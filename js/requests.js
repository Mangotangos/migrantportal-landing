// ── User identity from JWT
const user = getUser();
if (user) {
  const initials = (user.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('topAvatar').textContent = initials;
  document.getElementById('topName').textContent = user.name || user.email || 'User';
} else {
  // Unsigned user — show limited preview
  document.body.classList.add('unsigned');
  document.getElementById('signup-banner').classList.add('show');
  document.getElementById('signup-banner-btn').onclick = () => window.location.href = '/signup';
  document.getElementById('userChip').style.display = 'none';
  document.getElementById('loginBtn').style.display = 'flex';
}

// ── Map setup (degrade gracefully if Leaflet fails to load)
let map = null;
let mapReady = false;
try {
  if (typeof L === 'undefined') throw new Error('Leaflet not loaded');
  map = L.map('map', { zoomControl: true }).setView([38.9, -94.79], 9);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    alt: ''
  }).on('tileload', function (e) { e.tile.setAttribute('role', 'presentation'); }).addTo(map);
  setTimeout(() => map.invalidateSize(), 200);
  setTimeout(() => map.invalidateSize(), 800);
  mapReady = true;
} catch (err) {
  console.warn('[MP] Map disabled:', err.message);
  const mc = document.querySelector('.map-container');
  if (mc) mc.style.display = 'none';
  const mvb = document.getElementById('mapViewBtn');
  if (mvb) mvb.style.display = 'none';
  const mf = document.getElementById('mapFab');
  if (mf) mf.style.display = 'none';
}

const markers = [];
let allNeeds = [];

// ── Category display helpers
// ── Category icons (Lucide-style line SVGs; color comes from CSS currentColor)
const CATEGORY_ICON_PATHS = {
  housing: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  food: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  clothing: '<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>',
  furniture: '<path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0Z"/><path d="M4 18v2"/><path d="M20 18v2"/>',
  transportation: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  employment: '<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  legal: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  medical: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
  education: '<path d="M22 10v6"/><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  translation: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  childcare: '<path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/>',
  financial: '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  other: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
};
const CARD_ICON_BG = '#e6f4f6';
function categoryIcon(cat, size, strokeWidth) {
  const body = CATEGORY_ICON_PATHS[cat] || CATEGORY_ICON_PATHS.other;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}
const URGENCY_DOT    = { urgent:'#dc2626', high:'#ea580c', medium:'#ca8a04', low:'#16a34a' };

function timeAgo(dateStr) {
  // API timestamps are UTC but may lack a zone suffix; without it the browser reads them as local time and ages go negative
  const utc = /(Z|[+-]\d\d:?\d\d)$/.test(dateStr) ? dateStr : dateStr + 'Z';
  const diff = Math.max(0, Math.floor((Date.now() - new Date(utc)) / 86400000));
  if (diff === 0) return 'Today';
  if (diff === 1) return '1d';
  return diff + 'd';
}

