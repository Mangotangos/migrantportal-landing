// canSubmitNeeds also covers helpers allowed to submit needs; submit-need links them here.
const user = requireDashboardRole(canSubmitNeeds) || {};
mountShell(user, {
  icon: '🧭',
  roleLabel: 'Navigator',
  items: [
    { id: 'overview', icon: 'dash', label: 'Dashboard' },
    { id: 'needs', icon: 'needs', label: 'My Needs', badgeId: 'needsBadge' },
    { id: 'families', icon: 'families', label: 'Families' },
  ],
  mobile: [
    { id: 'overview', icon: 'dash', label: 'Overview' },
    { id: 'needs', icon: 'needs', label: 'Needs' },
    { href: 'submit-need', icon: 'plus', label: 'Submit' },
    { id: 'families', icon: 'families', label: 'Families' },
    { href: 'profile', icon: 'user', label: 'Profile' },
  ],
});
refreshUser();
const startSection = location.hash.slice(1);
if (['overview', 'needs', 'families'].includes(startSection)) showSection(startSection);

let myNeeds = [];
let families = [];
const responseCache = {};

const isOpen = n => n.status === 'active';
const isAwaiting = n => isOpen(n) && !n.response_count;
const famCell = n => n.family_name ? esc(n.family_name) : '<span style="color:var(--gray-400)">—</span>';

function responsesBadge(n) {
  if (n.status === 'fulfilled') return '<span class="badge badge-done">Fulfilled</span>';
  if (n.status === 'closed') return '<span class="badge badge-closed">Closed</span>';
  if (!isOpen(n)) return `<span class="badge badge-pending">${esc(cap(n.status))}</span>`;
  if (!n.response_count) return '<span class="badge badge-wait">Awaiting response</span>';
  const label = `${n.response_count} responder${n.response_count > 1 ? 's' : ''}`;
  return `<button class="badge badge-open" style="border:none;cursor:pointer" data-action="toggleResponses" data-arg="${esc(n.id)}" aria-label="Show ${label}">${label} ▾</button>`;
}

function actionCell(n) {
  return isOpen(n)
    ? `<button class="btn-sm" id="ful-${esc(n.id)}" data-action="markFulfilled" data-arg="${esc(n.id)}">Mark fulfilled</button>`
    : `<a class="act-link" href="need?id=${esc(n.id)}">View →</a>`;
}

function recentRow(n) {
  return `<tr><td>${needLink(n)}</td><td>${famCell(n)}</td><td>${urgencyBadge(n.urgency)}</td><td>${responsesBadge(n)}</td><td>${actionCell(n)}</td></tr>
    <tr class="resp-row" id="resp-${esc(n.id)}" style="display:none"><td colspan="5"></td></tr>`;
}

function fullRow(n) {
  return `<tr data-q="${esc((n.title + ' ' + (n.family_name || '') + ' ' + n.category).toLowerCase())}">
    <td>${needLink(n)}</td><td>${famCell(n)}</td><td class="hide-sm">${catLabel(n.category)}</td><td>${urgencyBadge(n.urgency)}</td>
    <td class="hide-sm">${esc(fmtLoc(n))}</td><td class="hide-sm" style="color:var(--gray-400)">${n.created_at ? timeAgo(n.created_at) : '—'}</td>
    <td>${responsesBadge(n)}</td><td>${actionCell(n)}</td></tr>
    <tr class="resp-row" id="resp-full-${esc(n.id)}" style="display:none"><td colspan="8"></td></tr>`;
}

