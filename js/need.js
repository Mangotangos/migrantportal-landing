// These elements carry data-no-i18n: i18n.js caches each leaf element's first-seen
// text and restores it on every mpReapplyI18n(), which wiped real data for responders.
function setText(el, text) {
  if (el) el.textContent = text;
}

// ── Case progress stepper. Stage comes from need status, response count and
// whether any offer is accepted (known to navigators via loadResponders).
const CASE_STEPS = ['Posted', 'Responder responded', 'Offer accepted', 'Delivery', 'Fulfilled'];
let caseProgress = { status: 'active', responseCount: 0, accepted: false, acceptedName: '' };
let iResponded = false;
let myResponseStatus = 'offered'; // this helper's own offer: offered | accepted | in_progress | completed

function renderStepper(patch = {}) {
  caseProgress = { ...caseProgress, ...patch };
  if (currentNeed && currentNeed.items) renderItems(currentNeed);
  const el = document.getElementById('case-steps');
  if (!el) return;
  const { status, responseCount, accepted } = caseProgress;
  const closed = status === 'fulfilled' || status === 'closed';
  const now = closed ? CASE_STEPS.length : accepted ? 3 : responseCount > 0 ? 2 : 1;
  const hints = !currentUser
      ? { 1: 'Waiting for a responder', 3: 'Delivery in progress' }
      : { 1: 'Waiting', 2: currentUser?.role === 'responder' ? 'Waiting for acceptance' : 'Review offers', 3: 'Arrange in chat' };
  el.innerHTML = CASE_STEPS.map((name, i) => {
    const cls = i < now ? 'done' : i === now ? 'now' : '';
    const hint = i === now ? (hints[i] || '') : '';
    const posted = i === 0 && caseProgress.postedLabel ? `<span class="step-hint" data-no-i18n>${esc(caseProgress.postedLabel)}</span>` : '';
    return `<li class="case-step ${cls}"${cls === 'now' ? ' aria-current="step"' : ''}>${currentUser ? name : vt(name)}${hint ? `<span class="step-hint"${currentUser ? '' : ' data-no-i18n'}>${currentUser ? hint : vt(hint)}</span>` : posted}</li>`;
  }).join('');
  renderChips();
  renderNextCard();
  if (window.mpReapplyI18n) window.mpReapplyI18n();
}

// Header chips: category, urgency, place, household, response count, closed state
let chipsSeeZip = false;
function renderChips() {
  const meta = document.querySelector('.req-meta');
  const need = currentNeed;
  if (!meta || !need || document.body.classList.contains('visitor')) return; // visitors get their own chips
  const urg = (need.urgency || '').toLowerCase();
  const loc = [need.city, need.state, chipsSeeZip ? need.zip : null].filter(Boolean).join(', ');
  const ad = need.family_adults || 1, ch = need.family_children || 0;
  const n = caseProgress.responseCount || 0;
  const closed = caseProgress.status === 'fulfilled' || caseProgress.status === 'closed';
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  meta.classList.add('req-chips'); // keep .req-meta: the visitor view looks it up by that class
  meta.innerHTML = [
    need.category ? `<span class="req-chip">${esc(cap(need.category))}</span>` : '',
    urg ? `<span class="req-chip${urg === 'high' || urg === 'urgent' ? ' urgent' : ''}">${esc(cap(urg))} urgency</span>` : '',
    loc ? `<span class="req-chip">${esc(loc)}</span>` : '',
    `<span class="req-chip">${ad} adult${ad !== 1 ? 's' : ''}, ${ch} child${ch !== 1 ? 'ren' : ''}</span>`,
    `<span class="req-chip">${n} response${n !== 1 ? 's' : ''}</span>`,
    closed ? `<span class="req-chip ok">${caseProgress.status === 'fulfilled' ? 'Fulfilled' : 'Closed'}</span>` : ''
  ].join('');
}

// "Your next step": one headline per role and stage. Logged-out visitors get no card here.
function nextCardCopy() {
  const { status, responseCount, accepted, acceptedName } = caseProgress;
  const role = currentUser?.role;
  const staff = isConnector(currentUser) || role === 'admin';
  const closed = status === 'fulfilled' || status === 'closed';
  const share = `<div class="next-actions"><button type="button" class="primary" data-action="shareNeed">Share this need</button><button type="button" data-action="showQrModal">Print QR</button></div>`;
  if (staff) {
    if (closed) return { eyebrow: 'Case closed', title: status === 'fulfilled' ? 'This need was fulfilled' : 'This need is closed', text: 'Thank you to everyone who helped.', calm: true };
    if (accepted) return { eyebrow: 'Your next step', title: 'Agree a drop-off time and place' + (acceptedName ? ' with ' + acceptedName : ''), text: 'Pick a time and an organization site in the chat below. Then record what arrived from the panel on the right.' };
    if (responseCount > 0) return { eyebrow: 'Your next step', title: 'Review the offers', text: `${responseCount} responder${responseCount !== 1 ? 's have' : ' has'} offered to help. Accept one from the list on the right.` };
    return { eyebrow: 'Waiting', title: 'Waiting for responders', text: 'No one has responded yet. Share this need to reach more people.', html: share, calm: true };
  }
  if (role === 'responder' && iResponded) {
    if (closed) return { eyebrow: 'Thank you', title: status === 'fulfilled' ? 'Your delivery is recorded' : 'This need is closed', text: 'You helped a family. Thank you.', calm: true };
    if (myResponseStatus === 'completed') return { eyebrow: 'Done', title: 'Waiting for the navigator to confirm', text: 'You marked your part done. The navigator will check with the family and close the need.', calm: true };
    if (myResponseStatus !== 'offered') return { eyebrow: 'Your next step', title: 'Confirm the drop-off with the navigator', text: 'Your offer was accepted. Agree a time and place in the chat below, then keep your records in the panel on the right.' };
    return { eyebrow: 'Offer sent', title: 'Waiting for the navigator to review your offer', text: 'Once your offer is accepted you can chat here to arrange the drop-off.', calm: true };
  }
  if (role === 'responder' && !closed) return { eyebrow: 'Offer to help', title: 'What can you give?', text: 'Choose how you want to help in the panel on the right. The navigator will review your offer and message you here.' };
  return null;
}

function renderNextCard() {
  const card = document.getElementById('next-card');
  if (!card) return;
  const copy = currentUser && currentNeed ? nextCardCopy() : null;
  card.style.display = copy ? '' : 'none';
  if (copy) {
    card.classList.toggle('calm', !!copy.calm);
    card.innerHTML = `<div class="next-eyebrow">${copy.eyebrow}</div><h2>${esc(copy.title)}</h2><p>${esc(copy.text)}</p>${copy.html || ''}`;
  }
  const closedNow = caseProgress.status === 'fulfilled' || caseProgress.status === 'closed';
  // Responder's own offer badge
  const badge = document.getElementById('offer-badge');
  if (badge) {
    const isMineAccepted = myResponseStatus !== 'offered';
    badge.classList.toggle('ok', isMineAccepted);
    badge.textContent = closedNow ? 'Delivered' : isMineAccepted ? 'Accepted' : 'Waiting for review';
  }
}

async function shareNeed() {
  const url = location.href;
  try {
    if (navigator.share) { await navigator.share({ title: document.title, url }); return; }
    await navigator.clipboard.writeText(url);
    toast('Link copied.');
  } catch (e) {
    if (e && e.name !== 'AbortError') toast('Could not share. Copy the link from the address bar.', true);
  }
}

// EN | ES switch: delegates to the toggle button i18n.js injects into .nav-right
function syncLangSeg() {
  const isEs = (document.documentElement.lang || 'en').toLowerCase() === 'es';
  document.querySelectorAll('.lang-seg button').forEach(b => {
    b.setAttribute('aria-pressed', String((b.dataset.lang === 'es') === isEs));
  });
}
document.querySelectorAll('.lang-seg button').forEach(b => {
  b.addEventListener('click', () => {
    const isEs = (document.documentElement.lang || 'en').toLowerCase() === 'es';
    if ((b.dataset.lang === 'es') !== isEs) document.querySelector('.mp-lang-toggle')?.click();
  });
});
new MutationObserver(syncLangSeg).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
window.addEventListener('load', syncLangSeg);

function quickReply(text) {
  const input = document.getElementById('chat-input');
  if (!input) return;
  input.value = text;
  input.focus();
}

function suggestTime() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  input.value = 'How about [day] at [time] at [organization site]?';
  input.focus();
  input.setSelectionRange(10, 15);
}

const CATEGORY_EMOJI = { housing:'🏠', food:'🍽️', clothing:'👗', furniture:'🛋️', transportation:'🚗', employment:'💼', legal:'⚖️', medical:'🏥', education:'📚', translation:'🌐', childcare:'👶', financial:'💰', other:'📦' };

let currentNeed = null;
const currentUser = getUser();
const needId = new URLSearchParams(location.search).get('id');
const _params = new URLSearchParams(location.search);
if (_params.get('donated') === '1') {
  // clean URL then show success toast after page loads
  history.replaceState(null, '', needId ? `need?id=${needId}` : 'requests');
  window.addEventListener('load', () => toast('Thank you! Your donation was received. 🎉'));
}

// ── Toast
function toast(msg, err=false) {
  let el = document.getElementById('need-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'need-toast';
    Object.assign(el.style, {
      position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)',
      background:'#1a1a1a', color:'white', padding:'10px 20px', borderRadius:'8px',
      fontSize:'13px', zIndex:'999', opacity:'0', pointerEvents:'none', transition:'opacity .2s'
    });
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.background = err ? '#EF4444' : '#1a1a1a';
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => el.style.opacity = '0', 2800);
}

// Accepted helper's own progress. "Done" emails the navigator, who then checks with the family.
function myProgressHtml() {
  if (myResponseStatus === 'offered') return '';
  const isDone = myResponseStatus === 'completed';
  const isOnIt = myResponseStatus === 'in_progress';
  const hint = isDone ? 'You marked your part done. The navigator will check with the family and close the need.'
    : isOnIt ? 'Tap Done once everything is dropped off.'
    : 'Let the navigator know when you start and when you are done.';
  const btn = (status, label, isPrimary) => `<button type="button" class="my-progress-btn" data-action="setMyProgress" data-a0="${status}"
    style="flex:1;height:38px;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;${isPrimary
      ? 'background:var(--teal);color:#fff;border:none' : 'background:#fff;color:var(--teal);border:1px solid var(--teal)'}">${label}</button>`;
  return `<div id="my-progress" style="border:1px solid var(--gray-200);border-radius:10px;padding:14px;margin-bottom:12px">
    <span style="display:block;font-size:12px;font-weight:700;color:var(--gray-700);margin-bottom:4px">Your progress</span>
    <p style="font-size:12px;color:var(--gray-600);margin:0 0 ${isDone ? 0 : 10}px">${hint}</p>
    ${isDone ? '' : `<div style="display:flex;gap:8px">${isOnIt ? '' : btn('in_progress', "I'm on it", false)}${btn('completed', 'Done', true)}</div>`}
  </div>`;
}