function buildCard(need, idx) {
  const icon  = categoryIcon(need.category, 56, 1.5);
  const bg    = CARD_ICON_BG;
  const dot   = URGENCY_DOT[need.urgency]     || '#999';
  const age   = need.created_at ? timeAgo(need.created_at) : '';
  const loc   = esc([need.city, need.state, need.zip].filter(Boolean).join(', '));
  const adults   = need.family_adults   || 1;
  const children = need.family_children || 0;
  const urgencyLabel = need.urgency ? need.urgency.charAt(0).toUpperCase() + need.urgency.slice(1) : '';
  return `
    <a class="req-card" href="need?id=${need.id}" data-action="selectCard" data-args="[{&quot;$&quot;:&quot;this&quot;}]" data-n1="${idx}" data-prevent data-id="${need.id}" data-urgency="${need.urgency || ''}" style="text-decoration:none;color:inherit;display:block;">
      <div class="card-img" style="background:${bg};">
        <span class="card-img-illus">${icon}</span>
        ${urgencyLabel ? `<span class="urgency-chip" data-urgency="${need.urgency}">${urgencyLabel}</span>` : ''}
        <div class="card-badge" style="background:${dot};width:8px;height:8px;border-radius:50%;position:absolute;top:8px;right:8px;"></div>
      </div>
      <div class="card-body">
        <div class="card-meta-top">
          <span class="card-id">${need.case_number ? '#' + need.case_number : '#MP' + String(need.id).slice(0, 6).toUpperCase()}</span>
          ${age ? `<span class="card-age"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${age}</span>` : ''}
        </div>
        <div class="card-title">${esc(need.title)}</div>
        <div class="card-desc">${need.description ? need.description.slice(0,110) + (need.description.length > 110 ? '…' : '') : ''}</div>
        ${loc || need._dist != null ? `<div class="card-loc">${loc}${need._dist != null ? `${loc ? ' · ' : ''}<span class="dist-chip">${need._dist < 10 ? need._dist.toFixed(1) : Math.round(need._dist)} mi</span>` : (originPoint && need.lat == null ? `${loc ? ' · ' : ''}<span style="color:#6b6b6b">distance unknown</span>` : '')}</div>` : ''}
        <div class="card-footer">
          <div class="family-count">
            ${children > 0 ? `<span class="fam-chip"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>${children} Child${children !== 1 ? 'ren' : ''}</span>` : ''}
            <span class="fam-chip"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${adults} Adult${adults !== 1 ? 's' : ''}</span>
          </div>
          <div class="card-cta">
            <span class="help-pill">I can help</span>
            <div class="card-actions">
              <button class="action-ico" title="Save" data-action="stop" data-args="[{&quot;$&quot;:&quot;event&quot;}]" data-prevent><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg></button>
            </div>
          </div>
        </div>
        <div class="card-needs">
          <span class="need-tag">${need.category ? need.category.charAt(0).toUpperCase() + need.category.slice(1) : ''}</span>
          ${need.can_help_remotely ? '<span class="need-tag remote">Can help remotely</span>' : ''}
        </div>
      </div>
    </a>`;
}

