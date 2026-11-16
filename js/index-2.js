(function() {
  window.addEventListener('error', function(e) {
    console.error('[MP]', e.message, e.filename + ':' + e.lineno + ':' + e.colno);
  });
  window.addEventListener('unhandledrejection', function(e) {
    console.error('[MP Promise]', e.reason);
  });
})();
