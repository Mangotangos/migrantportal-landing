(function() {
  document.body.style.visibility = 'visible';
  var user = getUser();

  // Org members get the org dashboard sidebar (same nav as org-dashboard / profile)
  var SB_ICON = {
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    needs: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
    user: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    pulse: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    plus: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
    me: '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>',
    out: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>'
  };
  function sbItem(href, icon, label, active) {
    return '<a class="sidebar-item' + (active ? ' active' : '') + '" href="' + href + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + SB_ICON[icon] + '</svg>' + label + '</a>';
  }
  function renderOrgSidebar(u, org) {
    document.getElementById('sidebar').innerHTML =
      '<div class="org-chip"><div class="org-icon">⛪</div><div><div class="org-name" id="sbOrgName"></div><div class="org-role" id="sbOrgRole" data-i18n></div></div></div>' +
      '<div class="sidebar-section"><div class="sidebar-label" data-i18n>Overview</div>' +
        sbItem('org-dashboard#overview', 'grid', 'Dashboard') + sbItem('org-dashboard#needs', 'needs', 'Submitted Needs') +
        sbItem('org-dashboard#members', 'user', 'Team Members') + sbItem('org-dashboard#activity', 'pulse', 'Activity') +
        sbItem('submit-need', 'plus', 'Submit a Need', true) + '</div>' +
      '<div class="sidebar-section"><div class="sidebar-label" data-i18n>Account</div>' + sbItem('profile', 'me', 'My Profile') +
        '<a class="sidebar-item" href="#" data-action="logout" data-prevent><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + SB_ICON.out + '</svg>Sign Out</a></div>';
    document.getElementById('sbOrgName').textContent = (org && org.name) || 'My Organization';
    document.getElementById('sbOrgRole').textContent = org ? (org.owner_id === u.id ? 'Admin' : 'Member') : '';
    document.getElementById('crumbDash').href = 'org-dashboard';
    document.getElementById('successMyNeeds').href = 'org-dashboard#needs';
  }
  function renderNavigatorSidebar(u) {
    document.getElementById('sidebar').innerHTML =
      '<div class="org-chip"><div class="org-icon">🧭</div><div><div class="org-name" id="sbNavName"></div><div class="org-role" data-i18n>Navigator</div></div></div>' +
      '<div class="sidebar-section"><div class="sidebar-label" data-i18n>Overview</div>' +
        sbItem('navigator-dashboard#overview', 'grid', 'Dashboard') + sbItem('navigator-dashboard#needs', 'needs', 'My Needs') +
        sbItem('navigator-dashboard#families', 'user', 'Families') + '</div>' +
      '<div class="sidebar-section"><div class="sidebar-label" data-i18n>Account</div>' + sbItem('profile', 'me', 'My Profile') +
        '<a class="sidebar-item" href="#" data-action="logout" data-prevent><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + SB_ICON.out + '</svg>Sign Out</a></div>';
    document.getElementById('sbNavName').textContent = u.name || 'My account';
    document.getElementById('crumbDash').href = 'navigator-dashboard';
  }
  if (user && !user.org_id && isConnector(user)) {
    renderNavigatorSidebar(user);
  } else if (user && user.org_id) {
    renderOrgSidebar(user, null);
    var sbTok = localStorage.getItem('mp_token');
    if (sbTok) {
      fetch(API + '/orgs/mine', { headers: { 'Authorization': 'Bearer ' + sbTok } })
        .then(function(r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function(org) { renderOrgSidebar(user, org); if (window.mpReapplyI18n) window.mpReapplyI18n(); })
        .catch(function() { /* keep generic chip */ });
    }
  }

  // Not logged in
  if (!user || !localStorage.getItem('mp_token')) {
    document.getElementById('authGate').style.display = 'block';
    return;
  }

  // Pending approval
  if (user.status === 'pending') {
    document.getElementById('authGateTitle').textContent = 'Account Pending Approval';
    document.getElementById('authGateMsg').textContent = 'Your account is awaiting admin approval. You will be able to submit needs once approved.';
    document.getElementById('authGateBtn').textContent = 'Go to Dashboard';
    document.getElementById('authGateBtn').href = 'pending';
    document.getElementById('authGate').style.display = 'block';
    return;
  }

  // Rejected
  if (user.status === 'rejected') {
    document.getElementById('authGateTitle').textContent = 'Account Not Approved';
    document.getElementById('authGateMsg').textContent = 'Your account was not approved. Contact support@migrantportal.com for help.';
    document.getElementById('authGateBtn').textContent = 'Contact Support';
    document.getElementById('authGateBtn').href = 'mailto:support@migrantportal.com';
    document.getElementById('authGate').style.display = 'block';
    return;
  }

  // Wrong role — only connectors, admins, and responders granted can_submit_needs
  const canSubmit = canSubmitNeeds(user);
  if (!canSubmit) {
    document.getElementById('authGateTitle').textContent = 'Navigator Account Required';
    document.getElementById('authGateMsg').textContent = 'Only Navigator accounts, or organizations approved to submit needs, can submit family needs. If you believe this is an error, contact your administrator.';
    document.getElementById('authGateBtn').textContent = 'Back to Dashboard';
    document.getElementById('authGateBtn').href = 'dashboard';
    document.getElementById('authGate').style.display = 'block';
    return;
  }

  // Approved connector or admin — show the form
  document.getElementById('formSection').style.display = 'block';
})();

let urgency = 'medium';
let adults = 1;
let children = 0;
let items = [];

function selectUrgency(val) {
  urgency = val;
  document.querySelectorAll('.urgency-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.value === val);
  });
}

