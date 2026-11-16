// Read role from URL — skip step 1 if provided
// Same allowlist as login.html: a page slug or a single need link, never an external URL.
function getSafeNextPath() {
  const next = new URLSearchParams(window.location.search).get('next');
  if (!next) return null;
  const stripped = next.replace(/\.html$/i, '');
  return /^([a-z0-9-]+|need\?id=[0-9a-f-]{36})$/i.test(stripped) ? stripped : null;
}
const _urlRole = new URLSearchParams(window.location.search).get('role');
const _roleMap = { navigator: 'navigator', responder: 'responder' };
const _preselectedRole = _urlRole ? (_roleMap[_urlRole] || null) : null;

// An org invite code (?invite=CODE) always means "join as this org's
// Case Submitter" — the backend forces role=connector for any invite_code
// registration, so preselect the matching card here too.
const _urlInviteCode = new URLSearchParams(window.location.search).get('invite');

const ORG_SIDE_STEPS = ['Organization type', 'How you’ll use it', 'Services', 'Organization details', 'Create account'];
const TOTAL = 5;
let currentStep = 1;
// Screens the user has actually left, in order. Back pops this, so it
// never lands on a step that was skipped (e.g. step 1 on ?role= links).
const stepHistory = [];
let selectedPlace = null; // { city, state, zip } once resolved
const ZIP_API = 'https://api.zippopotam.us/us/';
const US_STATES = 'AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(' ');
let notificationRadius = 50;
const ALL_NEED_CATEGORIES = ['housing','food','clothing','furniture','transportation','employment','legal','medical','education','translation','childcare','financial','other'];
let needCategories = [];
let referralSource = '';

// ── Org flow (completely separate from navigator/responder) ──────────────
let isOrgFlow = false;
let currentOrgStep = 1;
const ORG_TOTAL = 5;
let orgUsageChoice = '';
let orgInviteCode = '';

if (_urlRole === 'organization') {
  isOrgFlow = true;
  // Orgs that respond get the same alert settings (radius + need types) as
  // individual responders, so reuse that block inside the org services step.
  const alerts = document.getElementById('responder-only-sections');
  document.getElementById('org-alerts-mount').appendChild(alerts);
  alerts.style.display = '';
  // Need types are derived from the services ticked above (see checkOrgServices).
  document.getElementById('need-types-block').style.display = 'none';
  alerts.querySelector('.section-label').textContent = 'Alert us about needs within... of your organization ZIP (entered next)';
  document.getElementById('step-1').classList.remove('visible');
  goOrgTo(1);
} else if (_urlInviteCode) {
  const connectorCard = document.querySelector('#cards-1 .card[data-val="connector"]');
  if (connectorCard) {
    connectorCard.classList.add('selected');
    document.getElementById('btn-1').disabled = false;
    document.getElementById('btn-1').classList.add('ready');
  }
  showStep(2);
} else if (_preselectedRole) {
  // ── Navigator / Responder auto-skip ─────────────────────────────────
  const cardVal = _preselectedRole === 'navigator' ? 'church' : 'own';
  const matchingCard = document.querySelector(`#cards-1 .card[data-val="${cardVal}"]`);
  if (matchingCard) {
    matchingCard.classList.add('selected');
    document.getElementById('btn-1').disabled = false;
    document.getElementById('btn-1').classList.add('ready');
  }
  // showStep, not goTo: step 1 was skipped, so it must not enter the history.
  showStep(_preselectedRole === 'responder' ? 'rt' : 2);
}

/* ── Navigation ─────────────────────────── */
let responderType = '';

function goTo(n) {
  if (!(typeof n === 'number' && n > TOTAL)) stepHistory.push(currentStep);
  showStep(n);
}

function showStep(n) {
  // Hide current step
  const curEl = document.getElementById('step-' + currentStep);
  if (curEl) curEl.classList.remove('visible');

  // Capture responder type when leaving step-rt
  if (currentStep === 'rt') {
    const sel = document.querySelector('#cards-rt .card.selected');
    if (sel) responderType = sel.dataset.val;
  }

  currentStep = n;

  if (n === '3b') {
    document.getElementById('step-3b').classList.add('visible');
    updateProgress(4);
    window.scrollTo(0, 0);
    return;
  }

  const isSuccess = n > TOTAL;
  if (isSuccess) {
    document.getElementById('step-success').classList.add('visible');
    document.getElementById('progress').style.display = 'none';
    document.getElementById('prog-back-btn').style.display = 'none';
    return;
  }
  document.getElementById('step-' + n).classList.add('visible');
  if (n === 2) { updateStep2Sections(); updateStep2Summary(); }
  if (n === 3) checkStep3();
  updateProgress(n === 'rt' ? 1 : n);
  window.scrollTo(0, 0);
}

