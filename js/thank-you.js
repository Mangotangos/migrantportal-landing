// Read ?amount= and ?need= query params (backend will append these on success redirect)
(function () {
  const params = new URLSearchParams(location.search);
  const amountRaw = params.get('amount');
  const needTitle = params.get('need');
  const needId = params.get('need_id');

  const amountBox = document.getElementById('amount-box');
  if (amountRaw) {
    const n = parseFloat(amountRaw);
    if (!isNaN(n) && n > 0) {
      document.getElementById('amount').textContent = '$' + n.toFixed(2);
      amountBox.style.display = 'block';
    }
  }
  if (needTitle) {
    document.getElementById('amount-need').textContent = 'toward: ' + needTitle;
  }
  if (needId) {
    document.getElementById('primary-cta').href = '/need?id=' + encodeURIComponent(needId);
  }

  // Share link setup
  const shareUrl = location.origin + '/';
  const shareMsg = 'I just donated through MigrantPortal to help a migrant neighbor in need. Join me:';
  document.getElementById('share-fb').href =
    'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl);
  document.getElementById('share-tw').href =
    'https://twitter.com/intent/tweet?text=' + encodeURIComponent(shareMsg) + '&url=' + encodeURIComponent(shareUrl);
  document.getElementById('share-em').href =
    'mailto:?subject=' + encodeURIComponent('Help a migrant neighbor') +
    '&body=' + encodeURIComponent(shareMsg + ' ' + shareUrl);
})();

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(function () {});
}
