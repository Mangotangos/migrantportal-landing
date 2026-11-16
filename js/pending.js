const user = getUser();
if (user) {
  if (user.name) document.getElementById('user-name').textContent = user.name.split(' ')[0];
  if (user.email) document.getElementById('user-email').textContent = user.email;
  if (user.status === 'approved') {
    window.location.href = '/dashboard';
  }
}

// Handlers were inline attributes; bound here so the page can run without 'unsafe-inline'.
// NOTE: resendVerificationEmail is not defined anywhere (pre-existing bug, the inline onclick threw the same
// ReferenceError on click). Wrapped so the missing function fails on click only, not at page load.
document.getElementById('resendVerifyBtn')?.addEventListener('click', function () { resendVerificationEmail(); });
document.getElementById('logoutLink')?.addEventListener('click', logout);