function goBack() {
  if (isOrgFlow) {
    if (currentOrgStep === 4) { goBackFromOrgDetails(); return; }
    if (currentOrgStep > 1) goOrgTo(currentOrgStep - 1);
    return;
  }
  if (stepHistory.length) showStep(stepHistory.pop());
}

function goFromStep1() {
  const sel = document.querySelector('#cards-1 .card.selected');
  if (!sel) return;
  // church/navigator/connector all sign up as role=navigator, which never sends
  // responder_type, so only Individual Helper gets "How will you help?".
  const skipsHelpType = ['church', 'navigator', 'connector'].includes(sel.dataset.val);
  goTo(skipsHelpType ? 2 : 'rt');
}

/* ══ ORG FLOW FUNCTIONS ════════════════════════════════════════════════ */
function goOrgTo(n) {
  if (currentOrgStep >= 1) {
    const cur = document.getElementById('step-org-' + currentOrgStep);
    if (cur) cur.classList.remove('visible');
  }
  currentOrgStep = n;
  if (n === 4) document.getElementById('org-public-wrap').hidden = orgUsageChoice === 'submit';
  const next = document.getElementById('step-org-' + n);
  if (next) next.classList.add('visible');
  updateOrgProgress(n);
  window.scrollTo(0, 0);
}

function selectOrgUsage(el) {
  document.querySelectorAll('#cards-org-usage .card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  orgUsageChoice = el.dataset.val;
  setBtn('btn-org-2', true);
}

function goFromOrgUsage() {
  // "Submit needs" orgs skip the services step — it only applies to the
  // responder side (public directory listing).
  goOrgTo(orgUsageChoice === 'submit' ? 4 : 3);
}

function goBackFromOrgDetails() {
  goOrgTo(orgUsageChoice === 'submit' ? 2 : 3);
}

function updateOrgProgress(n) {
  for (let i = 1; i <= 5; i++) {
    const seg = document.getElementById('seg-' + i);
    if (!seg) continue;
    seg.className = 'progress-seg';
    if (i < n)         seg.classList.add('done');
    else if (i === n)  seg.classList.add('active');
  }
  document.getElementById('prog-back-btn').classList.toggle('hidden', n === 1);
  renderSideSteps(n, ORG_SIDE_STEPS);
}

function updateOrgStrength(pw) {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[0-9]/.test(pw) || /[^a-zA-Z0-9]/.test(pw)) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  for (let i = 1; i <= 4; i++) {
    document.getElementById('org-str-' + i).style.background = i <= score ? colors[score] : 'var(--gray-200)';
  }
  const lbl = document.getElementById('org-str-label');
  lbl.textContent = pw.length ? labels[score] : '';
  lbl.style.color = colors[score] || 'var(--gray-400)';
}

const SERVICE_TO_NEED = {
  food: 'food', shelter: 'housing', clothing: 'clothing', medical: 'medical',
  legal: 'legal', employment: 'employment', education: 'education',
  immigration: 'other', transportation: 'transportation', mental_health: 'other',
  financial: 'financial', childcare: 'childcare',
};
const NEED_LABELS = { housing: 'Housing', food: 'Food', clothing: 'Clothing', transportation: 'Transportation', employment: 'Employment', legal: 'Legal Aid', medical: 'Medical', education: 'Education', childcare: 'Childcare', financial: 'Financial', other: 'Other' };

function checkOrgServices() {
  const checked = [...document.querySelectorAll('#org-services-grid input[type=checkbox]:checked')];
  needCategories = [...new Set(checked.map(c => SERVICE_TO_NEED[c.value]).filter(Boolean))];
  const ready = checked.length > 0;
  const note = document.getElementById('org-alert-note');
  note.style.display = ready ? '' : 'none';
  note.innerHTML = '<strong>You’ll be alerted about:</strong> ' + needCategories.map(c => NEED_LABELS[c]).join(', ') + ' needs.';
  setBtn('btn-org-3', ready);
  document.getElementById('org-step3-hint').style.display = ready ? 'none' : '';
}

