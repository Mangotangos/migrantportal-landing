const API = 'https://migrant-portal-production-3826.up.railway.app';
let allResults = [];
let activeService = '';
let lastZip = '';

let lastQuery = '';

async function doSearch() {
  const zip = document.getElementById('zipInput').value.trim();
  if (!zip || zip.length < 5) {
    showError('Please enter a valid 5-digit zipcode.');
    return;
  }
  await runSearch(`zip=${encodeURIComponent(zip)}`, zip);
}

function useMyLocation() {
  const btn = document.getElementById('locBtn');
  if (!navigator.geolocation) {
    showError('Your browser cannot share its location.', 'Enter your zipcode above instead.');
    return;
  }
  btn.disabled = true;
  navigator.geolocation.getCurrentPosition(
    pos => {
      btn.disabled = false;
      const query = `lat=${pos.coords.latitude.toFixed(4)}&lng=${pos.coords.longitude.toFixed(4)}`;
      runSearch(query, 'your location');
    },
    () => {
      btn.disabled = false;
      showError('We could not get your location.', 'Allow location access, or enter your zipcode above.');
    },
    { timeout: 10000, maximumAge: 300000 }
  );
}

async function runSearch(query, label) {
  lastQuery = query;
  lastZip = label;
  setLoading();
  try {
    const url = `${API}/nonprofits?${query}${activeService ? '&service=' + activeService : ''}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || 'Search failed. Please try again.');
    }
    allResults = await resp.json();
    renderResults(allResults);
  } catch (e) {
    showError(e.message);
  }
}

function setFilter(service) {
  activeService = service;
  document.querySelectorAll('.chip').forEach(c => {
    const on = c.dataset.service === service;
    c.classList.toggle('active', on);
    c.setAttribute('aria-pressed', String(on));
  });
  if (!lastZip) {
    document.getElementById('zipInput').focus();
    return;
  }

  const filtered = service
    ? allResults.filter(n => n.services && n.services.toLowerCase().includes(service))
    : allResults;
  renderResults(filtered);
}

function renderResults(items) {
  const el = document.getElementById('resultsState');
  if (!items.length) {
    const hasPartnersInRadius = allResults.length > 0;
    el.innerHTML = `
      <div class="state-box">
        <div class="state-icon" aria-hidden="true">🔍</div>
        <div class="state-title">No results found</div>
        <div class="state-sub">No partner nonprofits found within 25 miles of <strong>${escHtml(lastZip)}</strong>. Try a different zipcode or choose All Services. We are adding new areas.</div>
        <div class="zero-box">
          <h4>Post a request instead</h4>
          <p>Tell us what you need. Volunteers and partners can respond, even outside your area.</p>
          <a class="btn" href="/signup">Post a request</a>
          <a class="btn alt" href="/requests">Browse requests</a>
        </div>
        <div id="nearestSlot"></div>
      </div>`;
    if (!hasPartnersInRadius) loadNearest(lastQuery, lastZip, activeService);
    return;
  }

  const partners = items.filter(isPartner);
  const resources = items.filter(n => !isPartner(n));
  el.innerHTML = `
    <div class="results-header">
      <div class="results-count">${items.length} organization${items.length !== 1 ? 's' : ''} found near ${escHtml(lastZip)}</div>
    </div>
    ${partnersSectionHtml(partners, true)}
    ${resourcesSectionHtml(resources)}`;
}

const isPartner = n => Boolean(n.org_id);

function partnersSectionHtml(partners, showEmpty) {
  if (!partners.length && !showEmpty) return '';
  const body = partners.length
    ? `<div class="results-grid">${partners.map(n => cardHtml(n)).join('')}</div>`
    : `<div class="partner-empty">
        <h4>No partner organizations near ${escHtml(lastZip)} yet</h4>
        <p>You can still post a request and our navigators will help match you. Other local organizations that may be able to help are listed below.</p>
        <a class="btn" href="/signup">Post a request</a>
        <a class="btn alt" href="/signup">Become a partner</a>
      </div>`;
  return `
    <div class="section-head">
      <div class="section-label">MigrantPortal partners</div>
      <p class="section-sub">Verified organizations that work with us. Request help through MigrantPortal and a partner responds.</p>
    </div>
    ${body}`;
}

function resourcesSectionHtml(resources) {
  if (!resources.length) return '';
  return `
    <div class="section-head">
      <div class="section-label">Other local resources</div>
      <p class="section-sub">Public organizations in your area. Not affiliated with MigrantPortal.</p>
    </div>
    <p class="section-note">We list these for convenience. Please call to confirm hours, eligibility and services before you go.</p>
    <div class="results-grid">${resources.map(n => cardHtml(n)).join('')}</div>`;
}

const NEAREST_RADIUS_MILES = 300;
const NEAREST_LIMIT = 3;
const PREVIEW_LIMIT = 3;

const hoursLabel = () => (document.documentElement.lang === 'es' ? 'Horario' : 'Hours');

function distanceHtml(n) {
  if (typeof n.distance_miles !== 'number') return '';
  return ` · <span class="np-dist">${n.distance_miles.toFixed(1)} mi away</span>`;
}

async function fetchJson(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  return resp.json();
}

async function loadPartnerPreview() {
  const slot = document.getElementById('partnerPreview');
  const line = document.getElementById('statsLine');
  try {
    const all = await fetchJson(`${API}/nonprofits`);
    const partners = all.filter(isPartner);
    if (partners.length) {
      line.textContent = `${partners.length} partner organization${partners.length !== 1 ? 's' : ''}`;
      line.hidden = false;
    }
    if (lastZip) return;
    slot.innerHTML = partnersSectionHtml(partners.slice(0, PREVIEW_LIMIT), false)
      + resourcesSectionHtml(all.filter(n => !isPartner(n)).slice(0, PREVIEW_LIMIT));
  } catch (e) {
    slot.innerHTML = '';
    line.hidden = true;
  }
}

async function loadNearest(query, label, service) {
  const slot = document.getElementById('nearestSlot');
  if (!slot) return;
  try {
    const url = `${API}/nonprofits?${query}&radius=${NEAREST_RADIUS_MILES}${service ? '&service=' + service : ''}`;
    const nearest = (await fetchJson(url)).slice(0, NEAREST_LIMIT);
    if (!nearest.length || label !== lastZip || !document.getElementById('nearestSlot')) return;
    document.getElementById('nearestSlot').innerHTML = `
      <div class="section-label">Nearest organizations</div>
      <div class="results-grid">${nearest.map(n => cardHtml(n)).join('')}</div>`;
  } catch (e) {
    slot.innerHTML = '';
  }
}

loadPartnerPreview();

const SERVICE_LABELS = { mental_health: 'Mental Health', financial: 'Financial Aid' };
const serviceLabel = s => SERVICE_LABELS[s] || s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');

function cardHtml(n) {
  const services = n.services ? n.services.split(',').map(s => s.trim()).filter(Boolean) : [];
  const location = [n.city, n.state].filter(Boolean).join(', ');
  return `
    <div class="np-card${isPartner(n) ? ' is-partner' : ''}">
      <div class="np-body">
      ${isPartner(n) ? '<span class="np-badge">✓ Partner</span>' : ''}
      <div class="np-name">${escHtml(n.name)}</div>
      ${location ? `<div class="np-location">📍 ${escHtml(location)}${n.zipcode ? ' ' + escHtml(n.zipcode) : ''}${distanceHtml(n)}</div>` : ''}
      ${n.description ? `<div class="np-desc">${escHtml(n.description)}</div>` : ''}
      ${n.hours ? `<div class="np-hours"><b>${hoursLabel()}:</b> ${escHtml(n.hours)}</div>` : ''}
      ${services.length ? `<div class="np-services">${services.map(s => `<span class="np-tag">${escHtml(serviceLabel(s))}</span>`).join('')}</div>` : ''}
      </div>
      <div class="np-contact">
        ${n.phone ? `<a class="np-call" href="tel:${escHtml(n.phone)}">📞 ${escHtml(n.phone)}</a>` : ''}
        ${n.website ? `<a class="np-link" href="${escHtml(safeSrc(n.website))}" target="_blank" rel="noopener noreferrer">🔗 Visit Website</a>` : ''}
        ${n.email ? `<a class="np-link" href="mailto:${escHtml(n.email)}">✉️ ${escHtml(n.email)}</a>` : ''}
        ${!n.phone && !n.email && !n.website ? '<span style="font-size:13px;color:#64748b">No contact info listed</span>' : ''}
      </div>
    </div>`;
}

function setLoading() {
  document.getElementById('resultsState').innerHTML = `
    <div class="state-box">
      <div class="state-icon">⏳</div>
      <div class="state-title">Searching...</div>
      <div class="state-sub">Finding partner nonprofits near ${escHtml(lastZip)}</div>
    </div>`;
  document.getElementById('searchBtn').disabled = true;
  setTimeout(() => { document.getElementById('searchBtn').disabled = false; }, 3000);
}

function showError(msg, sub = 'Check the zipcode and try again.') {
  document.getElementById('resultsState').innerHTML = `
    <div class="state-box">
      <div class="state-icon">⚠️</div>
      <div class="state-title state-error">${escHtml(msg)}</div>
      <div class="state-sub">${escHtml(sub)}</div>
    </div>`;
  document.getElementById('searchBtn').disabled = false;
}

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function safeSrc(url) {
  if (!url) return '#';
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    if (!['http:','https:'].includes(u.protocol)) return '#';
    return u.href;
  } catch { return '#'; }
}

// Handlers were inline attributes; bound here so the page can run without 'unsafe-inline'.
(function bindHandlers() {
  const mobileNav = document.querySelector('.mobile-nav');
  document.querySelector('.hamburger')?.addEventListener('click', function () { mobileNav.classList.add('open'); });
  document.querySelectorAll('.mobile-close, .mobile-link').forEach(function (el) {
    el.addEventListener('click', function () { mobileNav.classList.remove('open'); });
  });
  document.querySelectorAll('.chip[data-service]').forEach(function (chip) {
    chip.addEventListener('click', function () { setFilter(chip.dataset.service); });
  });
  document.getElementById('zipInput').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') doSearch();
  });
  document.getElementById('searchBtn').addEventListener('click', doSearch);
  document.getElementById('locBtn').addEventListener('click', useMyLocation);
})();
