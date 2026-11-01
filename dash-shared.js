/* Shared helpers for the role dashboards (navigator-dashboard, responder-dashboard).
   Requires api.js (API, apiGet, apiPatch, esc, getUser, logout). */

const CAT_EMOJI = { housing:'🏠', food:'🍽️', clothing:'👗', furniture:'🛋️', transportation:'🚗', employment:'💼', legal:'⚖️', medical:'🏥', education:'📚', translation:'🌐', other:'📦' };
const URGENCY_BADGE = { urgent:'badge-urgent', high:'badge-high', medium:'badge-medium', low:'badge-low' };
const URGENCY_RANK = { urgent: 3, high: 2, medium: 1, low: 0 };
const DEFAULT_RADIUS_MI = 50;
const NEARBY_MAX_ROWS = 5;

const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
const fmtMiles = d => d == null ? '—' : d < 1 ? '< 1 mi' : `${Math.round(d)} mi`;
const fmtLoc = o => [o.city, o.state].filter(Boolean).join(', ');

function timeAgo(d) {
  const diff = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (diff <= 0) return 'Today';
  return diff === 1 ? '1d ago' : diff + 'd ago';
}

function urgencyBadge(u) {
  const urg = u || 'low';
  return `<span class="badge ${URGENCY_BADGE[urg] || 'badge-low'}"><span class="dot"></span>${esc(cap(urg))}</span>`;
}

const catLabel = c => `${CAT_EMOJI[c] || ''} ${esc(cap(c))}`;
const needLink = n => `<a class="row-link" href="need?id=${esc(n.id)}">${esc(n.title)}</a>`;

function tableCard(head, rowsHtml, colspan) {
  // A head label starting with '~' marks a column that is hidden on mobile (cells use class hide-sm).
  const ths = head.map(h => !h ? '<th><span class="sr-only">Actions</span></th>' : h[0] === '~' ? `<th class="hide-sm">${h.slice(1)}</th>` : `<th>${h}</th>`).join('');
  return `<div class="table-card"><table><thead><tr>${ths}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
}

function emptyCard(title, body) {
  return `<div class="table-card"><div class="empty"><b>${title}</b>${body}</div></div>`;
}

function sectionRow(heading, linkHtml) {
  return `<div class="section-row"><div class="section-heading">${heading}</div>${linkHtml || ''}</div>`;
}

function statCard(label, id, delta, deltaClass) {
  return `<div class="stat-card"><div class="stat-label">${label}</div><div class="stat-value" id="${id}">—</div><div class="stat-delta ${deltaClass || 'neutral'}" id="${id}Delta">${delta}</div></div>`;
}

function nudgeCard(id, title, body, actionsHtml) {
  return `<div class="nudge" id="${id}" style="display:none"><div class="nudge-l"><div class="nudge-i">＋</div><div><b>${title}</b><p>${body}</p></div></div><div class="header-actions">${actionsHtml}</div></div>`;
}

/* ── Line icons (match org-dashboard.html; stroke follows currentColor) ── */
const DASH_ICONS = {
  dash: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  needs: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>',
  families: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>',
  chat: '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  heart: '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>',
  out: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>'
};
// Known key -> SVG line icon; anything else (e.g. the chip emoji) passes through unchanged.
function dashIcon(key) {
  const d = DASH_ICONS[key];
  return d ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>` : key;
}

