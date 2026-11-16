// Logs uncaught errors to the console. Shared by pages that run under a strict CSP.
window.onerror = function(msg, src, line, col, err) {
  console.error('[MigrantPortal]', msg, src + ':' + line);
};
window.addEventListener('unhandledrejection', function(e) {
  console.error('[MigrantPortal] Unhandled promise rejection:', e.reason);
});
