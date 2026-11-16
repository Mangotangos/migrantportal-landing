requireAuth();

// ── Load user from JWT first, then try API
const _stored = getUser() || {};
function prefill(u) {
  const parts = (u.name || '').trim().split(' ');
  if (parts[0]) document.getElementById('firstName').value = parts[0];
  if (parts[1]) document.getElementById('lastName').value  = parts.slice(1).join(' ');
  if (u.email)  document.getElementById('emailField').value = u.email;
  if (u.email)  document.getElementById('avatarEmail').textContent = u.email;
  setText('phone', u.phone); setText('phoneExt', u.phone_ext);
  setText('address1', u.address_line1); setText('address2', u.address_line2);
  setText('city', u.city); setText('zip', u.zip_code);
  setSelect('state', u.state); setSelect('country', u.country);
  applyNotifPrefs(u.notification_prefs);
  initAlertSettings(u);
  if (u.role)   document.getElementById('avatarRole').textContent = u.role;
  if (document.getElementById('topRole')) document.getElementById('topRole').textContent = u.role || '—';
  updateAvatar();
}
function setText(id, value) { if (value) document.getElementById(id).value = value; }
// Select a value, adding it as an option first if the list lacks it (e.g. "KS" saved by the mobile app)
function setSelect(id, value) {
  if (!value) return;
  const sel = document.getElementById(id);
  const find = () => [...sel.options].find(o => o.value === value || o.text === value);
  if (!find()) sel.add(new Option(value, value));
  sel.value = find().value;
}


