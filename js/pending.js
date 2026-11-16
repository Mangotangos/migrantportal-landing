const user = getUser();
if (user) {
  if (user.name) document.getElementById('user-name').textContent = user.name.split(' ')[0];
  if (user.email) document.getElementById('user-email').textContent = user.email;
  if (user.status === 'approved') {
    window.location.href = '/dashboard';
  }
}

// Handlers were inline attributes; bound here so the page can run without 'unsafe-inline'.
async function resendVerificationEmail() {
  const btn = document.getElementById('resendVerifyBtn');
  btn.disabled = true;
  try {
    await apiPost('/auth/send-verification-email', {});
    btn.textContent = 'Sent. Check your inbox';
  } catch (ex) {
    btn.textContent = (ex && ex.message) || 'Could not resend. Try again.';
    btn.disabled = false;
  }
}

document.getElementById('resendVerifyBtn')?.addEventListener('click', resendVerificationEmail);
document.getElementById('logoutLink')?.addEventListener('click', logout);
