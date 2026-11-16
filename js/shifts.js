requireAuth();
const me = getUser();

function toast(msg, err=false) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = 'show' + (err?' error':'');
  clearTimeout(el._t); el._t = setTimeout(() => el.className = '', 2500);
}

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(s) {
  const d = new Date(s + 'T00:00:00');
  return `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function renderShifts(shifts, showCancel=false) {
  const el = document.getElementById('shifts-list');
  if (!shifts.length) { el.innerHTML = '<div class="empty">No shifts found.</div>'; return; }
  el.innerHTML = shifts.map(s => {
    const pct = s.slots_total > 0 ? Math.round(s.slots_filled / s.slots_total * 100) : 0;
    const full = s.slots_filled >= s.slots_total;
    return `
      <div class="shift-card">
        <div class="shift-header">
          <div>
            <div class="shift-title">${esc(s.title)}</div>
            ${s.description ? `<div style="font-size:12px;color:var(--gray-600);margin-top:3px">${esc(s.description)}</div>` : ''}
          </div>
          ${s.cancelled ? '<span style="background:var(--red-lt);color:var(--red);font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px">Cancelled</span>' : ''}
        </div>
        <div class="shift-meta">
          <span>📅 ${fmtDate(s.date)}</span>
          <span>🕐 ${s.start_time} – ${s.end_time}</span>
          ${s.location ? `<span>📍 ${s.location}</span>` : ''}
          <span>👥 ${s.slots_filled}/${s.slots_total} slots</span>
        </div>
        <div>
          <div class="slot-bar"><div class="slot-fill ${full?'full':''}" style="width:${pct}%"></div></div>
        </div>
        ${!s.cancelled ? `<div class="shift-actions">
          ${showCancel
            ? `<button class="btn-cancel" data-action="cancelShift" data-a0="${s.id}">Cancel Shift</button>
               <button class="btn-signup" style="background:var(--teal-lt);color:var(--teal);border:1px solid var(--teal)" data-action="toggleRoster" data-args="[null,{&quot;$&quot;:&quot;this&quot;}]" data-a0="${s.id}">👥 Roster</button>`
            : s.signed_up
              ? `<button class="btn-drop" data-action="dropShift" data-a0="${s.id}">Drop Shift</button>`
              : full
                ? `<button class="btn-signup" disabled style="opacity:.5;cursor:not-allowed">Full</button>`
                : `<button class="btn-signup" data-action="signupShift" data-a0="${s.id}">Sign Up</button>`
          }
        </div>
        <div id="roster-${s.id}" style="display:none;margin-top:8px;font-size:12px;color:var(--gray-600);border-top:1px solid var(--gray-200);padding-top:8px">Loading roster…</div>` : ''}
      </div>`;
  }).join('');
}

let activeTab = 'all';
function switchTab(tab) {
  activeTab = tab;
  ['all','mine','org'].forEach(t => document.getElementById('tab-'+t).classList.toggle('active', t===tab));
  document.getElementById('create-form').style.display = tab === 'org' ? '' : 'none';
  loadTab(tab);
}

async function loadTab(tab) {
  document.getElementById('shifts-list').innerHTML = '<div class="empty">Loading…</div>';
  try {
    const url = tab === 'mine' ? '/shifts/mine' : tab === 'org' ? '/shifts/org' : '/shifts';
    const shifts = await apiGet(url);
    renderShifts(shifts, tab === 'org');
  } catch(e) {
    document.getElementById('shifts-list').innerHTML = `<div class="empty">${e.message.includes('403') ? 'Only org owners can manage shifts.' : 'Failed to load shifts.'}</div>`;
  }
}

async function signupShift(id) {
  try { await apiPost(`/shifts/${id}/signup`, {}); toast('Signed up!'); loadTab(activeTab); }
  catch(e) { toast(e.message, true); }
}

async function dropShift(id) {
  if (!await showConfirmModal({ title: 'Drop Shift', message: 'Are you sure you want to drop this shift?', confirmText: 'Drop Shift', danger: true })) return;
  try { await apiDelete(`/shifts/${id}/signup`); toast('Dropped.'); loadTab(activeTab); }
  catch(e) { toast(e.message, true); }
}

async function cancelShift(id) {
  if (!await showConfirmModal({ title: 'Cancel Shift', message: 'This will cancel the shift and remove all volunteer sign-ups.', confirmText: 'Cancel Shift', danger: true })) return;
  try { await apiDelete(`/shifts/${id}`); toast('Shift cancelled.'); loadTab(activeTab); }
  catch(e) { toast(e.message, true); }
}

async function createShift() {
  const title = document.getElementById('f-title').value.trim();
  const date = document.getElementById('f-date').value;
  const start = document.getElementById('f-start').value;
  const end = document.getElementById('f-end').value;
  const slots = parseInt(document.getElementById('f-slots').value) || 1;
  if (!title || !date || !start || !end) { toast('Fill in all required fields.', true); return; }
  try {
    await apiPost('/shifts', {
      title, date, start_time: start, end_time: end, slots_total: slots,
      description: document.getElementById('f-desc').value.trim() || undefined,
      location: document.getElementById('f-loc').value.trim() || undefined,
    });
    toast('Shift created!');
    ['f-title','f-desc','f-date','f-start','f-end','f-loc'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('f-slots').value = '1';
    loadTab('org');
  } catch(e) { toast(e.message, true); }
}

async function toggleRoster(id, btn) {
  const el = document.getElementById('roster-' + id);
  if (!el) return;
  if (el.style.display !== 'none') { el.style.display = 'none'; return; }
  el.style.display = '';
  el.textContent = 'Loading roster…';
  try {
    const list = await apiGet(`/shifts/${id}/roster`);
    if (!list.length) { el.textContent = 'No sign-ups yet.'; return; }
    el.innerHTML = '<strong>Signed up:</strong> ' + list.map(r =>
      `${esc(r.name)}${r.signed_up_at ? ' <span style="color:var(--gray-400)">('+esc(String(r.signed_up_at).slice(0,10))+')</span>' : ''}`
    ).join(' &nbsp;·&nbsp; ');
  } catch(e) { el.textContent = 'Could not load roster.'; }
}

loadTab('all');
