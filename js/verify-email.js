// Must be logged in to verify
const mpUser = JSON.parse(localStorage.getItem('mp_user') || 'null');
if (!mpUser || !mpUser.token) {
  window.location.href = 'login';
}

async function handleVerify() {
  const err = document.getElementById('alertError');
  const btn = document.getElementById('verifyBtn');
  const code = document.getElementById('codeInput').value.trim();

  err.style.display = 'none';
  if (!code || code.length !== 6) {
    err.textContent = 'Please enter the 6-digit code from your email.';
    err.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Verifying…';

  try {
    await apiPost('/auth/verify-email', { verification_code: code });
    document.getElementById('formState').style.display = 'none';
    document.getElementById('successState').style.display = 'block';
  } catch (ex) {
    err.textContent = ex.message || 'Verification failed. Please try again.';
    err.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = 'Verify Email';
  }
}

async function handleResend() {
  const ok = document.getElementById('alertSuccess');
  const err = document.getElementById('alertError');
  err.style.display = 'none';
  try {
    await apiPost('/auth/send-verification-email', {});
    ok.textContent = 'A new code has been sent to your email.';
    ok.style.display = 'block';
    setTimeout(() => { ok.style.display = 'none'; }, 4000);
  } catch (ex) {
    err.textContent = ex.message || 'Could not resend. Try again.';
    err.style.display = 'block';
  }
}

// Handlers were inline attributes; bound here so the page can run without 'unsafe-inline'.
document.getElementById('verifyBtn').addEventListener('click', handleVerify);
document.getElementById('resendBtn').addEventListener('click', handleResend);
