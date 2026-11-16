let _qrLibPromise = null;
function loadQrLib() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  if (_qrLibPromise) return _qrLibPromise;
  _qrLibPromise = new Promise(function (resolve, reject) {
    const s = document.createElement('script');
    s.src = '/vendor/qrcode-generator/qrcode.js';
    s.onload = function () { resolve(window.qrcode); };
    s.onerror = function () { reject(new Error('QR library failed to load')); };
    document.head.appendChild(s);
  });
  return _qrLibPromise;
}
function showQrModal() {
  const needTitle = (document.querySelector('.req-title') || {}).textContent || 'MigrantPortal Need';
  const descEl = document.querySelector('#need-description, .req-desc, .req-body-desc, .desc');
  const descText = descEl ? (descEl.textContent || '').trim().slice(0, 140) : '';
  const url = location.href;
  document.getElementById('qr-title').textContent = needTitle.trim();
  document.getElementById('qr-desc').textContent = descText || 'Help meet this real need today.';
  document.getElementById('qr-url').textContent = url;
  const wrap = document.getElementById('qr-code-wrap');
  wrap.innerHTML = '<div style="color:#999;font-size:12px;padding:80px 0">Generating QR…</div>';
  document.getElementById('qr-modal').classList.add('open');
  loadQrLib().then(function (qrcode) {
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    wrap.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  }).catch(function () {
    wrap.innerHTML = '<div style="color:#dc2626;font-size:12px;padding:80px 0">QR unavailable offline.</div>';
  });
}
function closeQrModal() {
  document.getElementById('qr-modal').classList.remove('open');
}
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeQrModal();
});
document.getElementById('qr-modal').addEventListener('click', function (e) {
  if (e.target.id === 'qr-modal') closeQrModal();
});

// Handlers that used to be multi-statement inline attributes.
function showFundsForm() {
  document.getElementById('funds-request-form').style.display = '';
  document.getElementById('funds-request-btn').style.display = 'none';
}
function chatKeydown(event) { if (event.key === 'Enter') sendChat(); }
function confOverlayClick(event) { if (event.target === this) _confCancel(); }
function uploadReceiptFromInput(input) { uploadReceipt(input.dataset.disbursementId, input); }

// Delegated handlers (js/mp-actions.js dispatches data-action / data-change / data-input / data-submit / data-keydown).
mpRegister({ showFundsForm, chatKeydown, confOverlayClick, uploadReceiptFromInput, _confCancel, _confOk, acceptResponse, claimShift, closeQrModal, confirmItemReceipt, fulfillNeed, goToDonateCard, loadChat, logHoursForNeed, quickReply, removeReceipt, requestProvider, saveEditNeed, selectAmt, selectFundsAmt, selectHelpType, sendChat, setMyProgress, setRatingStar, shareNeed, showEditModal, showQrModal, startDonation, submitFundsRequest, submitRating, submitReceipt, submitResponse, suggestTime, toggleBookmark, uploadPhoto, withdrawResponse });