// ── Alert settings (radius + need types), responders and responding orgs only
const ALERT_ICON_PATHS = {
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
const ALERT_CATS = [['housing','Housing'],['food','Food'],['clothing','Clothing'],['furniture','Furniture'],['transportation','Transportation'],['employment','Employment'],['legal','Legal Aid'],['medical','Medical'],['education','Education'],['translation','Translation'],['childcare','Childcare'],['financial','Financial'],['other','Other']];
let alertCats = [];
let alertRadius = 50;

function renderAlertSettings() {
  document.getElementById('alertChips').innerHTML = ALERT_CATS.map(([k, label]) =>
    `<button type="button" class="achip${alertCats.includes(k) ? ' on' : ''}" data-cat="${k}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ALERT_ICON_PATHS[k]}</svg>${label}</button>`).join('');
  document.querySelectorAll('#alertRadius .rpill').forEach(b => {
    b.classList.toggle('on', b.dataset.r === (alertRadius == null ? 'any' : String(alertRadius)));
  });
  document.getElementById('alertSaveBtn').disabled = alertCats.length === 0;
}

function initAlertSettings(u) {
  if (u.role !== 'responder') return;
  alertCats = Array.isArray(u.need_categories) ? [...u.need_categories] : [];
  alertRadius = u.notification_radius === undefined ? 50 : u.notification_radius;
  document.getElementById('alertsSect').style.display = '';
  renderAlertSettings();
}

document.getElementById('alertChips').addEventListener('click', e => {
  const chip = e.target.closest('.achip');
  if (!chip) return;
  const cat = chip.dataset.cat;
  alertCats = alertCats.includes(cat) ? alertCats.filter(c => c !== cat) : [...alertCats, cat];
  renderAlertSettings();
});
document.getElementById('alertRadius').addEventListener('click', e => {
  const pill = e.target.closest('.rpill');
  if (!pill) return;
  alertRadius = pill.dataset.r === 'any' ? null : Number(pill.dataset.r);
  renderAlertSettings();
});

async function saveAlertSettings() {
  const btn = document.getElementById('alertSaveBtn');
  btn.disabled = true;
  try {
    const sent = [...alertCats];
    const updated = await apiPatch('/auth/profile', { need_categories: sent, notification_radius: alertRadius });
    const saved = Array.isArray(updated.need_categories) ? updated.need_categories : [];
    if (sent.length !== saved.length || sent.some(c => !saved.includes(c))) {
      throw new Error('The server did not save the change.');
    }
    localStorage.setItem('mp_user', JSON.stringify(updated));
    _mpToast('Alert settings saved.');
  } catch (e) {
    _mpToast('Save failed: ' + (e.message || 'Unknown error'), true);
  } finally {
    renderAlertSettings();
  }
}

// ── Notification preferences (single source of truth for the rows)
const NOTIFS = [
  { key: 'new_request',  title: 'New Request Notifications', critical: true,  desc: 'Alerts you to new requests based on your location and settings.', channels: { app: true, email: true } },
  { key: 'faith_vetted', title: 'New Faith Community-Vetted Request Notifications', critical: true,  desc: 'Alerts you to new requests entered by your own faith community or team.', channels: { app: true, email: true } },
  { key: 'community',    title: 'Active Community Notifications', critical: true,  desc: 'Be among the first to know when another faith community nearby needs help meeting a request.', channels: { app: true, email: true } },
  { key: 'closed',       title: 'Closed Request Notifications', critical: false, desc: 'Get notified when a request you submitted, responded to, followed, or committed to has been closed.', channels: { app: true, email: true } },
  { key: 'newsletter',   title: 'Monthly Newsletter', critical: false, desc: 'Updates on how communities are giving brighter futures to migrants and their families.', channels: { email: false } },
  { key: 'feedback',     title: 'User Feedback Opportunities', critical: false, desc: 'Opt in to give feedback on existing and new MigrantPortal features.', channels: { email: true } },
];
const prefCell = (key, channel, on) => on === undefined
  ? '<div></div>'
  : `<div><input type="checkbox" class="notif-check" data-pref="${key}.${channel}" ${on ? 'checked' : ''}></div>`;
function renderNotifRows() {
  document.getElementById('notifRows').innerHTML = NOTIFS.map(n =>
    `<div class="notif-row"><div><div class="notif-label${n.critical ? ' critical' : ''}">${n.title}${n.critical ? ' <span class="crit-note">(Critical)</span>' : ''}</div><div class="notif-sub">${n.desc}</div></div>${prefCell(n.key, 'app', n.channels.app)}${prefCell(n.key, 'email', n.channels.email)}</div>`
  ).join('');
}
function applyNotifPrefs(saved) {
  if (!saved) return;
  document.querySelectorAll('.notif-check').forEach(c => { if (c.dataset.pref in saved) c.checked = saved[c.dataset.pref]; });
  document.querySelectorAll('.notif-flag').forEach(c => { const k = c.id.replace('pref-', ''); if (k in saved) c.checked = saved[k]; });
}
function setAllNotifs(on) { document.querySelectorAll('.notif-check').forEach(c => { c.checked = on; }); }
renderNotifRows();

prefill(_stored);

// ── Sidebar: org members get the org dashboard nav, everyone else the general nav
const ICON = {
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  needs: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
  user: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  pulse: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  plus: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
  me: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>',
  out: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
};
function sbItem(href, icon, label, active) {
  return `<a class="sidebar-item${active ? ' active' : ''}" href="${href}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ICON[icon]}</svg>${label}</a>`;
}
function renderSidebar(u, org) {
  const isOrg = !!(u && u.org_id);
  const overview = isOrg
    ? sbItem('org-dashboard#overview', 'grid', 'Dashboard') + sbItem('org-dashboard#needs', 'needs', 'Submitted Needs') +
      sbItem('org-dashboard#members', 'user', 'Team Members') + sbItem('org-dashboard#activity', 'pulse', 'Activity')
    : sbItem('dashboard', 'grid', 'Dashboard') + sbItem('requests', 'needs', 'Browse Needs') + sbItem('submit-need', 'plus', 'Submit a Family Need');
  const chip = isOrg
    ? `<div class="org-chip"><div class="org-icon">⛪</div><div><div class="org-name" id="sbOrgName"></div><div class="org-role" id="sbOrgRole"></div></div></div>`
    : '';
  document.getElementById('sidebar').innerHTML = chip +
    `<div class="sidebar-section"><div class="sidebar-label">Overview</div>${overview}</div>` +
    `<div class="sidebar-section"><div class="sidebar-label">Account</div>${sbItem('profile', 'me', 'My Profile', true)}` +
    `<a class="sidebar-item" href="#" data-action="logout" data-prevent><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ICON.out}</svg>Sign Out</a></div>`;
  if (isOrg) {
    document.getElementById('sbOrgName').textContent = (org && org.name) || 'My Organization';
    document.getElementById('sbOrgRole').textContent = org ? (org.owner_id === u.id ? 'Admin' : 'Member') : '';
  }
}
renderSidebar(_stored);
document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.getElementById('layout').classList.toggle('collapsed');
});

// Fetch fresh profile using Bearer token only — avoids cookie-session overwriting a different user's localStorage
const _tok = localStorage.getItem('mp_token');
if (_tok) {
  fetch(API + '/auth/me', { headers: { 'Authorization': 'Bearer ' + _tok } })
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(u => { prefill(u); localStorage.setItem('mp_user', JSON.stringify(u)); renderSidebar(u); setAvailUI(u.is_available !== false); loadOrgRole(u); })
    .catch(() => {/* use stored */});
}

// Add the user's organization membership (if any) to the My Roles table.
function loadOrgRole(u) {
  if (!u.org_id) return;
  fetch(API + '/orgs/mine', { headers: { 'Authorization': 'Bearer ' + _tok } })
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(org => {
      renderSidebar(u, org);
      const isOwner = org.owner_id === u.id;
      const active = u.status === 'approved';
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid var(--gray-100)';
      const cells = [
        [isOwner ? 'Organization Admin' : 'Organization Member', 'var(--teal)', 600],
        [org.name, 'var(--teal)', 400],
        [active ? 'Active' : 'Pending', active ? '#22c55e' : '#d97706', 600],
      ];
      cells.forEach(([text, color, weight]) => {
        const td = document.createElement('td');
        td.style.cssText = `padding:14px 12px;font-size:13px;color:${color};font-weight:${weight};`;
        td.textContent = text;
        row.appendChild(td);
      });
      document.getElementById('roles-body').appendChild(row);
      const n = document.getElementById('roles-body').rows.length;
      document.getElementById('roles-count').textContent = `Showing ${n} result${n === 1 ? '' : 's'}`;
    })
    .catch(() => {/* org row is optional */});
}

