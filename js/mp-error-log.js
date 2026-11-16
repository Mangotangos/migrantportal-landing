// Logs uncaught errors to the console with an [MP] prefix. Shared by pages that run under a strict CSP.
(function () {
  window.addEventListener('error', function (e) {
    console.error('[MP]', e.message, e.filename + ':' + e.lineno + ':' + e.colno);
  });
  window.addEventListener('unhandledrejection', function (e) {
    console.error('[MP Promise]', e.reason);
  });
})();