async function setMyProgress(status) {
  const buttons = document.querySelectorAll('#my-progress .my-progress-btn');
  buttons.forEach(b => { b.disabled = true; });
  try {
    await apiPatch(`/needs/${needId}/my-response-status`, { status });
    myResponseStatus = status;
    toast(status === 'completed' ? 'Marked done. The navigator has been told.' : 'The navigator knows you are on it.');
    renderPanel(currentNeed, true);
    renderNextCard();
    if (window.mpReapplyI18n) window.mpReapplyI18n();
  } catch (e) {
    buttons.forEach(b => { b.disabled = false; });
    toast(e.message, true);
  }
}

// ── Render sidebar panel based on need + user state
function renderPanel(need, alreadyResponded) {
  const panel = document.getElementById('panel-content');
  const role = currentUser?.role;
  const isNavigator = isConnector(currentUser) || role === 'admin';
  const isOwner = isNavigator && (need.navigator_org || role === 'admin');

  if (!currentUser) {
    panel.innerHTML = `
      <div style="text-align:center;padding:10px 0">
        <div style="font-size:32px;margin-bottom:10px">🤝</div>
        <div style="font-weight:700;font-size:14px;margin-bottom:6px">Want to respond?</div>
        <div style="color:var(--gray-600);font-size:13px;margin-bottom:16px">Log in to offer your support to this family.</div>
        <a href="login" style="display:block;background:var(--orange);color:white;font-size:14px;font-weight:700;padding:12px;border-radius:8px;text-align:center;text-decoration:none;">Log in to respond</a>
      </div>`;
    return;
  }

  if (need.status === 'pending') {
    panel.innerHTML = `<div style="text-align:center;padding:10px 0;color:var(--gray-400)"><div style="font-size:28px;margin-bottom:8px">⏳</div><div style="font-weight:600;font-size:13px">Awaiting Admin Approval</div><div style="font-size:12px;margin-top:6px">This need will be visible to responders once approved.</div></div>`;
    return;
  }

  if (need.status === 'fulfilled' || need.status === 'closed') {
    const fulfilled = need.status === 'fulfilled';
    const closedOn = need.fulfilled_at || need.closed_at;
    const rows = (need.items || []).map(i => `<div class="done-row"><span>${esc(i.label)}</span><span>${i.amount_received} of ${i.amount_needed} ${esc(i.unit)}</span></div>`).join('');
    panel.innerHTML = `<div class="done-summary">
      <div style="font-size:28px;text-align:center">${fulfilled ? '✅' : '🔒'}</div>
      <h3>${fulfilled ? 'This need was fulfilled' : 'This need is closed'}</h3>
      <div class="sub">${closedOn ? 'Closed ' + esc(new Date(closedOn).toLocaleDateString()) : 'Thank you to everyone who helped.'}</div>
      ${rows}
      ${need.outcome_note ? `<div class="done-note">"${esc(need.outcome_note)}"</div>` : ''}
    </div>`;
    return;
  }

  // Active need — role-specific panels
  if (role === 'responder') {
    if (alreadyResponded) {
      panel.innerHTML = `
        <div class="offer-card" style="border:1px solid var(--gray-200);border-radius:10px;padding:14px;margin-bottom:12px">
          <div class="offer-eyebrow">Your offer</div>
          <div style="font-weight:700;font-size:14px;margin-top:4px">You're responding</div>
          <div style="font-size:12px;color:var(--gray-600);margin-top:2px">Thank you for offering your support.</div>
          <span class="offer-badge${myResponseStatus !== 'offered' ? ' ok' : ''}" id="offer-badge">${myResponseStatus !== 'offered' ? 'Accepted' : 'Waiting for review'}</span>
        </div>
        ${myProgressHtml()}
        <div style="border:1px solid var(--gray-200);border-radius:10px;padding:14px;margin-bottom:12px">
          <div style="font-size:12px;font-weight:700;color:var(--gray-700);margin-bottom:10px">⏱ Log Volunteer Hours</div>
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
            <input id="hours-input" type="number" min="0.5" max="24" step="0.5" placeholder="Hours (e.g. 2.5)"
              style="flex:1;padding:8px 10px;border:1px solid var(--gray-200);border-radius:7px;font-size:13px;font-family:inherit" />
          </div>
          <input id="hours-note" type="text" placeholder="Note (optional)"
            style="width:100%;padding:8px 10px;border:1px solid var(--gray-200);border-radius:7px;font-size:13px;font-family:inherit;margin-bottom:8px;box-sizing:border-box" />
          <button data-action="logHoursForNeed"
            style="width:100%;height:36px;background:var(--teal);color:white;border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer">
            Save Hours
          </button>
          <div id="hours-total" style="margin-top:8px;font-size:11px;color:var(--gray-400);text-align:center"></div>
        </div>
        <div id="my-receipts"></div>
        <button data-action="withdrawResponse" style="width:100%;height:38px;border:1px solid #fca5a5;background:#fee2e2;color:#dc2626;font-size:13px;font-weight:600;border-radius:7px;cursor:pointer;">Withdraw My Response</button>`;
      loadMyReceipts();
    } else {
      const openItems = need.items.filter(i => i.amount_received < i.amount_needed);
      const HELP_TYPES = [
        { id: 'donate',    icon: '💰', label: 'Donate Money',   sub: 'Send funds directly via secure payment' },
        { id: 'goods',     icon: '📦', label: 'Buy / Ship Item', sub: 'Contribute a specific item they need' },
        { id: 'service',   icon: '⚖️', label: 'Offer a Service', sub: 'Legal, medical, translation, etc.' },
        { id: 'volunteer', icon: '⏰', label: 'Volunteer Time',  sub: 'Show up and help in person' },
      ];
      panel.innerHTML = `
        <div style="font-weight:700;font-size:14px;margin-bottom:4px">🤝 How do you want to help?</div>
        <div style="font-size:12px;color:var(--gray-600);margin-bottom:12px">Choose the type of support you can offer:</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
          ${HELP_TYPES.map(t => `
            <button data-action="selectHelpType" data-a0="${t.id}" id="ht-${t.id}"
              style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px;border:2px solid var(--gray-200);border-radius:10px;background:white;cursor:pointer;transition:all .15s;text-align:center">
              <span style="font-size:22px">${t.icon}</span>
              <span style="font-size:12px;font-weight:700;color:var(--text)">${t.label}</span>
              <span style="font-size:10px;color:var(--gray-600);line-height:1.3">${t.sub}</span>
            </button>`).join('')}
        </div>
        <div id="help-subpanel"></div>`;

      window._helpNeedOpenItems = openItems;
      window._helpNeedId = needId;
    }
    return;
  }

  // Navigator / admin: fulfill panel
  if (isNavigator) {
    panel.innerHTML = `
      <span style="display:block;font-weight:700;font-size:14px;margin-bottom:10px">Manage this need</span>
      <div style="font-size:12px;color:var(--gray-600);margin-bottom:10px">Response count: <strong>${need.response_count || 0}</strong></div>

      <span style="display:block;font-weight:600;font-size:13px;margin-bottom:8px">Responders</span>
      <div id="responders-list" style="margin-bottom:14px">
        <div style="font-size:12px;color:var(--gray-400)">Loading…</div>
      </div>

      <hr style="border:none;border-top:1px solid var(--gray-200);margin:12px 0">
      <span style="display:block;font-weight:600;font-size:13px;margin-bottom:8px">Edit Need</span>
      <button data-action="showEditModal" style="width:100%;height:34px;background:white;border:1px solid var(--gray-200);border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;color:var(--gray-700);margin-bottom:14px">✏️ Edit title and details</button>

      <hr style="border:none;border-top:1px solid var(--gray-200);margin:12px 0">
      <span style="display:block;font-weight:600;font-size:13px;margin-bottom:8px">Close this case</span>
      <textarea id="outcome-note" placeholder="Outcome note (optional)…" style="width:100%;height:70px;border:1px solid var(--gray-200);border-radius:7px;padding:8px;font-size:12px;font-family:Inter,sans-serif;resize:vertical;margin-bottom:10px"></textarea>
      <button data-action="fulfillNeed" style="width:100%;background:var(--green);color:white;font-size:13px;font-weight:700;padding:11px;border-radius:8px;border:none;cursor:pointer;">Mark fulfilled</button>`;
    loadResponders();
    return;
  }

  panel.innerHTML = `<div style="color:var(--gray-400);font-size:12px;text-align:center;padding:10px 0">Browse other <a href="requests">open needs</a>.</div>`;
}

// ── Render items grid
// Per-need wording follows delivery progress and the case stage
function itemStatus(met, partly, closed) {
  if (met) return { text: 'Delivered', cls: 'ok' };
  if (partly) return { text: 'Partly delivered', cls: '' };
  if (closed) return { text: 'Closed', cls: 'muted' };
  if (caseProgress.accepted) return { text: 'Awaiting delivery', cls: '' };
  if (caseProgress.responseCount > 0) return { text: 'Offer received', cls: '' };
  return { text: 'Needs a responder', cls: '' };
}