async function toggleResponses(id) {
  const rows = [document.getElementById('resp-' + id), document.getElementById('resp-full-' + id)].filter(Boolean);
  const open = rows.some(r => r.style.display !== 'none');
  if (open) { rows.forEach(r => { r.style.display = 'none'; }); return; }
  rows.forEach(r => { r.style.display = ''; r.firstElementChild.innerHTML = '<span style="color:var(--text-sub)">Loading…</span>'; });
  try {
    responseCache[id] = responseCache[id] || await apiGet(`/needs/${encodeURIComponent(id)}/responses`);
    const html = responseCache[id].map(r => `<div style="padding:4px 0;font-size:13px"><b>${esc(r.name)}</b>${r.org_name ? ' · ' + esc(r.org_name) : ''}${r.responder_type ? ' · ' + esc(cap(r.responder_type)) : ''}${fmtLoc(r) ? ' · ' + esc(fmtLoc(r)) : ''}${r.message ? `<div style="color:var(--text-sub)">“${esc(r.message)}”</div>` : ''}</div>`).join('');
    rows.forEach(r => { r.firstElementChild.innerHTML = html || 'No responders yet.'; });
  } catch (err) {
    console.error('Responses failed', err);
    rows.forEach(r => { r.firstElementChild.innerHTML = 'Could not load responders. Try again.'; });
  }
}

async function markFulfilled(id) {
  if (!confirm(tr('Mark this need as fulfilled? Responders who helped will be notified.'))) return;
  document.querySelectorAll(`[id="ful-${id}"]`).forEach(b => { b.disabled = true; b.textContent = 'Saving…'; });
  try {
    await apiPatch(`/needs/${encodeURIComponent(id)}/fulfill`, {});
    myNeeds = myNeeds.map(n => n.id === id ? { ...n, status: 'fulfilled' } : n);
    renderAll();
  } catch (err) {
    console.error('Fulfill failed', err);
    showError('Could not mark that need fulfilled: ' + err.message);
    renderAll();
  }
}

function filterNeeds(q) {
  const term = q.toLowerCase();
  document.querySelectorAll('#allNeedsBody tr[data-q]').forEach(r => { r.style.display = r.dataset.q.includes(term) ? '' : 'none'; });
}

function renderStats() {
  const open = myNeeds.filter(isOpen).length;
  document.getElementById('statsGrid').innerHTML =
    statCard('Families', 'statFamilies', 'Added by you') +
    statCard('Open Needs', 'statOpen', 'Active now', 'up') +
    statCard('Awaiting Response', 'statAwaiting', 'No responder yet') +
    statCard('Fulfilled', 'statFulfilled', 'All time');
  document.getElementById('statFamilies').textContent = families.length;
  document.getElementById('statOpen').textContent = open;
  document.getElementById('statAwaiting').textContent = myNeeds.filter(isAwaiting).length;
  document.getElementById('statFulfilled').textContent = myNeeds.filter(n => n.status === 'fulfilled').length;
  setBadge('needsBadge', open);
}

function renderAll() {
  renderStats();
  const noNeeds = !myNeeds.length;
  document.getElementById('nudgeSlot').innerHTML = noNeeds
    ? nudgeCard('nudge', "You haven't submitted a need yet", 'Add a family, post a real need from your caseload, and get matched with a local responder.',
        `<button class="btn-outline" data-action="addFamilyCta">Add a Family</button><button class="btn-primary" data-href="submit-need">Submit Your First Need</button>`)
    : '';
  if (noNeeds) document.getElementById('nudge').style.display = 'flex';

  document.getElementById('recentSlot').innerHTML = sectionRow('My Recent Needs', '<a class="see-all" href="#" data-action="section" data-arg="needs">See all →</a>') +
    (noNeeds
      ? emptyCard('No needs yet', 'Add a family, then post the first need from your caseload.')
      : tableCard(['Need', 'Family', 'Urgency', 'Responses', ''], myNeeds.slice(0, 5).map(recentRow).join('')));

  document.getElementById('allNeedsBody').innerHTML = noNeeds
    ? '<tr><td colspan="8"><div class="empty"><b>No needs yet</b>Add a family, then post the first need from your caseload.</div></td></tr>'
    : myNeeds.map(fullRow).join('');
  renderFamilies();
  renderActivity();
}

