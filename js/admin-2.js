const user = requireAuth();
if (!user || user.role !== 'admin') {
  window.location.replace('login');
  throw new Error('Unauthorized');
}
document.getElementById('adminName').textContent = user?.name || '';

/* ═══════════════════════════════════════════
   TAB SWITCHING
═══════════════════════════════════════════ */
let activeTab = 'home';
const ALL_TABS = ['home','pending','all','users','reports','flagged','announcements','email','orgs','resources','disbursements','nonprofits','audit'];

function switchTab(name) {
  document.querySelectorAll('.nav-item').forEach(el => {
    const isActive = el.dataset.tab === name;
    el.classList.toggle('active', isActive);
    if (isActive) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
  ALL_TABS.forEach(t => { document.getElementById('tab-' + t).style.display = t === name ? '' : 'none'; });
  activeTab = name;
  if (name === 'home')          loadHome();
  if (name === 'all')           loadAllNeeds();
  if (name === 'users')         { loadPendingUsers(); loadUsers(); loadDeletedUsers(); loadUsersCoverage(); }
  if (name === 'reports')       loadReports();
  if (name === 'flagged')       loadFlagged();
  if (name === 'announcements') loadAnnouncements();
  if (name === 'email')         { loadSentEmails(); renderEmailPreview(); }
  if (name === 'orgs')          loadOrgs();
  if (name === 'resources')     loadResources();
  if (name === 'nonprofits')    loadNonprofits();
  if (name === 'disbursements') loadDisbursements();
  if (name === 'audit')         loadAuditLog();
}

function kpiFilter(filter) {
  // Clear any previous active KPI card
  document.querySelectorAll('.stat-card[data-filter]').forEach(c => c.classList.remove('kpi-active'));
  const card = document.querySelector(`.stat-card[data-filter="${filter}"]`);
  if (card) card.classList.add('kpi-active');

  if (filter === 'pending') {
    switchTab('pending');
  } else if (filter === 'users') {
    switchTab('users');
  } else {
    // Navigate to All Needs and apply status filter
    switchTab('all');
    const sel = document.getElementById('allStatus');
    if (sel) {
      sel.value = (filter === 'all') ? '' : filter;
      goAllPage(1);
    }
  }
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show' + (isError ? ' error' : ' success');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.className = '', 2500);
}

/* ═══════════════════════════════════════════
   STATS + AUTO-REFRESH
═══════════════════════════════════════════ */
function renderKpiDelta(elId, curr, prev, higherIsBad) {
  const el = document.getElementById(elId);
  if (!el || prev === null) return;
  const diff = curr - prev;
  if (diff === 0) { el.textContent = ''; el.className = 'kpi-delta same'; return; }
  const sign = diff > 0 ? '+' : '';
  const isUp = diff > 0;
  el.textContent = `${sign}${diff}`;
  if (higherIsBad) {
    el.className = 'kpi-delta ' + (isUp ? 'up' : 'down');
  } else {
    el.className = 'kpi-delta ' + (isUp ? 'up-good' : 'up');
  }
}

async function loadStats() {
  try {
    const s = await apiGet('/admin/stats');

    // Read previous values from sessionStorage for delta
    const prev = JSON.parse(sessionStorage.getItem('mp_kpi_prev') || 'null');

    document.getElementById('sPending').textContent    = s.pending_count;
    document.getElementById('sActive').textContent     = s.active_count;
    document.getElementById('sFulfilled').textContent  = s.fulfilled_count;
    document.getElementById('sTotal').textContent      = s.total_needs;
    document.getElementById('sResponders').textContent = s.total_responders;
    document.getElementById('sRate').textContent       = s.fulfillment_rate + '%';

    if (prev) {
      renderKpiDelta('dPending',   s.pending_count,    prev.pending_count,   true);
      renderKpiDelta('dActive',    s.active_count,     prev.active_count,    false);
      renderKpiDelta('dFulfilled', s.fulfilled_count,  prev.fulfilled_count, false);
      renderKpiDelta('dTotal',     s.total_needs,      prev.total_needs,     false);
      renderKpiDelta('dResponders',s.total_responders, prev.total_responders,false);
      const rateDiff = Math.round((s.fulfillment_rate - prev.fulfillment_rate) * 10) / 10;
      const rEl = document.getElementById('dRate');
      if (rEl && rateDiff !== 0) {
        rEl.textContent = (rateDiff > 0 ? '+' : '') + rateDiff + '%';
        rEl.className = 'kpi-delta ' + (rateDiff > 0 ? 'up-good' : 'up');
      }
    }

    // Save current as previous for next poll
    sessionStorage.setItem('mp_kpi_prev', JSON.stringify({
      pending_count: s.pending_count, active_count: s.active_count, fulfilled_count: s.fulfilled_count,
      total_needs: s.total_needs, total_responders: s.total_responders, fulfillment_rate: s.fulfillment_rate
    }));

    const badge = document.getElementById('pendingBadge');
    badge.textContent = s.pending_count;
    badge.className = 'nav-badge' + (s.pending_count === 0 ? ' zero' : '');

    // Update last-refreshed timestamp
    const stamp = document.getElementById('lastUpdatedStamp');
    if (stamp) stamp.textContent = 'Updated ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch(e) { console.error('loadStats failed:', e); }

  loadSidebarBadges();
}

// Users and Nonprofits have no KPI tile on the home dashboard, so their
// pending counts only ever showed up if you clicked into the tab — this
// keeps the sidebar badge live the same way pendingBadge/flaggedBadge are.
async function loadSidebarBadges() {
  try {
    const pendingUsers = await apiGet('/admin/users/pending');
    const n = Array.isArray(pendingUsers) ? pendingUsers.filter(u => !isTestEmail(u.email)).length : 0;
    const badge = document.getElementById('usersBadge');
    badge.textContent = n;
    badge.className = 'nav-badge' + (n === 0 ? ' zero' : '');
  } catch(e) { console.error('loadSidebarBadges (users) failed:', e); }

  try {
    const nonprofits = await apiGet('/nonprofits/admin/all');
    const n = Array.isArray(nonprofits) ? nonprofits.filter(np => !np.is_active).length : 0;
    const badge = document.getElementById('nonprofitsBadge');
    badge.textContent = n;
    badge.className = 'nav-badge' + (n === 0 ? ' zero' : '');
  } catch(e) { console.error('loadSidebarBadges (nonprofits) failed:', e); }
}

async function loadGeography() {
  const el = document.getElementById('homeGeoContent');
  try {
    const g = await apiGet('/admin/geography');
    const total = g.signups_by_state.reduce((sum, r) => sum + r.count, 0);
    const unknown = g.signups_by_state.filter(r => r.state === 'Unknown').reduce((sum, r) => sum + r.count, 0);
    const peak = Math.max(1, ...g.signups_by_state.map(r => r.count));
    const kpi = (n, label, cls) => '<div class="geo-kpi' + (cls ? ' ' + cls : '') + '"><b>' + n + '</b><span>' + label + '</span></div>';
    const states = g.signups_by_state.map(r =>
      '<div class="geo-row"><span>' + esc(r.state) + '</span>' +
      '<div class="geo-bar' + (r.state === 'Unknown' ? ' unk' : '') + '"><i style="width:' + Math.round(r.count / peak * 100) + '%"></i></div>' +
      '<span class="geo-n">' + r.count + '</span></div>').join('');
    const cities = g.top_waitlist_cities.map(r =>
      '<tr><td>' + esc([r.city, r.state].filter(Boolean).join(', ') || 'Unknown') + '</td><td>' + esc(r.zip) + '</td><td><span class="geo-pill">' + r.count + '</span></td></tr>').join('');
    el.innerHTML =
      '<div class="geo-kpis">' + kpi(total, 'Total signups') + kpi(unknown, 'No state on file', unknown ? 'warn' : '') + kpi(g.waitlist_total, 'On waitlist') + '</div>' +
      '<div class="geo-cols"><div><h4 class="geo-h">Signups by state</h4>' +
      (states || '<div class="geo-empty"><b>No signups yet</b></div>') +
      (unknown ? '<div class="geo-note">' + unknown + ' account' + (unknown === 1 ? ' has' : 's have') + ' no location on file.</div>' : '') +
      '</div><div><h4 class="geo-h">Waitlist: top cities</h4>' +
      (cities
        ? '<table class="geo-table"><thead><tr><th>City</th><th>ZIP</th><th>On list</th></tr></thead><tbody>' + cities + '</tbody></table>'
        : '<div class="geo-empty"><b>No one is waiting yet</b>When someone outside your area signs up, their city and ZIP show up here.</div>') +
      '</div></div>';
  } catch (err) {
    el.innerHTML = '<div class="loading">Could not load geography.</div>';
  }
}

async function downloadWaitlist() {
  const btn = document.getElementById('waitlistExportBtn');
  btn.disabled = true;
  try {
    const r = await _fetchWithRetry('/admin/waitlist/export', { headers: _authHeaders(), credentials: 'include' });
    if (r.status === 401) { _handle401(); return; }
    if (!r.ok) throw new Error('Export failed (' + r.status + ')');
    const url = URL.createObjectURL(await r.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = 'waitlist.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert(err.message || 'Could not export the waitlist.');
  } finally {
    btn.disabled = false;
  }
}

async function loadHome() {
  loadGeography();
  document.getElementById('haPending').textContent = '—';
  document.getElementById('haFlagged').textContent = '—';
  document.getElementById('haDisb').textContent = '—';
  document.getElementById('haUsers').textContent = '—';
  document.getElementById('homeActivityContent').innerHTML = '<div class="loading">Loading</div>';

  const [statsRes, flaggedRes, disbRes, usersRes, activityRes] = await Promise.allSettled([
    apiGet('/admin/stats'),
    apiGet('/admin/needs/flagged'),
    apiGet('/admin/disbursements?status=requested'),
    apiGet('/admin/users/pending'),
    apiGet('/admin/audit-log?page=1&per_page=30'),
  ]);

  if (statsRes.status === 'fulfilled') {
    document.getElementById('haPending').textContent = statsRes.value.pending_count;
  }
  if (flaggedRes.status === 'fulfilled') {
    const items = Array.isArray(flaggedRes.value) ? flaggedRes.value : [];
    document.getElementById('haFlagged').textContent = items.length;
  }
  if (disbRes.status === 'fulfilled') {
    const items = Array.isArray(disbRes.value) ? disbRes.value : [];
    document.getElementById('haDisb').textContent = items.length;
  }
  if (usersRes.status === 'fulfilled') {
    const items = Array.isArray(usersRes.value) ? usersRes.value : [];
    document.getElementById('haUsers').textContent = items.length;
  }

  homeActivityItems = activityRes.status === 'fulfilled'
    ? (Array.isArray(activityRes.value) ? activityRes.value : (activityRes.value.items || []))
    : [];
  renderHomeActivity();
}

/* ── Home: compact Recent Activity feed ── */
const ACTIVITY_SHOWN = 6;
// Audit-log events are all need events (event_type on need_events).
const ACTIVITY_EVENTS = {
  submitted:         { group:'new',      text:'submitted a need',            sym:'i-clock', cls:'ic-other' },
  approved:          { group:'review',   text:'approved a need',             sym:'i-check', cls:'ic-approve' },
  rejected:          { group:'review',   text:'rejected a need',             sym:'i-x',     cls:'ic-reject' },
  deleted:           { group:'review',   text:'deleted a need',              sym:'i-x',     cls:'ic-reject' },
  flags_cleared:     { group:'review',   text:'cleared flags on a need',     sym:'i-check', cls:'ic-approve' },
  question:          { group:'review',   text:'asked a question on a need',  sym:'i-clock', cls:'ic-announce' },
  responded:         { group:'response', text:'responded to a need',         sym:'i-send',  cls:'ic-disb' },
  response_accepted: { group:'response', text:'accepted a response from',    sym:'i-check', cls:'ic-disb' },
  fulfilled:         { group:'response', text:'marked a need fulfilled',     sym:'i-check', cls:'ic-approve' },
  received:          { group:'response', text:'confirmed items received',    sym:'i-check', cls:'ic-approve' },
  receipt_removed:   { group:'response', text:'removed a receipt',           sym:'i-x',     cls:'ic-other' },
};
let homeActivityItems = [];
let homeActivityFilter = 'all';

function setActivityFilter(filter) {
  homeActivityFilter = filter;
  document.querySelectorAll('#homeActivityChips .act-chip').forEach(c => c.classList.toggle('on', c.dataset.filter === filter));
  renderHomeActivity();
}

function activityEvent(action) {
  return ACTIVITY_EVENTS[action] || { group:'other', text:(action || 'updated').replace(/_/g, ' ') + ' a need', sym:'i-clock', cls:'ic-other' };
}

// Day key and label in Central time, e.g. "Today", "Yesterday", "Mon, Nov 10".
function activityDay(date) {
  const key = d => d.toLocaleDateString('en-CA', { timeZone:'America/Chicago' });
  const now = new Date();
  const dayKey = key(date);
  if (dayKey === key(now)) return { dayKey, label:'Today' };
  if (dayKey === key(new Date(now - 86400000))) return { dayKey, label:'Yesterday' };
  return { dayKey, label: date.toLocaleDateString('en-US', { timeZone:'America/Chicago', weekday:'short', month:'short', day:'numeric' }) };
}

function activityTime(date, isToday) {
  const mins = Math.floor((Date.now() - date) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (isToday) return `${Math.floor(mins / 60)}h ago`;
  return date.toLocaleTimeString('en-US', { timeZone:'America/Chicago', hour:'numeric', minute:'2-digit' });
}

function activityRow(e, day) {
  const ev = activityEvent(e.action);
  const date = parseUtc(String(e.created_at).replace(' ', 'T'));
  const note = e.detail || e.reason || '';
  return `<div class="act-row" data-action="switchTab" data-args="[&quot;audit&quot;]" title="${esc(fmtCentral(String(e.created_at).replace(' ', 'T')))}">
    <span class="act-icon ${ev.cls}"><svg class="ic" viewBox="0 0 24 24"><use href="#${ev.sym}"/></svg></span>
    <span class="act-text"><b>${esc(e.admin_name || e.actor || 'Someone')}</b> ${esc(ev.text)}${note ? ` <span class="act-note">· ${esc(note)}</span>` : ''}</span>
    <span class="act-time">${esc(activityTime(date, day.label === 'Today'))}</span>
  </div>`;
}

function renderHomeActivity() {
  const el = document.getElementById('homeActivityContent');
  const matching = homeActivityItems.filter(e => e.created_at && (homeActivityFilter === 'all' || activityEvent(e.action).group === homeActivityFilter));
  if (!matching.length) {
    el.innerHTML = `<div class="act-empty">${homeActivityFilter === 'all' ? 'No recent activity.' : 'Nothing recent in this view.'}</div>`;
    return;
  }
  let lastDay = '';
  const rows = matching.slice(0, ACTIVITY_SHOWN).map(e => {
    const day = activityDay(parseUtc(String(e.created_at).replace(' ', 'T')));
    const header = day.dayKey !== lastDay ? `<div class="act-day">${esc(day.label)}</div>` : '';
    lastDay = day.dayKey;
    return header + activityRow(e, day);
  }).join('');
  el.innerHTML = rows + `<button class="act-more" data-action="switchTab" data-args="[&quot;audit&quot;]">See all in Audit Log →</button>`;
}

// Auto-refresh every 30s; re-renders visible tab data and timestamps
setInterval(async () => {
  await loadStats();
  if (activeTab === 'home') loadHome();
  if (activeTab === 'pending') {
    try {
      const data = await apiGet('/admin/needs/pending?page=1');
      pendingNeeds = data.items;
      renderPending();
    } catch(e) { console.error('auto-refresh pending failed:', e); }
  }
}, 30000);

// Re-render pending cards every 60s to keep time-in-queue badges accurate
setInterval(() => {
  if (activeTab === 'pending' && pendingNeeds.length) renderPending();
}, 60000);

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
const URGENCY_COLOR = { urgent:'urg-urgent', high:'urg-high', medium:'urg-medium', low:'urg-low' };
const CAT_EMOJI = { housing:'🏠', food:'🍽️', clothing:'👗', furniture:'🛋️', transportation:'🚗', employment:'💼', legal:'⚖️', medical:'🏥', education:'📚', translation:'🌐', childcare:'👶', financial:'💰', other:'📦' };
const STATUS_CLASS = { pending:'s-pending', active:'s-active', fulfilled:'s-fulfilled', closed:'s-closed' };

function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function safeSrc(url) {
  try { const u = new URL(url); return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : '#'; }
  catch { return '#'; }
}

function staleDays(createdAt) {
  if (!createdAt) return 0;
  return Math.floor((Date.now() - new Date(createdAt)) / 86400000);
}

function staleBadge(createdAt) {
  const d = staleDays(createdAt);
  if (d >= 7) return `<span class="stale-badge stale-crit">⚠ ${d}d old</span>`;
  if (d >= 3) return `<span class="stale-badge stale-warn">⏰ ${d}d old</span>`;
  return '';
}

function timeInQueue(createdAt) {
  if (!createdAt) return '';
  // API timestamps are naive UTC; without a Z the browser parses them as local time
  const utc = createdAt.endsWith('Z') || /[+-]\d\d:\d\d$/.test(createdAt) ? createdAt : createdAt + 'Z';
  const mins = Math.max(0, Math.floor((Date.now() - new Date(utc)) / 60000));
  if (mins < 60)  return `<span class="tiq tiq-hot" title="In queue ${mins} minute${mins !== 1 ? 's' : ''}">⏱ ${mins}m</span>`;
  const hrs = Math.floor(mins / 60);
  if (mins < 1440) return `<span class="tiq tiq-warn" title="In queue ${hrs} hour${hrs !== 1 ? 's' : ''}">${hrs}h in queue</span>`;
  const days = Math.floor(mins / 1440);
  return `<span class="tiq tiq-stale" title="In queue ${days} day${days !== 1 ? 's' : ''}">⚠ ${days}d in queue</span>`;
}

// AI triage scoring — client-side, zero backend changes
const TRIAGE_URGENCY = { urgent:40, high:25, medium:10, low:0 };
const TRIAGE_CAT     = { medical:25, housing:20, food:15, legal:15, transportation:10, employment:8, education:5 };
const TRIAGE_KEYWORDS = [
  ['emergency','eviction','homeless','evicted','electricity cut','no heat','no water','hospitalized','critically','life-threatening'], // +15 each
  ['hungry','starvation','disabled','pregnant','newborn','infant','elderly','domestic violence','deported','detained'],               // +10 each
  ['running out','urgent','immediately','desperate','dire','severe','crisis','sick','medication'],                                    // +5 each
];

function triageScore(n) {
  let score = TRIAGE_URGENCY[n.urgency] ?? 10;
  score += TRIAGE_CAT[n.category] ?? 0;
  const children = parseInt(n.family_children) || 0;
  if (children >= 4) score += 12;
  else if (children >= 2) score += 6;
  const d = staleDays(n.created_at);
  if (d >= 7) score += 15;
  else if (d >= 3) score += 8;
  const desc = (n.description || '').toLowerCase();
  TRIAGE_KEYWORDS[0].forEach(kw => { if (desc.includes(kw)) score += 15; });
  TRIAGE_KEYWORDS[1].forEach(kw => { if (desc.includes(kw)) score += 10; });
  TRIAGE_KEYWORDS[2].forEach(kw => { if (desc.includes(kw)) score += 5; });
  score = Math.min(score, 100);
  const level = score >= 75 ? 'P1' : score >= 50 ? 'P2' : score >= 25 ? 'P3' : 'P4';
  const cls   = score >= 75 ? 't-p1' : score >= 50 ? 't-p2' : score >= 25 ? 't-p3' : 't-p4';
  return { score, level, cls };
}

function triageBadge(n) {
  const t = triageScore(n);
  return `<span class="triage-badge ${t.cls}" title="AI triage score: ${t.score}/100">${t.level}</span>`;
}

// CSV export utility
function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
}

/* ═══════════════════════════════════════════
   PENDING QUEUE
═══════════════════════════════════════════ */
let pendingNeeds = [];
let selectedIds  = new Set();
let kbFocusIdx   = -1;

function updateBulkBar() {
  document.getElementById('bulkCount').textContent = selectedIds.size;
  document.getElementById('bulkBar').classList.toggle('show', selectedIds.size > 0);
}

function clearSelection() {
  selectedIds.forEach(id => {
    document.getElementById('pc-' + id)?.classList.remove('selected');
    const chk = document.getElementById('chk-' + id);
    if (chk) chk.checked = false;
  });
  selectedIds.clear();
  updateBulkBar();
}

async function loadPending() {
  try {
    const data = await apiGet('/admin/needs/pending?page=1');
    pendingNeeds = data.items;
    renderPending();
  } catch(e) {
    document.getElementById('pendingList').innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div>Failed to load pending needs.</div>';
  }
}

function renderPending() {
  const el = document.getElementById('pendingList');
  if (!pendingNeeds.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">✅</div><div style="margin-bottom:16px;font-weight:600;color:var(--text-2)">Queue is clear — all caught up.</div><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn" data-action="kpiFilter" data-args="[&quot;all&quot;]" style="font-size:12px">📋 All Needs</button><button class="btn" data-action="switchTab" data-args="[&quot;reports&quot;]" style="font-size:12px">📊 Reports</button><button class="btn" data-action="switchTab" data-args="[&quot;users&quot;]" style="font-size:12px">👥 Manage Users</button><button class="btn" data-action="switchTab" data-args="[&quot;announcements&quot;]" style="font-size:12px">📢 Announcements</button></div></div>';
    return;
  }
  el.innerHTML = pendingNeeds.map((n, i) => `
    <div class="pending-card" id="pc-${n.id}" data-idx="${i}">
      <input type="checkbox" id="chk-${n.id}" data-change="toggleSelect" data-a0="${n.id}">
      <div class="pc-body">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="pc-title" data-action="openNeedModal" data-n0="${i}">${esc(n.title)}</span>
          <span class="pc-case">#${esc(n.case_number)}</span>
          <span class="status-pill s-pending">
            <span class="urgency-dot ${URGENCY_COLOR[n.urgency]}"></span>${n.urgency}
          </span>
          <span style="font-size:12px;color:var(--text-2)">${CAT_EMOJI[n.category]||'📦'} ${n.category}</span>
          ${triageBadge(n)}
          ${timeInQueue(n.created_at)}
        </div>
        <div class="pc-meta">${esc(n.city)}, ${esc(n.state)} ${esc(n.zip)} &nbsp;·&nbsp; ${n.family_adults} adult${n.family_adults!==1?'s':''}, ${n.family_children} child${n.family_children!==1?'ren':''} &nbsp;·&nbsp; ${esc(n.connector_org || 'No org')}</div>
        <div class="pc-desc">${esc(n.description.slice(0,160))}${n.description.length>160?'…':''}</div>
        <div class="pc-actions">
          <button class="btn btn-approve" data-busy-for="${n.id}" data-busy-text="Approving…" data-action="approveSingle" data-a0="${n.id}">✓ Approve</button>
          <button class="btn btn-reject" data-busy-for="${n.id}" data-busy-text="Rejecting…" data-action="showReject" data-a0="${n.id}">✗ Reject</button>
          <button class="btn btn-delete" data-action="deleteNeedRow" data-a0="${n.id}" data-n1="${i}">Delete</button>
          <span style="font-size:11px;color:var(--text-3);margin-left:4px;cursor:pointer" data-action="openNeedModal" data-n0="${i}">View details →</span>
        </div>
      </div>
    </div>
  `).join('');
}

function toggleSelect(id) {
  const card = document.getElementById('pc-' + id);
  if (selectedIds.has(id)) { selectedIds.delete(id); card.classList.remove('selected'); }
  else { selectedIds.add(id); card.classList.add('selected'); }
  updateBulkBar();
}

// Needs with an approve/reject request in flight, so a second click can't send it again.
const needBusy = new Set();

// Disable every Approve/Reject button for this need (queue card, All Needs row, details popup).
// The clicked kind of button shows its busy label; the rest just grey out.
function setNeedBusy(id, busySelector) {
  const isBusy = !!busySelector;
  if (isBusy) needBusy.add(id); else needBusy.delete(id);
  document.querySelectorAll(`[data-busy-for="${CSS.escape(id)}"]`).forEach(btn => {
    btn.disabled = isBusy;
    if (isBusy && btn.matches(busySelector)) { btn.dataset.label = btn.textContent; btn.textContent = btn.dataset.busyText; }
    else if (!isBusy && btn.dataset.label) { btn.textContent = btn.dataset.label; delete btn.dataset.label; }
  });
}

// A need left the queue: drop it from Pending and refresh any view still showing it as pending.
function afterNeedDecision(id) {
  pendingNeeds = pendingNeeds.filter(n => n.id !== id);
  selectedIds.delete(id);
  renderPending(); loadStats();
  if (allNeedsCache.some(n => n.id === id)) loadAllNeeds();
}

async function approveSingle(id, closeModalOnDone = false) {
  if (needBusy.has(id)) return false;
  setNeedBusy(id, '.btn-approve');
  try {
    const r = await apiPatch(`/admin/needs/${id}/approve`, {});
    toast(`✓ Approved — notified ${r.notified_responders} responder(s).`);
  } catch(e) {
    setNeedBusy(id, null);
    if (!e.message.startsWith('ALREADY_APPROVED')) { toast(e.message, true); return false; }
    toast('Already approved. Refreshed the list.');
  }
  needBusy.delete(id);
  if (closeModalOnDone) closeModal();
  afterNeedDecision(id);
  return true;
}

async function showReject(id) {
  if (needBusy.has(id)) return;
  const reason = await showRejectModal({ title: 'Reject Need', subtitle: 'Select a reason or write a custom one. The navigator will be notified.', presets: NEED_REJECT_PRESETS });
  if (reason === null) return;
  setNeedBusy(id, '.btn-reject');
  try {
    await apiPatch(`/admin/needs/${id}/reject`, { reason });
    toast('Need rejected.');
    needBusy.delete(id);
    afterNeedDecision(id);
  } catch(e) { setNeedBusy(id, null); toast(e.message, true); }
}

async function bulkApprove() {
  const ids = [...selectedIds];
  if (!ids.length) return;
  try {
    const r = await apiPost('/admin/needs/bulk-approve', { need_ids: ids });
    toast(`✓ Approved ${r.approved} need(s).`);
    pendingNeeds = pendingNeeds.filter(n => !ids.includes(n.id));
    selectedIds.clear();
    renderPending(); updateBulkBar(); loadStats();
  } catch(e) { toast(e.message, true); }
}

async function bulkReject() {
  const ids = [...selectedIds];
  if (!ids.length) return;
  const reason = await showRejectModal({ title: `Reject ${ids.length} Need${ids.length!==1?'s':''}`, subtitle: `Choose a reason to apply to all ${ids.length} selected need${ids.length!==1?'s':''}.`, presets: NEED_REJECT_PRESETS });
  if (reason === null) return;
  let done = 0;
  for (const id of ids) {
    try { await apiPatch(`/admin/needs/${id}/reject`, { reason }); done++; } catch(e) { console.error(`bulkReject failed for need ${id}:`, e); }
  }
  toast(`Rejected ${done} need(s).`);
  pendingNeeds = pendingNeeds.filter(n => !ids.includes(n.id));
  selectedIds.clear();
  renderPending(); updateBulkBar(); loadStats();
}

async function deleteNeed(id, title) {
  if (!await showConfirmModal({ title: 'Delete Need', message: `Delete "${title}"? This cannot be undone.`, confirmText: 'Delete', danger: true })) return;
  try {
    await apiDelete(`/admin/needs/${id}`);
    toast('Need deleted.');
    pendingNeeds = pendingNeeds.filter(n => n.id !== id);
    renderPending(); loadStats();
    if (activeTab === 'all') loadAllNeeds();
  } catch(e) { toast(e.message, true); }
}

/* ═══════════════════════════════════════════
   NEED DETAIL MODAL
═══════════════════════════════════════════ */
/* ── Need review modal (pending queue + all needs) ── */
// API timestamps are naive UTC; without a Z the browser parses them as local time
function parseUtc(iso) {
  return new Date(iso.endsWith('Z') || /[+-]\d\d:\d\d$/.test(iso) ? iso : iso + 'Z');
}

function fmtCentral(iso) {
  if (!iso) return '—';
  return parseUtc(iso).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' CT';
}

function sinceText(iso) {
  const mins = Math.max(0, Math.floor((Date.now() - parseUtc(iso)) / 60000));
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs !== 1 ? 's' : ''}`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? 's' : ''}`;
}

function modalField(label, valueHtml, subHtml = '') {
  const sub = subHtml ? `<div style="font-size:12px;color:var(--text-2)">${subHtml}</div>` : '';
  return `<div class="modal-field"><div class="modal-field-label">${label}</div><div class="modal-field-val">${valueHtml}</div>${sub}</div>`;
}

function needHeaderHtml(n) {
  const isPending = n.status === 'pending';
  const waiting = isPending && n.created_at ? `<span class="status-pill" style="background:var(--surface-2);color:var(--text-2)">Waiting ${sinceText(n.created_at)}</span>` : '';
  return `
    <div style="margin-bottom:20px">
      <div style="font-size:18px;font-weight:800;letter-spacing:-0.4px;margin-bottom:6px">${esc(n.title)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <span class="pc-case">#${esc(n.case_number)}</span>
        ${isPending ? '' : `<span class="status-pill ${STATUS_CLASS[n.status]||''}">${esc(n.status)}</span>`}
        <span class="status-pill s-pending"><span class="urgency-dot ${URGENCY_COLOR[n.urgency]}"></span>${esc(n.urgency)}</span>
        <span style="font-size:12px;color:var(--text-2)">${CAT_EMOJI[n.category]||'📦'} ${esc(n.category)}</span>
        ${waiting}
        ${staleDays(n.created_at) >= 3 ? staleBadge(n.created_at) : ''}
        ${isPending ? '' : triageBadge(n)}
      </div>
    </div>`;
}

function needFactsHtml(n) {
  const remote = n.can_help_remotely ? '<span style="color:var(--green);font-weight:600">Remote help OK</span>' : '';
  const family = `${n.family_adults} adult${n.family_adults!==1?'s':''}, ${n.family_children} child${n.family_children!==1?'ren':''}`;
  const helpers = n.status === 'pending' ? modalField('Helpers to alert', '<span id="reviewHelpers">…</span>', 'when you approve') : modalField('Navigator Org', esc(n.connector_org || '—'));
  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">
      ${modalField('Submitted', fmtCentral(n.created_at), n.created_at ? `${sinceText(n.created_at)} ago` : '')}
      ${modalField('Location', `${esc(n.city)}, ${esc(n.state)} ${esc(n.zip || '')}`, remote)}
      ${modalField('Family Size', family)}
      ${helpers}
    </div>`;
}

function needItemsHtml(n) {
  const items = n.items || [];
  if (!items.length) return modalField('Items Requested', '<span style="color:var(--text-3)">None listed</span>');
  const rows = items.map(it => `
    <div style="display:flex;justify-content:space-between;gap:12px;padding:8px 12px;border-top:1px solid var(--border)">
      <span>${esc(it.label)}</span><strong>${esc(it.amount_needed)}${it.unit && it.unit !== 'item' ? ' ' + esc(it.unit) : ''}</strong>
    </div>`).join('');
  return modalField('Items Requested', `<div style="border:1px solid var(--border);border-top:none;border-radius:8px;overflow:hidden;font-size:13px">${rows}</div>`);
}

function needDescriptionHtml(n) {
  return modalField('Full Description', `<div style="background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:12px;font-size:13px;line-height:1.7;white-space:pre-wrap">${esc(n.description || '—')}</div>`);
}

function needActionsHtml(n, extraHtml = '') {
  const pending = n.status === 'pending';
  return `
    <div id="questionBox" style="display:none;margin-top:16px">
      <label for="questionText" class="modal-field-label" style="display:block">Question for the navigator</label>
      <textarea id="questionText" rows="3" maxlength="1000" style="width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:8px;padding:10px;font:inherit;font-size:13px" placeholder="e.g. Which store is closest to the family?"></textarea>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-approve" id="questionSend" data-action="sendQuestion" data-a0="${n.id}">Send question</button>
        <button class="btn btn-delete" data-action="toggleQuestion" data-args="[false]">Cancel</button>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:20px;flex-wrap:wrap">
      ${pending ? `<button class="btn btn-approve" data-busy-for="${n.id}" data-busy-text="Approving…" data-action="approveSingle" data-args="[null,true]" data-a0="${n.id}">✓ Approve</button><button class="btn btn-reject" data-busy-for="${n.id}" data-busy-text="Rejecting…" data-action="modalShowReject" data-a0="${n.id}">✗ Reject</button>` : ''}
      ${pending ? `<button class="btn" style="border-color:var(--border)" data-action="toggleQuestion" data-args="[true]">Ask navigator a question</button>` : ''}
      ${extraHtml}
      <button class="btn btn-delete" style="${extraHtml ? '' : 'margin-left:auto'}" data-action="closeModal">Close</button>
    </div>`;
}

function renderNeedModal(n, extraActionsHtml = '') {
  const content = document.getElementById('modalContent');
  content.dataset.needId = n.id;
  content.innerHTML =
    needHeaderHtml(n) +
    `<div id="needReview" style="margin-bottom:16px;font-size:13px;color:var(--text-3)">Loading submitter…</div>` +
    needFactsHtml(n) + needItemsHtml(n) + needDescriptionHtml(n) +
    needActionsHtml(n, extraActionsHtml);
  document.getElementById('modalOverlay').classList.add('open');
  loadNeedReview(n.id);
}

async function loadNeedReview(needId) {
  const content = document.getElementById('modalContent');
  try {
    const r = await apiGet(`/admin/needs/${encodeURIComponent(needId)}/review`);
    if (content.dataset.needId !== needId) return;  // modal moved on to another need
    document.getElementById('needReview').innerHTML = submitterHtml(r.submitter, r.submitter_stats) + reviewChecksHtml(r.checks);
    const helpers = document.getElementById('reviewHelpers');
    if (helpers) helpers.textContent = `${r.helpers_to_alert}${r.helpers_capped ? '+' : ''} helper${r.helpers_to_alert !== 1 ? 's' : ''}`;
  } catch (e) {
    if (content.dataset.needId !== needId) return;
    document.getElementById('needReview').textContent = 'Could not load submitter details: ' + e.message;
    const helpers = document.getElementById('reviewHelpers');
    if (helpers) helpers.textContent = '—';
  }
}

function submitterHtml(s, stats) {
  if (!s) return `<div style="color:var(--text-3);margin-bottom:12px">Submitter account not found.</div>`;
  const initials = (s.name || '?').split(/\s+/).map(w => (w.match(/\p{L}/u) || [''])[0]).join('').slice(0, 2).toUpperCase() || '?';
  const role = s.role === 'connector' || s.role === 'navigator' ? 'Navigator' : s.role;
  const approved = s.approved_at ? `Approved ${parseUtc(s.approved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' })}` : esc(s.status);
  const contact = [s.email && `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>`, s.phone && `<a href="tel:${esc(s.phone)}">${esc(s.phone)}</a>`].filter(Boolean).join(' · ');
  const stat = (num, label, color) => `<div style="background:var(--surface-2);border-radius:8px;padding:8px 10px"><div style="font-size:18px;font-weight:800;color:${color}">${num}</div><div style="font-size:11px;color:var(--text-2)">${label}</div></div>`;
  return `
    <div style="border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:12px;color:var(--text)">
      <div class="modal-field-label">Submitted by</div>
      <div style="display:flex;gap:12px;align-items:center;margin:8px 0 12px">
        <div style="width:40px;height:40px;border-radius:50%;background:var(--surface-2);display:flex;align-items:center;justify-content:center;font-weight:800;flex-shrink:0">${esc(initials)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:700">${esc(s.name)} <span class="status-pill" style="font-size:11px">${esc(role)}</span> <span style="font-size:12px;color:var(--text-2)">${approved}</span></div>
          <div style="font-size:13px;color:var(--text-2);overflow-wrap:anywhere">${contact || 'No contact on file'}</div>
          <div style="font-size:13px;color:var(--text-2)">Org: ${esc(s.org_name || 'Independent navigator')}</div>
        </div>
        <button class="btn" style="border-color:var(--border);flex-shrink:0" data-action="modalOpenUser" data-a0="${esc(s.id)}">View profile</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
        ${stat(stats.submitted, 'needs submitted', 'var(--text)')}${stat(stats.approved, 'approved', 'var(--green)')}${stat(stats.rejected, 'rejected', 'var(--red, #b91c1c)')}
      </div>
    </div>`;
}

function reviewChecksHtml(c) {
  const ok = text => `<div style="display:flex;gap:8px;color:var(--text)"><span style="color:var(--green);font-weight:800">✓</span><span>${text}</span></div>`;
  const warn = text => `<div style="display:flex;gap:8px;color:var(--text)"><span style="color:var(--orange);font-weight:800">⚠</span><span>${text}</span></div>`;
  const recent = c.recent_needs.map(r => `#${esc(r.case_number)} ${esc(r.title)} (${esc(r.status)}, ${sinceText(r.created_at)} ago)`).join('<br>');
  const rows = [
    c.contact_info.length ? warn(`Contact details in public text: ${c.contact_info.map(esc).join(', ')}`) : ok('No phone numbers, emails, links or addresses in the public text'),
    c.recent_needs.length ? warn(`${c.recent_needs.length} other need${c.recent_needs.length !== 1 ? 's' : ''} from this navigator in the last 30 days:<br>${recent}`) : ok('No other needs from this navigator in the last 30 days'),
    c.auto_flag_reason ? warn(`Auto-flagged: ${esc(c.auto_flag_reason)}`) : ok('No auto-flags'),
    c.community_flag_count ? warn(`Reported by ${c.community_flag_count} user${c.community_flag_count !== 1 ? 's' : ''}`) : '',
  ];
  return `
    <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:8px">
      <div class="modal-field-label">Review checks</div>
      ${rows.join('')}
    </div>`;
}

function toggleQuestion(show) {
  document.getElementById('questionBox').style.display = show ? 'block' : 'none';
  if (show) document.getElementById('questionText').focus();
}

async function sendQuestion(needId) {
  const text = document.getElementById('questionText').value.trim();
  if (!text) { toast('Write a question first.', true); return; }
  const btn = document.getElementById('questionSend');
  btn.disabled = true;
  try {
    const r = await apiPost(`/admin/needs/${encodeURIComponent(needId)}/question`, { message: text });
    toast(r.emailed ? 'Question sent to the navigator (app + email).' : 'Question sent to the navigator in the app.');
    document.getElementById('questionText').value = '';
    toggleQuestion(false);
  } catch (e) { toast(e.message, true); }
  finally { btn.disabled = false; }
}

function openNeedModal(idx) {
  const n = pendingNeeds[idx];
  if (n) renderNeedModal(n);
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').classList.remove('open');
}

function openAllNeedModal(id) {
  const n = allNeedsCache.find(x => x.id === id);
  if (!n) return;
  renderNeedModal(n, `<a href="need?id=${encodeURIComponent(n.id)}" class="btn" style="margin-left:auto;text-decoration:none;display:inline-flex;align-items:center">View Full Page →</a>`);
}

/* ═══════════════════════════════════════════
   ALL NEEDS + PAGINATION + EXPORT
═══════════════════════════════════════════ */
let allPage = 1, allPages = 1, allTotal = 0;
let allNeedsCache = [];
let allDebounce;

function debounceLoadAll() { clearTimeout(allDebounce); allDebounce = setTimeout(() => goAllPage(1), 350); }

function goAllPage(p) { allPage = p; loadAllNeeds(); }

async function loadAllNeeds() {
  const search = document.getElementById('allSearch').value.trim();
  const status = document.getElementById('allStatus').value;
  let url = `/admin/needs?page=${allPage}`;
  if (status) url += `&status=${status}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  document.getElementById('allNeedsContent').innerHTML = '<div class="loading">Loading</div>';
  try {
    const data = await apiGet(url);
    allNeedsCache = data.items;
    allPages = data.pages || 1;
    allTotal = data.total || 0;
    if (!data.items.length) {
      document.getElementById('allNeedsContent').innerHTML = '<div class="empty"><div class="empty-icon">🔍</div>No needs found.</div>';
      document.getElementById('allPagination').style.display = 'none';
      return;
    }
    document.getElementById('allNeedsContent').innerHTML = `
      <table class="need-table">
        <thead><tr>
          <th>Case</th><th>Title</th><th>Category</th><th>Urgency</th>
          <th>Triage</th><th>Location</th><th>Status</th><th>Age</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${data.items.map(n => `
            <tr>
              <td><a href="need?id=${escHtml(n.id)}" style="color:var(--text-3);font-family:var(--mono);font-size:12px">#${escHtml(n.case_number)}</a></td>
              <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;cursor:pointer;color:var(--teal)" title="${escHtml(n.title)}" data-need-id="${escHtml(n.id)}" data-action="view-need">${escHtml(n.title)}</td>
              <td style="color:var(--text-2)">${escHtml(CAT_EMOJI[n.category]||'')} ${escHtml(n.category)}</td>
              <td><span class="urgency-dot ${escHtml(URGENCY_COLOR[n.urgency]||'')}"></span><span style="color:var(--text-2)">${escHtml(n.urgency)}</span></td>
              <td>${triageBadge(n)}</td>
              <td style="color:var(--text-2)">${escHtml(n.city)}, ${escHtml(n.state)}</td>
              <td><span class="status-pill ${escHtml(STATUS_CLASS[n.status]||'')}">${escHtml(n.status)}</span></td>
              <td>${staleBadge(n.created_at) || `<span style="font-size:11px;color:var(--text-3)">${staleDays(n.created_at)}d</span>`}</td>
              <td style="display:flex;gap:6px">
                <button class="btn" style="background:var(--blue-bg);color:var(--blue);border:1px solid rgba(88,166,255,0.25)" data-need-id="${escHtml(n.id)}" data-action="view-need">View</button>
                ${n.status==='pending'?`<button class="btn btn-approve" data-need-id="${escHtml(n.id)}" data-busy-for="${escHtml(n.id)}" data-busy-text="Approving…" data-action="approve-need">Approve</button>`:''}
                <button class="btn btn-delete" data-need-id="${escHtml(n.id)}" data-need-title="${escHtml(n.title)}" data-action="delete-need">Delete</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
    // Wire up data-action buttons (safe — no inline onclick with user data)
    document.getElementById('allNeedsContent').querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', () => {
        const action = el.dataset.action;
        const id = el.dataset.needId;
        const title = el.dataset.needTitle;
        if (action === 'view-need') openAllNeedModal(id);
        else if (action === 'approve-need') approveSingle(id);
        else if (action === 'delete-need') deleteNeed(id, title);
      });
    });
    const pag = document.getElementById('allPagination');
    pag.style.display = allPages > 1 ? 'flex' : 'none';
    document.getElementById('allPageInfo').textContent = `Page ${allPage} / ${allPages}`;
    document.getElementById('allTotalInfo').textContent = `${allTotal} total`;
    document.getElementById('allPrev').disabled = allPage <= 1;
    document.getElementById('allNext').disabled = allPage >= allPages;
  } catch(e) {
    document.getElementById('allNeedsContent').innerHTML = '<div class="empty">Failed to load.</div>';
  }
}

async function exportAllNeedsCSV() {
  try {
    toast('Fetching data for export…');
    const data = await apiGet('/admin/needs?page=1&per_page=5000');
    const rows = [['Case#','Title','Category','Urgency','Status','City','State','Adults','Children','Navigator Org','Created']];
    (data.items || []).forEach(n => rows.push([n.case_number,n.title,n.category,n.urgency,n.status,n.city,n.state,n.family_adults,n.family_children,n.connector_org||'',n.created_at||'']));
    downloadCSV(rows, `migrantportal-needs-${new Date().toISOString().slice(0,10)}.csv`);
    toast(`✓ Exported ${rows.length-1} needs.`);
  } catch(e) { toast('Export failed.', true); }
}

/* ═══════════════════════════════════════════
   USERS + PAGINATION + EXPORT
═══════════════════════════════════════════ */
let usersPage = 1, usersPages = 1, usersTotal = 0;
let usersCache = [];

function goUsersPage(p) { usersPage = p; loadUsers(); }

let pendingCount = 0;

let coverageData = null;

function renderUsersTiles() {
  const s = coverageData ? coverageData.summary : { gap_cities: 0, needs_in_thin_areas: 0 };
  document.getElementById('usersTiles').innerHTML =
    `<div class="np-tile"><b>${usersTotal}</b><span>Active users</span></div>
     <div class="np-tile"><b${pendingCount ? ' style="color:var(--yellow)"' : ''}>${pendingCount}</b><span>Awaiting approval</span></div>
     <div class="np-tile"><b${s.gap_cities ? ' style="color:var(--red)"' : ''}>${s.gap_cities}</b><span>Cities with open needs and no responders</span></div>
     <div class="np-tile"><b>${s.needs_in_thin_areas}</b><span>Open needs in thin areas</span></div>`;
}

const catLabel = c => c.charAt(0).toUpperCase() + c.slice(1);
const coverageStatusPill = c => ({
  gap: `<span class="status-pill s-rejected">${c.responders ? `${c.gaps} gap${c.gaps === 1 ? '' : 's'}` : 'No responders'}</span>`,
  thin: '<span class="status-pill s-pending">Thin</span>',
  ok: '<span class="status-pill s-active">Covered</span>',
}[c.status]);

function coverageCell(cell, city, category) {
  if (!cell.needs) return '<span class="np-cell np-cx">·</span>';
  const tone = Math.min(cell.responders, 2);
  return `<span class="np-cell np-c${tone}" title="${cell.needs} open need(s), ${cell.responders} responder(s)" data-city="${esc(city)}" data-action="goCoverageCity" data-args="[{&quot;$&quot;:&quot;this&quot;}]">${cell.responders}</span>`;
}

function renderUsersCoverage() {
  const d = coverageData;
  const table = document.getElementById('ucovTable');
  document.getElementById('utc-coverage').textContent = d ? d.cities.length : 0;
  if (!d || !d.cities.length) {
    table.innerHTML = '<tbody><tr><td><div class="empty">No approved responders or open needs yet.</div></td></tr></tbody>';
    document.getElementById('ucovGaps').textContent = '';
    return;
  }
  const cats = d.categories.filter(c => d.cities.some(city => city.cells[c].needs > 0));
  table.innerHTML =
    `<thead><tr><th>City</th><th>Open needs</th>${cats.map(c => `<th>${esc(catLabel(c))}</th>`).join('')}<th>Status</th></tr></thead><tbody>` +
    d.cities.map(c => `<tr><td><b>${esc(c.city)}${c.state ? ', ' + esc(c.state) : ''}</b>
      <div style="font-size:12px;color:var(--text-2)">${c.responders} responder${c.responders === 1 ? '' : 's'} · ${c.navigators} navigator${c.navigators === 1 ? '' : 's'}</div></td>
      <td style="font-weight:700;${c.open_needs && c.status === 'gap' ? 'color:var(--red)' : ''}">${c.open_needs}</td>
      ${cats.map(cat => `<td>${coverageCell(c.cells[cat], c.city, cat)}</td>`).join('')}
      <td>${coverageStatusPill(c)}</td></tr>`).join('') + '</tbody>';
  document.getElementById('ucovGaps').textContent = d.summary.gap_cities
    ? `${d.summary.gap_cities} cit${d.summary.gap_cities === 1 ? 'y has' : 'ies have'} open needs and no responders` : '';
}

async function loadUsersCoverage() {
  try {
    coverageData = await apiGet('/admin/users/coverage');
    renderUsersCoverage();
    renderUsersTiles();
  } catch(e) {
    document.getElementById('ucovTable').innerHTML = '<tbody><tr><td><div class="empty">Could not load coverage.</div></td></tr></tbody>';
  }
}

function goCoverageCity(cell) {
  const wanted = cell.dataset.city.toLowerCase();
  const option = [...document.getElementById('userCity').options].find(o => o.value.toLowerCase() === wanted);
  if (!option) { toast(`No approved users in ${cell.dataset.city} yet.`); return; }
  document.getElementById('userCity').value = option.value;
  setUsersTab('active');
  goUsersPage(1);
}

async function loadPendingUsers() {
  try {
    const data = await apiGet('/admin/users/pending');
    const users = Array.isArray(data) ? data : [];
    pendingCount = users.length;
    document.getElementById('utc-pending').textContent = users.length;
    document.getElementById('utc-pending').style.background = users.length ? 'var(--yellow-bg)' : '';
    document.getElementById('pendingUsersContent').innerHTML = users.length
      ? users.map(renderPendingUser).join('')
      : '<div class="empty">No signups waiting for approval.</div>';
    updatePendingBulk();
    renderUsersTiles();
  } catch(e) { console.error(e); }
}

const selectedPendingIds = () => [...document.querySelectorAll('.pck:checked')].map(c => c.value);
function updatePendingBulk() {
  const n = selectedPendingIds().length;
  document.getElementById('pendingBulkCount').textContent = `${n} selected`;
  document.getElementById('pendingBulk').classList.toggle('on', n > 0);
}

async function bulkApprove() {
  const ids = selectedPendingIds();
  if (!ids.length || !await showConfirmModal({ title: 'Approve Users', message: `Approve ${ids.length} user(s)? They will be able to sign in right away.`, confirmText: 'Approve', danger: false })) return;
  let failed = 0;
  for (const id of ids) { try { await apiPost(`/admin/users/${id}/approve`, {}); } catch(e) { failed++; } }
  toast(failed ? `${ids.length - failed} approved; ${failed} failed.` : `✓ Approved ${ids.length} users.`, failed > 0);
  loadPendingUsers(); loadUsers();
}

const DISPOSABLE_EMAIL_DOMAINS = ['yopmail.com','mailinator.com','guerrillamail.com','10minutemail.com','tempmail.com','trashmail.com','sharklasers.com','getnada.com','maildrop.cc'];
const TEST_EMAIL_DOMAINS = ['example.com','yopmail.com'];
const isTestEmail = email => TEST_EMAIL_DOMAINS.includes((email || '').split('@').pop().toLowerCase());
const TEST_PILL = '<span class="status-pill s-test">TEST</span>';
const NOT_PROVIDED ='<span style="color:var(--text-2)">Not provided</span>';

function pendingChip(label, value) {
  return `<span class="pu-chip"><b>${esc(label)}</b> ${value ? esc(value) : 'Not provided'}</span>`;
}

function pendingDetail(label, value) {
  return `<div><small>${esc(label)}</small><span>${value ? esc(value) : NOT_PROVIDED}</span></div>`;
}

function pendingAgeLabel(createdAt) {
  if (!createdAt) return '';
  const d = new Date(createdAt.endsWith('Z') || /[+-]\d\d:\d\d$/.test(createdAt) ? createdAt : createdAt + 'Z');
  return d.toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' });
}

function renderPendingUser(u) {
  const domain = (u.email || '').split('@').pop().toLowerCase();
  const location = [u.city, u.state].filter(Boolean).join(', ');
  const isDisposable = DISPOSABLE_EMAIL_DOMAINS.includes(domain);
  const org = u.org;
  const sameDomain = u.same_domain_accounts || [];
  const emailHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(u.email)}&su=${encodeURIComponent('MigrantPortal application - a quick question')}&body=${encodeURIComponent(`Hi ${u.name},\n\nThanks for applying to MigrantPortal. Before we can approve your account, could you share a bit more detail about how you'd like to help?\n\n`)}`;
  const roleDetails = isConnector(u)
    ? pendingDetail('Org website', org && org.website) + pendingDetail('Legal name', org && org.legal_name) + pendingDetail('EIN', org && org.ein) + pendingDetail('Org description', org && org.description)
    : pendingDetail('Responder type', u.responder_type) + pendingDetail('Can help with', (u.need_categories || []).join(', '));
  return `
    <div id="pu-${esc(u.id)}" class="pu-row">
      <div class="pu-top">
        <input type="checkbox" class="pck" value="${esc(u.id)}" aria-label="Select ${esc(u.name)}" style="margin-top:4px" data-change="updatePendingBulk">
        <div class="pu-main">
          <div style="font-weight:700;font-size:15px">
            ${esc(u.name)}
            <span class="status-pill ${isConnector(u)?'s-active':'s-pending'}" style="margin-left:6px">${esc(u.role)}</span>${isTestEmail(u.email) ? TEST_PILL : ''}
          </div>
          <div style="font-size:12px;color:var(--text-2);margin-top:2px">${esc(u.email)}${u.org_name?' · '+esc(u.org_name):''}</div>
          <div class="pu-chips">
            <span class="pu-chip"><b>Signed up</b> ${esc(pendingAgeLabel(u.created_at))} ${timeInQueue(u.created_at)}</span>
            ${pendingChip('Phone', u.phone)}
            ${pendingChip('Location', location)}
            ${pendingChip('Language', (u.preferred_language || '').toUpperCase())}
            ${u.email_verified ? '<span class="pu-chip pu-ok">Email verified</span>' : '<span class="pu-chip pu-warn">Email not verified</span>'}
            ${isDisposable ? `<span class="pu-chip pu-warn">Disposable email domain (${esc(domain)})</span>` : ''}
          </div>
          <div class="pu-why ${u.registration_notes ? '' : 'pu-empty'}"><b>Why joining:</b> ${u.registration_notes ? esc(u.registration_notes) : 'None provided'}</div>
          <button class="pu-tog" data-action="togglePendingDetails" data-args="[null,{&quot;$&quot;:&quot;this&quot;}]" data-a0="${esc(u.id)}">▼ Details</button>
          <div class="pu-det" id="pu-det-${esc(u.id)}">
            <div class="pu-grid">
              ${pendingDetail('Org name', (org && org.name) || u.org_name)}
              ${roleDetails}
              ${pendingDetail('Referral source', u.referral_source)}
              ${pendingDetail('Can submit needs', u.can_submit_needs ? 'Yes' : 'No')}
              ${pendingDetail('Country', u.country)}
              ${pendingDetail('User ID', u.id)}
            </div>
            <div style="margin-top:10px;font-size:12px;color:var(--text-2)"><b>Other accounts at @${esc(domain)}:</b>
              ${sameDomain.length ? sameDomain.map(o => `${esc(o.name)} (${esc(o.role)}, ${esc(o.status)})`).join('; ') : 'none'}
            </div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;margin-top:2px">
          <a class="btn" style="background:var(--surface-2);color:var(--text-2);border-color:var(--border);text-decoration:none;display:inline-flex;align-items:center" target="_blank" rel="noopener" href="${esc(emailHref)}">✉ Email</a>
          <button class="btn btn-approve" data-action="approveUser" data-a0="${esc(u.id)}">✓ Approve</button>
          <button class="btn btn-reject" data-action="rejectUser" data-a0="${esc(u.id)}">✗ Reject</button>
        </div>
      </div>
    </div>`;
}

function togglePendingDetails(id, btn) {
  const panel = document.getElementById(`pu-det-${id}`);
  const isOpen = panel.classList.toggle('open');
  btn.textContent = isOpen ? '▲ Hide details' : '▼ Details';
}

async function approveUser(id) {
  try {
    await apiPost(`/admin/users/${id}/approve`, {});
    toast('✓ User approved — they can now sign in.');
    loadPendingUsers();
    loadUsers();
  } catch(e) { toast(e.message, true); }
}

async function rejectUser(id) {
  const reason = await showRejectModal({ title: 'Reject User', subtitle: 'Select a reason or write a custom one. The user will be notified.', presets: USER_REJECT_PRESETS });
  if (reason === null) return;
  try {
    await apiPost(`/admin/users/${id}/reject`, { reason: reason || '' });
    toast('User rejected. Find them under Users → Rejected.');
    loadPendingUsers();
    loadUsers();
  } catch(e) { toast(e.message, true); }
}

const AVATAR_COLORS = ['#0D7A8A','#E8663F','#4C7FD9','#2E9E5B','#CE8A1E','#7A5BD9','#8C9BA8'];
const initials = n => (String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('') || '?').toUpperCase();
const avatarColor = id => AVATAR_COLORS[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
const avatarHtml = u => `<div class="uav" style="background:${avatarColor(u.id)}">${esc(initials(u.name))}</div>`;
const roleLabel = u => (u.role === 'connector' ? 'navigator' : u.role);
const rolePill = u => `<span class="status-pill ${u.role === 'admin' ? 's-fulfilled' : isConnector(u) ? 's-active' : 's-pending'}">${esc(roleLabel(u))}</span>`;
const jsq = s => esc(String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
const matchesSearch = (u, q) => !q || `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase());
let usersTab = 'active', deletedCache = [];

function setUsersTab(tab) {
  usersTab = tab;
  document.querySelectorAll('.utab').forEach(b => b.classList.toggle('on', b.dataset.ut === tab));
  ['active', 'pending', 'coverage', 'deleted', 'test'].forEach(t => { document.getElementById('ut-' + t).style.display = t === tab ? '' : 'none'; });
  document.getElementById('usersPagination').style.display = tab === 'active' && usersTotal > 0 ? 'flex' : 'none';
}

function toggleUserMenu(ev, btn) {
  ev.stopPropagation();
  const menu = btn.parentElement.querySelector('.umenu');
  const wasOpen = menu.classList.contains('open');
  document.querySelectorAll('.umenu.open').forEach(m => m.classList.remove('open'));
  if (!wasOpen) menu.classList.add('open');
}
document.addEventListener('click', () => document.querySelectorAll('.umenu.open').forEach(m => m.classList.remove('open')));

const STATUS_DOT = { approved: ['#22a05a', 'Active'], rejected: ['#d92d20', 'Rejected'] };
function statusDot(u) {
  const [color, label] = STATUS_DOT[u.status] || ['#98a2b3', u.status || '—'];
  return `<span style="display:inline-flex;align-items:center;gap:6px;white-space:nowrap"><i style="width:8px;height:8px;border-radius:50%;background:${color}"></i>${esc(label)}</span>`;
}

function activityLabel(u) {
  const parts = [];
  if (u.needs_count) parts.push(`${u.needs_count} need${u.needs_count === 1 ? '' : 's'}`);
  if (u.responses_count) parts.push(`${u.responses_count} response${u.responses_count === 1 ? '' : 's'}`);
  return parts.length ? esc(parts.join(' · ')) : '<span style="color:var(--text-3)">No activity yet</span>';
}

function gmailCompose({ to = '', bcc = '', subject = '', body = '' }) {
  const q = new URLSearchParams({ view: 'cm', fs: '1', to, bcc, su: subject, body });
  window.open(`https://mail.google.com/mail/?${q}`, '_blank', 'noopener');
}

function inviteUser() {
  gmailCompose({
    subject: 'You are invited to join MigrantPortal',
    body: 'Hi,\n\nI would like to invite you to join MigrantPortal, where volunteers and navigators connect families with the help they need.\n\nYou can sign up here: https://migrantportal.com/register\n\nThank you,\nMigrantPortal',
  });
}

function bulkEmail() {
  const ids = new Set(selectedActiveIds());
  const emails = usersCache.filter(u => ids.has(u.id) && u.email).map(u => u.email);
  if (!emails.length) return;
  gmailCompose({ bcc: emails.join(','), subject: 'MigrantPortal update' });
}

function userRowHtml(u) {
  const name = jsq(u.name);
  const isSelf = u.id === user.id;
  const canManage = !isSelf && u.role !== 'admin';
  const rejected = u.status === 'rejected';
  return `
    <tr class="urow" data-action="openUserDrawer" data-a0="${u.id}">
      <td data-action="stop" data-args="[{&quot;$&quot;:&quot;event&quot;}]">${canManage && !rejected ? `<input type="checkbox" class="ack" value="${u.id}" aria-label="Select ${esc(u.name)}" data-change="updateActiveBulk">` : ''}</td>
      <td><div class="uwho">${avatarHtml(u)}<div><b>${esc(u.name)}${isSelf ? ' <small style="display:inline">(you)</small>' : ''}${u.is_test ? TEST_PILL : ''}</b><small>${esc(u.email)}</small></div></div></td>
      <td>${rolePill(u)}
        ${u.role === 'responder' && !rejected ? `<label class="uperm" data-action="stop" data-args="[{&quot;$&quot;:&quot;event&quot;}]"><input type="checkbox" ${u.can_submit_needs ? 'checked' : ''} data-change="changeCanSubmit" data-args="[null,{&quot;$&quot;:&quot;this&quot;}]" data-a0="${u.id}"> Can submit needs</label>` : ''}
      </td>
      <td>${statusDot(u)}</td>
      <td style="color:var(--text-2)">${esc(u.org_name || '—')}</td>
      <td style="color:var(--text-2)">${esc([u.city, u.state].filter(Boolean).join(', ') || '—')}</td>
      <td style="font-size:12px">${activityLabel(u)}</td>
      <td style="color:var(--text-3);font-size:12px">${u.created_at ? esc(u.created_at.slice(0, 10)) : '—'}</td>
      <td style="white-space:nowrap;text-align:right" data-action="stop" data-args="[{&quot;$&quot;:&quot;event&quot;}]">
        ${rejected ? `<button class="btn btn-approve" data-action="reconsiderUser" data-a0="${u.id}" data-a1="${name}">Reconsider</button> ` : ''}
        <span class="umenu-wrap">
          <button class="btn btn-secondary" aria-label="More actions" data-action="toggleUserMenu" data-args="[{&quot;$&quot;:&quot;event&quot;},{&quot;$&quot;:&quot;this&quot;}]">⋯</button>
          <div class="umenu">
            <button data-action="openUserDrawer" data-a0="${u.id}">View details</button>
            ${canManage && !rejected ? `<button data-action="promptChangeRole" data-a0="${u.id}" data-a1="${roleLabel(u)}">Change role…</button>` : ''}
            ${canManage ? `<hr><button class="d" data-action="deleteUser" data-a0="${u.id}" data-a1="${name}">Delete user…</button>` : ''}
          </div>
        </span>
      </td>
    </tr>`;
}

function usersTableHtml(list, emptyMsg) {
  if (!list.length) return `<div class="empty">${emptyMsg}</div>`;
  return `<table class="need-table"><thead><tr><th style="width:28px"><input type="checkbox" aria-label="Select all" data-change="toggleAllActive" data-args="[{&quot;$&quot;:&quot;this&quot;}]"></th><th>User</th><th>Role</th><th>Status</th><th>Org</th><th>Location</th><th>Activity</th><th>Joined</th><th></th></tr></thead><tbody>${list.map(userRowHtml).join('')}</tbody></table>`;
}

function renderUsersTabs() {
  const real = usersCache.filter(u => !u.is_test);
  const test = usersCache.filter(u => u.is_test);
  const qa = document.getElementById('userSearch').value.trim();
  const qt = document.getElementById('testSearch').value.trim();
  document.getElementById('usersContent').innerHTML = usersTableHtml(real.filter(u => matchesSearch(u, qa)), qa ? 'No users match your search.' : 'No users found.');
  document.getElementById('testUsersContent').innerHTML = usersTableHtml(test.filter(u => matchesSearch(u, qt)), 'No test accounts on this page.');
  document.getElementById('utc-active').textContent = real.length;
  document.getElementById('utc-test').textContent = test.length;
  updateActiveBulk();
}

const selectedActiveIds = () => [...document.querySelectorAll('.ack:checked')].map(c => c.value);
function toggleAllActive(box) {
  box.closest('table').querySelectorAll('.ack').forEach(c => { c.checked = box.checked; });
  updateActiveBulk();
}
function updateActiveBulk() {
  const n = selectedActiveIds().length;
  document.getElementById('activeBulkCount').textContent = `${n} selected`;
  document.getElementById('activeBulk').classList.toggle('on', n > 0);
}

let roleModalResolve = null;
function showRoleModal({ subtitle, current = '' }) {
  document.getElementById('roleModalSub').textContent = subtitle;
  document.getElementById('roleModalOpts').innerHTML = ['navigator', 'responder', 'admin'].map(r =>
    `<label style="display:flex;gap:8px;align-items:center;padding:10px 12px;border:1px solid var(--border);border-radius:10px;cursor:pointer;text-transform:capitalize">
      <input type="radio" name="newRole" value="${r}" ${r === current ? 'checked' : ''} data-change="roleModalWarn" data-args="[{&quot;$&quot;:&quot;value&quot;}]"> ${r}</label>`).join('');
  document.getElementById('roleModalWarn').style.display = 'none';
  document.getElementById('roleOverlay').classList.add('open');
  return new Promise(res => { roleModalResolve = res; });
}
function resolveRoleModal(role) {
  document.getElementById('roleOverlay').classList.remove('open');
  if (roleModalResolve) { roleModalResolve(role); roleModalResolve = null; }
}

async function bulkChangeRole() {
  const ids = selectedActiveIds();
  if (!ids.length) return;
  const role = await showRoleModal({ subtitle: `Set the role for ${ids.length} selected user(s).` });
  if (!role) return;
  let failed = 0;
  for (const id of ids) { try { await apiPatch(`/admin/users/${id}/role`, { role }); } catch(e) { failed++; } }
  toast(failed ? `${ids.length - failed} changed; ${failed} failed.` : `✓ ${ids.length} users are now ${role}s.`, failed > 0);
  loadUsers();
}

function fillCityOptions(cities) {
  const select = document.getElementById('userCity');
  const selected = select.value;
  select.innerHTML = '<option value="">All cities</option>' +
    cities.map(c => `<option value="${esc(c)}"${c === selected ? ' selected' : ''}>${esc(c)}</option>`).join('');
}

async function loadUsers() {
  const role = document.getElementById('roleFilter').value;
  let url = `/admin/users?page=${usersPage}`;
  if (role) url += `&role=${role}`;
  const status = document.getElementById('statusFilter').value;
  if (status) url += `&status=${status}`;
  ['userCity:city', 'userActivity:activity', 'userSort:sort'].forEach(pair => {
    const [id, param] = pair.split(':');
    const value = document.getElementById(id).value;
    if (value) url += `&${param}=${encodeURIComponent(value)}`;
  });
  document.getElementById('usersContent').innerHTML = '<div class="loading">Loading</div>';
  try {
    const data = await apiGet(url);
    usersCache = data.items || [];
    usersPages = data.pages || 1;
    usersTotal = data.total || 0;
    fillCityOptions(data.cities || []);
    renderUsersTabs();
    renderUsersTiles();
    const pag = document.getElementById('usersPagination');
    pag.style.display = usersTab === 'active' && usersTotal > 0 ? 'flex' : 'none';
    const pageSize = data.page_size || usersCache.length || 1;
    const first = (usersPage - 1) * pageSize + 1;
    document.getElementById('usersPageInfo').textContent = `Showing ${first}–${first + usersCache.length - 1} of ${usersTotal}`;
    document.getElementById('usersTotalInfo').textContent = '';
    document.getElementById('usersPrev').disabled = usersPage <= 1;
    document.getElementById('usersNext').disabled = usersPage >= usersPages;
  } catch(e) {
    document.getElementById('usersContent').innerHTML = '<div class="empty">Failed to load users.</div>';
  }
}

async function promptChangeRole(id, current) {
  const u = usersCache.find(x => x.id === id);
  const role = await showRoleModal({ subtitle: `${u ? u.name : 'This user'} is currently ${current}.`, current });
  if (!role || role === current) return;
  await changeRole(id, role);
  loadUsers();
}

/* ── User details drawer ── */
async function openUserDrawer(id) {
  const drawer = document.getElementById('userDrawer');
  document.getElementById('userDrawerBg').classList.add('open');
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  drawer.innerHTML = '<div class="db"><div class="loading">Loading</div></div>';
  const listed = usersCache.find(u => u.id === id) || deletedCache.find(u => u.id === id);
  try {
    const d = await apiGet(`/admin/users/${id}`);
    drawer.innerHTML = userDrawerHtml({ ...listed, ...d }, false);
  } catch(e) {
    // Deleted users are not served by the detail endpoint; show what the list already has.
    drawer.innerHTML = listed ? userDrawerHtml(listed, true) : '<div class="db"><div class="empty">Could not load this user.</div></div>';
  }
}

function closeUserDrawer() {
  document.getElementById('userDrawerBg').classList.remove('open');
  const drawer = document.getElementById('userDrawer');
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeUserDrawer(); if (roleModalResolve) resolveRoleModal(null); } });

const ALERT_CAT_LABELS = { legal: 'Legal Aid' };
const alertCatLabel = c => ALERT_CAT_LABELS[c] || catLabel(String(c));

// Responders only. Hidden when the API did not send the field (older backend) so we never claim "all categories" falsely.
function alertSettingsHtml(u) {
  if (u.role !== 'responder' || !Array.isArray(u.need_categories)) return '';
  const cats = u.need_categories;
  const chips = cats.length
    ? `<div class="chips">${cats.map(c => `<span class="chip">${esc(alertCatLabel(c))}</span>`).join('')}</div>`
    : '<div class="chips"><span class="chip all">All categories</span></div><div class="hint">None chosen, so they get alerts for every category.</div>';
  const radius = u.notification_radius == null ? 'Any distance' : `Within ${u.notification_radius} miles`;
  return `<div class="ds"><h4>Alert settings</h4><dl><dt>Can help with</dt><dd>${chips}</dd><dt>Alert radius</dt><dd>${esc(radius)}</dd></dl></div>`;
}

function userDrawerHtml(u, isDeleted) {
  const row = (k, v) => v ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : '';
  const s = u.stats;
  const list = (items, fmt, empty) => items && items.length ? items.map(fmt).join('') : `<div class="li" style="color:var(--text-3)">${empty}</div>`;
  const canManage = u.id !== user.id && u.role !== 'admin';
  const name = jsq(u.name);
  return `
    <div class="dh">${avatarHtml(u)}<div style="flex:1;min-width:0"><b style="font-size:16px">${esc(u.name)}</b><div>${rolePill(u)} ${isDeleted ? '<span class="status-pill s-rejected">deleted</span>' : (u.status === 'rejected' ? '<span class="status-pill s-rejected">rejected</span>' : '<span class="status-pill s-active">approved</span>')}${u.is_test ? TEST_PILL : ''}</div></div>
      <button class="btn btn-secondary" data-action="closeUserDrawer" aria-label="Close">✕</button></div>
    <div class="db">
      ${s ? `<div class="ds"><div class="stats" style="grid-template-columns:repeat(4,1fr)">
        <div><b>${s.needs_submitted}</b><span>Needs</span></div><div><b>${s.needs_fulfilled}</b><span>Needs fulfilled</span></div>
        <div><b>${s.responses_made}</b><span>Responses</span></div><div><b>${s.responses_fulfilled}</b><span>Resp. fulfilled</span></div></div></div>` : ''}
      <div class="ds"><h4>Contact</h4><dl>
        ${row('Email', u.email)}${row('Location', [u.city, u.state].filter(Boolean).join(', '))}${row('Language', u.preferred_language)}
        ${row('Organization', u.org_name)}${row('Responder type', u.responder_type)}${row('Joined', u.created_at && u.created_at.slice(0, 10))}
        ${isDeleted ? row('Deleted', u.deleted_at) : ''}
      </dl></div>
      ${alertSettingsHtml(u)}
      ${u.registration_notes ? `<div class="ds"><h4>Signup notes</h4><div style="font-size:13px">${esc(u.registration_notes)}</div></div>` : ''}
      ${u.status === 'rejected' && u.rejection_reason ? `<div class="ds"><h4>Rejection reason</h4><div style="font-size:13px">${esc(u.rejection_reason)}</div></div>` : ''}
      ${s ? `<div class="ds"><h4>Recent needs</h4>${list(u.recent_needs, n => `<div class="li"><span>${esc(n.title)}</span><span style="color:var(--text-3)">${esc(n.status)} · ${esc(n.created_at)}</span></div>`, 'No needs yet.')}</div>
      <div class="ds"><h4>Recent responses</h4>${list(u.recent_responses, r => `<div class="li"><span>${esc(r.need_title)}</span><span style="color:var(--text-3)">${esc(r.response_status)} · ${esc(r.created_at)}</span></div>`, 'No responses yet.')}</div>`
      : `<div class="ds"><h4>Activity</h4><div style="font-size:13px;color:var(--text-3)">Activity is not available for deleted users. Restore them to see it.</div></div>`}
    </div>
    <div class="df">
      ${isDeleted
        ? `<button class="btn btn-approve" data-action="drawerRestoreUser" data-a0="${u.id}" data-a1="${esc(u.name)}">Restore</button>
           <button class="btn btn-reject" data-action="drawerPermanentlyDeleteUser" data-a0="${u.id}" data-a1="${esc(u.name)}">Delete permanently…</button>`
        : `${u.email ? `<button class="btn btn-secondary" data-action="gmailComposeTo" data-a0="${esc(u.email)}">✉ Email</button>` : ''}
           ${canManage && u.status !== 'rejected' ? `<button class="btn btn-secondary" data-action="drawerPromptChangeRole" data-a0="${u.id}" data-a1="${esc(roleLabel(u))}">Change role…</button>` : ''}
           ${canManage ? `<button class="btn btn-delete" data-action="drawerDeleteUser" data-a0="${u.id}" data-a1="${esc(u.name)}">Delete user…</button>` : ''}`}
    </div>`;
}

async function reconsiderUser(id, name) {
  try {
    await apiPost(`/admin/users/${id}/reconsider`, {});
    toast(`${name} moved back to Pending Approvals.`);
    loadUsers();
    loadPendingUsers();
  } catch(e) { toast(e.message || 'Failed to reconsider user.', true); }
}

async function purgeTestAccounts() {
  let pending, everyone;
  try {
    pending = await apiGet('/admin/users/pending');
    const first = await apiGet('/admin/users?status=all&page=1');
    const rest = await Promise.all(Array.from({ length: Math.max(0, (first.pages || 1) - 1) }, (_, i) => apiGet(`/admin/users?status=all&page=${i + 2}`)));
    everyone = [first, ...rest].flatMap(p => p.items || []);
  } catch(e) { toast('Could not load users to purge.', true); return; }
  const targets = [...(Array.isArray(pending) ? pending : []), ...everyone].filter(u => isTestEmail(u.email) && u.role !== 'admin' && u.id !== user.id);
  if (!targets.length) { toast('No test accounts found.'); return; }
  if (!await showConfirmModal({ title: 'Purge Test Accounts', message: `Permanently delete ${targets.length} test account(s) (example.com / yopmail.com emails)? This cannot be undone.`, confirmText: 'Purge', danger: true })) return;
  let failed = 0;
  for (const u of targets) {
    try {
      await apiDelete(`/admin/users/${u.id}`);
      await apiDelete(`/admin/users/${u.id}/permanent`);
    } catch(e) { failed++; }
  }
  toast(failed ? `Purged ${targets.length - failed}; ${failed} failed.` : `✓ Purged ${targets.length} test accounts.`, failed > 0);
  loadPendingUsers(); loadUsers(); loadDeletedUsers();
}

async function changeRole(userId, role) {
  if (!role) return;
  try { await apiPatch(`/admin/users/${userId}/role`, { role }); toast(`Role changed to ${role}.`); }
  catch(e) { toast(e.message, true); }
}

async function changeCanSubmit(userId, checkbox) {
  const canSubmit = checkbox.checked;
  try {
    await apiPatch(`/admin/users/${userId}/can-submit-needs`, { can_submit_needs: canSubmit });
    toast(canSubmit ? 'Can now submit needs.' : 'Submit-needs access removed.');
  } catch(e) {
    checkbox.checked = !canSubmit;
    toast(e.message, true);
  }
}

async function deleteUser(id, name) {
  if (!await showConfirmModal({ title: 'Delete User', message: `Delete "${name}"? They will be locked out immediately. You can restore them from the Deleted tab.`, confirmText: 'Delete', danger: true })) return;
  try {
    await apiDelete(`/admin/users/${id}`);
    toast('User deleted. Restore anytime from the Deleted tab.');
    loadUsers();
    loadDeletedUsers();
  } catch(e) { toast(e.message || 'Failed to delete user.', true); }
}

const RESTORE_WINDOW_DAYS = 30;
const daysLeft = deletedAt => {
  const t = Date.parse(deletedAt);
  return Number.isNaN(t) ? null : Math.max(0, RESTORE_WINDOW_DAYS - Math.floor((Date.now() - t) / 86400000));
};

async function loadDeletedUsers() {
  try {
    deletedCache = await apiGet('/admin/users/deleted');
    document.getElementById('utc-deleted').textContent = deletedCache.length;
    renderDeletedUsers();
    renderUsersTiles();
  } catch(e) {
    document.getElementById('deletedUsersContent').innerHTML = '<div class="empty">Could not load deleted users.</div>';
  }
}

function deletedRowHtml(u) {
  const name = jsq(u.name);
  return `
    <tr class="urow" data-action="openUserDrawer" data-a0="${u.id}">
      <td data-action="stop" data-args="[{&quot;$&quot;:&quot;event&quot;}]"><input type="checkbox" class="dck" value="${u.id}" data-change="updateDeletedBulk"></td>
      <td><div class="uwho">${avatarHtml(u)}<div><b>${esc(u.name)}</b><small>${esc(u.email)}</small></div></div></td>
      <td>${rolePill(u)}</td>
      <td style="color:var(--text-3);font-size:12px">${esc(u.deleted_at || '—')}</td>
      <td style="white-space:nowrap;text-align:right" data-action="stop" data-args="[{&quot;$&quot;:&quot;event&quot;}]">
        <button class="btn btn-approve" data-action="restoreUser" data-a0="${u.id}" data-a1="${name}">Restore</button>
        <span class="umenu-wrap">
          <button class="btn btn-secondary" aria-label="More actions" data-action="toggleUserMenu" data-args="[{&quot;$&quot;:&quot;event&quot;},{&quot;$&quot;:&quot;this&quot;}]">⋯</button>
          <div class="umenu">
            <button data-action="openUserDrawer" data-a0="${u.id}">View details</button><hr>
            <button class="d" data-action="permanentlyDeleteUser" data-a0="${u.id}" data-a1="${name}">Delete permanently…</button>
          </div>
        </span>
      </td>
    </tr>`;
}

function renderDeletedUsers() {
  const q = document.getElementById('deletedSearch').value.trim();
  const list = deletedCache.filter(u => matchesSearch(u, q));
  const el = document.getElementById('deletedUsersContent');
  if (!list.length) {
    el.innerHTML = `<div class="empty">${deletedCache.length ? 'No deleted users match your search.' : 'No deleted users. Anyone you delete will show up here so you can restore them.'}</div>`;
    updateDeletedBulk();
    return;
  }
  const smoke = list.filter(u => isTestEmail(u.email));
  const real = list.filter(u => !isTestEmail(u.email));
  const head = '<thead><tr><th style="width:28px"><input type="checkbox" id="dckAll" data-change="toggleAllDeleted" data-args="[{&quot;$&quot;:&quot;this&quot;}]"></th><th>User</th><th>Role</th><th>Deleted</th><th></th></tr></thead>';
  el.innerHTML = `
    <div class="ubanner">Deleted users can be restored at any time. Permanent delete cannot be undone.</div>
    ${real.length ? `<table class="need-table">${head}<tbody>${real.map(deletedRowHtml).join('')}</tbody></table>` : ''}
    ${smoke.length ? `
      <div class="ugroup">
        <div class="ugroup-h" data-action="toggleSmoke">
          <span class="car">▸</span>
          <div class="t"><b>Test accounts (${smoke.length})</b><small>Automated test signups (example.com / yopmail.com).</small></div>
          <button class="btn btn-reject" data-action="purgeDeletedTestClick" data-args="[{&quot;$&quot;:&quot;event&quot;}]">Delete all ${smoke.length} permanently…</button>
        </div>
        <div id="smokeBody" class="hidden"><table class="need-table"><tbody>${smoke.map(deletedRowHtml).join('')}</tbody></table></div>
      </div>` : ''}`;
  updateDeletedBulk();
}

const selectedDeletedIds = () => [...document.querySelectorAll('.dck:checked')].map(c => c.value);
function toggleAllDeleted(box) { document.querySelectorAll('.dck').forEach(c => { c.checked = box.checked; }); updateDeletedBulk(); }
function updateDeletedBulk() {
  const n = selectedDeletedIds().length;
  document.getElementById('deletedBulkCount').textContent = `${n} selected`;
  document.getElementById('deletedBulk').classList.toggle('on', n > 0);
}

async function runBulk(ids, fn, doneMsg) {
  let failed = 0;
  for (const id of ids) { try { await fn(id); } catch(e) { failed++; } }
  toast(failed ? `${ids.length - failed} done; ${failed} failed (permanent delete is refused when a user has linked records).` : doneMsg, failed > 0);
  loadUsers(); loadDeletedUsers();
}
async function bulkRestore() {
  const ids = selectedDeletedIds();
  if (!ids.length || !await showConfirmModal({ title: 'Restore Users', message: `Restore ${ids.length} user(s)? They will be able to sign in again.`, confirmText: 'Restore', danger: false })) return;
  runBulk(ids, id => apiPost(`/admin/users/${id}/restore`, {}), `✓ Restored ${ids.length} users.`);
}
async function bulkPermanentDelete() {
  const ids = selectedDeletedIds();
  if (!ids.length || !await showConfirmModal({ title: 'Delete Permanently', message: `Permanently delete ${ids.length} user(s)? This cannot be undone.`, confirmText: 'Delete Forever', danger: true })) return;
  runBulk(ids, id => apiDelete(`/admin/users/${id}/permanent`), `${ids.length} users permanently deleted.`);
}
async function purgeDeletedTest() {
  const ids = deletedCache.filter(u => isTestEmail(u.email)).map(u => u.id);
  if (!ids.length || !await showConfirmModal({ title: 'Delete Test Accounts', message: `Permanently delete ${ids.length} deleted test account(s)? This cannot be undone.`, confirmText: 'Delete Forever', danger: true })) return;
  runBulk(ids, id => apiDelete(`/admin/users/${id}/permanent`), `${ids.length} test accounts permanently deleted.`);
}

async function restoreUser(id, name) {
  if (!await showConfirmModal({ title: 'Restore User', message: `Restore "${name}"? They will be able to sign in again.`, confirmText: 'Restore', danger: false })) return;
  try {
    await apiPost(`/admin/users/${id}/restore`, {});
    toast(`✓ ${name} restored.`);
    loadUsers();
    loadDeletedUsers();
  } catch(e) { toast(e.message || 'Failed to restore user.', true); }
}

async function permanentlyDeleteUser(id, name) {
  if (!await showConfirmModal({ title: 'Delete Permanently', message: `Permanently delete "${name}"? This cannot be undone — there is no restore after this.`, confirmText: 'Delete Forever', danger: true })) return;
  try {
    await apiDelete(`/admin/users/${id}/permanent`);
    toast(`${name} permanently deleted.`);
    loadDeletedUsers();
  } catch(e) { toast(e.message || 'Failed to permanently delete user.', true); }
}

async function exportUsersCSV() {
  try {
    toast('Fetching data for export…');
    const data = await apiGet('/admin/users?page=1&per_page=5000');
    const rows = [['Name','Email','Role','Org','City','State','Joined']];
    (data.items||[]).forEach(u => rows.push([u.name,u.email,u.role,u.org_name||'',u.city||'',u.state||'',u.created_at?u.created_at.slice(0,10):'']));
    downloadCSV(rows, `migrantportal-users-${new Date().toISOString().slice(0,10)}.csv`);
    toast(`✓ Exported ${rows.length-1} users.`);
  } catch(e) { toast('Export failed.', true); }
}

/* ═══════════════════════════════════════════
   REPORTS
═══════════════════════════════════════════ */
async function loadReports() {
  document.getElementById('reportsGrid').innerHTML = '<div class="loading">Loading reports</div>';
  try {
    const r = await apiGet('/admin/reports');
    const maxCat  = Math.max(...r.by_category.map(c => c.count), 1);
    const maxCity = Math.max(...r.top_cities.map(c => c.count), 1);
    document.getElementById('reportsGrid').innerHTML = `
      <div class="report-card">
        <div class="report-title">Needs by Category</div>
        ${r.by_category.length ? r.by_category.map(c => `
          <div class="bar-row">
            <div class="bar-label">${CAT_EMOJI[c.category]||''} ${c.category}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round(c.count/maxCat*100)}%"></div></div>
            <div class="bar-count">${c.count}</div>
          </div>`).join('') : '<div style="color:var(--text-3);font-size:12px">No data yet.</div>'}
      </div>
      <div class="report-card">
        <div class="report-title">Needs by Status</div>
        ${r.by_status.map(s => `
          <div class="bar-row">
            <div class="bar-label">${s.status}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round(s.count/Math.max(r.total_needs,1)*100)}%;background:${s.status==='fulfilled'?'var(--green)':s.status==='active'?'var(--teal)':s.status==='pending'?'var(--yellow)':'var(--text-3)'}"></div></div>
            <div class="bar-count">${s.count}</div>
          </div>`).join('')}
      </div>
      <div class="report-card">
        <div class="report-title">Top Cities</div>
        ${r.top_cities.length ? r.top_cities.map(c => `
          <div class="bar-row">
            <div class="bar-label">${esc(c.city)}, ${esc(c.state)}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.round(c.count/maxCity*100)}%;background:var(--blue)"></div></div>
            <div class="bar-count">${c.count}</div>
          </div>`).join('') : '<div style="color:var(--text-3);font-size:12px">No data yet.</div>'}
      </div>
      <div class="report-card">
        <div class="report-title">Summary</div>
        <div style="display:flex;flex-direction:column;gap:14px;margin-top:4px">
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:12px">
            <span style="font-size:13px;color:var(--text-2)">Total Needs</span>
            <span style="font-weight:800;font-size:22px;color:var(--text)">${r.total_needs}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:12px">
            <span style="font-size:13px;color:var(--text-2)">Total Responses</span>
            <span style="font-weight:800;font-size:22px;color:var(--teal)">${r.total_responses}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:13px;color:var(--text-2)">Avg Responses / Need</span>
            <span style="font-weight:800;font-size:22px;color:var(--green)">${r.avg_responses_per_need}</span>
          </div>
        </div>
      </div>`;
    // Append leaderboard card (full-width, separate row)
    await appendLeaderboard();
    await appendFulfillmentFunnel();
  } catch(e) { document.getElementById('reportsGrid').innerHTML = '<div class="empty">Failed to load reports.</div>'; }
}

async function appendFulfillmentFunnel() {
  const grid = document.getElementById('reportsGrid');
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'grid-column:1/-1';
  wrapper.className = 'report-card';
  wrapper.innerHTML = `<div class="report-title">Fulfillment Funnel by Category</div><div class="loading">Loading</div>`;
  grid.appendChild(wrapper);
  try {
    const data = await apiGet('/admin/needs?page=1&per_page=5000');
    const items = data.items || [];
    if (!items.length) { wrapper.innerHTML = '<div class="report-title">Fulfillment Funnel by Category</div><div style="color:var(--text-3);font-size:12px;padding-top:6px">No needs yet.</div>'; return; }
    const STATUS_ORDER = ['pending','active','fulfilled','closed'];
    const STATUS_COLOR = { pending:'var(--yellow)', active:'var(--teal)', fulfilled:'var(--green)', closed:'var(--text-3)' };
    const byCat = {};
    items.forEach(n => {
      const cat = n.category || 'other';
      byCat[cat] = byCat[cat] || { pending:0, active:0, fulfilled:0, closed:0, total:0 };
      if (byCat[cat][n.status] !== undefined) byCat[cat][n.status]++;
      byCat[cat].total++;
    });
    const cats = Object.keys(byCat).sort((a,b) => byCat[b].total - byCat[a].total);
    const maxTotal = Math.max(...cats.map(c => byCat[c].total), 1);
    wrapper.innerHTML = `
      <div class="report-title">Fulfillment Funnel by Category <span style="font-size:10px;color:var(--text-3);font-weight:500;letter-spacing:0;text-transform:none;margin-left:6px">pending &rarr; active &rarr; fulfilled</span></div>
      <div style="display:flex;gap:14px;margin:10px 0 14px;font-size:11px;color:var(--text-2)">
        ${STATUS_ORDER.map(s => `<span style="display:flex;align-items:center;gap:5px"><span style="width:8px;height:8px;border-radius:2px;background:${STATUS_COLOR[s]};display:inline-block"></span>${s}</span>`).join('')}
      </div>
      ${cats.map(cat => {
        const c = byCat[cat];
        const widthPct = s => Math.round(c[s] / maxTotal * 100);
        const resolvedPct = c.total ? Math.round(c.fulfilled / c.total * 100) : 0;
        return `
        <div class="bar-row" style="align-items:flex-start;margin-bottom:12px">
          <div class="bar-label" style="width:120px;padding-top:2px">${CAT_EMOJI[cat]||''} ${escHtml(cat)}</div>
          <div style="flex:1">
            <div style="display:flex;height:10px;border-radius:5px;overflow:hidden;background:var(--surface-2)">
              ${STATUS_ORDER.map(s => c[s] ? `<div style="width:${widthPct(s)}%;background:${STATUS_COLOR[s]}" title="${s}: ${c[s]}"></div>` : '').join('')}
            </div>
            <div style="font-size:10px;color:var(--text-3);margin-top:4px">${c.fulfilled} fulfilled of ${c.total} submitted &middot; ${resolvedPct}% resolved</div>
          </div>
          <div class="bar-count" style="width:32px">${c.total}</div>
        </div>`;
      }).join('')}`;
  } catch(e) {
    wrapper.innerHTML = `<div class="report-title">Fulfillment Funnel by Category</div><div style="color:var(--text-3);font-size:12px;padding-top:6px">Failed to load.</div>`;
  }
}

async function appendLeaderboard() {
  const grid = document.getElementById('reportsGrid');
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'grid-column:1/-1';
  wrapper.className = 'report-card';
  wrapper.innerHTML = `<div class="report-title">Responder Leaderboard</div><div class="loading">Loading</div>`;
  grid.appendChild(wrapper);
  try {
    const items = await apiGet('/admin/responders/leaderboard');
    if (!items.length) { wrapper.innerHTML = '<div class="report-title">Responder Leaderboard</div><div style="color:var(--text-3);font-size:12px;padding-top:6px">No responder activity yet.</div>'; return; }
    const maxR = Math.max(...items.map(r => r.response_count), 1);
    wrapper.innerHTML = `
      <div class="report-title">Responder Leaderboard <span style="font-size:10px;color:var(--text-3);font-weight:500;letter-spacing:0;text-transform:none;margin-left:6px">Top ${items.length} by responses</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:8px;margin-top:4px">
        ${items.map((r, i) => `
          <div class="lb-row">
            <span class="lb-rank" style="${i===0?'color:var(--yellow)':i===1?'color:var(--text-2)':i===2?'color:var(--orange)':''}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</span>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px">
                <span class="lb-name">${esc(r.name)}</span>
                ${r.fulfillment_count > 0 ? `<span style="font-size:10px;font-weight:700;color:var(--green);background:var(--green-bg);padding:1px 6px;border-radius:10px">${r.fulfillment_count} fulfilled</span>` : ''}
              </div>
              <div class="lb-org">${esc(r.org_name || 'Independent')}</div>
            </div>
            <div class="lb-bar-wrap">
              <div class="bar-track"><div class="bar-fill" style="width:${Math.round(r.response_count/maxR*100)}%;background:var(--teal)"></div></div>
            </div>
            <span class="lb-count">${r.response_count}</span>
          </div>`).join('')}
      </div>`;
  } catch(e) {
    wrapper.innerHTML = `<div class="report-title">Responder Leaderboard</div><div style="color:var(--text-3);font-size:12px;padding-top:6px">Endpoint not available yet — add <code style="font-size:11px;color:var(--teal)">/admin/responders/leaderboard</code> to enable.</div>`;
  }
}

/* ═══════════════════════════════════════════
   FLAGGED
═══════════════════════════════════════════ */
async function loadFlagged() {
  document.getElementById('flaggedContent').innerHTML = '<div class="loading">Loading</div>';
  try {
    const items = await apiGet('/admin/needs/flagged');
    const badge = document.getElementById('flaggedBadge');
    badge.textContent = items.length;
    badge.className = 'nav-badge' + (items.length ? '' : ' zero');
    if (!items.length) { document.getElementById('flaggedContent').innerHTML = '<div class="empty"><div class="empty-icon">✅</div>No flagged needs.</div>'; return; }
    document.getElementById('flaggedContent').innerHTML = `
      <table class="need-table">
        <thead><tr><th>Case #</th><th>Title</th><th>Status</th><th>Auto-Flag Reason</th><th>Reports</th><th>Actions</th></tr></thead>
        <tbody>
          ${items.map(n => `
            <tr>
              <td><strong style="font-family:var(--mono)">#${n.case_number}</strong></td>
              <td>${esc(n.title)}</td>
              <td><span class="status-pill ${STATUS_CLASS[n.status]||''}">${n.status}</span></td>
              <td style="font-size:12px;color:var(--text-2)">${esc(n.auto_flag_reason||'—')}</td>
              <td style="text-align:center;font-weight:700;color:var(--orange)">${n.community_flag_count}</td>
              <td style="display:flex;gap:6px;flex-wrap:wrap">
                <button class="btn btn-approve" data-action="clearFlags" data-a0="${n.id}">Clear Flags</button>
                <button class="btn btn-reject" data-action="rejectNeedConfirm" data-a0="${n.id}" data-a1="${esc(n.title)}">Reject</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch(e) { document.getElementById('flaggedContent').innerHTML = '<div class="empty">Failed to load flagged needs.</div>'; }
}

async function clearFlags(needId) {
  try { await apiPost(`/admin/needs/${needId}/clear-flags`, {}); toast('Flags cleared.'); loadFlagged(); }
  catch(e) { toast(e.message, true); }
}

/* ═══════════════════════════════════════════
   ANNOUNCEMENTS
═══════════════════════════════════════════ */
async function loadAnnouncements() {
  const el = document.getElementById('ann-list');
  try {
    const items = await apiGet('/announcements');
    if (!items.length) { el.innerHTML = '<div style="color:var(--text-3);font-size:13px">No announcements yet.</div>'; return; }
    el.innerHTML = items.map(a => `
      <div style="padding:14px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
          ${a.urgent?'<span style="background:var(--red-bg);color:var(--red);font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;letter-spacing:.5px">URGENT</span>':''}
          <span style="font-weight:700;font-size:13px">${esc(a.title)}</span>
          <span style="margin-left:auto;font-size:11px;color:var(--text-3)">${a.target_role?a.target_role+'s only':'Everyone'}</span>
          ${a.active?`<button data-action="deactivateAnn" data-a0="${a.id}" style="background:var(--red-bg);color:var(--red);border:1px solid rgba(248,81,73,0.2);border-radius:5px;font-size:11px;font-weight:600;padding:2px 8px;cursor:pointer;font-family:inherit">Deactivate</button>`:'<span style="font-size:11px;color:var(--text-3)">Inactive</span>'}
        </div>
        <div style="font-size:12px;color:var(--text-2)">${esc(a.body)}</div>
      </div>`).join('');
  } catch(e) { el.innerHTML = '<div style="color:var(--text-3);font-size:13px">Failed to load.</div>'; }
}

async function createAnnouncement() {
  const titleEl = document.getElementById('ann-title');
  const bodyEl  = document.getElementById('ann-body');
  const title = titleEl.value.trim();
  const body  = bodyEl.value.trim();
  if (!title || !body) {
    if (!title) { titleEl.style.borderColor = 'var(--red)'; titleEl.focus(); }
    if (!body)  { bodyEl.style.borderColor  = 'var(--red)'; if (title) bodyEl.focus(); }
    toast('Title and body are required.', true);
    return;
  }
  titleEl.style.borderColor = '';
  bodyEl.style.borderColor  = '';
  const target_role = document.getElementById('ann-role').value || null;
  const urgent = document.getElementById('ann-urgent').checked;
  try {
    await apiPost('/announcements', { title, body, target_role, urgent });
    toast('✓ Announcement posted!');
    ['ann-title','ann-body'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('ann-role').value = '';
    document.getElementById('ann-urgent').checked = false;
    loadAnnouncements();
  } catch(e) { toast(e.message, true); }
}

async function deactivateAnn(id) {
  try { await apiPatch(`/announcements/${id}/deactivate`, {}); toast('Deactivated.'); loadAnnouncements(); }
  catch(e) { toast(e.message, true); }
}

/* ═══════════════════════════════════════════
   EMAIL
═══════════════════════════════════════════ */
let emailUsersCache = null;
let emailOrgsCache = null;
let emailOrgMembersCache = [];
let emailSentCache = [];

function onEmailRecipientTypeChange() {
  const type = document.getElementById('email-recipient-type').value;
  document.getElementById('email-user-picker').style.display   = type === 'user'   ? '' : 'none';
  document.getElementById('email-org-picker').style.display    = type === 'org'    ? '' : 'none';
  document.getElementById('email-custom-picker').style.display = type === 'custom' ? '' : 'none';
  document.getElementById('email-last-sent-warning').style.display = 'none';

  if (type === 'user' && !emailUsersCache) {
    apiGet('/admin/users?page=1').then(data => { emailUsersCache = data.items || []; }).catch(() => { emailUsersCache = []; });
  }
  if (type === 'org' && !emailOrgsCache) {
    apiGet('/admin/orgs').then(orgs => {
      emailOrgsCache = orgs || [];
      const sel = document.getElementById('email-org-select');
      sel.innerHTML = '<option value="">Select an organization…</option>' + emailOrgsCache.map(o =>
        `<option value="${escHtml(o.id)}">${escHtml(o.name)}</option>`
      ).join('');
    }).catch(() => { emailOrgsCache = []; });
  }
  renderEmailPreview();
}

function filterEmailUsers() {
  const q = document.getElementById('email-user-search').value.trim().toLowerCase();
  const results = document.getElementById('email-user-results');
  document.getElementById('email-user-id').value = '';
  document.getElementById('email-user-email').value = '';
  document.getElementById('email-user-name').value = '';
  if (!q || !emailUsersCache) { results.style.display = 'none'; return; }
  const matches = emailUsersCache.filter(u =>
    (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
  ).slice(0, 8);
  if (!matches.length) { results.innerHTML = '<div style="padding:8px 10px;font-size:12px;color:var(--text-3)">No match</div>'; results.style.display = ''; return; }
  results.innerHTML = matches.map(u => `
    <div data-action="pickEmailUser" data-a0="${escHtml(u.id)}" data-a1="${escHtml(u.email)}" data-a2="${escHtml(u.name)}"
         style="padding:8px 10px;font-size:12px;cursor:pointer;border-bottom:1px solid var(--border)">
      <div style="font-weight:600">${escHtml(u.name)}</div>
      <div style="color:var(--text-3)">${escHtml(u.email)}</div>
    </div>`).join('');
  results.style.display = '';
}

function pickEmailUser(id, email, name) {
  document.getElementById('email-user-id').value = id;
  document.getElementById('email-user-email').value = email;
  document.getElementById('email-user-name').value = name;
  document.getElementById('email-user-search').value = `${name} <${email}>`;
  document.getElementById('email-user-results').style.display = 'none';
  updateLastSentWarning(email);
  renderEmailPreview();
}

function onEmailOrgSelectChange() {
  const orgId = document.getElementById('email-org-select').value;
  const memberWrap = document.getElementById('email-org-member-wrap');
  const memberSel = document.getElementById('email-org-member-select');
  memberSel.innerHTML = '<option value="">Select a member…</option>';
  document.getElementById('email-last-sent-warning').style.display = 'none';
  renderEmailPreview();
  if (!orgId) { memberWrap.style.display = 'none'; return; }
  memberWrap.style.display = '';
  apiGet(`/admin/email/org-members/${orgId}`).then(members => {
    emailOrgMembersCache = members || [];
    memberSel.innerHTML = '<option value="">Select a member…</option>' + emailOrgMembersCache.map(m =>
      `<option value="${escHtml(m.id)}">${escHtml(m.name)} — ${escHtml(m.email)}</option>`
    ).join('');
  }).catch(() => { emailOrgMembersCache = []; toast('Failed to load org members.', true); });
}

function onEmailOrgMemberChange() {
  const sel = document.getElementById('email-org-member-select');
  const member = emailOrgMembersCache.find(m => m.id === sel.value);
  updateLastSentWarning(member ? member.email : '');
  renderEmailPreview();
}

function renderEmailPreview() {
  const el = document.getElementById('email-preview');
  const type = document.getElementById('email-recipient-type').value;
  let name = '';
  if (type === 'user') {
    name = document.getElementById('email-user-name').value;
  } else if (type === 'org') {
    const sel = document.getElementById('email-org-member-select');
    const member = emailOrgMembersCache.find(m => m.id === sel.value);
    name = member ? member.name : '';
  }
  const subject = document.getElementById('email-subject').value.trim() || 'Your subject here';
  const body = document.getElementById('email-body').value.trim() || 'Your message will appear here as you type.';
  const greeting = name ? `<p style="margin:0 0 10px;font-size:14px;color:#374151;">Hi ${escHtml(name)},</p>` : '';
  el.innerHTML = `
    <div style="border-radius:14px;overflow:hidden;box-shadow:0 2px 10px rgba(13,122,138,0.12);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      <div style="background:linear-gradient(135deg,#0D7A8A 0%,#0a6070 100%);padding:18px 20px">
        <div style="color:rgba(255,255,255,0.75);font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase">MigrantPortal</div>
        <div style="color:#fff;font-size:16px;font-weight:800;margin-top:3px">${escHtml(subject)}</div>
      </div>
      <div style="background:#fff;padding:18px 20px">
        ${greeting}
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;white-space:pre-line">${escHtml(body)}</p>
        <hr style="border:none;border-top:1px solid #E5F4F6;margin:18px 0 12px">
        <p style="margin:0;font-size:11px;color:#9CA3AF;line-height:1.5">
          You're receiving this email because you have an account on MigrantPortal.<br>
          Questions? Email us at support@migrantportal.com
        </p>
      </div>
    </div>`;
}

function updateLastSentWarning(email) {
  const el = document.getElementById('email-last-sent-warning');
  if (!email) { el.style.display = 'none'; return; }
  const prior = emailSentCache
    .filter(s => (s.to_email || '').toLowerCase() === email.toLowerCase())
    .sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))[0];
  if (!prior) { el.style.display = 'none'; return; }
  const days = Math.round((Date.now() - new Date(prior.sent_at)) / 86400000);
  el.textContent = `Last emailed: ${days === 0 ? 'today' : days === 1 ? '1 day ago' : days + ' days ago'}`;
  el.style.display = '';
}

async function loadSentEmails() {
  const el = document.getElementById('email-sent-list');
  try {
    const data = await apiGet('/admin/email/sent?page=1');
    emailSentCache = data.items || [];
    if (!emailSentCache.length) { el.innerHTML = '<div style="color:var(--text-3);font-size:13px">No emails sent yet.</div>'; return; }
    el.innerHTML = `
      <table class="need-table">
        <thead><tr><th>To</th><th>Subject</th><th>Sent At</th><th>Sent By</th></tr></thead>
        <tbody>
          ${emailSentCache.map(s => `
            <tr>
              <td>${escHtml(s.to_email)}</td>
              <td>${escHtml(s.subject)}</td>
              <td style="color:var(--text-3)">${s.sent_at ? new Date(s.sent_at).toLocaleString() : '—'}</td>
              <td style="color:var(--text-3)">${escHtml(s.sent_by_admin_name || 'Unknown')}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch(e) { el.innerHTML = '<div style="color:var(--text-3);font-size:13px">Failed to load.</div>'; }
}

async function composeSendEmail() {
  const type = document.getElementById('email-recipient-type').value;
  let to_email = '', to_user_id = null;

  if (type === 'user') {
    to_email = document.getElementById('email-user-email').value;
    to_user_id = document.getElementById('email-user-id').value || null;
    if (!to_email) { toast('Pick a user to email.', true); return; }
  } else if (type === 'org') {
    const memberSel = document.getElementById('email-org-member-select');
    const member = emailOrgMembersCache.find(m => m.id === memberSel.value);
    to_email = member ? member.email : '';
    to_user_id = member ? member.id : null;
    if (!to_email) { toast('Pick an organization member to email.', true); return; }
  } else {
    to_email = document.getElementById('email-custom-address').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to_email)) { toast('Enter a valid email address.', true); return; }
  }

  const subjectEl = document.getElementById('email-subject');
  const bodyEl = document.getElementById('email-body');
  const subject = subjectEl.value.trim();
  const body = bodyEl.value.trim();
  if (!subject || !body) {
    if (!subject) subjectEl.style.borderColor = 'var(--red)';
    if (!body) bodyEl.style.borderColor = 'var(--red)';
    toast('Subject and body are required.', true);
    return;
  }
  subjectEl.style.borderColor = '';
  bodyEl.style.borderColor = '';

  if (!await showConfirmModal({
    title: 'Send Email',
    message: `Send this email to ${to_email}? This goes to a real inbox and cannot be undone.`,
    confirmText: 'Send',
    danger: false,
  })) return;

  const body_html = escHtml(body).replace(/\n/g, '<br>');
  try {
    await apiPost('/admin/email/send', { to_email, to_user_id, subject, body_html });
    toast('✓ Email sent.');
    subjectEl.value = '';
    bodyEl.value = '';
    document.getElementById('email-last-sent-warning').style.display = 'none';
    renderEmailPreview();
    loadSentEmails();
  } catch(e) { toast(e.message || 'Send failed.', true); }
}

/* ═══════════════════════════════════════════
   ORGS
═══════════════════════════════════════════ */
async function loadOrgs() {
  const el = document.getElementById('orgsContent');
  try {
    const orgs = await apiGet('/admin/orgs');
    if (!orgs.length) { el.innerHTML = '<div class="empty">No organizations yet.</div>'; return; }
    el.innerHTML = `
      <table class="need-table">
        <thead><tr><th>Name</th><th>Owner</th><th>Location</th><th style="text-align:center">Members</th><th style="text-align:center">Invite Code</th><th></th></tr></thead>
        <tbody>
          ${orgs.map(o => `
            <tr>
              <td style="font-weight:600">${esc(o.name)}</td>
              <td style="color:var(--text-2)">${o.owner_name}</td>
              <td style="color:var(--text-2)">${esc([o.city,o.state].filter(Boolean).join(', ')||'—')}</td>
              <td style="text-align:center;font-weight:600">${o.member_count}</td>
              <td style="text-align:center;font-family:var(--mono);font-size:12px;color:var(--teal)">${o.invite_code}</td>
              <td style="text-align:right"><button data-action="deleteOrg" data-a0="${jsq(o.id)}" data-a1="${jsq(o.name)}" class="btn btn-delete">Delete</button></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch(e) { el.innerHTML = `<div class="empty" style="color:var(--red)">${escHtml(e.message)}</div>`; }
}

function toggleAddOrgForm() {
  const el = document.getElementById('addOrgForm');
  el.style.display = el.style.display === 'none' ? '' : 'none';
  if (el.style.display !== 'none') document.getElementById('org-name').focus();
}

async function submitAddOrg() {
  const nameEl = document.getElementById('org-name');
  const name = nameEl.value.trim();
  if (!name) { nameEl.style.borderColor = 'var(--red)'; nameEl.focus(); toast('Name is required.', true); return; }
  nameEl.style.borderColor = '';
  const city  = document.getElementById('org-city').value.trim() || null;
  const state = document.getElementById('org-state').value.trim() || null;
  try {
    await apiPost('/admin/orgs', { name, city, state });
    toast('✓ Organization created.');
    ['org-name','org-city','org-state'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('addOrgForm').style.display = 'none';
    loadOrgs();
  } catch(e) { toast(e.message, true); }
}

async function deleteOrg(id, name) {
  if (!await showConfirmModal({ title: 'Delete Organization', message: `Delete org "${name}"? This cannot be undone.`, confirmText: 'Delete', danger: true })) return;
  try { await apiDelete(`/admin/orgs/${id}`); toast('Organization deleted.'); loadOrgs(); }
  catch(e) { toast(e.message, true); }
}

/* ═══════════════════════════════════════════
   RESOURCES
═══════════════════════════════════════════ */
async function loadResources() {
  const el = document.getElementById('resourcesContent');
  try {
    const items = await apiGet('/resources/admin/pending');
    if (!items.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">✅</div>No pending resources.</div>'; return; }
    el.innerHTML = items.map(r => `
      <div style="padding:16px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
          <div>
            <div style="font-weight:700;font-size:14px">${esc(r.name)}</div>
            <div style="font-size:12px;color:var(--text-2);margin-top:3px">${esc(r.category)} · ${esc([r.city,r.state].filter(Boolean).join(', ')||'—')}</div>
            ${r.description?`<div style="font-size:12px;color:var(--text-2);margin-top:4px">${esc(r.description)}</div>`:''}
            ${r.phone?`<div style="font-size:12px;color:var(--text-2);margin-top:3px">📞 ${esc(r.phone)}</div>`:''}
            ${r.website?`<div style="font-size:12px;margin-top:3px"><a href="${escHtml(safeSrc(r.website))}" target="_blank" rel="noopener noreferrer" style="color:var(--teal)">🔗 ${escHtml(r.website)}</a></div>`:''}
          </div>
          <div style="display:flex;gap:8px;flex-shrink:0">
            <button data-action="approveResource" data-a0="${r.id}" class="btn btn-approve">Approve</button>
            <button data-action="deleteResource" data-a0="${r.id}" class="btn btn-delete">Delete</button>
          </div>
        </div>
      </div>`).join('');
  } catch(e) {
    const errDiv = document.createElement('div');
    errDiv.className = 'empty';
    errDiv.style.color = 'var(--red)';
    errDiv.textContent = e.message;
    el.innerHTML = '';
    el.appendChild(errDiv);
  }
}

async function approveResource(id) {
  try { await apiPatch(`/resources/${id}/approve`, {}); toast('✓ Resource approved.'); loadResources(); }
  catch(e) { toast(e.message, true); }
}
async function deleteResource(id) {
  if (!await showConfirmModal({ title: 'Delete Resource', message: 'This resource will be permanently removed.', confirmText: 'Delete', danger: true })) return;
  try { await apiDelete(`/resources/${id}`); toast('Resource deleted.'); loadResources(); }
  catch(e) { toast(e.message, true); }
}

/* ═══════════════════════════════════════════
   NONPROFITS
═══════════════════════════════════════════ */
const NP_SERVICES = ['food','shelter','clothing','medical','legal','employment','education','immigration','transportation','mental_health','financial','childcare'];
const NP_PER_PAGE = 25;
const NP_STALE_DAYS = 365;
const NP_TYPES = { nonprofit: 'Nonprofit', church: 'Church / faith community', government: 'Government agency', school: 'School / university', community: 'Community group', other: 'Other' };
const npType = n => (NP_TYPES[n.org_type] ? n.org_type : 'nonprofit');
const npTypeLabel = n => NP_TYPES[npType(n)];
const npStatus = n => n.status || (n.is_active ? 'active' : 'pending');
const npDate = s => (s ? String(s).slice(0, 10) : '');
const npIsStale = n => !n.last_verified_at || (Date.now() - Date.parse(n.last_verified_at)) > NP_STALE_DAYS * 86400000;
const npLabel = s => String(s).replace(/_/g, ' ');
const npServices = n => (n.services ? n.services.split(',').map(s => s.trim()).filter(Boolean) : []);
const npCityKey = n => `${(n.city || '').trim().toLowerCase()}|${(n.state || '').trim().toUpperCase()}`;
const npCityLabel = n => (n.city ? `${n.city.trim()}${n.state ? ', ' + n.state.trim().toUpperCase() : ''}` : 'No city');
const npById = id => npAll.find(n => n.id === id);
let npAll = [], npRemoved = [], npOrgById = {}, npPage = 1, npSelected = new Set(), npKind = 'res';
const npIsPartner = n => Boolean(n.org_id);

async function loadNonprofits() {
  document.getElementById('npDirContent').innerHTML = '<div class="loading">Loading…</div>';
  try {
    const [items, orgs, removed] = await Promise.all([
      apiGet('/nonprofits/admin/all'), apiGet('/admin/orgs').catch(() => []), apiGet('/nonprofits/admin/all?removed=true').catch(() => []),
    ]);
    npAll = Array.isArray(items) ? items : [];
    npRemoved = (Array.isArray(removed) ? removed : []).filter(n => n.deleted_at);
    npOrgById = {};
    (orgs || []).forEach(o => { npOrgById[o.id] = o; });
    npSelected = new Set();
    npBuildFilters();
    npRenderAll();
  } catch(e) {
    document.getElementById('npDirContent').innerHTML = `<div class="empty" style="color:var(--red)">${escHtml(e.message)}</div>`;
  }
}

function npBuildFilters() {
  const citySel = document.getElementById('npCity'), svcSel = document.getElementById('npSvc');
  const prevCity = citySel.value, prevSvc = svcSel.value;
  const cities = new Map();
  npAll.filter(n => n.is_active).forEach(n => { if (!cities.has(npCityKey(n))) cities.set(npCityKey(n), npCityLabel(n)); });
  const sorted = [...cities.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  citySel.innerHTML = `<option value="">All cities (${sorted.length})</option>` + sorted.map(([k, l]) => `<option value="${escHtml(k)}">${escHtml(l)}</option>`).join('');
  svcSel.innerHTML = '<option value="">All services</option>' + NP_SERVICES.map(s => `<option value="${s}">${npLabel(s)}</option>`).join('');
  citySel.value = cities.has(prevCity) ? prevCity : '';
  svcSel.value = prevSvc;
  const typeSel = document.getElementById('npTypeFilter'), prevType = typeSel.value;
  typeSel.innerHTML = '<option value="">All types</option>' + Object.entries(NP_TYPES).map(([k, l]) => `<option value="${k}">${escHtml(l)}</option>`).join('');
  typeSel.value = prevType;
}

const npActive = () => npAll.filter(n => n.is_active);
const npInactive = () => npAll.filter(n => !n.is_active);
function npAttention() {
  const act = npActive();
  return {
    geo: act.filter(n => n.lat == null),
    phone: act.filter(n => !(n.phone || '').trim()),
    svc: act.filter(n => !npServices(n).length),
    stale: act.filter(npIsStale),
  };
}

function npRenderAll() {
  const att = npAttention(), attCount = att.geo.length + att.phone.length + att.svc.length + att.stale.length;
  const cities = new Set(npActive().map(npCityKey).filter(k => !k.startsWith('|')));
  document.getElementById('npTiles').innerHTML =
    `<div class="np-tile"><b>${npActive().filter(npIsPartner).length}</b><span>Partners</span></div>
     <div class="np-tile"><b>${npActive().filter(n => !npIsPartner(n)).length}</b><span>Other resources</span></div>
     <div class="np-tile"><b>${cities.size}</b><span>Cities covered</span></div>
     <div class="np-tile"><b>${npInactive().length}</b><span>Awaiting review</span></div>
     <div class="np-tile"><b>${attCount}</b><span>Listing issues</span></div>`;
  document.getElementById('npn-par').textContent = npActive().filter(npIsPartner).length;
  document.getElementById('npn-res').textContent = npActive().filter(n => !npIsPartner(n)).length;
  document.getElementById('npn-rev').textContent = npInactive().length;
  document.getElementById('npn-att').textContent = attCount;
  document.getElementById('npn-rem').textContent = npRemoved.length;
  const badge = document.getElementById('nonprofitsBadge');
  badge.textContent = npInactive().length;
  badge.className = 'nav-badge' + (npInactive().length === 0 ? ' zero' : '');
  npRenderDirectory(); npRenderReview(); npRenderCoverage(); npRenderAttention(); npRenderRemoved();
}

// 'par' and 'res' share the directory panel; 'dir' shows both (used by coverage drill-down)
function npSetTab(tab) {
  const isDirTab = ['par', 'res', 'dir'].includes(tab);
  if (isDirTab) { npKind = tab === 'dir' ? '' : tab; npSelected = new Set(); npPage = 1; npRenderDirectory(); }
  const panel = isDirTab ? 'dir' : tab;
  document.querySelectorAll('[data-npt]').forEach(b => b.classList.toggle('on', b.dataset.npt === tab));
  ['dir', 'rev', 'cov', 'att', 'rem'].forEach(t => { document.getElementById('np-p-' + t).style.display = t === panel ? '' : 'none'; });
}

function npFiltered() {
  const q = document.getElementById('npQ').value.trim().toLowerCase();
  const city = document.getElementById('npCity').value, svc = document.getElementById('npSvc').value, type = document.getElementById('npTypeFilter').value;
  return npActive().filter(n =>
    (!npKind || (npKind === 'par') === npIsPartner(n)) &&
    (!q || [n.name, n.city, n.phone, n.email, n.website].join(' ').toLowerCase().includes(q)) &&
    (!city || npCityKey(n) === city) &&
    (!svc || npServices(n).includes(svc)) &&
    (!type || npType(n) === type));
}

function npRowHtml(n) {
  const svcs = npServices(n);
  const id = escHtml(n.id);
  return `<tr class="urow" data-action="npOpenDrawer" data-a0="${id}">
    <td data-action="stop" data-args="[{&quot;$&quot;:&quot;event&quot;}]"><input type="checkbox" ${npSelected.has(n.id) ? 'checked' : ''} data-change="npToggleSel" data-args="[null,{&quot;$&quot;:&quot;checked&quot;}]" data-a0="${id}"></td>
    <td><b>${escHtml(n.name)}</b><span class="np-type">${escHtml(npTypeLabel(n))}</span>
      <div style="font-size:12px;color:var(--text-2)">${n.phone ? escHtml(n.phone) : '<span class="np-flag">No phone</span>'}</div>
      ${n.lat == null ? '<span class="np-flag">⚠ No map coordinates</span>' : ''}</td>
    <td>${svcs.slice(0, 3).map(s => `<span class="np-svc">${escHtml(npLabel(s))}</span>`).join('')}${svcs.length > 3 ? `<span class="np-svc more">+${svcs.length - 3}</span>` : ''}</td>
    <td style="color:var(--text-2)">${escHtml(npCityLabel(n))}</td>
    <td>${n.org_id && npOrgById[n.org_id] ? `<span style="color:var(--teal);font-weight:600;font-size:12px">Linked · ${npOrgById[n.org_id].member_count} member${npOrgById[n.org_id].member_count === 1 ? '' : 's'}</span>` : '<span style="color:var(--text-3);font-size:12px">Directory only</span>'}</td>
    <td data-action="stop" data-args="[{&quot;$&quot;:&quot;event&quot;}]"><button class="btn btn-secondary" data-action="npOpenDrawer" data-a0="${id}">Open</button></td>
  </tr>`;
}

function npRenderDirectory() {
  const list = npFiltered();
  const pages = Math.max(1, Math.ceil(list.length / NP_PER_PAGE));
  npPage = Math.min(Math.max(1, npPage), pages);
  const rows = list.slice((npPage - 1) * NP_PER_PAGE, npPage * NP_PER_PAGE);
  const chips = [['npCity', document.getElementById('npCity').selectedOptions[0]?.textContent], ['npSvc', npLabel(document.getElementById('npSvc').value)],
    ['npTypeFilter', document.getElementById('npTypeFilter').selectedOptions[0]?.textContent]].filter(([id]) => document.getElementById(id).value);
  document.getElementById('npChips').innerHTML = chips.map(([id, label]) => `<span class="np-chip">${escHtml(label)}<i data-action="npClearFilter" data-a0="${id}">✕</i></span>`).join('');
  document.getElementById('npDirContent').innerHTML = rows.length
    ? `<table class="need-table"><thead><tr><th style="width:30px"><input type="checkbox" data-change="npToggleAll" data-args="[{&quot;$&quot;:&quot;checked&quot;}]"></th><th>Organization</th><th>Services</th><th>City</th><th>Org account</th><th></th></tr></thead><tbody>${rows.map(npRowHtml).join('')}</tbody></table>`
    : `<div class="empty">${npActive().length ? 'No organizations match these filters.' : npKind === 'par' ? 'No partners yet. An organization becomes a partner once it has a linked, approved org account.' : 'No organizations yet. Add one, or import a CSV.'}</div>`;
  document.getElementById('npPInfo').textContent = `${list.length ? (npPage - 1) * NP_PER_PAGE + 1 : 0}–${Math.min(npPage * NP_PER_PAGE, list.length)} of ${list.length} organizations`;
  document.getElementById('npPPage').textContent = `Page ${npPage} of ${pages}`;
  document.getElementById('npPrev').disabled = npPage <= 1;
  document.getElementById('npNext').disabled = npPage >= pages;
  npUpdateBulk();
}

function npToggleSel(id, on) { if (on) npSelected.add(id); else npSelected.delete(id); npUpdateBulk(); }
function npToggleAll(on) {
  const list = npFiltered().slice((npPage - 1) * NP_PER_PAGE, npPage * NP_PER_PAGE);
  list.forEach(n => { if (on) npSelected.add(n.id); else npSelected.delete(n.id); });
  npRenderDirectory();
}
function npUpdateBulk() {
  document.getElementById('npBulk').classList.toggle('on', npSelected.size > 0);
  document.getElementById('npBulkCount').textContent = `${npSelected.size} selected`;
}

async function npRunBatch(ids, fn, doneMsg) {
  let failed = 0;
  for (const id of ids) { try { await fn(id); } catch(e) { failed++; } }
  toast(failed ? `${ids.length - failed} done; ${failed} failed.` : doneMsg, failed > 0);
  await loadNonprofits();
}
async function npBulk(action) {
  const ids = [...npSelected];
  if (!ids.length) return;
  if (action === 'pause') {
    if (!await showConfirmModal({ title: 'Move to review', message: `Take ${ids.length} listing(s) off the public Find Help page? You can approve them again from Awaiting review.`, confirmText: 'Move to review', danger: false })) return;
    npRunBatch(ids, id => apiPatch(`/nonprofits/${id}`, { status: 'paused' }), `${ids.length} listings moved to review.`);
  } else {
    if (!await showConfirmModal({ title: 'Remove nonprofits', message: `Remove ${ids.length} organization(s)? They leave Find Help and can be restored from the Removed tab.`, confirmText: 'Remove', danger: true })) return;
    npRunBatch(ids, id => apiDelete(`/nonprofits/${id}`), `${ids.length} organizations removed. Restore them from the Removed tab.`);
  }
}

function npRenderReview() {
  const list = npInactive();
  document.getElementById('npReview').innerHTML = list.length ? list.map(n => {
    const id = escHtml(n.id);
    return `<div class="np-app"><div class="b"><b>${escHtml(n.name)}</b><span class="np-type">${escHtml(npTypeLabel(n))}</span> <span class="status-pill ${npStatus(n) === 'paused' ? 's-rejected' : 's-pending'}">${npStatus(n) === 'paused' ? 'paused' : 'new application'}</span><br>
      <small>${escHtml(npCityLabel(n))}${n.website ? ' · ' + escHtml(n.website) : ''}${n.created_at ? ' · added ' + escHtml(String(n.created_at).slice(0, 10)) : ''}</small>
      <div style="margin-top:6px">${npServices(n).map(s => `<span class="np-svc">${escHtml(npLabel(s))}</span>`).join('')}</div></div>
      <div style="display:flex;gap:6px"><button class="btn btn-secondary" data-action="npOpenDrawer" data-a0="${id}">Review</button>
      <button class="btn btn-approve" data-action="npSetActive" data-args="[null,true]" data-a0="${id}">Approve</button>
      <button class="btn btn-delete" data-action="npRemove" data-a0="${id}">Remove</button></div></div>`;
  }).join('') : '<div class="empty">Nothing waiting. New applications from the public form will show up here.</div>';
}

function npRenderCoverage() {
  const groups = new Map();
  npActive().forEach(n => {
    const k = npCityKey(n);
    if (!groups.has(k)) groups.set(k, { key: k, label: npCityLabel(n), orgs: [] });
    groups.get(k).orgs.push(n);
  });
  const rows = [...groups.values()].map(g => {
    const counts = NP_SERVICES.map(s => g.orgs.filter(n => npServices(n).includes(s)).length);
    return { ...g, counts, gaps: counts.filter(c => c === 0).length };
  });
  const mode = document.getElementById('npCovSort').value;
  rows.sort((a, b) => mode === 'g' ? b.gaps - a.gaps : mode === 'a' ? a.label.localeCompare(b.label) : b.orgs.length - a.orgs.length);
  document.getElementById('npCovTable').innerHTML =
    `<thead><tr><th>City</th><th>Orgs</th>${NP_SERVICES.map(s => `<th>${escHtml(npLabel(s))}</th>`).join('')}</tr></thead><tbody>` +
    rows.map(r => `<tr><td><b>${escHtml(r.label)}</b></td><td style="font-weight:700">${r.orgs.length}</td>${r.counts.map((c, i) =>
      `<td><span class="np-cell np-c${Math.min(c, 3)}" data-ck="${escHtml(r.key)}" data-sv="${NP_SERVICES[i]}" data-action="npGoCoverage" data-args="[{&quot;$&quot;:&quot;this&quot;}]">${c}</span></td>`).join('')}</tr>`).join('') + '</tbody>';
  document.getElementById('npGaps').textContent = `${rows.reduce((a, r) => a + r.gaps, 0)} city + service gaps with no active partner`;
}

function npGoCoverage(cell) {
  document.getElementById('npCity').value = cell.dataset.ck;
  document.getElementById('npSvc').value = cell.dataset.sv;
  npPage = 1; npRenderDirectory(); npSetTab('dir');
}

function npRenderAttention() {
  const a = npAttention();
  const section = (title, list, why) => `<h3>${title} <span class="status-pill s-pending">${list.length}</span></h3><div style="color:var(--text-2);font-size:12px">${why}</div>` +
    (list.length ? list.slice(0, 8).map(n => `<div class="row"><div class="nm"><b>${escHtml(n.name)}</b><div style="font-size:12px;color:var(--text-2)">${escHtml(npCityLabel(n))}</div></div><button class="btn btn-secondary" data-action="npOpenDrawer" data-a0="${escHtml(n.id)}">Fix</button></div>`).join('') +
      (list.length > 8 ? `<div class="row" style="color:var(--text-3)">+ ${list.length - 8} more</div>` : '') : '<div class="row" style="color:var(--text-3)">All good.</div>');
  document.getElementById('npAtt').innerHTML =
    section('Missing map coordinates', a.geo, 'They will not appear in distance searches on Find Help. Usually a wrong zipcode.') +
    section('No phone number', a.phone, 'Families cannot call them.') +
    section('No services selected', a.svc, 'They will not show up when someone filters by service.') +
    section('Not verified in 12+ months', a.stale, 'Confirm they still operate, then press Mark verified in their details.');
}

/* ── drawer: edit or add ── */
function npField(id, label, value, type = 'text') {
  return `<label class="fld"><span class="form-label">${label}</span><input class="form-input" id="npf-${id}" type="${type}" value="${escHtml(value || '')}"></label>`;
}

function npOpenDrawer(id) {
  const n = id ? npById(id) : null;
  if (id && !n) return;
  const have = new Set(n ? npServices(n) : []);
  const linked = n && n.org_id ? npOrgById[n.org_id] : null;
  const drawer = document.getElementById('npDrawer');
  drawer.innerHTML = `
    <div class="dh"><div style="flex:1;min-width:0"><b style="font-size:16px">${n ? escHtml(n.name) : 'Add nonprofit'}</b>
      ${n ? `<div style="margin-top:4px"><span class="status-pill ${n.is_active ? 's-active' : 's-pending'}">${n.is_active ? 'active' : 'awaiting review'}</span></div>` : ''}</div>
      <button class="btn btn-secondary" data-action="npCloseDrawer" aria-label="Close">✕</button></div>
    <div class="db">
      <h4>Organization</h4>
      ${npField('name', 'Name *', n && n.name)}
      <label class="fld"><span class="form-label">Type</span><select class="form-select" id="npf-org_type">${Object.entries(NP_TYPES).map(([k, l]) => `<option value="${k}" ${(n ? npType(n) : 'nonprofit') === k ? 'selected' : ''}>${escHtml(l)}</option>`).join('')}</select></label>
      <label class="fld"><span class="form-label">Description</span><textarea class="form-textarea" id="npf-description" rows="3">${escHtml(n ? n.description || '' : '')}</textarea></label>
      <h4>Services</h4><div class="pick" id="npf-services">${NP_SERVICES.map(s => `<label><input type="checkbox" value="${s}" ${have.has(s) ? 'checked' : ''}>${escHtml(npLabel(s))}</label>`).join('')}</div>
      <h4>Location</h4>
      ${npField('address', 'Address', n && n.address)}
      <div style="display:flex;gap:8px"><div style="flex:1">${npField('city', 'City', n && n.city)}</div><div style="width:70px">${npField('state', 'State', n && n.state)}</div></div>
      ${npField('zipcode', 'Zipcode * (used for the map pin)', n && n.zipcode)}
      ${n ? `<div style="font-size:12px;margin:-4px 0 8px;${n.lat == null ? 'color:var(--yellow)' : 'color:var(--text-3)'}">${n.lat == null ? '⚠ No map coordinates. Check the zipcode and save.' : `📌 ${Number(n.lat).toFixed(4)}, ${Number(n.lng).toFixed(4)}`}</div>` : ''}
      <h4>Contact</h4>
      ${npField('phone', 'Phone', n && n.phone, 'tel')}${npField('email', 'Email', n && n.email, 'email')}${npField('website', 'Website', n && n.website, 'url')}
      <label class="fld"><span class="form-label">Hours (optional, shown on the listing as typed)</span><input class="form-input" id="npf-hours" type="text" maxlength="120" placeholder="Mon to Fri, 9am to 5pm" value="${escHtml(n && n.hours || '')}"></label>
      ${n ? `<h4>Responders and org account</h4><div style="font-size:13px">${linked ? `Linked to <a href="#" data-action="npCloseDrawerToOrgs" data-prevent style="color:var(--teal)">${escHtml(linked.name)} →</a>
        <div style="font-size:12px;color:var(--text-2);margin-top:4px">${linked.member_count} responder account${linked.member_count === 1 ? '' : 's'} · owner ${escHtml(linked.owner_name)}${linked.owner_email ? ' (' + escHtml(linked.owner_email) + ')' : ''}</div>` : '<span style="color:var(--text-3)">Directory listing only. No responders signed in under this organization.</span>'}</div>
      <h4>Verification</h4><div style="font-size:13px">${n.last_verified_at ? 'Last verified ' + escHtml(npDate(n.last_verified_at)) : '<span style="color:var(--yellow)">Never verified</span>'}</div>
      <h4>Admin notes (private)</h4><textarea class="form-textarea" id="npf-admin_notes" rows="3" placeholder="e.g. Spoke with the director on 10/12. Open Tue and Thu.">${escHtml(n.admin_notes || '')}</textarea>`
      : `<h4>Visibility</h4>
      <label class="pick" style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="npf-visible" checked data-change="npSyncAddLabel">Show on Find Help</label>
      <div style="font-size:12px;color:var(--text-3);margin-top:4px">Hidden listings stay in Awaiting review until you approve them.</div>`}
    </div>
    <div class="df"><button class="btn btn-primary" id="npSaveBtn" data-action="npSave" data-a0="${n ? escHtml(n.id) : ''}">${n ? 'Save changes' : 'Add and place on map'}</button>
      ${n ? `<button class="btn btn-secondary" data-action="npVerify" data-a0="${escHtml(n.id)}">Mark verified</button>` : ''}
      ${n && !n.is_active ? `<button class="btn btn-approve" data-action="npSetActive" data-args="[null,true]" data-a0="${escHtml(n.id)}">Approve</button>` : ''}
      ${n && n.is_active ? `<button class="btn btn-secondary" data-action="npSetActive" data-args="[null,false]" data-a0="${escHtml(n.id)}">Move to review</button>` : ''}
      ${n ? `<button class="btn btn-delete" style="margin-left:auto" data-action="npRemove" data-a0="${escHtml(n.id)}">Remove…</button>` : ''}</div>`;
  document.getElementById('npDrawerBg').classList.add('open');
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
}

function npSyncAddLabel() {
  const visible = document.getElementById('npf-visible').checked;
  document.getElementById('npSaveBtn').textContent = visible ? 'Add and place on map' : 'Save as draft';
}

function npCloseDrawer() {
  document.getElementById('npDrawerBg').classList.remove('open');
  const d = document.getElementById('npDrawer');
  d.classList.remove('open');
  d.setAttribute('aria-hidden', 'true');
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') npCloseDrawer(); });

function npFormValues() {
  const v = id => document.getElementById('npf-' + id).value.trim();
  const services = [...document.querySelectorAll('#npf-services input:checked')].map(c => c.value).join(',');
  return {
    name: v('name'), org_type: v('org_type'), description: v('description'), services, address: v('address'), city: v('city'),
    state: v('state').toUpperCase(), zipcode: v('zipcode'), phone: v('phone'), email: v('email'), website: v('website'), hours: v('hours'),
    ...(document.getElementById('npf-admin_notes') ? { admin_notes: v('admin_notes') } : {}),
  };
}

async function npSave(id) {
  const f = npFormValues();
  if (!f.name) { toast('Name is required.', true); return; }
  if (!id && !f.zipcode) { toast('Zipcode is required for map placement.', true); return; }
  try {
    if (id) {
      await apiPatch(`/nonprofits/${id}`, f);
      toast('✓ Saved.');
    } else {
      const payload = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v || null]));
      const isVisible = document.getElementById('npf-visible').checked;
      await apiPost('/nonprofits', { ...payload, is_active: isVisible });
      toast(isVisible ? '✓ Nonprofit added and placed on the map.' : '✓ Saved as draft in Awaiting review. Hidden from Find Help.');
    }
    npCloseDrawer();
    loadNonprofits();
  } catch(e) { toast(e.message, true); }
}

async function npSetActive(id, active) {
  try {
    await apiPatch(`/nonprofits/${id}`, { status: active ? 'active' : 'paused' });
    toast(active ? '✓ Approved. Now live on Find Help.' : 'Moved to Awaiting review. Hidden from Find Help.');
    npCloseDrawer();
    loadNonprofits();
  } catch(e) { toast(e.message, true); }
}

async function npRemove(id) {
  const n = npById(id);
  if (!await showConfirmModal({ title: 'Remove nonprofit', message: `Remove "${n ? n.name : 'this organization'}"? It leaves Find Help. You can restore it from the Removed tab.`, confirmText: 'Remove', danger: true })) return;
  try { await apiDelete(`/nonprofits/${id}`); toast('Removed. Restore it anytime from the Removed tab.'); npCloseDrawer(); loadNonprofits(); }
  catch(e) { toast(e.message, true); }
}

async function npVerify(id) {
  try {
    await apiPatch(`/nonprofits/${id}`, { mark_verified: true });
    toast('✓ Marked verified today.');
    npCloseDrawer();
    loadNonprofits();
  } catch(e) { toast(e.message, true); }
}

/* ── removed listings ── */
function npRenderRemoved() {
  document.getElementById('npRemovedList').innerHTML = npRemoved.length ? npRemoved.map(n => {
    const id = escHtml(n.id);
    return `<div class="np-app"><div class="b"><b>${escHtml(n.name)}</b><span class="np-type">${escHtml(npTypeLabel(n))}</span><br>
      <small>${escHtml(npCityLabel(n))} · removed ${escHtml(npDate(n.deleted_at))}</small></div>
      <div style="display:flex;gap:6px"><button class="btn btn-approve" data-action="npRestore" data-a0="${id}">Restore</button>
      <button class="btn btn-delete" data-action="npDeleteForever" data-a0="${id}">Delete forever…</button></div></div>`;
  }).join('') : '<div class="empty">Nothing removed. Anything you remove can be restored from here.</div>';
}

async function npRestore(id) {
  try { await apiPost(`/nonprofits/${id}/restore`, {}); toast('Restored as paused. Approve it from Awaiting review when ready.'); loadNonprofits(); }
  catch(e) { toast(e.message, true); }
}

async function npDeleteForever(id) {
  const n = npRemoved.find(x => x.id === id);
  if (!await showConfirmModal({ title: 'Delete forever', message: `Permanently delete "${n ? n.name : 'this organization'}"? This cannot be undone.`, confirmText: 'Delete Forever', danger: true })) return;
  try { await apiDelete(`/nonprofits/${id}?permanent=true`); toast('Permanently deleted.'); loadNonprofits(); }
  catch(e) { toast(e.message, true); }
}

/* ── export / import ── */
const NP_CSV_COLUMNS = ['name', 'org_type', 'description', 'services', 'address', 'city', 'state', 'zipcode', 'phone', 'email', 'website'];

function npExport() {
  const rows = [NP_CSV_COLUMNS, ...npFiltered().map(n => NP_CSV_COLUMNS.map(c => (c === 'services' ? npServices(n).join(';') : n[c] || '')))];
  downloadCSV(rows, `nonprofits-${new Date().toISOString().slice(0, 10)}.csv`);
}

function npDownloadTemplate() {
  downloadCSV([NP_CSV_COLUMNS, ['Example Food Pantry', 'nonprofit', 'Weekly groceries', 'food;clothing', '123 Main St', 'Olathe', 'KS', '66061', '(913) 555-0100', 'help@example.org', 'https://example.org']], 'nonprofits-import-template.csv');
}

function npParseCsv(text) {
  const rows = []; let row = [], cur = '', quoted = false;
  const endRow = () => { row.push(cur); cur = ''; if (row.some(c => c.trim())) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') cur += c;
      else if (text[i + 1] === '"') { cur += '"'; i++; }
      else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; endRow(); }
    else cur += c;
  }
  endRow();
  return rows;
}

function npRowsToPayloads(table) {
  const header = table[0].map(h => h.trim().toLowerCase().replace(/^\ufeff/, ''));
  const existing = new Set(npAll.map(n => `${n.name.trim().toLowerCase()}|${(n.zipcode || '').trim()}`));
  const ok = [], skipped = [];
  table.slice(1).forEach(cells => {
    const rec = Object.fromEntries(NP_CSV_COLUMNS.map(c => [c, (cells[header.indexOf(c)] || '').trim()]));
    const key = `${rec.name.toLowerCase()}|${rec.zipcode}`;
    if (!rec.name || !rec.zipcode) { skipped.push(`${rec.name || '(no name)'}: name and zipcode are required`); return; }
    if (existing.has(key)) { skipped.push(`${rec.name}: already in the directory`); return; }
    existing.add(key);
    const services = rec.services.split(/[;,|]/).map(s => s.trim().toLowerCase().replace(/\s+/g, '_')).filter(s => NP_SERVICES.includes(s)).join(',');
    const orgType = NP_TYPES[rec.org_type.toLowerCase()] ? rec.org_type.toLowerCase() : (rec.org_type ? 'other' : 'nonprofit');
    ok.push({ ...Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, v || null])), org_type: orgType, services: services || null, state: rec.state.toUpperCase() || null, is_active: true });
  });
  return { ok, skipped };
}

async function npImportFile(input) {
  const file = input.files[0];
  input.value = '';
  if (!file) return;
  const table = npParseCsv(await file.text());
  if (table.length < 2 || !table[0].some(h => h.trim().toLowerCase().replace(/^\ufeff/, '') === 'name')) {
    toast('That file needs a header row with a "name" column. Use the CSV template.', true); return;
  }
  const { ok, skipped } = npRowsToPayloads(table);
  if (!ok.length) { toast(`Nothing to import. ${skipped.length} rows skipped (${skipped[0] || 'empty file'}).`, true); return; }
  const detail = skipped.length ? ` ${skipped.length} rows will be skipped (missing name or zipcode, or already listed).` : '';
  if (!await showConfirmModal({ title: 'Import nonprofits', message: `Add ${ok.length} organizations as active partners? Each is placed on the map from its zipcode. Unrecognized service names are ignored, and a missing type becomes Nonprofit.${detail}`, confirmText: `Import ${ok.length}`, danger: false })) return;
  let failed = 0;
  for (let i = 0; i < ok.length; i++) {
    try { await apiPost('/nonprofits', ok[i]); } catch(e) { failed++; }
    if ((i + 1) % 10 === 0) toast(`Imported ${i + 1} of ${ok.length}…`);
  }
  toast(failed ? `Imported ${ok.length - failed}; ${failed} failed.` : `✓ Imported ${ok.length} organizations.`, failed > 0);
  loadNonprofits();
}

/* ═══════════════════════════════════════════
   DISBURSEMENTS
═══════════════════════════════════════════ */
async function loadDisbursements() {
  const el = document.getElementById('disbContent');
  const status = document.getElementById('disbFilter').value;
  el.innerHTML = '<div class="loading">Loading</div>';
  try {
    const url = '/admin/disbursements' + (status ? `?status=${status}` : '');
    const items = await apiGet(url);
    const pending = items.filter(d => d.status === 'requested');
    const badge = document.getElementById('disbBadge');
    badge.textContent = pending.length;
    badge.className = 'nav-badge' + (pending.length ? '' : ' zero');
    if (!items.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">✅</div>No disbursement requests.</div>'; return; }
    el.innerHTML = `
      <table class="need-table">
        <thead><tr><th>Navigator</th><th>Need</th><th>Amount</th><th>Method</th><th>Purpose</th><th>Requested</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${items.map(d => `
            <tr>
              <td><div style="font-weight:600">${d.navigator_name}</div><div style="font-size:11px;color:var(--text-3)">${d.navigator_email}</div></td>
              <td style="font-size:13px;max-width:160px;color:var(--text-2)">${d.need_title}</td>
              <td style="font-weight:800;font-size:15px;color:var(--teal)">$${(d.amount_cents/100).toFixed(2)}</td>
              <td style="font-size:12px;color:var(--text-2);text-transform:capitalize">${d.method.replace('_',' ')}</td>
              <td style="font-size:12px;color:var(--text-2);max-width:180px">${esc(d.note||'—')}</td>
              <td style="font-size:11px;color:var(--text-3)">${new Date(d.requested_at).toLocaleDateString()}</td>
              <td><span class="status-pill disb-${d.status}">${d.status}</span></td>
              <td>
                ${d.status==='requested'?`
                  <div style="display:flex;flex-direction:column;gap:6px">
                    <input id="gc-${d.id}" type="text" placeholder="Gift card code (optional)" style="height:28px;border:1px solid var(--border-2);border-radius:6px;padding:0 8px;font-size:11px;background:var(--surface-2);color:var(--text);width:160px;font-family:inherit;outline:none">
                    <div style="display:flex;gap:5px">
                      <button class="btn btn-approve" data-action="approveDisbursement" data-a0="${d.id}">Approve</button>
                      <button class="btn btn-reject" data-action="rejectDisbursement" data-a0="${d.id}">Reject</button>
                    </div>
                  </div>`:''}
                ${d.status==='sent'?`<div style="display:flex;flex-direction:column;gap:5px;align-items:flex-start"><span style="font-size:11px;color:var(--text-3)">Awaiting receipt</span><button class="btn btn-approve" data-action="showReceiptModal" data-a0="${d.id}" style="font-size:11px;padding:4px 10px">📄 Upload Receipt</button></div>`:''}
                ${d.status==='confirmed'&&d.receipt_url?`<a href="${API}${d.receipt_url}"  target="_blank" rel="noopener noreferrer" style="font-size:12px;font-weight:600;color:var(--teal)">📄 View Receipt</a>`:''}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch(e) { el.innerHTML = `<div class="empty" style="color:var(--red)">Failed: ${escHtml(e.message)}</div>`; }
}

async function approveDisbursement(id) {
  const code = document.getElementById('gc-' + id)?.value.trim() || null;
  const result = await showApproveModal(`Approve disbursement${code ? ' with gift card code' : ''}?`);
  if (!result.confirmed) return;
  try { await apiPost(`/admin/disbursements/${id}/approve`, { gift_card_code: code, admin_note: result.note }); toast('✓ Disbursement approved.'); loadDisbursements(); }
  catch(e) { toast(e.message, true); }
}

async function rejectDisbursement(id) {
  const reason = await showRejectModal({ title: 'Reject Disbursement', subtitle: 'Select a reason or write a custom one. The navigator will be notified.', presets: DISB_REJECT_PRESETS });
  if (reason === null) return;
  try { await apiPost(`/admin/disbursements/${id}/reject`, { admin_note: reason }); toast('Disbursement rejected.'); loadDisbursements(); }
  catch(e) { toast(e.message, true); }
}

/* ═══════════════════════════════════════════
   AUDIT LOG
═══════════════════════════════════════════ */
let auditPage = 1, auditPages = 1, auditTotal = 0;
let auditCache = [];

function goAuditPage(p) { auditPage = p; loadAuditLog(); }

const ACTION_CLASS = {
  approve:'act-approve', user_approve:'act-approve',
  reject:'act-reject', user_reject:'act-reject',
  delete:'act-delete',
  announcement:'act-announce',
  disbursement:'act-disb',
};

async function loadAuditLog() {
  const action = document.getElementById('auditActionFilter')?.value || '';
  let url = `/admin/audit-log?page=${auditPage}`;
  if (action) url += `&action=${action}`;
  document.getElementById('auditContent').innerHTML = '<div class="loading">Loading</div>';
  try {
    const data = await apiGet(url);
    auditCache  = data.items || data;
    const items = Array.isArray(data) ? data : (data.items || []);
    auditPages  = data.pages || 1;
    auditTotal  = data.total || items.length;
    if (!items.length) {
      document.getElementById('auditContent').innerHTML = '<div class="empty"><div class="empty-icon">📜</div>No audit entries found.</div>';
      document.getElementById('auditPagination').style.display = 'none';
      return;
    }
    document.getElementById('auditContent').innerHTML = `
      <table class="need-table audit-row">
        <thead><tr>
          <th>Time</th><th>Admin</th><th>Action</th><th>Entity</th><th>Detail</th>
        </tr></thead>
        <tbody>
          ${items.map(e => {
            const actKey = (e.action||'').split('_')[0];
            const cls = ACTION_CLASS[e.action] || ACTION_CLASS[actKey] || 'act-other';
            const ts  = e.created_at ? new Date(e.created_at).toLocaleString() : '—';
            return `<tr>
              <td style="color:var(--text-3);white-space:nowrap">${ts}</td>
              <td style="font-weight:600">${e.admin_name || e.actor || '—'}</td>
              <td><span class="audit-action ${cls}">${(e.action||'').replace(/_/g,' ')}</span></td>
              <td style="font-family:var(--mono);font-size:11px;color:var(--text-2)">${e.entity_type||'—'} ${e.entity_id?`<span title="${e.entity_id}" style="cursor:default">#${e.entity_id.slice(0,8)}…</span>`:''}</td>
              <td style="color:var(--text-2);max-width:260px;font-size:12px">${e.detail || e.reason || '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
    const pag = document.getElementById('auditPagination');
    pag.style.display = auditPages > 1 ? 'flex' : 'none';
    document.getElementById('auditPageInfo').textContent  = `Page ${auditPage} / ${auditPages}`;
    document.getElementById('auditTotalInfo').textContent = `${auditTotal} entries`;
    document.getElementById('auditPrev').disabled = auditPage <= 1;
    document.getElementById('auditNext').disabled = auditPage >= auditPages;
  } catch(e) {
    document.getElementById('auditContent').innerHTML = `
      <div class="empty">
        <div class="empty-icon">📋</div>
        <div>Audit log coming soon.</div>
        <div style="margin-top:6px;font-size:11px;color:var(--muted)">Full activity history will be available in a future update.</div>
      </div>`;
    document.getElementById('auditPagination').style.display = 'none';
  }
}

async function exportAuditCSV() {
  try {
    toast('Fetching audit data…');
    const data = await apiGet('/admin/audit-log?page=1&per_page=5000');
    const items = Array.isArray(data) ? data : (data.items || []);
    const rows = [['Time','Admin','Action','Entity Type','Entity ID','Detail']];
    items.forEach(e => rows.push([
      e.created_at || '', e.admin_name || e.actor || '',
      e.action || '', e.entity_type || '', e.entity_id || '', e.detail || e.reason || ''
    ]));
    downloadCSV(rows, `migrantportal-audit-${new Date().toISOString().slice(0,10)}.csv`);
    toast(`✓ Exported ${rows.length - 1} entries.`);
  } catch(e) { toast('Export failed — endpoint not available yet.', true); }
}

/* ═══════════════════════════════════════════
   COMMAND PALETTE
═══════════════════════════════════════════ */
const cmdIc = id => `<svg class="ic" viewBox="0 0 24 24"><use href="#${id}"/></svg>`;
const CMD_ITEMS = [
  { icon:cmdIc('i-home'),      label:'Home',             tab:'home' },
  { icon:cmdIc('i-clock'),     label:'Pending Queue',    tab:'pending' },
  { icon:cmdIc('i-list'),      label:'All Needs',        tab:'all' },
  { icon:cmdIc('i-bars'),      label:'Reports',          tab:'reports' },
  { icon:cmdIc('i-flag'),      label:'Flagged',          tab:'flagged' },
  { icon:cmdIc('i-dollar'),    label:'Disbursements',    tab:'disbursements' },
  { icon:cmdIc('i-users'),     label:'Users',            tab:'users' },
  { icon:cmdIc('i-building'),  label:'Organizations',    tab:'orgs' },
  { icon:cmdIc('i-book'),      label:'Resources',        tab:'resources' },
  { icon:cmdIc('i-megaphone'), label:'Announcements',    tab:'announcements' },
  { icon:cmdIc('i-send'),      label:'Email',            tab:'email' },
  { icon:cmdIc('i-landmark'),  label:'Directory',      tab:'nonprofits' },
  { icon:cmdIc('i-scroll'),    label:'Audit Log',        tab:'audit' },
];
let cmdIdx = 0;

function openCmd() {
  document.getElementById('cmdOverlay').classList.add('open');
  setTimeout(() => document.getElementById('cmdInput').focus(), 50);
  renderCmdList('');
}

function closeCmd(e) {
  if (e && e.target !== document.getElementById('cmdOverlay')) return;
  document.getElementById('cmdOverlay').classList.remove('open');
  document.getElementById('cmdInput').value = '';
}

function toggleShortcuts() {
  const el = document.getElementById('shortcutsOverlay');
  const isOpen = el.style.display === 'flex';
  el.style.display = isOpen ? 'none' : 'flex';
}
function closeShortcuts(e) {
  if (e && e.target !== document.getElementById('shortcutsOverlay')) return;
  document.getElementById('shortcutsOverlay').style.display = 'none';
}

function renderCmdList(q) {
  const tabs = q ? CMD_ITEMS.filter(i => i.label.toLowerCase().includes(q.toLowerCase())) : CMD_ITEMS;
  const isCaseNum = q && /^\d{3,}$/.test(q.trim());
  cmdIdx = 0;
  document.getElementById('cmdList').innerHTML = `
    <div class="cmd-section">Navigate to</div>
    ${tabs.map((item, i) => `
      <div class="cmd-item ${i===0 && !isCaseNum ?'cmd-active':''}" data-tab="${item.tab}" data-action="cmdGo" data-a0="${item.tab}">
        <span class="cmd-item-icon">${item.icon}</span>
        ${item.label}
        ${item.tab === activeTab ? '<span class="cmd-item-badge">current</span>' : ''}
      </div>`).join('')}
    ${isCaseNum ? `
      <div class="cmd-section" style="margin-top:4px">Search cases</div>
      <div class="cmd-item cmd-active" data-action="cmdSearchCase" data-a0="${q.trim()}">
        <span class="cmd-item-icon"><svg class="ic" viewBox="0 0 24 24"><use href="#i-search"/></svg></span>
        Search All Needs for #${q.trim()}
      </div>` : ''}
    ${!tabs.length && !isCaseNum ? '<div style="padding:20px;text-align:center;color:var(--text-3);font-size:13px">No results</div>' : ''}
  `;
}

function cmdSearchCase(num) {
  document.getElementById('cmdOverlay').classList.remove('open');
  document.getElementById('cmdInput').value = '';
  switchTab('all');
  setTimeout(() => {
    const el = document.getElementById('allSearch');
    if (el) { el.value = num; loadAllNeeds(); }
  }, 100);
}

function filterCmd() {
  renderCmdList(document.getElementById('cmdInput').value);
}

function cmdGo(tab) {
  switchTab(tab);
  document.getElementById('cmdOverlay').classList.remove('open');
  document.getElementById('cmdInput').value = '';
}

function cmdKey(e) {
  const items = document.querySelectorAll('.cmd-item');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    cmdIdx = Math.min(cmdIdx + 1, items.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    cmdIdx = Math.max(cmdIdx - 1, 0);
  } else if (e.key === 'Enter') {
    const active = items[cmdIdx];
    if (active) cmdGo(active.dataset.tab);
    return;
  } else if (e.key === 'Escape') {
    document.getElementById('cmdOverlay').classList.remove('open');
    return;
  }
  items.forEach((el, i) => el.classList.toggle('cmd-active', i === cmdIdx));
  items[cmdIdx]?.scrollIntoView({ block:'nearest' });
}

/* ═══════════════════════════════════════════
   KEYBOARD SHORTCUTS
═══════════════════════════════════════════ */
let kbFocus = -1;

function setKbFocus(idx) {
  document.querySelectorAll('.pending-card').forEach((el, i) => el.classList.toggle('kb-focus', i === idx));
  kbFocus = idx;
  const el = document.querySelector(`.pending-card[data-idx="${idx}"]`);
  el?.scrollIntoView({ block:'nearest', behavior:'smooth' });
}

document.addEventListener('keydown', (e) => {
  // Don't trigger inside inputs/textareas
  if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
  if (e.metaKey || e.ctrlKey) {
    if (e.key === 'k') { e.preventDefault(); openCmd(); }
    return;
  }
  if (e.key === '?') { e.preventDefault(); toggleShortcuts(); return; }

  if (activeTab === 'pending') {
    const cards = document.querySelectorAll('.pending-card');
    if (e.key === 'j') {
      e.preventDefault();
      setKbFocus(Math.min(kbFocus + 1, cards.length - 1));
    } else if (e.key === 'k') {
      e.preventDefault();
      setKbFocus(Math.max(kbFocus - 1, 0));
    } else if (e.key === 'a' && kbFocus >= 0) {
      e.preventDefault();
      const n = pendingNeeds[kbFocus];
      if (n) approveSingle(n.id);
    } else if (e.key === 'r' && kbFocus >= 0) {
      e.preventDefault();
      const n = pendingNeeds[kbFocus];
      if (n) showReject(n.id);
    } else if (e.key === 'x' && kbFocus >= 0) {
      e.preventDefault();
      const n = pendingNeeds[kbFocus];
      if (n) {
        const chk = document.getElementById('chk-' + n.id);
        if (chk) { chk.checked = !chk.checked; toggleSelect(n.id); }
      }
    } else if (e.key === 'Escape') {
      document.querySelectorAll('.pending-card').forEach(el => el.classList.remove('kb-focus'));
      kbFocus = -1;
    }
  }

  if (e.key === 'Escape') {
    document.getElementById('shortcutsOverlay').style.display = 'none';
    document.getElementById('modalOverlay').classList.remove('open');
    document.getElementById('cmdOverlay').classList.remove('open');
  }
});

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
loadStats();
loadPending();
loadHome();
