requireAuth();
const user = getUser() || {};
// Not named canSubmitNeeds: api.js declares that global, and redeclaring it with const kills this whole script.
const orgCanSubmit = u => u.role !== 'responder' || u.can_submit_needs === true;
document.body.classList.toggle('no-submit', !orgCanSubmit(user));
// Refresh the cached profile so an admin grant takes effect without re-login
apiGet('/auth/me').then(me => {
  if (!me) return;
  localStorage.setItem('mp_user', JSON.stringify(me));
  document.body.classList.toggle('no-submit', !orgCanSubmit(me));
}).catch(() => {});
const initials = (user.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
document.getElementById('topAvatar').textContent = initials;
document.getElementById('topName').textContent = user.name || user.email || 'User';
if (user.organization) document.getElementById('orgName').textContent = user.organization;

const URGENCY_BADGE = { urgent:'badge-urgent', high:'badge-high', medium:'badge-medium', low:'badge-low' };
const CAT_EMOJI = { housing:'🏠', food:'🍽️', clothing:'👗', furniture:'🛋️', transportation:'🚗', employment:'💼', legal:'⚖️', medical:'🏥', education:'📚', translation:'🌐', childcare:'👶', financial:'💰', other:'📦' };

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'; }
function timeAgo(d) {
  // API timestamps are naive UTC; without the Z they parse as local time and go negative
  const utc = /Z$|[+-]\d\d:\d\d$/.test(d) ? d : d + 'Z';
  const diff = Math.max(0, Math.floor((Date.now() - new Date(utc)) / 86400000));
  if (diff === 0) return 'Today'; if (diff === 1) return '1d ago';
  return diff + 'd ago';
}

const STATUS_BADGE = {
  pending:   ['badge-pending', 'Awaiting Approval'],
  approved:  ['badge-open',    'Approved'],
  active:    ['badge-open',    'Open'],
  fulfilled: ['badge-closed',  'Fulfilled'],
  closed:    ['badge-closed',  'Closed'],
};
function statusBadge(status) {
  const [cls, label] = STATUS_BADGE[status] || ['badge-closed', cap(status || 'unknown')];
  return `<span class="badge ${cls}">${label}</span>`;
}

function needRow(n, cols) {
  const urg  = n.urgency || 'low';
  const loc  = [n.city, n.state].filter(Boolean).join(', ');
  const fam  = `${n.family_adults||1}A ${n.family_children||0}C`;
  const date = n.created_at ? timeAgo(n.created_at) : '—';
  const id   = '#MP' + String(n.id).padStart(3,'0');

  if (cols === 'short') return `
    <tr>
      <td><a href="need?id=${n.id}" style="font-weight:600;color:var(--teal);">${esc(n.title)}</a></td>
      <td>${CAT_EMOJI[n.category]||''} ${cap(n.category)}</td>
      <td><span class="badge ${URGENCY_BADGE[urg]}"><span class="dot"></span>${cap(urg)}</span></td>
      <td>${esc(loc)}</td>
      <td>${fam}</td>
      <td>${statusBadge(n.status)}</td>
      <td><a href="need?id=${n.id}" style="font-size:12px;color:var(--teal);font-weight:600;">View →</a></td>
    </tr>`;
  return `
    <tr>
      <td style="font-size:12px;color:var(--gray-600);font-weight:600;">${id}</td>
      <td><a href="need?id=${n.id}" style="font-weight:600;color:var(--teal);">${esc(n.title)}</a></td>
      <td>${CAT_EMOJI[n.category]||''} ${cap(n.category)}</td>
      <td><span class="badge ${URGENCY_BADGE[urg]}"><span class="dot"></span>${cap(urg)}</span></td>
      <td>${esc(loc)}</td>
      <td>${fam}</td>
      <td style="color:var(--gray-400);">${date}</td>
      <td>${statusBadge(n.status)}</td>
      <td><a href="need?id=${n.id}" style="font-size:12px;color:var(--teal);font-weight:600;">View →</a></td>
    </tr>`;
}

function openMembersSection() {
  showSection('members', document.querySelectorAll('.sidebar-item')[2]);
}

let allNeeds = [];

// ── Needs near you ───────────────────────────────────────────────────────
const NEARBY_RADIUS_MI = 25;
const NEARBY_MAX_ROWS = 5;
const URGENCY_RANK = { urgent: 3, high: 2, medium: 1, low: 0 };

function distanceMiles(a, b) {
  const rad = d => d * Math.PI / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

async function geocodeOrg(org) {
  if (!org || !org.city || !org.state) return null;
  const key = `mp_org_geo_${esc(org.city)}_${esc(org.state)}`.toLowerCase();
  const cached = localStorage.getItem(key);
  if (cached) return JSON.parse(cached);
  try {
    const q = encodeURIComponent(`${esc(org.city)}, ${esc(org.state)}, USA`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`);
    const hits = res.ok ? await res.json() : [];
    if (!hits.length) return null;
    const point = { lat: parseFloat(hits[0].lat), lng: parseFloat(hits[0].lon) };
    localStorage.setItem(key, JSON.stringify(point));
    return point;
  } catch (err) {
    console.warn('Org geocode failed', err);
    return null;
  }
}

function nearbyRow(n) {
  const urg = n.urgency || 'low';
  const loc = [n.city, n.state].filter(Boolean).join(', ');
  const dist = n.distance == null ? '—' : `${Math.round(n.distance)} mi`;
  return `
    <tr>
      <td><a href="need?id=${esc(n.id)}" style="font-weight:600;color:var(--teal);">${esc(n.title)}</a></td>
      <td>${CAT_EMOJI[n.category] || ''} ${cap(n.category)}</td>
      <td><span class="badge ${URGENCY_BADGE[urg]}"><span class="dot"></span>${cap(urg)}</span></td>
      <td>${esc(loc)}</td>
      <td>${dist}</td>
      <td><a href="need?id=${esc(n.id)}" style="font-size:12px;color:var(--teal);font-weight:600;">Respond →</a></td>
    </tr>`;
}

async function loadNearbyNeeds(org) {
  const body = document.getElementById('nearbyNeedsBody');
  const tile = document.getElementById('statNearby');
  const tileDelta = document.getElementById('statNearbyDelta');
  const emptyRow = msg => `<tr><td colspan="6" style="text-align:center;color:var(--text-sub);padding:28px;">${msg}</td></tr>`;
  try {
    const [res, origin] = await Promise.all([fetch(`${API}/needs/public`), geocodeOrg(org)]);
    if (!res.ok) throw new Error(`needs/public ${res.status}`);
    const needs = await res.json();

    const withDistance = needs.map(n => ({
      ...n,
      distance: origin && n.lat != null && n.lng != null ? distanceMiles(origin, n) : null,
    }));
    const nearby = origin
      ? withDistance.filter(n => n.distance != null && n.distance <= NEARBY_RADIUS_MI)
      : withDistance.filter(n => org && org.state && n.state === org.state);

    nearby.sort((a, b) =>
      (URGENCY_RANK[b.urgency] || 0) - (URGENCY_RANK[a.urgency] || 0) ||
      (a.distance ?? Infinity) - (b.distance ?? Infinity));

    tile.textContent = nearby.length;
    tileDelta.textContent = origin ? `Within ${NEARBY_RADIUS_MI} mi` : 'In your state';
    body.innerHTML = nearby.length
      ? nearby.slice(0, NEARBY_MAX_ROWS).map(nearbyRow).join('')
      : emptyRow(`No open needs ${origin ? `within ${NEARBY_RADIUS_MI} mi` : 'near you'} right now. New needs are posted by navigators every week. <a href="requests">Browse all needs →</a> or <a href="submit-need">submit one from your caseload →</a>`);
  } catch (err) {
    console.error('Nearby needs failed', err);
    tile.textContent = '—';
    body.innerHTML = emptyRow('Could not load nearby needs. <a href="requests">Browse all needs →</a>');
  }
}

async function loadData() {
  const [needsRes, orgRes, statsRes, membersRes] = await Promise.allSettled([
    apiGet('/needs?limit=100'),
    apiGet('/orgs/mine'),
    apiGet('/orgs/mine/stats'),
    apiGet('/orgs/mine/members'),
  ]);

  allNeeds = needsRes.status === 'fulfilled'
    ? (Array.isArray(needsRes.value) ? needsRes.value : (needsRes.value.items || needsRes.value.needs || []))
    : [];

  const org     = orgRes.status     === 'fulfilled' ? orgRes.value     : null;
  const stats   = statsRes.status   === 'fulfilled' ? statsRes.value   : null;
  const members = membersRes.status === 'fulfilled'
    ? (Array.isArray(membersRes.value) ? membersRes.value : (membersRes.value.items || membersRes.value.members || []))
    : [];

  renderInviteCard(org, orgRes.status === 'fulfilled');
  fillDropoff(org);
  renderMembersTable(members, membersRes.status === 'fulfilled');

  // Org name
  if (org) document.getElementById('orgName').textContent = org.name;

  // First-run nudge — only while nothing has ever been submitted
  document.getElementById('firstNeedNudge').style.display = allNeeds.length ? 'none' : 'flex';

  // Stats
  document.getElementById('statTotal').textContent    = allNeeds.length || '0';
  const openCount = allNeeds.filter(n => n.status === 'active').length;
  document.getElementById('statOpen').textContent     = openCount;
  loadNearbyNeeds(org);
  document.getElementById('statMembers').textContent  = stats ? stats.member_count : (members.length || '1');
  document.getElementById('needsBadge').textContent   = openCount;

  // Recent needs table (5 rows)
  const recent = allNeeds.slice(0, 5);
  const rBody = document.getElementById('recentNeedsBody');
  rBody.innerHTML = recent.length
    ? recent.map(n => needRow(n, 'short')).join('')
    : '<tr><td colspan="7" style="text-align:center;color:var(--text-sub);padding:28px;">No needs submitted yet. <a href="submit-need">Submit your first need →</a></td></tr>';

  // All needs table
  renderAllNeeds(allNeeds);

  // Activity feed
  renderActivity(allNeeds);

  // Solo-team nudge — invite link only while the team is just the admin
  const memberCount = stats ? stats.member_count : (members.length || 1);
  document.getElementById('statMembersDelta').innerHTML = memberCount <= 1
    ? 'Just you so far. <a href="#" data-action="openMembers" style="color:var(--teal);font-weight:600;">Invite a teammate →</a>'
    : 'Active volunteers';
}

function renderAllNeeds(needs) {
  const body = document.getElementById('allNeedsBody');
  body.innerHTML = needs.length
    ? needs.map(n => needRow(n, 'full')).join('')
    : '<tr><td colspan="9" style="text-align:center;color:var(--text-sub);padding:28px;">No needs found. <a href="submit-need">Submit one →</a></td></tr>';
}

function filterTable(q) {
  const term = q.toLowerCase();
  document.querySelectorAll('#allNeedsBody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
  });
}

function renderActivity(needs) {
  const items = needs.slice(0, 8).map(n => `
    <div class="feed-item">
      <div class="feed-dot teal">${CAT_EMOJI[n.category]||'📦'}</div>
      <div>
        <div class="feed-text">Need submitted: <a href="need?id=${n.id}" style="font-weight:600;">${esc(n.title)}</a></div>
        <div class="feed-time">${n.created_at ? timeAgo(n.created_at) : '—'} · ${[n.city,n.state].filter(Boolean).join(', ')}</div>
      </div>
    </div>`).join('');
  const html = items || '<div style="padding:20px;text-align:center;color:var(--text-sub);font-size:13px;">No activity yet.</div>';
  document.getElementById('activityFeed').innerHTML = html;
  document.getElementById('activityFeedFull').innerHTML = html;
}

function fillDropoff(org) {
  const card = document.getElementById('dropoffCard');
  if (!org) { card.style.display = 'none'; return; }
  document.getElementById('dropoffAddress').value = org.dropoff_address || '';
  document.getElementById('dropoffHours').value = org.dropoff_hours || '';
  document.getElementById('dropoffNotes').value = org.dropoff_notes || '';
}

async function saveDropoff() {
  const status = document.getElementById('dropoffStatus');
  const btn = document.getElementById('saveDropoffBtn');
  btn.disabled = true;
  status.textContent = 'Saving…';
  try {
    await apiPatch('/orgs/mine/dropoff', {
      dropoff_address: document.getElementById('dropoffAddress').value,
      dropoff_hours: document.getElementById('dropoffHours').value,
      dropoff_notes: document.getElementById('dropoffNotes').value,
    });
    status.textContent = 'Saved.';
  } catch (err) {
    console.error('Save drop-off failed', err);
    status.textContent = /owner/i.test(err.message || '') ? 'Only the org owner can change this.' : 'Could not save. Try again.';
  } finally {
    btn.disabled = false;
  }
}

function renderInviteCard(org, ok) {
  const el = document.getElementById('inviteCardBody');
  if (!ok) {
    el.innerHTML = `<div style="color:var(--text-sub);">Couldn't load your invite code right now. <a href="#" data-action="reload" style="color:var(--teal);font-weight:600;">Try again</a></div>`;
    return;
  }
  const code = org && org.invite_code;
  if (!code) {
    el.innerHTML = `<div style="color:var(--text-sub);">No invite code is set up for this organization yet.</div>`;
    return;
  }
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
      <code id="inviteCodeText" style="background:var(--gray-100);border:1px solid var(--border);border-radius:8px;padding:8px 14px;font-size:15px;font-weight:700;letter-spacing:.04em;color:var(--text);">${esc(code)}</code>
      <button class="btn-outline" id="copyInviteBtn" data-action="copyInvite" data-code="${esc(code)}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        Copy code
      </button>
    </div>
    <div style="color:var(--text-sub);">A teammate can enter this code at <strong>migrantportal.com/register?invite=${esc(code)}</strong> to join your org as a navigator with needs-submission access.</div>`;
}

function copyInviteCode(code) {
  const btn = document.getElementById('copyInviteBtn');
  navigator.clipboard.writeText(code).then(() => {
    if (!btn) return;
    const original = btn.innerHTML;
    btn.innerHTML = 'Copied!';
    setTimeout(() => { btn.innerHTML = original; }, 1500);
  }).catch(() => {
    if (btn) btn.innerHTML = 'Copy failed';
  });
}

function renderMembersTable(members, ok) {
  const body = document.getElementById('membersBody');
  if (!ok) {
    body.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-sub);padding:28px;">Couldn\'t load team members right now. <a href="#" data-action="reload" style="color:var(--teal);font-weight:600;">Try again</a></td></tr>';
    return;
  }
  if (!members.length) {
    body.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-sub);padding:28px;">No team members yet. Share your invite code above to bring your team on.</td></tr>';
    return;
  }
  body.innerHTML = members.map(m => {
    const name = m.name || m.email || 'Unknown';
    const youTag = m.id === user.id ? ' <span style="color:var(--gray-400);font-weight:500;">(You)</span>' : '';
    return `<tr>
      <td style="font-weight:600;">${esc(name)}${youTag}</td>
      <td style="color:var(--text-sub);">${esc(m.email || '—')}</td>
      <td>${esc(cap(m.responder_type) || '—')}</td>
    </tr>`;
  }).join('');
}

// Section switching
const sections = ['overview','needs','members','activity','howitworks'];
function showSection(id, btn) {
  sections.forEach(s => {
    const el = document.getElementById('sec-' + s);
    if (el) el.style.display = s === id ? '' : 'none';
  });
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.mob-nav-item').forEach(i => i.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function openHowItWorks() {
  const item = document.querySelector('.sidebar-item[data-section="howitworks"]');
  showSection('howitworks', item);
  window.scrollTo(0, 0);
}

// Deep link from other pages' sidebars, e.g. org-dashboard#members
const _hashSection = location.hash.slice(1);
if (sections.includes(_hashSection)) {
  const _item = document.querySelector('.sidebar-item[data-section="' + _hashSection + '"]');
  showSection(_hashSection, _item);
}

loadData();

// Handlers were inline attributes (and onclick strings inside templates). One delegated listener now serves
// them all, so the page can run without 'unsafe-inline' and re-rendered markup keeps working.
const ACTIONS = {
  logout: function () { logout(); },
  openHowItWorks: function () { openHowItWorks(); },
  openMembers: function () { openMembersSection(); },
  seeAllNeeds: function () { showSection('needs', document.querySelector('.sidebar-item[data-section="needs"]')); },
  saveDropoff: function () { saveDropoff(); },
  reload: function () { loadData(); },
  copyInvite: function (el) { copyInviteCode(el.dataset.code); },
};

document.addEventListener('click', function (event) {
  const target = event.target.closest('[data-action], [data-section], [data-href]');
  if (!target) return;
  if (target.dataset.action) {
    if (target.tagName === 'A') event.preventDefault();
    const run = ACTIONS[target.dataset.action];
    if (run) run(target);
  } else if (target.dataset.section) {
    showSection(target.dataset.section, target);
  } else if (target.dataset.href) {
    window.location.href = target.dataset.href;
  }
});

document.addEventListener('input', function (event) {
  if (event.target.matches('[data-filter-table]')) filterTable(event.target.value);
});