function setAvailUI(isAvail) {
  const btn = document.getElementById('avail-toggle');
  const lbl = document.getElementById('avail-label');
  if (!btn) return;
  btn.classList.toggle('on', isAvail);
  lbl.innerHTML = isAvail
    ? 'You are <strong style="color:var(--teal)">available</strong> to respond to needs.'
    : 'You are <strong style="color:#9CA3AF">unavailable</strong> — you won\'t appear in need matches.';
}

async function toggleAvailability() {
  const btn = document.getElementById('avail-toggle');
  const isNowAvail = !btn.classList.contains('on');
  setAvailUI(isNowAvail);
  try {
    await apiPatch('/auth/profile', { is_available: isNowAvail });
  } catch(e) {
    // revert on failure
    setAvailUI(!isNowAvail);
    _mpToast('Could not save availability. Please try again.', true);
  }
}

function updateAvatar() {
  const fn = document.getElementById('firstName').value.trim();
  const ln = document.getElementById('lastName').value.trim();
  const initials = ((fn[0]||'') + (ln[0]||'')).toUpperCase() || '?';
  const fullName = [fn, ln].filter(Boolean).join(' ') || '—';
  document.getElementById('avatarInitials').textContent = initials;
  document.getElementById('avatarName').textContent     = fullName;
  document.getElementById('topAvatar').textContent      = initials;
  document.getElementById('topName').textContent        = fullName || 'User';
}
document.getElementById('firstName').addEventListener('input', updateAvatar);
document.getElementById('lastName').addEventListener('input', updateAvatar);

// ── Tab switching
function switchTab(id, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.ptab').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  btn.classList.add('active');
}

// ── Change password
async function updatePassword() {
  const cur = document.getElementById('currentPw').value;
  const nw  = document.getElementById('newPw').value;
  const cnf = document.getElementById('confirmPw').value;
  if (!cur || !nw || !cnf) { _mpToast('Please fill in all password fields.', true); return; }
  if (nw.length < 8) { _mpToast('New password must be at least 8 characters.', true); return; }
  if (nw !== cnf) { _mpToast('New passwords do not match.', true); return; }
  try {
    await apiPost('/auth/change-password', { current_password: cur, new_password: nw });
    document.getElementById('currentPw').value = '';
    document.getElementById('newPw').value = '';
    document.getElementById('confirmPw').value = '';
    const s = document.getElementById('pwSuccess');
    s.style.display = 'block';
    setTimeout(() => s.style.display = 'none', 3000);
  } catch (e) {
    _mpToast(e.message || 'Password update failed.', true);
  }
}

// ── Save notification preferences to the account
async function saveNotifPrefs() {
  const prefs = {};
  document.querySelectorAll('.notif-check').forEach(c => { prefs[c.dataset.pref] = c.checked; });
  document.querySelectorAll('.notif-flag').forEach(c => { prefs[c.id.replace('pref-', '')] = c.checked; });
  const btn = document.getElementById('notifSaveBtn');
  btn.disabled = true;
  try {
    const updated = await apiPatch('/auth/profile', { notification_prefs: prefs });
    localStorage.setItem('mp_user', JSON.stringify(updated));
    _mpToast('Notification preferences saved.');
  } catch (e) {
    _mpToast('Save failed: ' + (e.message || 'Unknown error'), true);
  } finally {
    btn.disabled = false;
  }
}

// ── Save button enables only once something changes
function setDirty(isDirty, justSaved = false) {
  document.getElementById('saveHint').textContent = isDirty ? 'You have unsaved changes' : (justSaved ? '✓ All changes saved' : '');
}
document.getElementById('personalForm').addEventListener('input', () => setDirty(true));

// ── Save profile
async function saveProfile() {
  const fn = document.getElementById('firstName').value.trim();
  const ln = document.getElementById('lastName').value.trim();
  const s  = document.getElementById('saveSuccess');
  s.style.display = 'none';
  try {
    const val = id => document.getElementById(id).value.trim();
    const updated = await apiPatch('/auth/profile', {
      name: [fn, ln].filter(Boolean).join(' '),
      phone: val('phone'), phone_ext: val('phoneExt'),
      address_line1: val('address1'), address_line2: val('address2'),
      city: val('city'), state: val('state'), zip_code: val('zip'), country: val('country'),
    });
    localStorage.setItem('mp_user', JSON.stringify(updated));
    updateAvatar();
    setDirty(false, true);
    s.style.display = 'block';
    setTimeout(() => s.style.display = 'none', 3000);
  } catch (e) {
    _mpToast('Save failed: ' + (e.message || 'Unknown error'), true);
  }
}