function renderItems(need) {
  if (!currentUser) { renderVisitorItems(need); return; }
  const grid = document.querySelector('.needs-grid');
  const badge = document.querySelector('.section-badge');
  if (!grid) return;
  setText(badge, `${need.items.length} Need${need.items.length!==1?'s':''}`);
  if (!need.items.length) { grid.innerHTML = '<div style="color:var(--gray-400);font-size:13px">No items listed.</div>'; return; }
  const closed = need.status === 'fulfilled' || need.status === 'closed';
  grid.innerHTML = need.items.map((item, idx) => {
    const pct = item.amount_needed > 0 ? Math.round(item.amount_received / item.amount_needed * 100) : 0;
    const met = pct >= 100;
    const pill = itemStatus(met, item.amount_received > 0, closed);
    return `
      <div class="need-item" style="${met?'opacity:.6':''}">
        <div class="need-num">${idx+1}</div>
        <div class="need-icon">${CATEGORY_EMOJI[need.category]||'📦'}</div>
        <div class="need-body">
          <div class="need-name">${esc(item.label)}</div>
          <div class="need-status"><span class="need-pill ${pill.cls}">${pill.text}</span></div>
          <div style="margin-top:6px;background:var(--gray-200);border-radius:3px;height:5px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${met?'var(--green)':'var(--teal)'};border-radius:3px;transition:width .5s"></div>
          </div>
          <div style="font-size:11px;color:var(--gray-400);margin-top:3px">${item.amount_received} / ${item.amount_needed} ${esc(item.unit)}</div>
        </div>
      </div>`;
  }).join('');
}

// ── Help type picker
let selectedHelpType = 'goods';
function selectHelpType(type) {
  selectedHelpType = type;
  // Highlight selected card
  ['donate','goods','service','volunteer'].forEach(t => {
    const btn = document.getElementById(`ht-${t}`);
    if (!btn) return;
    if (t === type) { btn.style.borderColor = 'var(--teal)'; btn.style.background = 'var(--teal-lt)'; }
    else { btn.style.borderColor = 'var(--gray-200)'; btn.style.background = 'white'; }
  });
  const sub = document.getElementById('help-subpanel');
  if (!sub) return;
  const openItems = window._helpNeedOpenItems || [];

  if (type === 'donate') {
    sub.innerHTML = `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin-bottom:10px;font-size:12px;color:#15803d">
        💳 Choose an amount below and you'll be taken to our secure checkout. Funds go into escrow and the navigator can request disbursement.
      </div>
      <button type="button" data-action="goToDonateCard"
        style="display:block;width:100%;background:var(--orange);color:white;font-size:14px;font-weight:700;padding:13px;border-radius:8px;text-align:center;border:none;cursor:pointer;">
        Choose an amount →
      </button>`;
  } else if (type === 'goods') {
    sub.innerHTML = `
      <div style="font-size:12px;color:var(--gray-600);margin-bottom:8px">Select items you can provide:</div>
      <div id="item-checks" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
        ${openItems.length ? openItems.map(i => `
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;padding:8px;border:1px solid var(--gray-200);border-radius:7px">
            <input type="checkbox" value="${i.id}" style="accent-color:var(--teal);width:15px;height:15px">
            <span>${i.label} <span style="color:var(--gray-400)">(${i.amount_received}/${i.amount_needed} ${i.unit})</span></span>
          </label>`).join('') : '<div style="color:var(--gray-400);font-size:12px">All items are covered — consider donating instead!</div>'}
      </div>
      <textarea id="respond-msg" placeholder="Optional message to navigator…" style="width:100%;height:60px;border:1px solid var(--gray-200);border-radius:7px;padding:8px;font-size:12px;font-family:Inter,sans-serif;resize:vertical;margin-bottom:10px"></textarea>
      <button data-role="submit-response" data-action="submitResponse" style="width:100%;background:var(--orange);color:white;font-size:14px;font-weight:700;padding:13px;border-radius:8px;border:none;cursor:pointer;">Yes, I Can Help!</button>`;
  } else if (type === 'service') {
    sub.innerHTML = `
      <div style="font-size:12px;color:var(--gray-600);margin-bottom:8px">Describe the service you can offer:</div>
      <textarea id="respond-msg" placeholder="e.g. I can provide free legal consultation, translation in Spanish, or medical advice…" style="width:100%;height:90px;border:1px solid var(--gray-200);border-radius:7px;padding:8px;font-size:12px;font-family:Inter,sans-serif;resize:vertical;margin-bottom:10px"></textarea>
      <button data-role="submit-response" data-action="submitResponse" style="width:100%;background:var(--teal);color:white;font-size:14px;font-weight:700;padding:13px;border-radius:8px;border:none;cursor:pointer;">Offer My Service</button>`;
  } else if (type === 'volunteer') {
    sub.innerHTML = `
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;margin-bottom:10px;font-size:12px;color:#1d4ed8">
        ⏰ Volunteer shifts are coordinated through the app. Submit your offer and the navigator will reach out with details.
      </div>
      <textarea id="respond-msg" placeholder="When are you available? Any skills to mention?" style="width:100%;height:70px;border:1px solid var(--gray-200);border-radius:7px;padding:8px;font-size:12px;font-family:Inter,sans-serif;resize:vertical;margin-bottom:10px"></textarea>
      <button data-role="submit-response" data-action="submitResponse" style="width:100%;background:#7c3aed;color:white;font-size:14px;font-weight:700;padding:13px;border-radius:8px;border:none;cursor:pointer;">Sign Up to Volunteer</button>`;
  }
}

// ── Submit response
async function submitResponse() {
  const btn = document.querySelector('[data-role="submit-response"]');
  const origText = btn?.textContent;
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }
  const checkedIds = [...document.querySelectorAll('#item-checks input:checked')].map(c => c.value);
  const msg = document.getElementById('respond-msg')?.value.trim() || '';
  try {
    await apiPost(`/needs/${needId}/respond`, { item_ids: checkedIds, message: msg, help_type: selectedHelpType });
    toast('Response submitted! The navigator will be notified.');
    renderPanel(currentNeed, true);
  } catch(e) {
    toast(e.message, true);
    if (btn) { btn.disabled = false; btn.textContent = origText; }
  }
}

// ── Bookmark toggle
let _bookmarked = false;
function setBookmarkUI(on) {
  _bookmarked = on;
  document.getElementById('bookmark-icon').style.fill = on ? '#009DA5' : 'none';
  document.getElementById('bookmark-icon').style.stroke = on ? '#009DA5' : 'currentColor';
  document.getElementById('bookmark-label').textContent = on ? 'Bookmarked' : 'Bookmark';
}
async function toggleBookmark() {
  try {
    if (_bookmarked) {
      await apiDelete(`/needs/${needId}/bookmark`);
      setBookmarkUI(false);
    } else {
      await apiPost(`/needs/${needId}/bookmark`, {});
      setBookmarkUI(true);
    }
  } catch(e) { toast(e.message, true); }
}
async function initBookmarkState() {
  try {
    const bookmarked = await apiGet('/needs/bookmarked');
    setBookmarkUI(bookmarked.some(n => n.id === needId));
  } catch(e) { console.error('initBookmarkState failed:', e); }
}