let orgZipResolved = false;

function checkOrgDetails() {
  const ok = document.getElementById('org-name').value.trim() &&
             orgZipResolved &&
             document.getElementById('org-city').value.trim() &&
             document.getElementById('org-state').value;
  setBtn('btn-org-4', ok);
}

function setOrgLocationResult(kind, text) {
  const el = document.getElementById('org-loc-result');
  el.className = 'loc-result' + (kind ? ' ' + kind : '');
  el.textContent = text;
}

async function onOrgZipInput(input) {
  input.value = input.value.replace(/\D/g, '');
  const zip = input.value;
  orgZipResolved = false;
  checkOrgDetails();
  if (!/^\d{5}$/.test(zip)) { setOrgLocationResult('', ''); return; }
  try {
    const data = await fetchPlace(zip);
    if (input.value !== zip) return; // stale response
    if (!data) {
      setOrgLocationResult('bad', "We couldn't find ZIP " + zip + '. Check it and try again.');
      return;
    }
    const place = data.places[0];
    document.getElementById('org-city').value = place['place name'];
    document.getElementById('org-state').value = place['state abbreviation'];
    orgZipResolved = true;
    setOrgLocationResult('ok', '✓ ' + place['place name'] + ', ' + place['state abbreviation'] + ' ' + zip);
  } catch (err) {
    setOrgLocationResult('bad', "We couldn't look up that ZIP right now. Please try again in a moment.");
  }
  checkOrgDetails();
}

function checkOrgAccount() {
  const pw  = document.getElementById('org-pw').value;
  const pw2 = document.getElementById('org-pw2').value;
  const ok  = document.getElementById('org-fname').value.trim() &&
              document.getElementById('org-lname').value.trim() &&
              document.getElementById('org-login-email').value.includes('@') &&
              pw.length >= 8 && pw === pw2 &&
              document.getElementById('org-agree').checked &&
              document.getElementById('org-agree-data').checked;
  setBtn('btn-org-5', ok);
}

async function apiPostWithToken(path, body, token) {
  const r = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(_extractDetail(data.detail));
  return data;
}

function showOrgSuccess(loginEmail) {
  document.getElementById('step-org-5').classList.remove('visible');
  document.getElementById('step-org-success').classList.add('visible');
  document.getElementById('progress').style.display = 'none';
  document.getElementById('prog-back-btn').style.display = 'none';
  document.getElementById('org-success-email').textContent = loginEmail + ' — created just now.';
  document.getElementById('org-invite-code').textContent = orgInviteCode || '—';
  const linkEl = document.getElementById('org-invite-link');
  if (linkEl) linkEl.textContent = orgInviteCode ? `migrantportal.com/register?invite=${orgInviteCode}` : 'migrantportal.com/register?invite=…';
  window.scrollTo(0, 0);
}

function copyOrgInviteCode() {
  if (!orgInviteCode) return;
  navigator.clipboard?.writeText(orgInviteCode).then(() => {
    const btn = document.getElementById('org-invite-copy-btn');
    btn.textContent = 'Copied ✓';
    setTimeout(() => { btn.textContent = 'Copy code'; }, 2000);
  }).catch(() => {});
}

