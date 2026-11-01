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

/* ── Shell: topbar, sidebar, mobile nav ─────────────────────────────── */
// cfg: { icon, roleLabel, items:[{id,icon,label,badgeId?,href?}], mobile:[{id,icon,label,href?}] }
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
    return `<div class="sidebar-item${first ? ' active' : ''}" data-sec="${i.id || ''}" onclick="${act}"><span class="ico">${i.icon}</span>${i.label}${badge}</div>`;
  };
  document.getElementById('shell-side').innerHTML = `
    <div class="org-chip"><div class="org-icon">${cfg.icon}</div><div><div class="org-name">${esc(user.name || 'My account')}</div><div class="org-role">${esc(cfg.roleLabel)}</div></div></div>
    <div class="sidebar-section"><div class="sidebar-label">Overview</div>${cfg.items.map((i, n) => item(i, n === 0)).join('')}</div>
    <div class="sidebar-section" style="margin-top:16px"><div class="sidebar-label">Account</div>
      <div class="sidebar-item" onclick="window.location.href='profile'"><span class="ico">👤</span>My Profile</div>
      <div class="sidebar-item" onclick="logout()"><span class="ico">↪</span>Sign Out</div></div>`;
  document.getElementById('shell-mobile').innerHTML = cfg.mobile.map((i, n) => {
    const act = i.href ? `window.location.href='${i.href}'` : `showSection('${i.id}', this)`;
    return `<button class="mob-nav-item${n === 0 ? ' active' : ''}" data-sec="${i.id || ''}" onclick="${act}"><span class="ico">${i.icon}</span>${i.label}</button>`;
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