// ── Load responders (navigator/admin only)
async function loadResponders() {
  const el = document.getElementById('responders-list');
  if (!el) return;
  try {
    const list = await apiGet(`/needs/${needId}/responses`);
    renderStepper({
      responseCount: list.length,
      accepted: list.some(r => r.response_id && r.status && r.status !== 'offered'),
      acceptedName: (list.find(r => r.response_id && r.status && r.status !== 'offered') || {}).name || ''
    });
    if (!list.length) {
      el.innerHTML = `<p class="waiting-note">Waiting for responders. Share this need to reach more people.<br>
        <button type="button" data-action="shareNeed">Share this need</button><button type="button" data-action="showQrModal">Print QR</button></p>`;
      return;
    }
    const HELP_LABEL = { donate: '💰 Donated', goods: '📦 Goods', service: '⚖️ Service', volunteer: '⏰ Volunteer' };
    const STATUS_COLOR = { committed: '#92400E', delivered: '#1D4ED8', confirmed: '#15803D' };
    const STATUS_BG    = { committed: '#FEF3C7', delivered: '#DBEAFE', confirmed: '#DCFCE7' };

    // Fetch existing ratings (navigator/admin only, non-fatal)
    let existingRatings = {};
    const canRate = isConnector(currentUser) || currentUser?.role === 'admin';
    if (canRate) {
      try {
        const ratingsData = await apiGet(`/ratings/need/${needId}`);
        ratingsData.forEach(r => { existingRatings[r.responder_id] = r; });
      } catch(e) { /* non-fatal */ }
    }

    // Receipts recorded against accepted responders (non-fatal)
    const receiptsByResponse = {};
    try {
      (await apiGet(`/needs/${needId}/receipts`)).forEach(rc => {
        (receiptsByResponse[rc.response_id] = receiptsByResponse[rc.response_id] || []).push(rc);
      });
    } catch(e) { /* non-fatal */ }

    // Service offers grouped at top
    const serviceOffers = list.filter(r => r.help_type === 'service');
    const serviceSection = serviceOffers.length ? `
      <div style="margin-bottom:12px">
        <div style="font-size:11px;font-weight:700;color:#7C3AED;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">⚖️ Service Offers (${serviceOffers.length})</div>
        ${serviceOffers.map(r => `
          <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:8px;margin-bottom:6px">
            <div style="flex:1">
              <div style="font-weight:700;font-size:13px">${esc(r.name)}</div>
              <div style="font-size:11px;color:#6B7280">${esc([r.responder_type, r.org_name, [r.city,r.state].filter(Boolean).join(', ')].filter(Boolean).join(' · '))}</div>
              ${r.message ? `<div style="font-size:12px;color:#374151;margin-top:2px;font-style:italic">"${esc(r.message)}"</div>` : ''}
            </div>
            <button data-action="requestProvider" data-a0="${r.id}"
              style="flex-shrink:0;background:#7C3AED;color:#fff;font-size:11px;font-weight:700;padding:6px 12px;border:none;border-radius:8px;cursor:pointer">
              📩 Request
            </button>
          </div>`).join('')}
      </div>
      ${list.filter(r => r.help_type !== 'service').length ? '<div style="font-size:11px;font-weight:700;color:var(--gray-600);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">All Responders</div>' : ''}
    ` : '';

    el.innerHTML = serviceSection + (list.filter(r => r.help_type !== 'service').map(r => `
      <div style="padding:10px 0;border-bottom:1px solid var(--gray-200)">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-weight:700;font-size:13px">${esc(r.name)}</div>
            <div style="font-size:11px;color:var(--gray-600)">${esc([r.responder_type, r.org_name, [r.city,r.state].filter(Boolean).join(', ')].filter(Boolean).join(' · '))}</div>
          </div>
          ${r.help_type ? `<span style="font-size:10px;font-weight:700;padding:2px 8px;background:#EFF6FF;color:#1D4ED8;border-radius:10px">${esc(HELP_LABEL[r.help_type]||r.help_type)}</span>` : ''}
        </div>
        ${r.message ? `<div style="font-size:12px;color:var(--gray-700);margin-top:3px;font-style:italic">"${esc(r.message)}"</div>` : ''}
        ${r.response_id ? (r.status === 'offered'
          ? `<button data-action="acceptResponse" data-a0="${esc(r.response_id)}" style="margin-top:8px;background:#16a34a;color:#fff;font-size:12px;font-weight:700;padding:6px 14px;border:none;border-radius:7px;cursor:pointer">Accept offer and open chat</button>`
          : `<span style="display:block;margin-top:8px;font-size:11px;font-weight:700;color:#15803D">${r.status === 'completed' ? 'Their part is complete.' : 'Accepted. Arrange details in the chat below.'}</span>${receiptBlock(r, receiptsByResponse[r.response_id] || [])}`) : ''}
        ${r.items && r.items.length ? `
          <div style="margin-top:8px;display:flex;flex-direction:column;gap:5px">
            ${r.items.map(ri => `
              <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:#F9FAFB;border-radius:7px">
                <span style="flex:1;font-size:12px;font-weight:600">${esc(ri.label)}</span>
                ${ri.tracking_info ? `<span style="font-size:10px;color:var(--gray-400)">📦 ${esc(ri.tracking_info)}</span>` : ''}
                <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;background:${STATUS_BG[ri.delivery_status]||'#F3F4F6'};color:${STATUS_COLOR[ri.delivery_status]||'#555'}">${esc(ri.delivery_status)}</span>
                ${ri.delivery_status === 'delivered' ? `<button data-action="confirmItemReceipt" data-a0="${ri.response_item_id}" style="font-size:10px;font-weight:700;padding:3px 9px;background:#16a34a;color:#fff;border:none;border-radius:6px;cursor:pointer">✓ Confirm</button>` : ''}
              </div>`).join('')}
          </div>` : ''}
        ${canRate && r.response_id && r.status && r.status !== 'offered' ? (() => {
          const rated = existingRatings[r.id];
          const currentStars = rated ? rated.stars : 0;
          return `
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid #F3F4F6">
            <div style="font-size:11px;font-weight:700;color:var(--gray-600);margin-bottom:5px">${rated ? '⭐ Your rating' : 'Rate this responder'}</div>
            <div style="display:flex;gap:2px;margin-bottom:6px">
              ${[1,2,3,4,5].map(n => `<button data-action="setRatingStar" data-a0="${r.id}" data-n1="${n}" id="star-${r.id}-${n}" style="background:none;border:none;cursor:pointer;font-size:22px;padding:0;line-height:1">${currentStars >= n ? '⭐' : '☆'}</button>`).join('')}
            </div>
            <textarea id="note-${esc(r.id)}" placeholder="Optional note about this responder…" style="width:100%;font-size:12px;padding:6px 8px;border:1px solid var(--gray-200);border-radius:7px;resize:none;height:48px;font-family:inherit">${esc(rated?.note || '')}</textarea>
            <button data-action="submitRating" data-a0="${r.id}" style="margin-top:6px;background:var(--teal);color:#fff;font-size:12px;font-weight:700;padding:6px 14px;border:none;border-radius:7px;cursor:pointer">${rated ? 'Update Rating' : 'Save Rating'}</button>
          </div>`;
        })() : canRate ? `
          <div class="rate-locked" style="margin-top:10px;padding-top:10px;border-top:1px solid #F3F4F6">
            <div style="font-size:11px;font-weight:700;color:var(--gray-600)">Rate this responder</div>
            <div class="stars-off" aria-hidden="true"><span>☆</span><span>☆</span><span>☆</span><span>☆</span><span>☆</span></div>
            <div class="hint">Opens once you accept this offer.</div>
          </div>` : ''}
      </div>`).join(''));
    if (window.mpReapplyI18n) window.mpReapplyI18n();
  } catch(e) {
    const notOwner = isConnector(currentUser) && currentNeed && currentNeed.navigator_id !== currentUser.id;
    el.innerHTML = `<div style="font-size:12px;color:var(--gray-400)">${notOwner ? 'Only the navigator who posted this need can manage its responders.' : 'Could not load responders.'}</div>`;
  }
}

function receiptRows(receipts, canRemove) {
  return receipts.map(rc => {
    const qty = rc.quantity != null ? ` (${esc(String(rc.quantity))}${rc.unit ? ' ' + esc(rc.unit) : ''})` : (rc.unit ? ` (${esc(rc.unit)})` : '');
    const when = esc(String(rc.received_at).slice(0, 10));
    const remove = canRemove ? ` <button data-action="removeReceipt" data-a0="${esc(rc.id)}" style="font-size:10px;color:#dc2626;background:none;border:none;cursor:pointer;text-decoration:underline">Remove</button>` : '';
    const forItem = rc.item_label ? ` <span style="color:var(--gray-500)">for ${esc(rc.item_label)}</span>` : '';
    return `<div style="font-size:12px;color:var(--gray-700);padding:3px 0">${when}: ${esc(rc.description)}${qty}${forItem}${remove}</div>`;
  }).join('');
}

function receiptBlock(r, receipts) {
  const rid = esc(r.response_id);
  const rows = receiptRows(receipts, true);
  const items = (currentNeed && currentNeed.items) || [];
  const itemPicker = items.length ? `
      <select id="rc-item-${rid}" aria-label="For which need?" style="width:100%;font-size:12px;padding:6px 8px;border:1px solid var(--gray-200);border-radius:7px;font-family:inherit;margin-bottom:5px;background:#fff">
        <option value="">For which need? (optional)</option>
        ${items.map(i => `<option value="${esc(i.id)}">${esc(i.label)} (${esc(String(i.amount_received || 0))} of ${esc(String(i.amount_needed))} ${esc(i.unit || '')})</option>`).join('')}
      </select>` : '';
  const form = r.status === 'completed' ? '' : `
    <div style="margin-top:8px;padding:8px 10px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px">
      <span style="display:block;font-size:11px;font-weight:700;color:#15803D;margin-bottom:5px">Record what arrived</span>
      <input id="rc-desc-${rid}" maxlength="500" placeholder="What did you receive?" style="width:100%;font-size:12px;padding:6px 8px;border:1px solid var(--gray-200);border-radius:7px;font-family:inherit;margin-bottom:5px">${itemPicker}
      <div style="display:flex;gap:6px;margin-bottom:5px">
        <input id="rc-qty-${rid}" type="number" min="0" step="any" placeholder="Quantity" style="width:50%;font-size:12px;padding:6px 8px;border:1px solid var(--gray-200);border-radius:7px;font-family:inherit">
        <input id="rc-unit-${rid}" maxlength="40" placeholder="Unit (bags, hours, USD)" style="width:50%;font-size:12px;padding:6px 8px;border:1px solid var(--gray-200);border-radius:7px;font-family:inherit">
      </div>
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--gray-700);margin-bottom:6px"><input id="rc-done-${rid}" type="checkbox"> This completes their part</label>
      <button data-action="submitReceipt" data-a0="${rid}" style="background:#16a34a;color:#fff;font-size:12px;font-weight:700;padding:6px 14px;border:none;border-radius:7px;cursor:pointer">Save</button>
    </div>`;
  return (rows ? `<div style="margin-top:8px"><span style="display:block;font-size:11px;font-weight:700;color:var(--gray-600);text-transform:uppercase;letter-spacing:.05em">Received</span>${rows}</div>` : '') + form;
}

async function refreshItems() {
  try {
    const need = await apiGet(`/needs/${needId}`);
    currentNeed = { ...currentNeed, items: need.items };
    renderItems(currentNeed);
  } catch (e) { /* progress bars refresh on next page load */ }
}

async function removeReceipt(receiptId) {
  if (!await showConfirmModal({ title: 'Remove Record', message: 'Remove this record of what arrived?', confirmText: 'Remove', danger: true })) return;
  try {
    await apiDelete(`/needs/${needId}/receipts/${receiptId}`);
    toast('Record removed.');
    loadResponders();
    refreshItems();
  } catch(e) { toast(e.message || 'Could not remove', true); }
}

async function loadMyReceipts() {
  const el = document.getElementById('my-receipts');
  if (!el) return;
  try {
    const mine = await apiGet(`/needs/${needId}/receipts`);
    renderStepper({ accepted: true }); // receipts only open once the offer is accepted
    el.innerHTML = mine.length
      ? `<div style="border:1px solid var(--gray-200);border-radius:10px;padding:12px;margin-bottom:12px"><span style="display:block;font-size:12px;font-weight:700;color:var(--gray-700);margin-bottom:6px">Received</span>${receiptRows(mine, false)}</div>`
      : '';
    if (window.mpReapplyI18n) window.mpReapplyI18n();
  } catch(e) { el.innerHTML = ''; /* not accepted yet: nothing to show */ }
}

async function submitReceipt(responseId) {
  const description = document.getElementById(`rc-desc-${responseId}`).value.trim();
  if (!description) { toast('Describe what arrived.', true); return; }
  const qtyRaw = document.getElementById(`rc-qty-${responseId}`).value;
  const unit = document.getElementById(`rc-unit-${responseId}`).value.trim();
  const itemId = document.getElementById(`rc-item-${responseId}`)?.value || null;
  const body = {
    description,
    item_id: itemId,
    quantity: qtyRaw === '' ? null : Number(qtyRaw),
    unit: unit || null,
    complete: document.getElementById(`rc-done-${responseId}`).checked,
  };
  try {
    await apiPost(`/needs/${needId}/responses/${responseId}/receipts`, body);
    toast('Recorded. The responder has been thanked.');
    loadResponders();
    refreshItems();
  } catch(e) { toast(e.message || 'Could not record', true); }
}

async function acceptResponse(responseId) {
  try {
    await apiPatch(`/needs/${needId}/responses/${responseId}/accept`, {});
    toast('Offer accepted. The responder has been notified.');
    loadResponders();
    loadThreads().then(loadChat);
  } catch(e) { toast(e.message || 'Could not accept offer', true); }
}

async function requestProvider(responderId) {
  try {
    await apiPost(`/needs/${needId}/request-provider/${responderId}`, {});
    toast('Provider notified! They will reach out via Chat.');
  } catch(e) { toast(e.message || 'Could not send request', true); }
}

