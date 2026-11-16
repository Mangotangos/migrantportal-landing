function openAdminSettings() {
  const stored = localStorage.getItem('mp_user');
  const userData = stored ? JSON.parse(stored) : {};
  const [fn, ln] = (userData.name || '').split(' ');
  document.getElementById('adminFirstName').value = fn || '';
  document.getElementById('adminLastName').value = ln || '';
  document.getElementById('adminSettingsSuccess').style.display = 'none';
  document.getElementById('adminSettingsOverlay').classList.add('open');
  setTimeout(() => document.getElementById('adminFirstName').focus(), 50);
}

function closeAdminSettings() {
  document.getElementById('adminSettingsOverlay').classList.remove('open');
}

function updateAdminPreview() {
  const fn = document.getElementById('adminFirstName').value.trim();
  const ln = document.getElementById('adminLastName').value.trim();
  const fullName = [fn, ln].filter(Boolean).join(' ') || 'Admin';
  document.getElementById('adminName').textContent = fullName;
}

async function saveAdminProfile() {
  const fn = document.getElementById('adminFirstName').value.trim();
  const ln = document.getElementById('adminLastName').value.trim();
  const successEl = document.getElementById('adminSettingsSuccess');
  successEl.style.display = 'none';
  try {
    const updated = await apiPatch('/auth/profile', {
      name: [fn, ln].filter(Boolean).join(' '),
    });
    localStorage.setItem('mp_user', JSON.stringify(updated));
    document.getElementById('adminName').textContent = updated.name || 'Admin';
    successEl.style.display = 'block';
    setTimeout(() => closeAdminSettings(), 1500);
  } catch(e) {
    toast('Save failed: ' + (e.message || 'Unknown error'), true);
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('adminSettingsOverlay').classList.contains('open')) closeAdminSettings();
  if (e.key === 'Escape') closeReceiptModal();
});

/* ── Receipt Upload Modal ── */
let _receiptDisbId = null;

function showReceiptModal(id) {
  _receiptDisbId = id;
  document.getElementById('receipt-url-input').value = '';
  document.getElementById('receipt-note-input').value = '';
  document.getElementById('receipt-alert').style.display = 'none';
  const btn = document.getElementById('receipt-submit-btn');
  btn.disabled = false; btn.textContent = 'Submit Receipt';
  document.getElementById('receipt-modal').style.display = 'flex';
}

function closeReceiptModal() {
  document.getElementById('receipt-modal').style.display = 'none';
  _receiptDisbId = null;
}

async function submitReceipt() {
  const url = document.getElementById('receipt-url-input').value.trim();
  const note = document.getElementById('receipt-note-input').value.trim() || null;
  const alertEl = document.getElementById('receipt-alert');
  const btn = document.getElementById('receipt-submit-btn');

  if (!url) {
    alertEl.textContent = 'Please enter a receipt URL.';
    alertEl.style.display = 'block';
    return;
  }
  alertEl.style.display = 'none';
  btn.disabled = true; btn.textContent = 'Submitting…';

  try {
    await apiPost(`/admin/disbursements/${_receiptDisbId}/receipt`, { receipt_url: url, note });
    closeReceiptModal();
    toast('✓ Receipt submitted and disbursement confirmed.');
    loadDisbursements();
  } catch(e) {
    alertEl.textContent = e.message || 'Failed to submit receipt. Please try again.';
    alertEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Submit Receipt';
  }
}