function renderFamilies() {
  document.getElementById('familiesSlot').innerHTML = families.length
    ? tableCard(['Family', 'Country', 'Language', 'Household'],
        families.map(f => `<tr><td><b>${esc(f.name)}</b></td><td>${esc(f.origin_country || '—')}</td><td>${esc(f.language || '—')}</td><td>${f.adults}A ${f.children}C</td></tr>`).join(''))
    : emptyCard('No families yet', 'Add a family to attach needs to it. Only you can see their names.');
}

function toggleFamilyForm(forceOpen) {
  const f = document.getElementById('familyForm');
  f.style.display = forceOpen === true || f.style.display === 'none' ? 'block' : 'none';
}

async function addFamily(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = {
    name: fd.get('name').trim(),
    origin_country: fd.get('origin_country').trim() || null,
    language: fd.get('language').trim() || null,
    adults: parseInt(fd.get('adults'), 10) || 1,
    children: parseInt(fd.get('children'), 10) || 0,
  };
  const btn = document.getElementById('familySave');
  btn.disabled = true;
  try {
    const created = await apiPost('/families', body);
    families = [created, ...families];
    e.target.reset();
    toggleFamilyForm();
    renderAll();
  } catch (err) {
    console.error('Add family failed', err);
    showError('Could not save that family: ' + err.message);
  } finally {
    btn.disabled = false;
  }
}

async function renderActivity() {
  const items = [];
  myNeeds.slice(0, 8).forEach(n => {
    if (n.status === 'fulfilled') items.push([n.created_at, feedItem('✅', `<b>${esc(n.title)}</b> marked fulfilled`, esc(fmtLoc(n)))]);
    items.push([n.created_at, feedItem('📝', `You submitted <a href="need?id=${esc(n.id)}" style="font-weight:600">${esc(n.title)}</a>`, `${n.created_at ? timeAgo(n.created_at) : '—'} · ${esc(fmtLoc(n))}`)]);
  });
  const withResp = myNeeds.filter(n => isOpen(n) && n.response_count).slice(0, 3);
  const resp = await Promise.allSettled(withResp.map(n => apiGet(`/needs/${encodeURIComponent(n.id)}/responses`)));
  resp.forEach((r, i) => {
    if (r.status !== 'fulfilled') return;
    responseCache[withResp[i].id] = r.value;
    r.value.slice(0, 2).forEach(x => items.push([x.responded_at, feedItem('🔔', `<b>${esc(x.name)}</b> offered to help with <b>${esc(withResp[i].title)}</b>`, x.responded_at ? timeAgo(x.responded_at) : '')]));
  });
  items.sort((a, b) => new Date(b[0]) - new Date(a[0]));
  renderFeed('activityFeed', items.slice(0, 8).map(x => x[1]).join(''));
}

async function loadData() {
  const [needsRes, famRes] = await Promise.allSettled([apiGet('/needs/mine'), apiGet('/families/mine')]);
  if (needsRes.status === 'fulfilled') myNeeds = needsRes.value;
  else { console.error('needs/mine failed', needsRes.reason); showError('Could not load your needs. Please refresh.'); }
  if (famRes.status === 'fulfilled') families = famRes.value;
  else console.error('families/mine failed', famRes.reason);
  renderAll();
}
loadData();

// Delegated handlers (dash-shared.js dispatches data-action / data-input / data-submit / data-href).
Object.assign(MP_ACTIONS, {
  toggleFamilyForm: () => toggleFamilyForm(),
  addFamilyCta: () => { showSection('families'); toggleFamilyForm(true); },
  toggleResponses: el => toggleResponses(el.dataset.arg),
  markFulfilled: el => markFulfilled(el.dataset.arg),
});
MP_INPUT.filterNeeds = value => filterNeeds(value);
MP_SUBMIT.addFamily = event => addFamily(event);