async function submitOrgForm() {
  const btn = document.getElementById('btn-org-5');
  const errEl = document.getElementById('org-reg-error');
  errEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Submitting…';

  const fname = document.getElementById('org-fname').value.trim();
  const lname = document.getElementById('org-lname').value.trim();
  const loginEmail = document.getElementById('org-login-email').value.trim();
  const password   = document.getElementById('org-pw').value;

  const orgType = document.querySelector('#cards-org-type .card.selected')?.dataset.val || 'nonprofit';
  const services = [...document.querySelectorAll('#org-services-grid input:checked')].map(c => c.value).join(',');

  const orgPayload = {
    org_name:    document.getElementById('org-name').value.trim(),
    org_type:    orgType,
    description: document.getElementById('org-desc').value.trim() || null,
    services:    services || null,
    address:     document.getElementById('org-address').value.trim() || null,
    city:        document.getElementById('org-city').value.trim() || null,
    state:       document.getElementById('org-state').value.trim().toUpperCase() || null,
    zipcode:     document.getElementById('org-zip').value.trim(),
    phone:       document.getElementById('org-phone').value.trim() || null,
    email:       document.getElementById('org-email').value.trim() || null,
    website:     document.getElementById('org-website').value.trim() || null,
    hours:       document.getElementById('org-hours').value.trim() || null,
    contact_name: fname + ' ' + lname,
  };

  // 'submit' orgs register as connector (needed to actually submit needs);
  // 'respond' and 'both' register as responder (public directory listing).
  const role = orgUsageChoice === 'submit' ? 'navigator' : 'responder';
  const userPayload = {
    name: fname + ' ' + lname,
    email: loginEmail,
    password,
    role,
    responder_type: role === 'responder' ? 'church' : null,
    registration_notes: `Organization application (${orgUsageChoice}): ${orgPayload.org_name} (${orgType})` +
      (orgUsageChoice !== 'submit' && !document.getElementById('org-public').checked ? '. Opted out of the public Find Help listing.' : ''),
    city: orgPayload.city,
    state: orgPayload.state,
    zip_code: orgPayload.zipcode,
  };
  if (orgUsageChoice !== 'submit') {
    userPayload.notification_radius = notificationRadius;
    userPayload.need_categories = needCategories;
  }

  try {
    // 1. Register user account
    const userData = await apiPost('/auth/register', userPayload);

    // 2. Submit nonprofit directory listing — only orgs that respond need
    // a public listing; pure "submit" orgs skip it.
    let nonprofitId = null;
    if (orgUsageChoice !== 'submit' && document.getElementById('org-public').checked) {
      const npData = await apiPost('/nonprofits/apply', orgPayload);
      nonprofitId = npData.id || null;
    }

    // 3. "Both": create the Organization now so we have an invite code to
    // hand the org a second, connector-role login for submitting needs.
    // Pass nonprofit_id so admin can see which account owns which listing.
    if (orgUsageChoice === 'both' && userData.access_token) {
      try {
        const org = await apiPostWithToken('/orgs', {
          name: orgPayload.org_name,
          description: orgPayload.description,
          website: orgPayload.website,
          city: orgPayload.city,
          state: orgPayload.state,
          ...(nonprofitId ? { nonprofit_id: nonprofitId } : {}),
        }, userData.access_token);
        orgInviteCode = org.invite_code || '';
      } catch (orgEx) {
        console.error('[MP] org creation failed, continuing without invite code', orgEx);
      }
    }

    // 4. Route to the right confirmation screen
    if (orgUsageChoice === 'both') {
      showOrgSuccess(loginEmail);
    } else if (userData.user?.status === 'pending') {
      window.location.href = '/pending';
    } else {
      saveSession(userData.access_token, userData.user);
      setTimeout(() => { window.location.href = getSafeNextPath() || 'dashboard'; }, 1500);
    }
  } catch (ex) {
    btn.disabled = false;
    btn.textContent = 'Submit Application';
    const msg = ex.message || 'Something went wrong. Please try again.';
    const isEmailTaken = msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists');
    errEl.innerHTML = isEmailTaken
      ? `That email is already registered. <a href="/login" style="color:#dc2626;font-weight:600;text-decoration:underline">Sign in instead?</a>`
      : msg;
    errEl.style.display = 'block';
  }
}

function renderSideSteps(n, labels) {
  document.querySelectorAll('#side-steps li').forEach(li => {
    const idx = Number(li.dataset.s);
    if (labels) li.lastChild.textContent = labels[idx - 1];
    li.classList.toggle('cur', idx === n);
    li.classList.toggle('done', idx < n);
  });
}

function updateProgress(n) {
  for (let i = 1; i <= TOTAL; i++) {
    const seg = document.getElementById('seg-' + i);
    seg.className = 'progress-seg';
    if (i < n)        seg.classList.add('done');
    else if (i === n) seg.classList.add('active');
  }
  const backBtn = document.getElementById('prog-back-btn');
  backBtn.classList.toggle('hidden', stepHistory.length === 0);
  renderSideSteps(n);
}