async function confirmItemReceipt(responseItemId) {
  try {
    await apiPost(`/needs/${needId}/response-items/${responseItemId}/confirm`, {});
    toast('Receipt confirmed! Responder has been notified.');
    loadResponders();
  } catch(e) { toast(e.message || 'Error confirming receipt', true); }
}

// ── Need Photos
async function loadPhotos(need) {
  const el = document.getElementById('photos-section');
  if (!el || !currentUser) return;
  try {
    const photos = await apiGet(`/needs/${needId}/photos`);
    const isOwner = isConnector(currentUser) && need.navigator_id === currentUser.id;
    const canUpload = isOwner || currentUser.role === 'admin';

    const strip = photos.length ? `
      <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:${canUpload?'10px':'0'}">
        ${photos.map(p => `
          <div style="position:relative;flex-shrink:0">
            <img src="${escUrl(p.url)}" data-photo-url="${escUrl(p.url)}" class="js-photo-img" style="width:110px;height:82px;object-fit:cover;border-radius:8px;cursor:pointer" />
            ${canUpload ? `<button data-photo-id="${esc(p.id)}" class="js-photo-delete" title="Remove"
              style="position:absolute;top:3px;right:3px;background:rgba(0,0,0,.55);color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:13px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center">×</button>` : ''}
          </div>`).join('')}
      </div>` : '';

    const uploadBtn = canUpload && photos.length < 5 ? `
      <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;font-weight:700;color:var(--teal);border:1.5px dashed var(--teal);padding:6px 14px;border-radius:8px">
        📷 Add Photo
        <input type="file" accept="image/*" style="display:none" data-change="uploadPhoto" data-args="[{&quot;$&quot;:&quot;this&quot;}]" />
      </label>
      <span id="photo-uploading" style="display:none;font-size:12px;color:var(--gray-400);margin-left:8px">Uploading…</span>` : '';

    el.innerHTML = strip + uploadBtn;
    el.querySelectorAll('.js-photo-img').forEach(img => img.addEventListener('click', () => window.open(img.dataset.photoUrl, '_blank', 'noopener')));
    el.querySelectorAll('.js-photo-delete').forEach(btn => btn.addEventListener('click', () => deletePhoto(btn.dataset.photoId)));
  } catch(e) { /* non-fatal */ }
}

async function uploadPhoto(input) {
  const file = input.files?.[0];
  if (!file) return;
  document.getElementById('photo-uploading').style.display = 'inline';
  try {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API}/needs/${needId}/photos`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    if (!res.ok) throw new Error('Upload failed');
    toast('Photo added!');
    loadPhotos(currentNeed);
  } catch(e) {
    toast(e.message || 'Upload failed', true);
  } finally {
    document.getElementById('photo-uploading').style.display = 'none';
    input.value = '';
  }
}

async function deletePhoto(photoId) {
  if (!await showConfirmModal({ title: 'Remove Photo', message: 'This photo will be permanently removed.', confirmText: 'Remove', danger: true })) return;
  try {
    const res = await fetch(`${API}/needs/${needId}/photos/${photoId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok && res.status !== 204) throw new Error('Delete failed');
    toast('Photo removed.');
    loadPhotos(currentNeed);
  } catch(e) { toast('Could not remove photo', true); }
}

// ── Volunteer Shifts
async function loadShifts() {
  const el = document.getElementById('shifts-section');
  if (!el || !needId || !currentUser) return;
  try {
    const shifts = await apiGet(`/shifts?need_id=${needId}`);
    if (!shifts.length) { el.innerHTML = ''; return; }
    const isResponder = currentUser.role === 'responder';
    el.innerHTML = `
      <div style="font-size:13px;font-weight:700;color:var(--gray-700);margin-bottom:8px;display:flex;align-items:center;gap:6px">
        📅 Volunteer Shifts
      </div>
      ${shifts.map(s => {
        const full = s.slots_filled >= s.slots_total;
        const slotColor = full ? '#DC2626' : '#10B981';
        const slotBg = full ? '#FEE2E2' : '#D1FAE5';
        return `
          <div style="border:1px solid var(--gray-200);border-radius:10px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:700;margin-bottom:2px">${esc(s.title)}</div>
              <div style="font-size:11px;color:var(--gray-600);margin-bottom:4px">${s.date} · ${s.start_time}–${s.end_time}${s.location ? ' · 📍 ' + s.location : ''}</div>
              <span style="font-size:11px;font-weight:700;color:${slotColor};background:${slotBg};padding:2px 8px;border-radius:10px">
                ${s.slots_filled}/${s.slots_total} slots filled
              </span>
              ${s.signed_up ? '<span style="font-size:11px;font-weight:700;color:#1D4ED8;background:#DBEAFE;padding:2px 8px;border-radius:10px;margin-left:6px">✓ Signed up</span>' : ''}
            </div>
            ${isResponder ? `<button data-action="claimShift" data-a0="${s.id}" data-n1="${s.signed_up}"
              style="padding:6px 14px;border:none;border-radius:7px;font-size:12px;font-weight:700;color:white;background:${s.signed_up ? '#EF4444' : full ? '#9CA3AF' : 'var(--teal)'};cursor:${full && !s.signed_up ? 'not-allowed' : 'pointer'}"
              ${full && !s.signed_up ? 'disabled' : ''}>${s.signed_up ? 'Drop' : full ? 'Full' : 'Join'}</button>` : ''}
          </div>`;
      }).join('')}`;
  } catch(e) { /* silently ignore if no shifts */ }
}

async function claimShift(shiftId, isSignedUp) {
  try {
    if (isSignedUp) {
      await fetch(`${API}/shifts/${shiftId}/signup`, { method: 'DELETE', credentials: 'include' });
    } else {
      await fetch(`${API}/shifts/${shiftId}/signup`, { method: 'POST', credentials: 'include' });
    }
    toast(isSignedUp ? 'Dropped from shift.' : 'Joined shift!');
    loadShifts();
  } catch(e) { toast('Could not update shift.', true); }
}

// ── Ratings
const _pendingStars = {};

function setRatingStar(responderId, n) {
  _pendingStars[responderId] = n;
  for (let i = 1; i <= 5; i++) {
    const btn = document.getElementById(`star-${responderId}-${i}`);
    if (btn) btn.textContent = i <= n ? '⭐' : '☆';
  }
}

async function submitRating(responderId) {
  const stars = _pendingStars[responderId];
  if (!stars) { toast('Please select a star rating first.', true); return; }
  const note = document.getElementById(`note-${responderId}`)?.value?.trim() || undefined;
  try {
    await apiPost('/ratings', { need_id: needId, responder_id: responderId, stars, note });
    toast('Rating saved!');
    loadResponders();
  } catch(e) { toast(e.message || 'Could not save rating', true); }
}

// ── Log volunteer hours
async function logHoursForNeed() {
  const hours = parseFloat(document.getElementById('hours-input').value);
  const note = document.getElementById('hours-note').value.trim();
  if (!hours || hours <= 0) { toast('Enter a valid number of hours.', true); return; }
  try {
    await apiPost('/hours', { hours, need_id: needId, note: note || null });
    document.getElementById('hours-input').value = '';
    document.getElementById('hours-note').value = '';
    toast('Hours logged!');
    const summary = await apiGet('/hours/mine/summary');
    document.getElementById('hours-total').textContent = `Your total: ${summary.total_hours} hrs across ${summary.entry_count} entries`;
  } catch(e) { toast(e.message, true); }
}

// ── Withdraw response
async function withdrawResponse() {
  if (!await showConfirmModal({ title: 'Withdraw Response', message: 'Are you sure you want to withdraw your response from this need?', confirmText: 'Withdraw', danger: true })) return;
  try {
    await apiDelete(`/needs/${needId}/respond`);
    toast('Response withdrawn.');
    renderPanel(currentNeed, false);
  } catch(e) { toast(e.message, true); }
}

// ── Edit need (navigator only)
function showEditModal() {
  if (!currentNeed) return;
  document.getElementById('edit-title').value = currentNeed.title || '';
  document.getElementById('edit-desc').value = currentNeed.description || '';
  document.getElementById('edit-category').value = currentNeed.category || '';
  document.getElementById('edit-urgency').value = currentNeed.urgency || '';
  document.getElementById('edit-need-modal').style.display = 'flex';
}

async function saveEditNeed() {
  const payload = {};
  const title = document.getElementById('edit-title').value.trim();
  const desc = document.getElementById('edit-desc').value.trim();
  const cat = document.getElementById('edit-category').value;
  const urg = document.getElementById('edit-urgency').value;
  if (title) payload.title = title;
  if (desc) payload.description = desc;
  if (cat) payload.category = cat;
  if (urg) payload.urgency = urg;
  if (!Object.keys(payload).length) { document.getElementById('edit-need-modal').style.display = 'none'; return; }
  try {
    await apiPatch(`/needs/${needId}`, payload);
    toast('Need updated.');
    document.getElementById('edit-need-modal').style.display = 'none';
    const need = await apiGet('/needs/' + needId);
    currentNeed = need;
    document.querySelector('.req-title').textContent = need.title || '';
    const storyText = document.querySelector('.story-text');
    if (storyText && need.description) storyText.textContent = need.description;
  } catch(e) { toast(e.message, true); }
}

// ── Fulfill need
async function fulfillNeed() {
  const note = document.getElementById('outcome-note')?.value.trim() || '';
  if (!await showConfirmModal({ title: 'Mark as Fulfilled', message: 'This will mark the need as fulfilled and notify all parties.', confirmText: 'Mark Fulfilled', danger: false })) return;
  try {
    await apiPatch(`/needs/${needId}/fulfill`, { outcome_note: note });
    toast('Marked as fulfilled!');
    currentNeed.status = 'fulfilled';
    currentNeed.outcome_note = note;
    renderPanel(currentNeed, false);
    renderStepper({ status: 'fulfilled' }); // steps, chips and "Your next step" card
  } catch(e) { toast(e.message, true); }
}

// ── Chat
let chatPollTimer = null;
let lastMsgCount = 0;

function timeAgo(s) {
  const d = (Date.now() - new Date(s)) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return Math.floor(d/60) + 'm ago';
  if (d < 86400) return Math.floor(d/3600) + 'h ago';
  return Math.floor(d/86400) + 'd ago';
}

