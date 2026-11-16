// /dashboard is only a router: the role dashboards hold the real UI.
(function () {
  var user = null;
  try { user = JSON.parse(localStorage.getItem('mp_user')); } catch (_) { /* treated as signed out */ }

  var target = '/login';
  if (user) {
    if (user.role === 'admin') target = '/admin';
    else if (user.role === 'responder') target = user.org_id ? '/org-dashboard' : '/responder-dashboard';
    else if (user.role === 'navigator' || user.role === 'connector') target = '/navigator-dashboard';
    else localStorage.removeItem('mp_user'); // unknown role: sign out so login does not bounce back here
  }
  window.location.replace(target);
})();
