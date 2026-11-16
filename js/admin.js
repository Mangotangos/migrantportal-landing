(function() {
  const token = localStorage.getItem('mp_token');
  const _adminUser = (() => { try { return JSON.parse(localStorage.getItem('mp_user')); } catch { return null; } })();
  if (!token || _adminUser?.role !== 'admin') { window.location.replace('/login'); }
})();