function adjustCount(type, delta) {
  if (type === 'adults') {
    adults = Math.max(1, adults + delta);
    document.getElementById('adultsVal').textContent = adults;
  } else {
    children = Math.max(0, children + delta);
    document.getElementById('childrenVal').textContent = children;
  }
}

function addItem() {
  const id = Date.now();
  items.push({ id, name: '', quantity: 1 });
  renderItems();
  // focus the new input
  setTimeout(() => {
    const inp = document.getElementById('item-name-' + id);
    if (inp) inp.focus();
  }, 50);
}

function removeItem(id) {
  items = items.filter(i => i.id !== id);
  renderItems();
}

function renderItems() {
  const list = document.getElementById('itemsList');
  if (items.length === 0) {
    list.innerHTML = '';
    return;
  }
  list.innerHTML = items.map(item => `
    <div class="item-row">
      <input type="text" id="item-name-${item.id}" aria-label="Item name" placeholder="Item name (e.g. Winter jacket, size M)"
        value="${esc(item.name)}" data-input="updateItem" data-args="[null,&quot;name&quot;,{&quot;$&quot;:&quot;value&quot;}]" data-n0="${item.id}" />
      <input type="number" id="item-qty-${item.id}" aria-label="Quantity" placeholder="Qty" min="1" max="999"
        value="${item.quantity}" data-input="updateItem" data-args="[null,&quot;qty&quot;,{&quot;$&quot;:&quot;value&quot;}]" data-n0="${item.id}"
        style="text-align:center;" />
      <button class="remove-btn" data-action="removeItem" data-n0="${item.id}">×</button>
    </div>
  `).join('');
  if (window.mpReapplyI18n) window.mpReapplyI18n();
}

function updateItem(id, field, val) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  if (field === 'name') item.name = val;
  else item.quantity = parseInt(val) || 1;
}

async function handleSubmit() {
  const btn = document.getElementById('submitBtn');
  const err = document.getElementById('alertError');
  err.style.display = 'none';

  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const category = document.getElementById('category').value;
  const city = document.getElementById('city').value.trim();
  const state = document.getElementById('state').value.trim().toUpperCase();
  const zip = document.getElementById('zip').value.trim();

  if (!title || title.length < 5) return showError('Title must be at least 5 characters.');
  if (!category) return showError('Please select a category.');
  if (!city || !state) return showError('Please fill in city and state.');
  if (!/^\d{5}(-\d{4})?$/.test(zip)) return showError('Please enter a valid 5-digit ZIP code (e.g. 64108).');
  if (!description || description.length < 20) return showError('Description must be at least 20 characters.');

  // Collect items (ignore incomplete rows)
  const itemsPayload = items
    .filter(i => i.name.trim())
    .map(i => ({ label: i.name.trim(), amount_needed: i.quantity, unit: 'item' }));

  const payload = {
    title,
    description,
    category,
    urgency,
    city,
    state,
    zip,
    family_adults: adults,
    family_children: children,
    can_help_remotely: document.getElementById('canHelpRemotely').checked,
    items: itemsPayload,
  };

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> ' + (window.mpT ? window.mpT('Submitting…') : 'Submitting…');

  try {
    await apiPost('/needs', payload);
    if (title) {
      // Title is user input — textContent only
      document.getElementById('successNeedTitle').textContent = '"' + title + '"';
      document.getElementById('successMsgDefault').style.display = 'none';
      document.getElementById('successMsgNamed').style.display = 'block';
    }
    document.getElementById('formSection').style.display = 'none';
    document.getElementById('successCard').style.display = 'block';
  } catch (ex) {
    showError(ex.message);
    btn.disabled = false;
    btn.innerHTML = window.mpT ? window.mpT('Submit Need') : 'Submit Need';
  }
}

function showError(msg) {
  const err = document.getElementById('alertError');
  err.textContent = window.mpT ? window.mpT(msg) : msg;
  err.style.display = 'block';
  err.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Delegated handlers (js/mp-actions.js dispatches data-action / data-change / data-input / data-submit / data-keydown).
mpRegister({ addItem, adjustCount, handleSubmit, logout, removeItem, selectUrgency, updateItem });