/* ── Shell: topbar, sidebar, mobile nav ─────────────────────────────── */
// cfg: { icon, roleLabel, items:[{id,icon,label,badgeId?,href?}], mobile:[{id,icon,label,href?}] }
// item/mobile `icon` is a DASH_ICONS key (cfg.icon is the chip emoji, shown as-is)
function mountShell(user, cfg) {
  const initials = (user.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const top = document.getElementById('shell-top');
  if (!top.firstChild) top.innerHTML = `
    <a href="dashboard" class="topbar-logo"><div class="logo-icon"><img src="logo.png" alt="MigrantPortal" /></div>MigrantPortal</a>
    <div class="topbar-right">
      <a href="requests" class="nav-link">Browse Needs</a>
      <a href="dashboard" class="nav-link">My Dashboard</a>
      <button type="button" class="mp-lang-toggle" onclick="toggleDashLang()" aria-label="Cambiar a español">ES</button>
      <div class="user-chip" onclick="window.location.href='profile'">
        <div class="user-avatar">${esc(initials)}</div><span class="user-name">${esc(user.name || user.email || 'User')}</span>
      </div>
    </div>`;
  const item = (i, first) => {
    const act = i.href ? `window.location.href='${i.href}'` : `showSection('${i.id}', this)`;
    const badge = i.badgeId ? `<span class="sidebar-badge" id="${i.badgeId}" style="display:none">0</span>` : '';
    return `<div class="sidebar-item${first ? ' active' : ''}" data-sec="${i.id || ''}" onclick="${act}"><span class="ico">${dashIcon(i.icon)}</span>${i.label}${badge}</div>`;
  };
  document.getElementById('shell-side').innerHTML = `
    <div class="org-chip"><div class="org-icon">${cfg.icon}</div><div><div class="org-name">${esc(user.name || 'My account')}</div><div class="org-role">${esc(cfg.roleLabel)}</div></div></div>
    <div class="sidebar-section"><div class="sidebar-label">Overview</div>${cfg.items.map((i, n) => item(i, n === 0)).join('')}</div>
    <div class="sidebar-section" style="margin-top:16px"><div class="sidebar-label">Support</div>
      <div class="sidebar-item" onclick="window.location.href='faq'"><span class="ico">${dashIcon('book')}</span>Resources</div>
      <div class="sidebar-item" onclick="window.location.href='contact'"><span class="ico">${dashIcon('help')}</span>Help &amp; Support</div></div>
    <div class="sidebar-section" style="margin-top:16px"><div class="sidebar-label">Account</div>
      <div class="sidebar-item" onclick="window.location.href='profile'"><span class="ico">${dashIcon('user')}</span>Profile &amp; Settings</div>
      <div class="sidebar-item" onclick="logout()"><span class="ico">${dashIcon('out')}</span>Sign Out</div></div>`;
  document.getElementById('shell-mobile').innerHTML = cfg.mobile.map((i, n) => {
    const act = i.href ? `window.location.href='${i.href}'` : `showSection('${i.id}', this)`;
    return `<button class="mob-nav-item${n === 0 ? ' active' : ''}" data-sec="${i.id || ''}" onclick="${act}"><span class="ico">${dashIcon(i.icon)}</span>${i.label}</button>`;
  }).join('');
}

function showSection(id, el) {
  document.querySelectorAll('[id^="sec-"]').forEach(s => { s.style.display = s.id === 'sec-' + id ? '' : 'none'; });
  document.querySelectorAll('.sidebar-item[data-sec], .mob-nav-item[data-sec]').forEach(b => {
    b.classList.toggle('active', b.dataset.sec === id);
  });
  window.scrollTo(0, 0);
}

function setBadge(id, count) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = count;
  el.style.display = count > 0 ? '' : 'none';
}

function showError(msg) {
  const el = document.getElementById('errBanner');
  el.textContent = msg;
  el.style.display = 'block';
}

/* ── Session ────────────────────────────────────────────────────────── */
// Refresh cached profile so admin grants (can_submit_needs) apply without re-login.
async function refreshUser() {
  try {
    const me = await apiGet('/auth/me');
    if (me) { localStorage.setItem('mp_user', JSON.stringify(me)); return me; }
  } catch (err) {
    console.warn('Profile refresh failed', err);
  }
  return getUser() || {};
}

/* ── Location (browser geocode, no lat/lng stored on users) ─────────── */
function distanceMiles(a, b) {
  const rad = d => d * Math.PI / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

async function geocodeCity(city, state) {
  if (!city || !state) return null;
  const key = `mp_org_geo_${city}_${state}`.toLowerCase(); // same cache namespace as org-dashboard
  const cached = localStorage.getItem(key);
  if (cached) return JSON.parse(cached);
  try {
    const q = encodeURIComponent(`${city}, ${state}, USA`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`);
    const hits = res.ok ? await res.json() : [];
    if (!hits.length) return null;
    const point = { lat: parseFloat(hits[0].lat), lng: parseFloat(hits[0].lon) };
    localStorage.setItem(key, JSON.stringify(point));
    return point;
  } catch (err) {
    console.warn('Geocode failed', err);
    return null;
  }
}

// Open needs within radius of the user's city; same-state fallback when no city/geocode.
async function fetchNearbyNeeds(user) {
  const radius = user.notification_radius || DEFAULT_RADIUS_MI;
  const [res, origin] = await Promise.all([fetch(`${API}/needs/public`), geocodeCity(user.city, user.state)]);
  if (!res.ok) throw new Error(`needs/public ${res.status}`);
  const needs = (await res.json()).map(n => ({
    ...n,
    distance: origin && n.lat != null && n.lng != null ? distanceMiles(origin, n) : null,
  }));
  const nearby = origin
    ? needs.filter(n => n.distance != null && n.distance <= radius)
    : needs.filter(n => user.state && n.state === user.state);
  nearby.sort((a, b) =>
    (URGENCY_RANK[b.urgency] || 0) - (URGENCY_RANK[a.urgency] || 0) ||
    (a.distance ?? Infinity) - (b.distance ?? Infinity));
  return { nearby, radius, hasOrigin: !!origin };
}

function feedItem(icon, html, meta) {
  return `<div class="feed-item"><div class="feed-dot teal">${icon}</div><div><div class="feed-text">${html}</div><div class="feed-time">${meta}</div></div></div>`;
}

function renderFeed(elId, itemsHtml) {
  document.getElementById(elId).innerHTML = itemsHtml ||
    '<div class="empty"><b>Nothing yet</b>Activity from your needs and responses will appear here.</div>';
}
