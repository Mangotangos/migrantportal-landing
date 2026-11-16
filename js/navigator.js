// ── Auth guard ──────────────────────────────────────────
const user = getUser();
if (!user) { window.location.href = 'login'; }
if (user && !isConnector(user)) { window.location.href = 'dashboard'; }

function signOut() { fetch('https://migrant-portal-production-3826.up.railway.app/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {}); localStorage.removeItem('mp_user'); localStorage.removeItem('mp_token'); window.location.href = 'login'; }

// ── Populate header ─────────────────────────────────────
const initials = (user?.name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
document.getElementById('avatar-initials').textContent = initials;
document.getElementById('user-full-name').textContent = 'Hello, ' + (user?.name?.split(' ')[0] || 'there') + ' 👋';
document.getElementById('user-name-top').textContent = user?.name || '';
if (user?.org_name) document.getElementById('user-org').textContent = user.org_name;

const URGENCY_COLORS = { urgent:'#DC2626', high:'#EA580C', medium:'#D97706', low:'#16A34A' };
const STATUS_COLORS  = { active:'#009DA5', pending:'#D97706', fulfilled:'#16A34A', closed:'#999', approved:'#7C3AED' };
const CAT_EMOJI = { housing:'🏠', food:'🍽️', clothing:'👗', furniture:'🛋️', transportation:'🚗', employment:'💼', legal:'⚖️', medical:'🏥', education:'📚', translation:'🌐', childcare:'👶', financial:'💰', other:'📦' };

let _stats = null;

// ── Load stats ──────────────────────────────────────────
async function loadDashboard() {
  try {
    const d = await apiGet('/needs/navigator/stats');
    _stats = d;

    // Stats
    document.getElementById('s-families').textContent  = d.families_count;
    document.getElementById('s-active').textContent    = d.active_count;
    document.getElementById('s-pending').textContent   = d.pending_count;
    document.getElementById('s-fulfilled').textContent = d.fulfilled_count;
    document.getElementById('s-responses').textContent = d.total_responses;
    if (!d.pending_count) document.getElementById('sc-pending').classList.remove('urgent');

    // Expiring soon
    if (d.expiring_soon && d.expiring_soon.length > 0) {
      document.getElementById('expiry-section').style.display = '';
      document.getElementById('expiry-title').textContent = `⚠️ ${d.expiring_soon.length} Need${d.expiring_soon.length !== 1 ? 's' : ''} Expiring Soon`;
      document.getElementById('expiry-list').innerHTML = d.expiring_soon.map(n => `
        <div class="alert-row" id="expiry-row-${n.id}">
          <div class="alert-row-info">
            <div class="alert-row-title">${esc(n.title)}</div>
            <div class="alert-row-sub">#${n.case_number} · ${n.days_left ?? '?'} days left · ${esc(n.city)}, ${esc(n.state)}</div>
          </div>
          <a href="need?id=${n.id}" class="btn-sm btn-view">View</a>
          <button class="btn-renew" data-action="handleRenew" data-args="[null,{&quot;$&quot;:&quot;this&quot;}]" data-a0="${n.id}">Renew</button>
        </div>`).join('');
    }

    // Follow-ups due
    if (d.followups_due && d.followups_due.length > 0) {
      document.getElementById('followup-section').style.display = '';
      document.getElementById('followup-title').textContent = `🔔 ${d.followups_due.length} Follow-up${d.followups_due.length !== 1 ? 's' : ''} Due`;
      document.getElementById('followup-list').innerHTML = d.followups_due.map(n => `
        <div class="alert-row" id="fu-row-${n.id}">
          <div class="alert-row-info">
            <div class="alert-row-title">${esc(n.title)}</div>
            ${n.follow_up_note ? `<div class="followup-note">"${n.follow_up_note}"</div>` : ''}
          </div>
          <button class="btn-snooze" data-action="handleSnooze" data-a0="${esc(String(n.id))}" data-a1="${esc(n.follow_up_note || '')}" data-args="[null,null,{&quot;onclick="handleSnooze('${esc(String(n.id))}', '${esc((n.follow_up_note||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'"))}', this)"quot;:&quot;this&quot;}]">+7d</button>
          <button class="btn-done" data-action="handleFollowupDone" data-args="[null,{&quot;$&quot;:&quot;this&quot;}]" data-a0="${n.id}">✓ Done</button>
        </div>`).join('');
    }

    // Recent needs
    renderNeeds(d.recent_needs);

    document.getElementById('page-loading').style.display = 'none';
    document.getElementById('page-content').style.display = '';
  } catch(e) {
    document.getElementById('page-loading').textContent = 'Failed to load dashboard. Please refresh.';
  }
}

function renderNeeds(needs) {
  if (!needs || !needs.length) {
    document.getElementById('needs-list').innerHTML =
      '<div class="empty">No submissions yet. <a href="submit-need">Submit your first need →</a></div>';
    return;
  }
  document.getElementById('needs-list').innerHTML = needs.map(n => {
    const uc = URGENCY_COLORS[n.urgency] || '#999';
    const sc = STATUS_COLORS[n.status] || '#999';
    return `
      <div class="need-card">
        <div class="need-urgency-bar" style="background:${uc}"></div>
        <div style="flex:1">
          <div class="need-body">
            <div class="need-top">
              <div class="need-title">${CAT_EMOJI[n.category]||'📦'} ${esc(n.title)}</div>
              <span class="need-status" style="background:${sc}22;color:${sc}">${n.status.toUpperCase()}</span>
            </div>
            <div class="need-desc">${esc(n.description)}</div>
            <div class="need-meta">
              <span>📍 ${esc(n.city)}, ${esc(n.state)}</span>
              <span class="need-meta-dot"></span>
              <span>💬 ${n.response_count ?? 0} responses</span>
              <span class="need-meta-dot"></span>
              <span>#${n.case_number}</span>
              ${n.days_left != null ? `<span class="need-meta-dot"></span><span style="color:${n.days_left < 7 ? 'var(--red)' : 'var(--gray-400)'}">⏱ ${n.days_left}d left</span>` : ''}
            </div>
          </div>
          <div class="need-actions">
            <a href="need?id=${n.id}" class="btn-sm btn-view">View</a>
            ${n.response_count > 0 ? `<span class="response-pill">👥 ${n.response_count} response${n.response_count!==1?'s':''}</span>` : ''}
            ${n.status === 'active' && n.days_left != null && n.days_left < 15 ? `<button class="btn-sm" style="background:#fef3c7;color:var(--yellow)" data-action="handleRenewCard" data-args="[null,{&quot;$&quot;:&quot;this&quot;}]" data-a0="${n.id}">🔄 Renew</button>` : ''}
            ${n.status === 'active' ? `<button class="btn-sm btn-fulfill" data-action="openFollowupModal" data-a0="${n.id}">🔔 Set Follow-up</button>` : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Actions ─────────────────────────────────────────────
async function handleRenew(needId, btn) {
  btn.disabled = true;
  btn.textContent = '…';
  try {
    await apiPost(`/needs/${needId}/renew`, {});
    const row = document.getElementById(`expiry-row-${needId}`);
    if (row) row.remove();
    // Update days_left display if visible in main list
    loadDashboard();
  } catch {
    btn.disabled = false;
    btn.textContent = 'Renew';
    _mpToast('Failed to renew. Please try again.', true);
  }
}

async function handleRenewCard(needId, btn) {
  btn.disabled = true;
  btn.textContent = '…';
  try {
    await apiPost(`/needs/${needId}/renew`, {});
    loadDashboard();
  } catch {
    btn.disabled = false;
    btn.textContent = '🔄 Renew';
  }
}

async function handleSnooze(needId, currentNote, btn) {
  btn.disabled = true;
  try {
    const due = new Date();
    due.setDate(due.getDate() + 7);
    await apiPost(`/needs/${needId}/followup`, { note: currentNote || 'Follow-up rescheduled', due_at: due.toISOString().slice(0, 10) });
    const row = document.getElementById(`fu-row-${needId}`);
    if (row) row.remove();
  } catch {
    btn.disabled = false;
  }
}

async function handleFollowupDone(needId, btn) {
  btn.disabled = true;
  try {
    await apiDelete(`/needs/${needId}/followup`);
    const row = document.getElementById(`fu-row-${needId}`);
    if (row) row.remove();
  } catch {
    btn.disabled = false;
  }
}

// ── Follow-up modal ─────────────────────────────────────
function openFollowupModal(needId) {
  document.getElementById('fu-need-id').value = needId;
  document.getElementById('fu-note').value = '';
  const d = new Date(); d.setDate(d.getDate() + 7);
  document.getElementById('fu-date').value = d.toISOString().slice(0, 10);
  document.getElementById('followup-modal').classList.add('open');
}

function closeFollowupModal() {
  document.getElementById('followup-modal').classList.remove('open');
}

async function saveFollowup() {
  const needId = document.getElementById('fu-need-id').value;
  const note   = document.getElementById('fu-note').value.trim() || 'Follow-up scheduled';
  const due_at = document.getElementById('fu-date').value;
  if (!due_at) { _mpToast('Please pick a due date.', true); return; }
  try {
    await apiPost(`/needs/${needId}/followup`, { note, due_at });
    closeFollowupModal();
  } catch {
    _mpToast('Failed to save follow-up.', true);
  }
}

// ── Close modal on overlay click ─────────────────────────
document.getElementById('followup-modal').addEventListener('click', function(e) {
  if (e.target === this) closeFollowupModal();
});

// ── Init ────────────────────────────────────────────────
loadDashboard();

// Delegated handlers (js/mp-actions.js dispatches data-action / data-change / data-input / data-submit / data-keydown).
mpRegister({ closeFollowupModal, handleFollowupDone, handleRenew, handleRenewCard, openFollowupModal, saveFollowup, signOut });