function addMarker(need, idx) {
  if (!mapReady || !need.lat || !need.lng) { markers.push(null); return; }
  const urgent = need.urgency === 'urgent';
  const loc    = esc([need.city, need.state].filter(Boolean).join(', '));
  const icon = L.divIcon({
    html: `<div class="map-pin${urgent ? ' urgent' : ''}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-1px;margin-right:3px"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>Need</div>`,
    className: '',
    iconAnchor: [28, 12]
  });
  const m = L.marker([need.lat, need.lng], { icon })
    .addTo(map)
    .bindPopup(`
      <div class="popup-id">#${need.case_number || need.id.slice(0,6).toUpperCase()}</div>
      <div class="popup-title">${esc(need.title)}</div>
      <div class="popup-loc">${loc}</div>
      <div style="margin-top:8px">
        <a href="need?id=${need.id}" style="color:#009DA5;font-size:12px;font-weight:600;">View Details →</a>
      </div>
    `);
  m.on('click', () => {
    const cards = document.querySelectorAll('.req-card:not(.static-card)');
    cards.forEach(c => c.classList.remove('selected'));
    cards[idx]?.classList.add('selected');
    cards[idx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  markers.push(m);
}

let activeCategory = '';
let activeSort = 'nearest';   // client-side; the API is asked for urgency order and ties keep that order
let activeSearch = '';
let loadDebounce = null;

async function loadNeeds() {
  // Unsigned users: load real public data (no auth, fuzzed coords)
  if (document.body.classList.contains('unsigned')) {
    document.getElementById('cardsLoading').style.display = 'none';
    try {
      const params = new URLSearchParams();
      if (activeCategory) params.set('category', activeCategory);
      const res = await fetch(`${API}/needs/public?${params.toString()}`);
      if (!res.ok) throw new Error('public api error');
      const needs = await res.json();
      document.querySelectorAll('.static-card').forEach(c => c.remove());
      lastFetched = Array.isArray(needs) ? needs : [];
      showNeeds();
    } catch {
      showLoadError();
    }
    return;
  }
  // Hide static fallback cards
  document.querySelectorAll('.static-card').forEach(c => c.style.display = 'none');
  document.getElementById('cardsLoading').style.display = 'block';

  clearRendered();

  // Build query params from current filter state
  const params = new URLSearchParams({ sort: activeSort === 'nearest' ? 'urgency' : activeSort, status: 'active' });
  if (activeCategory) params.set('category', activeCategory);
  if (activeSearch.trim()) params.set('search', activeSearch.trim());
  const cat = document.getElementById('filt-category')?.value;
  const urg = document.getElementById('filt-urgency')?.value;
  if (cat) params.set('category', cat);
  if (urg) params.set('urgency', urg);

  try {
    const data = await apiGet('/needs?' + params.toString());
    lastFetched = Array.isArray(data) ? data : (data.items || data.needs || []);
    document.getElementById('cardsLoading').style.display = 'none';
    showNeeds();
  } catch (err) {
    showLoadError();
  }
}

// ── Distance filter: client-side, measured from the user's profile ZIP.
// Needs without coordinates are never hidden; they show as "distance unknown".
const RADIUS_STOPS = [5, 10, 25, 50, 0];   // 0 = any distance
const DEFAULT_RADIUS = 0;   // revisit 25 once ~20+ open needs span several cities
let originPoint = null;
let originLabel = '';
let originInfo = null;   // { zip, city, state } used by the waitlist
let activeRemote = false;
const COVERAGE_MILES = 50;   // no open need within this far of the origin = not covered yet
let lastFetched = [];
let loaded = false;   // true once a /needs response has rendered; radius/origin changes re-render only then
const storedRadius = localStorage.getItem('mp_radius');   // null when never chosen; Number(null) is 0, which means "any distance"
let activeRadius = storedRadius !== null && RADIUS_STOPS.includes(Number(storedRadius)) ? Number(storedRadius) : DEFAULT_RADIUS;

function distanceMiles(a, b) {
  const R = 3958.8, rad = d => d * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function clearRendered() {
  document.querySelectorAll('.req-card:not(.static-card)').forEach(c => c.remove());
  markers.forEach(m => m && map && map.removeLayer(m));
  markers.length = 0;
  document.getElementById('cardsEmpty').style.display = 'none';
}

function setEmpty(title, msg, ctaLabel, ctaAction) {
  document.getElementById('emptyTitle').textContent = title;
  document.getElementById('emptyMsg').textContent = msg;
  const cta = document.getElementById('emptyCta');
  cta.style.display = ctaLabel ? '' : 'none';
  cta.textContent = ctaLabel || '';
  cta.onclick = ctaAction || null;
  document.getElementById('cardsEmpty').style.display = 'block';
}

function showLoadError() {
  loaded = false;
  clearRendered();
  document.getElementById('cardsLoading').style.display = 'none';
  document.getElementById('countLabel').textContent = '0';
  document.querySelector('.panel').classList.add('is-empty');
  setEmpty("Couldn't load needs", 'Check your connection and try again.', 'Retry', loadNeeds);
}

function showNeeds() {
  loaded = true;
  clearRendered();
  const withDist = lastFetched.map(n => ({
    ...n,
    _dist: originPoint && n.lat != null && n.lng != null ? distanceMiles(originPoint, { lat: n.lat, lng: n.lng }) : null
  }));
  const limited = !!originPoint && activeRadius > 0;
  const needs = withDist.filter(n => (!limited || n._dist === null || n._dist <= activeRadius) && (!activeRemote || n.can_help_remotely));
  const hidden = withDist.length - needs.length;
  if (activeSort === 'nearest') {
    needs.sort((a, b) => (a._dist ?? Infinity) - (b._dist ?? Infinity));   // stable: unknown distances keep API order, last
  }
  allNeeds = needs;
  renderCoverage(withDist);

  document.querySelector('.map-container').classList.toggle('is-empty', needs.length === 0);
  document.getElementById('countLabel').textContent = needs.length;
  document.getElementById('countText').textContent =
    (needs.length === 1 ? 'need' : 'needs') + (limited ? ` within ${activeRadius} miles${originLabel ? ' of ' + originLabel : ''}` : '');
  document.querySelector('.panel').classList.toggle('is-empty', needs.length === 0);

  if (needs.length === 0) {
    const filtered = activeRemote || activeCategory || activeSearch.trim() || document.getElementById('filt-urgency').value;
    if (hidden > 0) {
      const canWiden = activeRadius < 50;
      setEmpty(`No open needs within ${activeRadius} miles`, `${hidden} open ${hidden === 1 ? 'need is' : 'needs are'} farther away.`,
        canWiden ? 'Widen to 50 miles' : 'Show any distance', () => setRadius(canWiden ? 50 : 0));
    } else if (filtered) {
      setEmpty('No needs match these filters', 'Try a different category or clear your filters.', 'Clear filters', clearFilters);
    } else {
      setEmpty('No open needs yet', 'New needs appear here as families and organizations post them.');
    }
    recenterMap();
    return;
  }
  const list = document.getElementById('cardsList');
  needs.forEach((need, i) => {
    list.insertAdjacentHTML('beforeend', buildCard(need, i));
    addMarker(need, i);
  });
  recenterMap();
  if (window.mpReapplyI18n) window.mpReapplyI18n();
}

function setRemote(on) {
  activeRemote = !!on;
  document.getElementById('railRemote').checked = activeRemote;
  if (loaded) showNeeds();
}

function showAllNeeds(remote) {
  setRadius(0);
  setRemote(remote);
  const first = document.querySelector('.req-card:not(.static-card)');
  if (first) first.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function escapeHtml(v) {
  return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Shown when the visitor's ZIP has no open need within COVERAGE_MILES: explain, collect a waitlist email, offer three actions.
function renderCoverage(withDist) {
  const box = document.getElementById('noCoverage');
  const covered = !originPoint || !originInfo || withDist.some(n => n._dist !== null && n._dist <= COVERAGE_MILES);
  if (covered) { box.style.display = 'none'; return; }
  const city = escapeHtml(originInfo.city || 'your area');
  const place = escapeHtml([originInfo.city, originInfo.state].filter(Boolean).join(', ') || 'ZIP ' + originInfo.zip);
  const joined = localStorage.getItem('mp_waitlist_' + originInfo.zip);
  const signup = joined
    ? `<div class="no-cover-msg nc-ok" role="status">You're on the list for ${place}.</div>`
    : `<form class="origin-form" data-submit="submitWaitlist" data-args="[{&quot;$&quot;:&quot;event&quot;}]">
      <div class="origin-row"><input id="waitEmail" type="email" autocomplete="email" maxlength="254" placeholder="you@example.com" aria-label="Email" required /><button type="submit">Notify me</button></div>
      <div class="no-cover-msg" id="waitMsg" role="status"></div></form>`;
  box.innerHTML = `<h3>We're not active in ${city} yet</h3>
    <p>MigrantPortal is live in the Kansas City area. Tell us you're in ${place} and we'll email you when the first family or local helper joins near you. The more people who sign up, the sooner we open there.</p>
    ${signup}
    <div class="no-cover-sub">Meanwhile, you can still help</div>
    <div class="no-cover-actions">
      <button type="button" data-action="showAllNeeds" data-args="[false]">Fund a need in Kansas City<small>Open needs accept donations from anywhere</small></button>
      <button type="button" data-action="showAllNeeds" data-args="[true]">Help online<small>Translation, tutoring, benefits and legal questions by phone or video</small></button>
      <a href="register">Become a launch partner in ${city}<small>Know a church or nonprofit serving migrants there? Start a partner application.</small></a>
    </div>`;
  box.style.display = 'block';
}

async function submitWaitlist(e) {
  e.preventDefault();
  const msg = document.getElementById('waitMsg');
  const email = document.getElementById('waitEmail').value.trim();
  msg.className = 'no-cover-msg nc-note';
  msg.textContent = 'Saving...';
  try {
    const res = await fetch(`${API}/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, zip: originInfo.zip, city: originInfo.city || null, state: originInfo.state || null })
    });
    if (res.status === 429) throw new Error('Too many tries. Please try again later.');
    if (!res.ok) throw new Error('Please check your email address.');
    localStorage.setItem('mp_waitlist_' + originInfo.zip, '1');
    showNeeds();
  } catch (err) {
    msg.className = 'no-cover-msg nc-err';
    msg.textContent = err instanceof TypeError ? "Couldn't reach the server. Try again." : err.message;
  }
  return false;
}

function setRadius(val) {
  activeRadius = RADIUS_STOPS.includes(Number(val)) ? Number(val) : DEFAULT_RADIUS;
  localStorage.setItem('mp_radius', String(activeRadius));
  document.getElementById('railRadius').value = RADIUS_STOPS.indexOf(activeRadius);
  document.getElementById('filt-radius').value = String(activeRadius);
  document.getElementById('radiusText').textContent = activeRadius ? activeRadius + ' mi' : 'Any';
  if (loaded) showNeeds();
}

async function lookupZippopotam(zip) {
  try {
    const res = await fetch('https://api.zippopotam.us/us/' + encodeURIComponent(zip));
    if (!res.ok) return null;
    const place = (await res.json()).places[0];
    return { zip, lat: parseFloat(place.latitude), lng: parseFloat(place.longitude), city: place['place name'], state: place['state abbreviation'] };
  } catch { return null; }
}

async function lookupNominatim(zip) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&postalcode=${encodeURIComponent(zip)}`);
    const hit = res.ok ? (await res.json())[0] : null;
    return hit ? { zip, lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) } : null;
  } catch { return null; }
}

async function geocodeZip(zip) {
  const cached = JSON.parse(localStorage.getItem('mp_origin') || 'null');
  if (cached && cached.zip === zip) return cached;
  const origin = (await lookupZippopotam(zip)) || (await lookupNominatim(zip));
  if (origin) localStorage.setItem('mp_origin', JSON.stringify(origin));
  return origin;
}

function applyOrigin(origin, label) {
  originPoint = { lat: origin.lat, lng: origin.lng };
  originInfo = { zip: origin.zip, city: origin.city || '', state: origin.state || '' };
  originLabel = label || 'ZIP ' + origin.zip;
  const note = document.getElementById('radiusNote');
  note.textContent = 'From ' + originLabel + '. Needs without a location still show. ';
  const change = document.createElement('button');
  change.type = 'button';
  change.className = 'origin-link';
  change.textContent = 'Change';
  change.onclick = showZipPrompt;
  note.appendChild(change);
  document.getElementById('railRadius').disabled = false;
}

function showZipPrompt() {
  const note = document.getElementById('radiusNote');
  note.innerHTML = '<form class="origin-form" data-submit="submitOriginZip" data-args="[{&quot;$&quot;:&quot;event&quot;}]">' +
    '<label for="originZip">Enter your ZIP to filter by distance</label>' +
    '<div class="origin-row"><input id="originZip" inputmode="numeric" maxlength="5" autocomplete="postal-code" placeholder="e.g. 66062" />' +
    '<button type="submit">Set</button></div><div class="origin-err" id="originErr" role="status"></div></form>';
  if (!originPoint) document.getElementById('railRadius').disabled = true;
}

async function submitOriginZip(e) {
  e.preventDefault();
  const input = document.getElementById('originZip');
  const err = document.getElementById('originErr');
  const zip = input.value.replace(/\D/g, '');
  if (zip.length !== 5) { err.textContent = 'Enter a 5-digit ZIP.'; return false; }
  const origin = await geocodeZip(zip);
  if (!origin) { err.textContent = "We couldn't find that ZIP."; return false; }
  applyOrigin(origin, origin.city);
  if (loaded) showNeeds();
  return false;
}

async function resolveOrigin() {
  let profile = user;
  let zip = '';
  let fromProfile = false;
  try {
    if (user && !(profile && profile.zip_code)) profile = await apiGet('/auth/me');
    zip = String((profile && profile.zip_code) || '').trim().slice(0, 5);
    fromProfile = !!zip;
  } catch { /* fall back to the ZIP saved in this browser */ }
  if (!zip) {
    const saved = JSON.parse(localStorage.getItem('mp_origin') || 'null');
    zip = saved ? saved.zip : '';
  }
  const origin = zip ? await geocodeZip(zip) : null;
  if (origin) applyOrigin(origin, (fromProfile && profile.city) || origin.city);
  else showZipPrompt();
  if (loaded) showNeeds();
}

// Fit the map to the loaded needs plus the user's origin; Kansas City is only the initial view.
function recenterMap() {
  if (!mapReady) return;
  const points = markers.filter(Boolean).map(m => m.getLatLng());
  if (originPoint) points.push(L.latLng(originPoint.lat, originPoint.lng));
  if (points.length === 0) return;
  map.invalidateSize();
  if (points.length === 1) { map.setView(points[0], 11); return; }
  map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 12 });
}

// ── Rail / role-based nav
function initRail() {
  if (!user) {
    document.getElementById('railMenu').style.display = 'none';
    setRadius(activeRadius);
    resolveOrigin();   // signed-out visitors use the ZIP saved in this browser, or enter one
    return;
  }
  const canSubmit = canSubmitNeeds(user);
  document.getElementById('railSubmit').style.display = canSubmit ? '' : 'none';
  document.getElementById('mobSubmit').style.display = canSubmit ? '' : 'none';
  if (user.org_id) document.getElementById('railDash').href = 'org-dashboard';
  setRadius(activeRadius);
  resolveOrigin();
}

function setView(mapOn) {
  const ws = document.querySelector('.workspace');
  if (ws.classList.contains('map-active') !== mapOn) toggleMapView();
}

loadNeeds();
document.addEventListener('DOMContentLoaded', initRail);

// ── Select card → pan map + navigate
function selectCard(el, idx) {
  // Unsigned users: allow preview but block navigation
  if (document.body.classList.contains('unsigned')) {
    document.getElementById('signup-banner').classList.add('show');
    return;
  }
  document.querySelectorAll('.req-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  if (mapReady && markers[idx]) {
    map.flyTo(markers[idx].getLatLng(), 12, { duration: 0.8 });
    markers[idx].openPopup();
  }
  const needId = el.dataset.id;
  const href = needId ? `need?id=${needId}` : 'need';
  setTimeout(() => { window.location.href = href; }, 300);
}

// ── Search — debounced server reload
function filterCards(q) {
  activeSearch = q;
  clearTimeout(loadDebounce);
  loadDebounce = setTimeout(loadNeeds, 350);
}

function debounceTopSearch(q) { filterCards(q); }

// ── Toggle filter panel
function toggleFilter(btn) {
  const panel = document.getElementById('filter-panel');
  const isOpen = panel.classList.contains('open');
  panel.classList.toggle('open', !isOpen);
  document.getElementById('filterBtn').classList.toggle('active', !isOpen);
  document.getElementById('quickBtn').classList.toggle('active', !isOpen);
}

// ── Map / List toggle (mobile)
function toggleMapView() {
  const ws = document.querySelector('.workspace');
  const isMap = ws.classList.toggle('map-active');
  const btn = document.getElementById('mapViewBtn');
  const fab = document.getElementById('mapFab');
  if (btn) btn.classList.toggle('active', isMap);
  document.getElementById('viewList').classList.toggle('active', !isMap);
  document.getElementById('viewMap').classList.toggle('active', isMap);
  if (fab) {
    fab.classList.toggle('list-mode', isMap);
    fab.innerHTML = isMap
      ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> List View'
      : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg> Map View';
  }
  if (mapReady) {
    setTimeout(() => { map.invalidateSize(); }, 50);
    setTimeout(() => { map.invalidateSize(); }, 350);
    setTimeout(recenterMap, 400);
  }
}

// ── Filters → server reload
function applyFilters() {
  document.getElementById('railUrgency').value = document.getElementById('filt-urgency').value;
  loadNeeds();
}

function clearFilters() {
  document.getElementById('filt-category').value = '';
  document.getElementById('filt-urgency').value = '';
  document.getElementById('filt-status').value = '';
  activeCategory = '';
  activeSearch = '';
  document.getElementById('topbar-search-input').value = '';
  setCategoryChip('');
  loadNeeds();
}

// ── Category chips + sidebar list: prepend a line icon to each labelled button
document.querySelectorAll('.cat-chip[data-cat], .rail-cat[data-cat]').forEach(btn => {
  if (btn.dataset.cat) btn.insertAdjacentHTML('afterbegin', categoryIcon(btn.dataset.cat, 14, 2));
});
function setCategoryChip(val) {
  activeCategory = val;
  document.querySelectorAll('.cat-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.cat === val);
  });
  document.querySelectorAll('.rail-cat').forEach(c => c.classList.toggle('active', c.dataset.cat === val));
  document.getElementById('filt-category').value = val;
  loadNeeds();
}

// ── Sort toggle
function setSort(val) {
  activeSort = val;
  document.querySelectorAll('.sort-opt').forEach(b => b.classList.toggle('active', b.dataset.sort === val));
  loadNeeds();
}

function clearFilters() {
  document.getElementById('filt-category').value = '';
  document.getElementById('filt-urgency').value = '';
  document.getElementById('filt-status').value = '';
  applyFilters();
}

// ── Topbar search (hits backend /search endpoint)
let _searchTimer;
function debounceTopSearch(q) {
  clearTimeout(_searchTimer);
  const dd = document.getElementById('search-dropdown');
  if (!q || q.length < 2) { dd.style.display = 'none'; return; }
  _searchTimer = setTimeout(() => runTopSearch(q), 400);
}

async function runTopSearch(q) {
  const dd = document.getElementById('search-dropdown');
  dd.style.display = '';
  dd.innerHTML = '<div style="padding:12px 16px;font-size:13px;color:#999">Searching…</div>';
  try {
    const r = await apiGet(`/search?q=${encodeURIComponent(q)}&type=needs`);
    if (!r.total) { dd.innerHTML = '<div style="padding:12px 16px;font-size:13px;color:#999">No results found.</div>'; return; }
    dd.innerHTML = r.needs.map(n => `
      <a href="need?id=${n.id}" style="display:block;padding:10px 16px;border-bottom:1px solid #f3f4f6;text-decoration:none;color:#0D0D0D" data-action="hide" data-target="search-dropdown">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="display:flex;color:var(--teal)">${categoryIcon(n.category, 16, 2)}</span>
          <div>
            <div style="font-size:13px;font-weight:600">${esc(n.title)}</div>
            <div style="font-size:11px;color:#999">#${n.case_number} · ${n.status} · ${esc([n.city,n.state].filter(Boolean).join(', ')||'—')}</div>
          </div>
        </div>
      </a>`).join('');
  } catch(e) { dd.innerHTML = '<div style="padding:12px 16px;font-size:13px;color:#dc2626">Search failed.</div>'; }
}

// Close dropdown on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.topbar-search')) document.getElementById('search-dropdown').style.display = 'none';
});

// Handlers that used to be multi-statement inline attributes.
function railUrgencyChange(value) {
  document.getElementById('filt-urgency').value = value;
  applyFilters();
}
function railRadiusInput(value) { setRadius(RADIUS_STOPS[value]); }

// Delegated handlers (js/mp-actions.js dispatches data-action / data-change / data-input / data-submit / data-keydown).
mpRegister({ railUrgencyChange, railRadiusInput, applyFilters, clearFilters, debounceTopSearch, filterCards, setCategoryChip, setRadius, setRemote, setSort, setView, showAllNeeds, submitOriginZip, submitWaitlist, toggleFilter, toggleMapView });