function renderChat(msgs) {
  const el = document.getElementById('chat-messages');
  if (!msgs.length) { el.innerHTML = '<div style="color:var(--gray-400);font-size:12px;text-align:center;padding:16px 0">No messages yet. Say hello!</div>'; return; }
  el.innerHTML = msgs.map(m => {
    const mine = currentUser && m.sender_id === currentUser.id;
    return `<div class="chat-msg">
      <div class="chat-meta ${mine?'mine':''}">${mine?'You':m.sender_name} · ${(m.sender_role === 'navigator' || m.sender_role === 'connector') ? 'navigator' : m.sender_role}</div>
      <div class="chat-bubble ${mine?'mine':'theirs'}">${m.text.replace(/</g,'&lt;')}</div>
      <div class="chat-meta ${mine?'mine':''}">${timeAgo(m.created_at)}</div>
    </div>`;
  }).join('');
  if (msgs.length !== lastMsgCount) { el.scrollTop = el.scrollHeight; lastMsgCount = msgs.length; }
}

// Submitter/admin: one chat thread per accepted responder
async function loadThreads() {
  const sel = document.getElementById('chat-thread');
  if (!sel || !currentUser || currentUser.role === 'responder') return;
  try {
    const list = await apiGet(`/needs/${needId}/responses`);
    const accepted = list.filter(r => r.response_id && r.status && r.status !== 'offered');
    const chosen = sel.value;
    if (accepted.length < 2) { sel.style.display = 'none'; sel.innerHTML = ''; return; }
    sel.innerHTML = '<option value="">Choose a responder…</option>' +
      accepted.map(r => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('');
    sel.value = accepted.some(r => r.id === chosen) ? chosen : '';
    sel.style.display = '';
  } catch(e) { /* not staff for this need: keep the single shared view */ }
}

function selectedThread() {
  const sel = document.getElementById('chat-thread');
  return sel && sel.style.display !== 'none' ? sel.value : '';
}

async function loadChat() {
  if (!needId || !currentUser) return;
  try {
    const thread = selectedThread();
    const msgs = await apiGet(`/chat/${needId}${thread ? `?responder_id=${encodeURIComponent(thread)}` : ''}`);
    renderChat(msgs);
  } catch(e) { console.error('loadChat failed:', e); }
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  const sel = document.getElementById('chat-thread');
  const multi = sel && sel.style.display !== 'none';
  if (multi && !sel.value) { toast('Choose which responder to message first.', true); return; }
  input.value = '';
  try {
    await apiPost(`/chat/${needId}`, multi ? { text, responder_id: sel.value } : { text });
    loadChat();
  } catch(e) { toast(e.message, true); input.value = text; }
}

// Drop-off site = the submitting org. The API only answers for the submitter and the accepted responder.
async function loadDropoff() {
  const box = document.getElementById('dropoff-site');
  if (!box || !needId) return;
  let site;
  try {
    site = await apiGet(`/needs/${needId}/dropoff`);
  } catch (e) {
    box.style.display = 'none'; // 403 until an offer is accepted
    return;
  }
  if (!site.org_name) { box.style.display = 'none'; return; }
  const place = [site.city, site.state].filter(Boolean).join(', ');
  const where = site.address
    ? esc(site.address)
    : (place ? esc(place) + ' · ' : '') + 'Ask in the chat for the address.';
  box.innerHTML = `
    <div class="dropoff-label">Drop-off site</div>
    <div class="dropoff-name">${esc(site.org_name)}</div>
    <div class="dropoff-line">${where}</div>
    ${site.hours ? `<div class="dropoff-line">${esc(site.hours)}</div>` : ''}
    ${site.notes ? `<div class="dropoff-line">${esc(site.notes)}</div>` : ''}`;
  box.style.display = '';
  if (window.mpReapplyI18n) window.mpReapplyI18n();
}

function initChat(isAuthorized) {
  const card = document.getElementById('chat-card');
  if (!isAuthorized || !needId) return;
  card.style.display = '';
  const open = currentNeed && currentNeed.status === 'active';
  card.classList.toggle('next-step', !!open);
  loadThreads().then(loadChat);
  loadDropoff();
  chatPollTimer = setInterval(loadChat, 10000);
}

// ── Donations
let selectedAmtCents = 2500;

function selectAmt(btn, cents) {
  document.querySelectorAll('.amt-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedAmtCents = cents;
}

async function loadDonationTotal() {
  if (!needId) return;
  try {
    // Use balance endpoint for full picture: donated, disbursed, available
    const b = await apiGet(`/disbursements/need/${needId}/balance`);
    const el = document.getElementById('donate-total');
    if (el) {
      el.textContent = b.total_donated_usd > 0
        ? `$${b.total_donated_usd.toFixed(2)} donated`
        : 'Be the first to donate!';
    }
    // Progress bar (donated vs. a goal if we can infer it)
    if (b.total_donated_usd > 0) {
      const wrap = document.getElementById('donate-progress-wrap');
      if (wrap) wrap.style.display = '';
      const label = document.getElementById('donate-progress-label');
      if (label) label.textContent = `$${b.total_donated_usd.toFixed(2)} raised`;
      const disbLabel = document.getElementById('donate-disbursed-label');
      if (disbLabel && b.total_disbursed_usd > 0) {
        disbLabel.style.display = '';
        disbLabel.textContent = `✅ $${b.total_disbursed_usd.toFixed(2)} already delivered to family`;
      }
      // progress: disbursed / donated (shows how much of collected money has reached family)
      const pct = b.total_donated_usd > 0 ? Math.min(100, Math.round(b.total_disbursed_usd / b.total_donated_usd * 100)) : 0;
      const bar = document.getElementById('donate-progress-bar');
      if (bar) setTimeout(() => bar.style.width = pct + '%', 100);
      const pctEl = document.getElementById('donate-progress-pct');
      if (pctEl) pctEl.textContent = pct + '% delivered';
    }
  } catch(e) {
    // fall back to simple total
    try {
      const d = await apiGet(`/donations/need/${needId}/total`);
      const el = document.getElementById('donate-total');
      if (el) el.textContent = d.total_usd > 0 ? `$${d.total_usd.toFixed(2)} donated so far` : 'Be the first to donate!';
    } catch {}
  }
}

// ── Navigator funds panel
let selectedFundsCents = 0;
function selectFundsAmt(btn, cents) {
  document.querySelectorAll('.funds-btn').forEach(b => b.style.background = '');
  btn.style.background = 'var(--teal)';
  btn.style.color = 'white';
  selectedFundsCents = cents;
  document.getElementById('funds-custom-amt').value = '';
}

async function loadNavigatorFundsPanel(need) {
  if (!currentUser || currentUser.id !== need.navigator_id) return;
  const card = document.getElementById('navigator-funds-card');
  if (card) card.style.display = '';
  try {
    const b = await apiGet(`/disbursements/need/${needId}/balance`);
    const balEl = document.getElementById('funds-balance');
    if (balEl) balEl.textContent = `$${b.total_donated_usd.toFixed(2)} donated · $${b.available_usd.toFixed(2)} available`;
    const availBox = document.getElementById('funds-available-box');
    const availAmt = document.getElementById('funds-available-amt');
    const reqBtn = document.getElementById('funds-request-btn');
    if (b.available_usd > 0) {
      if (availBox) availBox.style.display = '';
      if (availAmt) availAmt.textContent = `$${b.available_usd.toFixed(2)}`;
      if (reqBtn) reqBtn.style.display = '';
    }
    // Load disbursement history
    const hist = await apiGet(`/disbursements/need/${needId}`);
    const histEl = document.getElementById('funds-history');
    if (histEl && hist.length) {
      const STATUS_ICON = { requested:'⏳', sent:'📬', confirmed:'✅', rejected:'❌' };
      histEl.innerHTML = `<div style="font-size:11px;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Disbursement History</div>` +
        hist.map(d => `
          <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--gray-100);font-size:12px">
            <div>
              <span style="margin-right:4px">${STATUS_ICON[d.status]||'•'}</span>
              <span style="font-weight:600">$${(d.amount_cents/100).toFixed(2)}</span>
              <span style="color:var(--gray-400);margin-left:4px">${esc(String(d.method||'').replace('_',' '))}</span>
              ${d.note ? `<div style="color:var(--gray-600);margin-top:2px;margin-left:18px">${esc(d.note)}</div>` : ''}
              ${d.gift_card_code ? `<div style="background:#F0FDF4;border:1px dashed #16A34A;border-radius:5px;padding:4px 8px;margin-top:4px;font-weight:700;letter-spacing:.05em;margin-left:18px">🎁 ${esc(d.gift_card_code)}</div>` : ''}
              ${d.receipt_url
                ? `<a href="${escUrl('https://migrant-portal-production-3826.up.railway.app' + d.receipt_url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-left:18px;margin-top:4px;color:var(--teal);font-weight:600">📄 View Receipt</a>`
                : d.status === 'sent' ? `<div style="margin-left:18px;margin-top:4px"><label style="cursor:pointer;color:var(--teal);font-weight:600">📎 Upload Receipt<input type="file" accept="image/*" style="display:none" data-disbursement-id="${esc(d.id)}" data-change="uploadReceiptFromInput" data-args="[{&quot;$&quot;:&quot;this&quot;}]"></label></div>` : ''}
            </div>
            <span style="color:var(--gray-400);white-space:nowrap">${new Date(d.requested_at).toLocaleDateString()}</span>
          </div>`).join('');
    }
  } catch(e) {
    const el = document.getElementById('funds-balance');
    if (el) el.textContent = 'Could not load balance.';
  }
}

async function submitFundsRequest() {
  const customAmt = parseFloat(document.getElementById('funds-custom-amt').value);
  const cents = customAmt > 0 ? Math.round(customAmt * 100) : selectedFundsCents;
  if (!cents || cents < 100) { toast('Enter an amount of at least $1.00', true); return; }
  const note = document.getElementById('funds-note').value.trim();
  if (!note) { toast('Please describe what the funds will be used for', true); return; }
  try {
    await apiPost('/disbursements', { need_id: needId, amount_cents: cents, method: 'gift_card', note });
    toast('Disbursement request submitted! Admin will review within 24 hrs.');
    document.getElementById('funds-request-form').style.display = 'none';
    loadNavigatorFundsPanel(currentNeed);
    loadDonationTotal();
  } catch(e) { toast(e.message, true); }
}

async function uploadReceipt(disbId, input) {
  const file = input.files[0];
  if (!file) return;
  const form = new FormData();
  form.append('file', file);
  try {
    const r = await fetch(`https://migrant-portal-production-3826.up.railway.app/disbursements/${disbId}/receipt`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || 'Upload failed');
    toast('Receipt uploaded! Donors will be notified. ✅');
    loadNavigatorFundsPanel(currentNeed);
  } catch(e) { toast(e.message, true); }
}

// Reveal the on-page donation card (amount picker + secure checkout) and scroll to it
function goToDonateCard() {
  const card = document.getElementById('donate-card');
  if (card) {
    card.style.display = '';
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const amt = card.querySelector('.amt-btn[data-amt="2500"]');
    if (amt && !card.querySelector('.amt-btn.selected')) amt.classList.add('selected');
  } else {
    startDonation();
  }
}

async function startDonation() {
  if (!currentUser) { window.location.href = 'login'; return; }
  const btn = document.getElementById('donate-btn');
  btn.disabled = true; btn.textContent = 'Redirecting…';
  try {
    const data = await apiPost('/donations/checkout', { amount_cents: selectedAmtCents, need_id: needId });
    window.location.href = data.checkout_url;
  } catch(e) {
    btn.disabled = false; btn.textContent = 'Donate';
    toast(e.message || 'Unable to process donation. Please try again.', true);
  }
}

// ── Load need
async function loadNeed() {
  if (!needId) {
    // No ?id= param — redirect to requests list; never show the demo record
    window.location.replace('requests');
    return;
  }

  try {
    const need = await apiGet('/needs/' + needId);
    currentNeed = need;

    // Check if already responded (responders only)
    let alreadyResponded = false;
    if (currentUser?.role === 'responder') {
      try {
        const responded = await apiGet('/needs/responded');
        const mine = responded.find(n => n.id === needId);
        alreadyResponded = !!mine;
        myResponseStatus = mine?.my_response_status || 'offered';
      } catch(e) { console.error('loadResponded check failed:', e); }
    }

    renderStepper({ status: need.status, responseCount: need.response_count || 0 });

    // Title + page meta
    document.title = (need.title || 'Need Detail') + ' | MigrantPortal';
    const titleEl = document.querySelector('.req-title');
    setText(titleEl, need.title || '');

    // Breadcrumb
    const crumb = document.getElementById('crumb-case');
    setText(crumb, need.case_number ? 'Need #' + need.case_number : 'Need');

    // Illustration
    const illus = document.querySelector('.req-illustration');
    if (illus) illus.textContent = CATEGORY_EMOJI[need.category] || '📦';

    // Header chips (ZIP only for staff and responders who have responded)
    iResponded = alreadyResponded;
    chipsSeeZip = isConnector(currentUser) || currentUser?.role === 'admin' || alreadyResponded;
    renderChips();
    renderNextCard();

    // Description
    const storyText = document.querySelector('.story-text');
    if (storyText && need.description) storyText.textContent = need.description;

    // Family size heading
    const secMeta = document.querySelector('#story .section-meta');
    if (secMeta) {
      const ch = need.family_children || 0, ad = need.family_adults || 1;
      setText(secMeta, (ch > 0 ? `👶 ${ch} Child${ch!==1?'ren':''} ` : '') + `👤 ${ad} Adult${ad!==1?'s':''}`);
    }

    // Render items
    renderItems(need);
    loadPhotos(need);
    loadShifts();

    // Hide "Yes I Can Help" header button — sidebar handles it now
    const helpBtn = document.querySelector('.btn-help');
    if (helpBtn) helpBtn.style.display = 'none';

    // Render sidebar
    try {
      renderPanel(need, alreadyResponded);
    } catch(panelErr) {
      const p = document.getElementById('panel-content');
      if (p) p.innerHTML = '<div style="color:var(--gray-400);font-size:12px;text-align:center;padding:10px 0">Browse other <a href="requests">open needs</a>.</div>';
    }
    // Safety: clear any lingering "Loading…" if renderPanel didn't set content
    const p = document.getElementById('panel-content');
    if (p && p.textContent.trim() === 'Loading…') {
      p.innerHTML = '<div style="color:var(--gray-400);font-size:12px;text-align:center;padding:10px 0">Browse other <a href="requests">open needs</a>.</div>';
    }
    initBookmarkState();
    // Load navigator funds panel and refresh donation progress bar
    loadNavigatorFundsPanel(need);
    loadDonationTotal();

    // Chat — visible to navigator + responders who responded
    const chatAuthorized = currentUser && (
      currentUser.role === 'admin' ||
      isConnector(currentUser) ||
      alreadyResponded
    );
    initChat(chatAuthorized);

    // Donations sidebar card (active needs only, non-navigator)
    if (need.status === 'active' && !isConnector(currentUser) && currentUser?.role !== 'admin') {
      document.getElementById('donate-card').style.display = '';
      document.querySelector('.amt-btn[data-amt="2500"]')?.classList.add('selected');
      loadDonationTotal();
    }

  } catch(err) {
    console.warn('Could not load need:', err.message);
    document.getElementById('panel-content').innerHTML = '<div style="color:var(--gray-400);font-size:13px;text-align:center">Could not load need details.</div>';
  }
}

// ── Donor impact card
async function loadDonorImpact() {
  if (!currentUser || !needId) return;
  try {
    const impacts = await apiGet('/disbursements/my-impact');
    const mine = impacts.filter(i => i.need_id === needId);
    if (!mine.length) return;
    const card = document.getElementById('donor-impact-card');
    const body = document.getElementById('donor-impact-body');
    const totalGiven = mine.reduce((s, i) => s + i.amount_cents, 0);
    const DISB_LABELS = {
      requested: { label: 'Under Review', color: '#92400E', bg: '#FEF3C7' },
      sent:      { label: 'Funds Sent to Family', color: '#1D4ED8', bg: '#DBEAFE' },
      confirmed: { label: 'Delivered ✓', color: '#15803D', bg: '#DCFCE7' },
      rejected:  { label: 'Request Not Approved', color: '#DC2626', bg: '#FEE2E2' },
    };
    const latestStatus = mine[mine.length - 1]?.disbursement_status;
    const s = latestStatus ? DISB_LABELS[latestStatus] : null;
    const receiptUrl = mine.find(i => i.receipt_url)?.receipt_url;
    body.innerHTML = `
      <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:10px">
        <span style="font-size:24px;font-weight:800;color:var(--orange)">$${(totalGiven/100).toFixed(2)}</span>
        <span style="font-size:12px;color:var(--gray-600)">donated by you</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:${receiptUrl?'10px':'0'}">
        <span style="font-size:11px;font-weight:600;color:var(--gray-600)">Fund status:</span>
        ${s
          ? `<span style="font-size:11px;font-weight:700;padding:2px 10px;border-radius:10px;background:${s.bg};color:${s.color}">${s.label}</span>`
          : `<span style="font-size:11px;font-weight:700;padding:2px 10px;border-radius:10px;background:#F3F4F6;color:#555">In Escrow</span>`}
      </div>
      ${receiptUrl ? `<a href="${receiptUrl}"  target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:4px;font-size:12px;font-weight:600;color:var(--green)">📄 View Delivery Receipt →</a>` : ''}`;
    card.style.display = '';
  } catch(e) { /* silent — not every user donated */ }
}

// ── Visitor (logged-out) view: read-only, whitelisted fields from GET /needs/{id}/public.
// Everything here is rendered through vt() and re-rendered on EN|ES switch, because the
// strings are composed from data (counts, amounts) that the i18n.js dictionary can't key on.
// Sign-in return path: login/register accept ?next=need%3Fid%3D<uuid> (see getSafeNextPath).
const isEs = () => (document.documentElement.lang || 'en').toLowerCase() === 'es';
const VT_ES = {
  'Help this family': 'Ayude a esta familia', 'Be the first to respond': 'Sea el primero en responder',
  'Sign up or sign in to send an offer. Family details stay private until your offer is accepted.': 'Regístrese o inicie sesión para enviar una oferta. Los datos de la familia siguen siendo privados hasta que se acepte su oferta.',
  'In progress': 'En curso', 'A responder is already on this': 'Un colaborador ya está atendiendo esto',
  'An offer was accepted and delivery is being arranged. You can still help other families by signing up.': 'Se aceptó una oferta y se está organizando la entrega. Aún puede ayudar a otras familias registrándose.',
  'Fulfilled': 'Completada', 'This need has been met': 'Esta necesidad fue cubierta',
  'Thanks to a volunteer and the navigator. Other families still need help.': 'Gracias a un voluntario y al navegador. Otras familias aún necesitan ayuda.',
  'Sign up to help': 'Regístrese para ayudar', 'Sign up to help others': 'Regístrese para ayudar a otros',
  'Posted': 'Publicado', 'Responder responded': 'Un colaborador respondió', 'Offer accepted': 'Oferta aceptada', 'Delivery': 'Entrega',
  'Waiting for a responder': 'Esperando a un colaborador', 'Delivery in progress': 'Entrega en curso',
  'Sign in': 'Iniciar sesión', 'Share': 'Compartir', 'Browse open needs': 'Ver necesidades abiertas',
  "What's needed": 'Lo que se necesita', 'Story': 'Historia', 'Case': 'Caso',
  'Needs a responder': 'Necesita un colaborador', 'Awaiting delivery': 'Esperando entrega',
  'Partly delivered': 'Entrega parcial', 'Delivered': 'Entregado', 'Closed': 'Cerrada',
  'Family details and exact location are private. Only the navigator and the accepted responder can see them.': 'Los datos de la familia y la ubicación exacta son privados. Solo el navegador y el colaborador aceptado pueden verlos.',
  urgent: 'Urgente', high: 'Alta', medium: 'Media', low: 'Baja',
  housing: 'Vivienda', food: 'Alimentos', clothing: 'Ropa', furniture: 'Muebles', transportation: 'Transporte',
  employment: 'Empleo', legal: 'Legal', medical: 'Médico', education: 'Educación', translation: 'Traducción',
  childcare: 'Cuidado de niños', financial: 'Financiero', other: 'Otro',
};
const vt = (en) => (isEs() && VT_ES[en]) || en;
const cap = (v) => v ? v.charAt(0).toUpperCase() + v.slice(1) : '';
const plural = (n, one, many, oneEs, manyEs) => isEs() ? (n === 1 ? oneEs : manyEs) : (n === 1 ? one : many);

const VISITOR_COPY = {
  open: { eyebrow: 'Help this family', title: 'Be the first to respond',
          body: 'Sign up or sign in to send an offer. Family details stay private until your offer is accepted.', cta: 'Sign up to help', browse: false },
  accepted: { eyebrow: 'In progress', title: 'A responder is already on this',
              body: 'An offer was accepted and delivery is being arranged. You can still help other families by signing up.', cta: 'Sign up to help', browse: true },
  fulfilled: { eyebrow: 'Fulfilled', title: 'This need has been met',
               body: 'Thanks to a volunteer and the navigator. Other families still need help.', cta: 'Sign up to help others', browse: true },
};

function showVisitorUnavailable() {
  document.body.classList.add('unavailable');
  document.title = 'A family needs help | MigrantPortal';
  if (document.getElementById('visitor-unavailable')) return;
  const card = document.createElement('div');
  card.className = 'card visitor-unavailable';
  card.id = 'visitor-unavailable';
  card.innerHTML = `<h1>This request isn't available</h1>
    <p>It may have been completed or removed. Please check the link you were sent.</p>
    <a href="/" style="background:var(--teal);color:#fff;font-weight:700;font-size:14px;padding:11px 18px;border-radius:8px;text-decoration:none;display:inline-block">Go to MigrantPortal home</a>`;
  document.querySelector('.col-main').prepend(card);
  // i18n.js is deferred: translate now if it's ready, otherwise as soon as the page has loaded
  if (window.mpReapplyI18n) window.mpReapplyI18n(); else window.addEventListener('load', () => window.mpReapplyI18n && window.mpReapplyI18n());
}

function familyText(ad, ch) {
  return `${ad} ${plural(ad, 'adult', 'adults', 'adulto', 'adultos')}, ${ch} ${plural(ch, 'child', 'children', 'niño', 'niños')}`;
}

function itemAmount(item, n) {
  return String(item.unit).toLowerCase() === 'usd' ? `$${n}` : `${n} ${item.unit}`;
}

function renderVisitorItems(need) {
  const grid = document.querySelector('.needs-grid');
  const heading = document.querySelector('#needs .section-heading');
  if (!grid || !heading) return;
  const closed = need.status === 'fulfilled' || need.status === 'closed';
  const rows = need.items.map((item) => {
    const pct = need.status === 'fulfilled' ? 100 : item.amount_needed > 0 ? Math.min(100, Math.round(item.amount_received / item.amount_needed * 100)) : 0;
    const pill = need.status === 'fulfilled' ? { text: 'Delivered', cls: 'ok' } : itemStatus(pct >= 100, item.amount_received > 0, closed);
    const target = String(item.unit).toLowerCase() === 'usd'
      ? (isEs() ? `Meta: $${item.amount_needed}` : `Target: $${item.amount_needed} worth`)
      : (isEs() ? `Meta: ${item.amount_needed} ${item.unit}` : `Target: ${item.amount_needed} ${item.unit}`);
    const gotQty = String(item.unit).toLowerCase() === 'usd' ? `$${item.amount_received}` : String(item.amount_received);
    const got = item.amount_received > 0
      ? (isEs() ? `${gotQty} recibido` : `${gotQty} received`)
      : (isEs() ? '0 recibido hasta ahora' : '0 received so far');
    return `<div class="need-item" style="${pct >= 100 ? 'opacity:.7' : ''}">
      <div class="need-icon">${CATEGORY_EMOJI[need.category] || '📦'}</div>
      <div class="need-body">
        <div class="need-name">${esc(item.label)}</div>
        <div style="font-size:12px;color:var(--gray-600);margin-top:2px">${esc(target)} · ${esc(got)}</div>
        <div style="margin-top:6px;background:var(--gray-200);border-radius:3px;height:5px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${pct >= 100 ? 'var(--green)' : 'var(--teal)'};border-radius:3px"></div></div>
      </div>
      <span class="need-pill ${pill.cls}">${esc(vt(pill.text))}</span>
    </div>`;
  }).join('');
  const n = need.items.length;
  const delivered = need.status === 'fulfilled' ? n : need.items.filter(i => i.amount_needed > 0 && i.amount_received >= i.amount_needed).length;
  const meta = isEs() ? `${n} ${n === 1 ? 'necesidad' : 'necesidades'} · ${delivered} de ${n} entregadas`
                      : `${n} ${n === 1 ? 'need' : 'needs'} · ${delivered} of ${n} delivered`;
  heading.innerHTML = `${esc(vt("What's needed"))} <span class="section-badge">${esc(meta)}</span>`;
  grid.innerHTML = rows || '<div style="color:var(--gray-400);font-size:13px">—</div>';
  heading.querySelectorAll('*').forEach(e => e.setAttribute('data-no-i18n', ''));
  grid.querySelectorAll('*').forEach(e => e.setAttribute('data-no-i18n', ''));
}

function renderVisitor(need) {
  const status = need.status;
  const ad = need.family_adults || 0, ch = need.family_children || 0;
  const place = [need.city, need.state].filter(Boolean).join(', ');
  const next = encodeURIComponent('need?id=' + needId);
  const copy = VISITOR_COPY[status] || VISITOR_COPY.open;
  const accepted = status === 'accepted';
  const posted = new Date(String(need.created_at).replace(' ', 'T') + 'Z');
  const postedLabel = isNaN(posted) ? '' : posted.toLocaleDateString(isEs() ? 'es' : 'en', { month: 'short', day: 'numeric' });

  renderStepper({ status: status === 'fulfilled' ? 'fulfilled' : 'active', responseCount: accepted ? 1 : 0, accepted, postedLabel });
  document.querySelector('.req-illustration')?.setAttribute('hidden', '');
  const body = document.querySelector('.req-header-body');
  let eyebrow = document.getElementById('visitor-header-eyebrow');
  if (!eyebrow) {
    eyebrow = document.createElement('div');
    eyebrow.id = 'visitor-header-eyebrow';
    eyebrow.className = 'visitor-eyebrow';
    eyebrow.setAttribute('data-no-i18n', '');
    body.prepend(eyebrow);
  }
  eyebrow.textContent = `${vt(need.category)} · ${vt('Case')} #${need.case_number}`.toUpperCase();
  setText(document.querySelector('.req-title'), need.title || '');
  setText(document.getElementById('crumb-case'), `Need #${need.case_number}`);

  const responses = need.response_count || 0;
  const urgencyText = isEs() ? `Urgencia ${vt(need.urgency).toLowerCase()}` : `${cap(need.urgency)} urgency`;
  const chip = (t, cls = '') => `<span class="visitor-chip ${cls}" data-no-i18n>${esc(t)}</span>`;
  document.querySelector('.req-meta').innerHTML =
    chip(urgencyText, need.urgency === 'urgent' || need.urgency === 'high' ? 'warn' : '') + chip(place) + chip(familyText(ad, ch)) +
    chip(`${responses} ${plural(responses, 'response', 'responses', 'respuesta', 'respuestas')}`) +
    (status === 'fulfilled' ? chip(vt('Fulfilled'), 'ok') : '');

  // Next-step card, between the header and "What's needed" (mockup order)
  let card = document.getElementById('visitor-next');
  if (!card) {
    card = document.createElement('div');
    card.className = 'card visitor-cta';
    card.id = 'visitor-next';
    document.getElementById('request-details').after(card);
  }
  card.innerHTML = `
    <div class="visitor-eyebrow">${esc(vt(copy.eyebrow))}</div>
    <h2>${esc(vt(copy.title))}</h2>
    <p>${esc(vt(copy.body))}</p>
    <div class="cta-row">
      <a class="cta-primary" href="register?next=${next}">${esc(vt(copy.cta))}</a>
      <a class="cta-secondary" href="login?next=${next}">${esc(vt('Sign in'))}</a>
      <button type="button" class="cta-secondary" data-action="shareNeed">${esc(vt('Share'))}</button>
      ${copy.browse ? `<a class="cta-link" href="requests">${esc(vt('Browse open needs'))}</a>` : ''}
    </div>`;
  card.querySelectorAll('*').forEach(e => e.setAttribute('data-no-i18n', ''));

  // What's needed before Story, as in the mockup
  const needs = document.getElementById('needs'), story = document.getElementById('story');
  if (needs && story && needs.nextElementSibling !== null && story.compareDocumentPosition(needs) & Node.DOCUMENT_POSITION_FOLLOWING) story.before(needs);
  renderVisitorItems(need);

  // Story card: a summary built only from the whitelisted counts and item labels, never the written story
  const heading = story.querySelector('.section-heading');
  heading.innerHTML = esc(vt('Story'));
  heading.setAttribute('data-no-i18n', '');
  const labels = need.items.map(i => i.label).join(', ');
  const total = ad + ch;
  const summary = isEs()
    ? `Una familia de ${total} (${familyText(ad, ch)}) necesita ${labels || 'ayuda'}.`
    : `A family of ${total} (${familyText(ad, ch)}) needs ${labels || 'help'}.`;
  const storyEl = story.querySelector('.story-text');
  storyEl.textContent = summary;
  storyEl.setAttribute('data-no-i18n', '');
  story.querySelector('.section-meta')?.remove();

  // Side rail: privacy card only
  const panel = document.getElementById('panel-content');
  panel.removeAttribute('style');
  panel.className = 'visitor-privacy';
  panel.innerHTML = `<span aria-hidden="true">🔒</span><span>${esc(vt('Family details and exact location are private. Only the navigator and the accepted responder can see them.'))}</span>`;
}

async function loadVisitorNeed() {
  document.body.classList.add('visitor');
  document.title = 'A family needs help | MigrantPortal';
  const robots = document.querySelector('meta[name="robots"]');
  if (robots) robots.setAttribute('content', 'noindex');
  if (!needId) { window.location.replace('requests'); return; }
  try {
    const r = await fetch(API + '/needs/' + encodeURIComponent(needId) + '/public', { headers: { Accept: 'application/json' } });
    if (!r.ok) { showVisitorUnavailable(); return; }
    currentNeed = await r.json();
    renderVisitor(currentNeed);
    new MutationObserver(() => renderVisitor(currentNeed)).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  } catch (err) {
    console.warn('Could not load public need:', err.message);
    showVisitorUnavailable();
  }
}

// Logged in: untouched behavior. Logged out: public read-only view (no login redirect).
if (currentUser) {
  loadNeed();
  loadDonorImpact();
} else {
  loadVisitorNeed();
}
