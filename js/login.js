// Validates ?next= against an internal-path allowlist pattern to prevent open redirects,
// and strips a trailing .html left over from the old static-site routes.
function getSafeNextPath() {
  const next = new URLSearchParams(window.location.search).get('next');
  if (!next) return null;
  const stripped = next.replace(/\.html$/i, '');
  // Plain page slug, or a single need link (need?id=<uuid>) so shared links survive sign-in.
  return /^([a-z0-9-]+|need\?id=[0-9a-f-]{36})$/i.test(stripped) ? stripped : null;
}

// Org-linked responders land on the org dashboard, not the individual one
function homeFor(user) {
  if (user?.role === 'admin') return 'admin';
  if (user?.role === 'responder' && user?.org_id) return 'org-dashboard';
  return 'dashboard';
}

// Redirect if already logged in — role-aware
const _existingUser = localStorage.getItem('mp_user');
if (_existingUser) {
  try {
    window.location.href = getSafeNextPath() || homeFor(JSON.parse(_existingUser));
  } catch (_) {
    window.location.href = getSafeNextPath() || 'dashboard';
  }
}

// BUG-014: Prevent auto-submit when browser fills saved credentials
// Also clear autofilled email to avoid leaking a different account's address
document.addEventListener('DOMContentLoaded', function() {
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', function(e) {
      // Only allow submission triggered by explicit user action (click/keyboard)
      if (!e.isTrusted) { e.preventDefault(); }
    });
  }
  setTimeout(function() {
    const emailEl = document.getElementById('email');
    if (emailEl) emailEl.value = '';
  }, 50);
});

function togglePw() {
  const inp = document.getElementById('password');
  const btn = inp.nextElementSibling;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? 'Show' : 'Hide';
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const err = document.getElementById('errorBox');
  err.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Signing in…';

  try {
    const data = await apiPost('/auth/login', {
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value
    });
    saveSession(data.access_token, data.user);
    try { localStorage.removeItem('mp_lang'); } catch(_) {}
    window.location.href = getSafeNextPath() || homeFor(data.user);
  } catch (ex) {
    const msg = ex.message || '';
    if (msg.startsWith('PENDING:')) {
      err.style.background = '#FFFBEB'; err.style.borderColor = '#FDE68A'; err.style.color = '#92400E';
      err.textContent = '⏳ Your account is awaiting admin approval. You\'ll be notified once approved (1–2 business days).';
    } else if (msg.startsWith('REJECTED:')) {
      const reason = msg.replace('REJECTED:', '').trim();
      err.textContent = '❌ Your account was not approved.' + (reason ? ' Reason: ' + reason : ' Please contact support.');
    } else if (msg.startsWith('SUSPENDED:')) {
      err.textContent = '🚫 Your account has been suspended. Please contact support.';
    } else {
      err.textContent = msg || 'Sign in failed. Please try again.';
    }
    err.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = 'Sign In';
  }
}

// Handlers were inline attributes; bound here so the page can run without 'unsafe-inline'.
document.getElementById('loginForm').addEventListener('submit', handleLogin);
document.getElementById('pwToggle').addEventListener('click', togglePw);
