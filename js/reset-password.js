// Already logged in? → dashboard
if (localStorage.getItem('mp_user')) window.location.href = 'dashboard';

// Extract token from URL
const token = new URLSearchParams(window.location.search).get('token');
if (!token) {
  document.getElementById('formState').style.display = 'none';
  document.getElementById('invalidState').style.display = 'block';
}

function togglePw(id, btn) {
  const input = document.getElementById(id);
  input.type = input.type === 'password' ? 'text' : 'password';
}

function checkStrength() {
  const pw = document.getElementById('pw').value;
  const fill = document.getElementById('strengthFill');
  const label = document.getElementById('strengthLabel');
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { w: '25%', c: '#dc2626', t: 'Weak' },
    { w: '50%', c: '#f97316', t: 'Fair' },
    { w: '75%', c: '#f59e0b', t: 'Good' },
    { w: '100%', c: '#16a34a', t: 'Strong' },
  ];
  const lvl = levels[Math.max(0, score - 1)] || levels[0];
  fill.style.width = pw.length ? lvl.w : '0';
  fill.style.background = lvl.c;
  label.textContent = pw.length ? lvl.t : '';
}

async function handleSubmit(e) {
  e.preventDefault();
  const pw  = document.getElementById('pw').value;
  const pw2 = document.getElementById('pw2').value;
  const err = document.getElementById('alertError');
  const btn = document.getElementById('submitBtn');

  err.style.display = 'none';

  if (pw !== pw2) {
    err.textContent = 'Passwords do not match.';
    err.style.display = 'block';
    return;
  }
  if (pw.length < 8) {
    err.textContent = 'Password must be at least 8 characters.';
    err.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Saving…';

  try {
    await apiPost('/auth/reset-password', { token, new_password: pw });
    document.getElementById('formState').style.display = 'none';
    document.getElementById('successState').style.display = 'block';
  } catch (ex) {
    if (ex.message.toLowerCase().includes('expired') || ex.message.toLowerCase().includes('invalid')) {
      document.getElementById('formState').style.display = 'none';
      document.getElementById('invalidState').style.display = 'block';
    } else {
      err.textContent = ex.message;
      err.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = 'Set New Password';
    }
  }
}

// Handlers were inline attributes; bound here so the page can run without 'unsafe-inline'.
document.getElementById('resetForm').addEventListener('submit', handleSubmit);
document.getElementById('pw').addEventListener('input', checkStrength);
document.querySelectorAll('.pw-toggle').forEach(function (b) {
  b.addEventListener('click', function () { togglePw(b.dataset.pw, b); });
});
