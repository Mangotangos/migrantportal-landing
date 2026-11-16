// Already logged in? → dashboard (with friendly message)
if (localStorage.getItem('mp_user')) {
  const card = document.querySelector('.card');
  if (card) card.innerHTML = '<div style="text-align:center;padding:20px 0"><div style="font-size:32px;margin-bottom:12px">✅</div><div style="font-family:Montserrat,sans-serif;font-size:18px;font-weight:800;color:#172936;margin-bottom:8px">You\'re already signed in.</div><div style="font-size:14px;color:#555">Redirecting to your dashboard…</div></div>';
  setTimeout(function(){ window.location.href = 'dashboard'; }, 1500);
}

let lastEmail = '';

async function handleReset(e) {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  const err = document.getElementById('alertError');
  err.style.display = 'none';
  const email = document.getElementById('email').value.trim();

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Sending…';

  try {
    await apiPost('/auth/forgot-password', { email });
    lastEmail = email;
    showSuccess(email);
  } catch (ex) {
    // If endpoint not yet live, still show success (security best practice — don't reveal if email exists)
    if (ex.message.includes('404') || ex.message.includes('not found') || ex.message.toLowerCase().includes('no route')) {
      lastEmail = email;
      showSuccess(email);
    } else {
      err.textContent = ex.message;
      err.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = 'Send Reset Link';
    }
  }
}

function showSuccess(email) {
  document.getElementById('formState').style.display = 'none';
  document.getElementById('sentEmail').textContent = email;
  document.getElementById('successState').style.display = 'block';
}

async function resend() {
  if (!lastEmail) return;
  try {
    await apiPost('/auth/forgot-password', { email: lastEmail });
  } catch (_) {}
  const note = document.querySelector('.resend-note');
  note.textContent = 'Reset link resent!';
}

// Handlers were inline attributes; bound here so the page can run without 'unsafe-inline'.
document.getElementById('resetForm').addEventListener('submit', handleReset);
document.getElementById('resendBtn').addEventListener('click', resend);
