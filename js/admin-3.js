/* ── Rejection Modal Engine ── */
let _rejResolve = null;

const USER_REJECT_PRESETS = [
  'Incomplete profile information',
  'Organization not verified',
  'Duplicate account',
  'Unable to confirm identity',
  'Does not meet eligibility requirements',
];
const NEED_REJECT_PRESETS = [
  'Insufficient documentation',
  'Outside service area',
  'Need already fulfilled',
  'Duplicate submission',
  'Does not meet program criteria',
];
const DISB_REJECT_PRESETS = [
  'Insufficient documentation',
  'Amount exceeds approved limit',
  'Need already fulfilled',
  'Duplicate request',
  'Ineligible expense category',
];

function showRejectModal({ title = 'Reject', subtitle = 'Select a reason or write a custom one.', presets = NEED_REJECT_PRESETS } = {}) {
  document.getElementById('rejTitle').textContent = title;
  document.getElementById('rejSubtitle').textContent = subtitle;
  document.getElementById('rejTextarea').value = '';
  const presetsEl = document.getElementById('rejPresets');
  presetsEl.innerHTML = presets.map(p =>
    `<span class="rej-chip" data-action="_rejChipClick" data-args="[{&quot;$&quot;:&quot;this&quot;}]" data-a1="${esc(p)}">${p}</span>`
  ).join('');
  document.getElementById('rejOverlay').classList.add('open');
  document.getElementById('rejTextarea').focus();
  return new Promise(res => { _rejResolve = res; });
}

function _rejChipClick(el, text) {
  const wasSelected = el.classList.contains('selected');
  document.querySelectorAll('.rej-chip').forEach(c => c.classList.remove('selected'));
  if (!wasSelected) {
    el.classList.add('selected');
    document.getElementById('rejTextarea').value = text;
  } else {
    document.getElementById('rejTextarea').value = '';
  }
}

function _rejConfirm(skipReason) {
  const reason = skipReason ? '' : (document.getElementById('rejTextarea').value.trim());
  _rejClose();
  if (_rejResolve) { _rejResolve(reason); _rejResolve = null; }
}

function _rejCancel() {
  _rejClose();
  if (_rejResolve) { _rejResolve(null); _rejResolve = null; }
}

function _rejClose() {
  document.getElementById('rejOverlay').classList.remove('open');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('rejOverlay').classList.contains('open')) _rejCancel();
});