/* ── Step 1: Card selection ──────────────── */
function selectCard(groupId, el, btnId) {
  document.querySelectorAll('#' + groupId + ' .card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  const btn = document.getElementById(btnId);
  btn.disabled = false;
  btn.classList.add('ready');
}

/* ── Step 2: Location ────────────────────── */
function setLocationResult(kind, text) {
  const el = document.getElementById('loc-result');
  el.className = 'loc-result' + (kind ? ' ' + kind : '');
  el.textContent = text;
}

function updateLocBtn() {
  const btn = document.getElementById('btn-2');
  btn.disabled = !selectedPlace;
  btn.classList.toggle('ready', !!selectedPlace);
  updateStep2Summary();
}

function applyPlace(place) {
  selectedPlace = place;
  if (place) setLocationResult('ok', '✓ ' + place.city + ', ' + place.state + (place.zip ? ' ' + place.zip : ''));
  updateLocBtn();
}

async function fetchPlace(path) {
  const res = await fetch(ZIP_API + path);
  if (!res.ok) return null;
  const data = await res.json();
  return data.places && data.places[0] ? data : null;
}

async function lookupZip(zip) {
  selectedPlace = null;
  updateLocBtn();
  if (!/^\d{5}$/.test(zip)) { setLocationResult('', ''); return; }
  try {
    const data = await fetchPlace(zip);
    if (document.getElementById('loc-zip').value !== zip) return; // stale response
    if (!data) {
      setLocationResult('bad', "We couldn't find ZIP " + zip + '. Check it, or enter city and state instead.');
      return;
    }
    const place = data.places[0];
    applyPlace({ city: place['place name'], state: place['state abbreviation'], zip });
  } catch (err) {
    setLocationResult('bad', "We couldn't look up that ZIP right now. Try city and state instead.");
  }
}

function onZipInput(input) {
  input.value = input.value.replace(/\D/g, '');
  lookupZip(input.value);
}

function updateStep2Summary() {
  const el = document.getElementById('step2-summary');
  if (!el) return;
  const parts = [];
  const showNeeds = document.getElementById('responder-only-sections').style.display !== 'none';
  if (showNeeds) {
    parts.push(needCategories.length + (needCategories.length === 1 ? ' need' : ' needs'));
    parts.push(notificationRadius ? 'within ' + notificationRadius + ' mi' : 'any distance');
  }
  if (selectedPlace) parts.push(selectedPlace.city + ', ' + selectedPlace.state);
  el.textContent = parts.join(' \u00b7 ');
  el.classList.toggle('show', parts.length > 0 && !!selectedPlace);
}

async function useMyLocation() {
  const btn = document.getElementById('btn-geo');
  if (!navigator.geolocation) {
    setLocationResult('bad', 'Location is not available in this browser. Enter your ZIP instead.');
    return;
  }
  btn.disabled = true;
  setLocationResult('', '');
  navigator.geolocation.getCurrentPosition(async pos => {
    try {
      const url = 'https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat='
        + pos.coords.latitude + '&lon=' + pos.coords.longitude;
      const res = await fetch(url);
      const data = res.ok ? await res.json() : null;
      const addr = data && data.address ? data.address : null;
      const zip = addr && addr.postcode ? String(addr.postcode).slice(0, 5) : '';
      if (!/^\d{5}$/.test(zip) || (addr.country_code && addr.country_code !== 'us')) {
        setLocationResult('bad', "We couldn't find a US ZIP for your location. Enter it manually.");
      } else {
        document.getElementById('loc-zip').value = zip;
        await lookupZip(zip);
      }
    } catch (err) {
      setLocationResult('bad', "We couldn't look up your location. Enter your ZIP instead.");
    } finally {
      btn.disabled = false;
    }
  }, () => {
    btn.disabled = false;
    setLocationResult('bad', 'Location permission was denied. Enter your ZIP instead.');
  }, { timeout: 10000 });
}

function pickQuickZip(zip) {
  document.getElementById('loc-zip').value = zip;
  lookupZip(zip);
}

function toggleManualLocation() {
  const box = document.getElementById('loc-manual');
  box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

async function lookupCityState() {
  const city = document.getElementById('loc-city').value.trim();
  const state = document.getElementById('loc-state').value;
  selectedPlace = null;
  updateLocBtn();
  if (!city || !state) return;
  try {
    const data = await fetchPlace(state.toLowerCase() + '/' + encodeURIComponent(city.toLowerCase()));
    if (!data) {
      setLocationResult('bad', 'We couldn’t find "' + city + ', ' + state + '". Check the spelling.');
      return;
    }
    const titleCity = city.replace(/\b\w/g, c => c.toUpperCase());
    applyPlace({ city: titleCity, state, zip: data.places[0]['post code'] });
  } catch (err) {
    setLocationResult('bad', "We couldn't look that up right now. Try a ZIP code instead.");
  }
}

(function initStateSelects() {
  const options = '<option value="">--</option>' + US_STATES.map(s => '<option>' + s + '</option>').join('');
  ['loc-state', 'org-state'].forEach(id => { document.getElementById(id).innerHTML = options; });
})();

/* ── Step 3: Personal info ───────────────── */
const MIN_NOTES_LENGTH = 10;

// Every card except Individual Helper registers as role=navigator.
function isNavigatorSignup() {
  const sel = document.querySelector('#cards-1 .card.selected');
  return !!sel && sel.dataset.val !== 'own';
}

// Invitees join an org that already vouches for them, so they skip the notes.
function notesRequired() {
  return isNavigatorSignup() && !_urlInviteCode;
}

// Same characters the backend accepts (PHONE_PATTERN in auth.py).
const PHONE_PATTERN = /^[0-9+().\- ]*$/;

function checkStep3() {
  const notes = document.getElementById('reg-notes').value.trim();
  const phoneOk = PHONE_PATTERN.test(document.getElementById('phone').value);
  document.getElementById('phone-error').hidden = phoneOk;
  const ok = document.getElementById('fname').value.trim() &&
             document.getElementById('lname').value.trim() &&
             document.getElementById('email').value.includes('@') &&
             phoneOk &&
             (!notesRequired() || notes.length >= MIN_NOTES_LENGTH);
  setBtn('btn-3', !!ok);
}

/* ── Step 5: Password ────────────────────── */
function updateStrength(pw) {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[0-9]/.test(pw) || /[^a-zA-Z0-9]/.test(pw)) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  for (let i = 1; i <= 4; i++) {
    document.getElementById('str-' + i).style.background = i <= score ? colors[score] : 'var(--gray-200)';
  }
  const lbl = document.getElementById('str-label');
  lbl.textContent = pw.length ? labels[score] : '';
  lbl.style.color = colors[score] || 'var(--gray-400)';
}

function checkStep5() {
  const errEl = document.getElementById('reg-error');
  if (errEl) errEl.style.display = 'none';
  const pw  = document.getElementById('pw').value;
  const pw2 = document.getElementById('pw2').value;
  const ok  = pw.length >= 8 && pw === pw2
              && document.getElementById('agree').checked
              && document.getElementById('agree-data').checked;
  setBtn('btn-5', ok);
}

function setBtn(id, ok) {
  const btn = document.getElementById(id);
  btn.disabled = !ok;
  btn.classList.toggle('ready', ok);
}

/* ── Step 2: Responder sections visibility ── */
function updateStep2Sections() {
  const sel = document.querySelector('#cards-1 .card.selected');
  // Only responders get "new need nearby" alerts (backend matching filters on
  // role=responder), so navigator cards, church included, skip radius + need types.
  const isResponder = sel && sel.dataset.val === 'own';
  document.getElementById('responder-only-sections').style.display = isResponder ? '' : 'none';
  // Step 2 and 3 wording (and the notes field) differ for navigators.
  document.querySelectorAll('[data-for="responder"]').forEach(el => { el.hidden = !isResponder; });
  document.querySelectorAll('[data-for="navigator"]').forEach(el => { el.hidden = !!isResponder || (el.id === 'field-notes' && !notesRequired()); });
}

/* ── Step 2: Radius pills ────────────────── */
function selectRadius(el, value) {
  document.querySelectorAll('.radius-pill').forEach(p => p.classList.remove('selected'));
  el.classList.add('selected');
  notificationRadius = value;
  updateStep2Summary();
}

/* ── Step 2: Need category chips ─────────── */
function toggleNeedChip(el) {
  const cat = el.dataset.cat;
  if (el.classList.contains('selected')) {
    el.classList.remove('selected');
    needCategories = needCategories.filter(c => c !== cat);
  } else {
    el.classList.add('selected');
    if (!needCategories.includes(cat)) needCategories.push(cat);
  }
  const toggleBtn = document.getElementById('needs-toggle');
  if (toggleBtn) toggleBtn.textContent = needCategories.length === 0 ? 'Select All' : 'Clear All';
  if (needCategories.length) clearNeedError();
  updateStep2Summary();
  if (isOrgFlow) checkOrgServices();
}

function toggleAllNeeds(btn) {
  const chips = document.querySelectorAll('.need-chip');
  if (needCategories.length > 0) {
    chips.forEach(c => c.classList.remove('selected'));
    needCategories = [];
    btn.textContent = 'Select All';
  } else {
    chips.forEach(c => c.classList.add('selected'));
    needCategories = [...ALL_NEED_CATEGORIES];
    btn.textContent = 'Clear All';
    clearNeedError();
  }
  updateStep2Summary();
  if (isOrgFlow) checkOrgServices();
}

function clearNeedError() {
  document.getElementById('need-chips').classList.remove('err');
  document.getElementById('need-error').style.display = 'none';
}

function goFromStep2() {
  const needsRequired = document.getElementById('responder-only-sections').style.display !== 'none';
  if (needsRequired && needCategories.length === 0) {
    const chips = document.getElementById('need-chips');
    chips.classList.add('err');
    document.getElementById('need-error').style.display = '';
    chips.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  goTo(3);
}

/* ── Step 3b: Referral source ────────────── */
function selectReferral(el, value) {
  document.querySelectorAll('.referral-chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  referralSource = value;
}

/* ── Submit ──────────────────────────────── */
async function submitForm() {
  const btn   = document.getElementById('btn-5');
  const name  = (document.getElementById('fname').value + ' ' + document.getElementById('lname').value).trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('pw').value;

  btn.disabled = true;
  btn.textContent = 'Creating account…';
  document.querySelectorAll('#step-5 input, #step-5 select, #step-5 textarea').forEach(el => { el.disabled = true; });

  const serveChoice = document.querySelector('#cards-1 .card.selected')?.dataset.val;
  const isOrgSignup = serveChoice === 'church' || serveChoice === 'navigator';
  const role = (serveChoice === 'connector' || isOrgSignup) ? 'navigator' : 'responder';
  const notes = notesRequired() ? document.getElementById('reg-notes').value.trim() : '';

  try {
    const payload = { name, email, password, role };
    if (notes) payload.registration_notes = notes;
    if (responderType && role === 'responder') payload.responder_type = responderType;
    if (referralSource) payload.referral_source = referralSource;
    if (_urlInviteCode) payload.invite_code = _urlInviteCode;
    const phone = document.getElementById('phone').value.trim();
    if (phone) payload.phone = phone;
    if (selectedPlace) {
      payload.city = selectedPlace.city;
      payload.state = selectedPlace.state;
      if (selectedPlace.zip) payload.zip_code = selectedPlace.zip;
    }
    // Saved whenever step 2 showed the radius and need chips (individual helpers).
    if (document.getElementById('responder-only-sections').style.display !== 'none') {
      payload.notification_radius = notificationRadius;
      payload.need_categories = needCategories;
    }
    const data = await apiPost('/auth/register', payload);
    goTo(6);
    if (data.user?.status === 'pending') {
      // Do NOT save session — pending users must wait for admin approval
      window.location.href = '/pending';
    } else {
      saveSession(data.access_token, data.user);
      const dest = getSafeNextPath() || (isOrgSignup ? 'org-dashboard' : 'dashboard');
      setTimeout(() => window.location.href = dest, 2000);
    }
  } catch (ex) {
    btn.disabled = false;
    btn.textContent = 'Create Account';
    const errEl = document.getElementById('reg-error');
    const msg = ex.message || 'Something went wrong. Please try again.';
    const isEmailTaken = msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists');
    errEl.innerHTML = isEmailTaken
      ? `That email is already registered. <a href="/login" style="color:#dc2626;font-weight:600;text-decoration:underline;">Sign in instead?</a>`
      : msg;
    errEl.style.display = 'block';
  }
}

// Handlers that used to be two-call inline attributes.
function pwInput(value) { checkStep5(); updateStrength(value); }
function orgPwInput(value) { checkOrgAccount(); updateOrgStrength(value); }

// Delegated handlers (js/mp-actions.js dispatches data-action / data-change / data-input / data-submit / data-keydown).
mpRegister({ pwInput, orgPwInput, checkOrgAccount, checkOrgDetails, checkOrgServices, checkStep3, checkStep5, copyOrgInviteCode, goBack, goBackFromOrgDetails, goFromOrgUsage, goFromStep1, goFromStep2, goOrgTo, goTo, lookupCityState, onOrgZipInput, onZipInput, pickQuickZip, selectCard, selectOrgUsage, selectRadius, selectReferral, submitForm, submitOrgForm, toggleAllNeeds, toggleManualLocation, toggleNeedChip, useMyLocation });