// Handlers that used to be multi-statement inline attributes.
function allPageStep(d) { goAllPage(allPage + d); }
function usersPageStep(d) { goUsersPage(usersPage + d); }
function auditPageStep(d) { goAuditPage(auditPage + d); }
function npFilterChanged() { npPage = 1; npRenderDirectory(); }
function npPageStep(d) { npPage += d; npRenderDirectory(); }
function npClearFilter(id) { document.getElementById(id).value = ''; npFilterChanged(); }
function npCloseDrawerToOrgs() { npCloseDrawer(); switchTab('orgs'); }
function emailLastSentInput(value) { updateLastSentWarning(value); renderEmailPreview(); }
function roleModalConfirm() { resolveRoleModal(document.querySelector('input[name=newRole]:checked')?.value || null); }
function roleModalWarn(value) { document.getElementById('roleModalWarn').style.display = value === 'admin' ? 'block' : 'none'; }
function deleteNeedRow(id, i) { deleteNeed(id, pendingNeeds[i].title); }
function modalShowReject(id) { closeModal(); showReject(id); }
function modalOpenUser(id) { closeModal(); openUserDrawer(id); }
function drawerRestoreUser(id, name) { restoreUser(id, name); closeUserDrawer(); }
function drawerPermanentlyDeleteUser(id, name) { permanentlyDeleteUser(id, name); closeUserDrawer(); }
function drawerPromptChangeRole(id, current) { closeUserDrawer(); promptChangeRole(id, current); }
function drawerDeleteUser(id, name) { closeUserDrawer(); deleteUser(id, name); }
function gmailComposeTo(email) { gmailCompose({ to: email }); }
function toggleSmoke() {
  const body = document.getElementById('smokeBody');
  body.classList.toggle('hidden');
  this.querySelector('.car').textContent = body.classList.contains('hidden') ? '▸' : '▾';
}
function purgeDeletedTestClick(event) { event.stopPropagation(); purgeDeletedTest(); }

// Delegated handlers (js/mp-actions.js dispatches data-action / data-change / data-input / data-submit / data-keydown).
mpRegister({ rejectNeedConfirm, _rejChipClick, allPageStep, usersPageStep, auditPageStep, npFilterChanged, npPageStep, npClearFilter, npCloseDrawerToOrgs, emailLastSentInput, roleModalConfirm, roleModalWarn, deleteNeedRow, modalShowReject, modalOpenUser, drawerRestoreUser, drawerPermanentlyDeleteUser, drawerPromptChangeRole, drawerDeleteUser, gmailComposeTo, toggleSmoke, purgeDeletedTestClick, _rejCancel, _confCancel, closeAdminSettings, closeReceiptModal, _confCancel, _confOk, _rejCancel, _rejConfirm, approveDisbursement, approveResource, approveSingle, approveUser, bulkApprove, bulkChangeRole, bulkEmail, bulkPermanentDelete, bulkReject, bulkRestore, changeCanSubmit, clearFlags, clearSelection, closeAdminSettings, closeCmd, closeModal, closeReceiptModal, closeShortcuts, closeUserDrawer, cmdGo, cmdKey, cmdSearchCase, composeSendEmail, createAnnouncement, deactivateAnn, debounceLoadAll, deleteOrg, deleteResource, deleteUser, downloadWaitlist, exportAllNeedsCSV, exportAuditCSV, exportUsersCSV, filterCmd, filterEmailUsers, goAllPage, goAuditPage, goCoverageCity, goUsersPage, inviteUser, kpiFilter, loadDeletedUsers, loadDisbursements, loadPendingUsers, loadUsersCoverage, logout, npBulk, npCloseDrawer, npDeleteForever, npDownloadTemplate, npExport, npGoCoverage, npImportFile, npOpenDrawer, npRemove, npRenderCoverage, npRestore, npSave, npSetActive, npSetTab, npSyncAddLabel, npToggleAll, npToggleSel, npVerify, onEmailOrgMemberChange, onEmailOrgSelectChange, onEmailRecipientTypeChange, openAdminSettings, openCmd, openNeedModal, openUserDrawer, permanentlyDeleteUser, pickEmailUser, promptChangeRole, purgeTestAccounts, reconsiderUser, rejectDisbursement, rejectUser, renderDeletedUsers, renderEmailPreview, renderUsersTabs, resolveRoleModal, restoreUser, saveAdminProfile, sendQuestion, setActivityFilter, setUsersTab, showReceiptModal, showReject, submitAddOrg, submitReceipt, switchTab, toggleAddOrgForm, toggleAllActive, toggleAllDeleted, togglePendingDetails, toggleQuestion, toggleSelect, toggleUserMenu, updateActiveBulk, updateAdminPreview, updateDeletedBulk, updatePendingBulk });
