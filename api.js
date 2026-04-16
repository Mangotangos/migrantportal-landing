const API = 'https://migrant-portal-backend.up.railway.app';

function _handle401() {
  localStorage.removeItem('mp_user');
  window.location.href = '/login.html';
}

async function apiPost(path, body) {
  const r = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (r.status === 401) { _handle401(); throw new Error('Session expired'); }
  if (!r.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

async function apiPatch(path, body) {
  const r = await fetch(API + path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (r.status === 401) { _handle401(); throw new Error('Session expired'); }
  if (!r.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

async function apiGet(path) {
  const r = await fetch(API + path, { credentials: 'include' });
  const data = await r.json();
  if (r.status === 401) { _handle401(); throw new Error('Session expired'); }
  if (!r.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

async function apiDelete(path) {
  const r = await fetch(API + path, { method: 'DELETE', credentials: 'include' });
  if (r.status === 401) { _handle401(); throw new Error('Session expired'); }
  if (!r.ok) { const data = await r.json().catch(() => ({})); throw new Error(data.detail || 'Request failed'); }
  return r.status === 204 ? null : r.json();
}

// token param kept for mobile-app callers that still pass it; ignored on web (cookie is used)
function saveSession(_tokenOrUser, user) {
  const u = user !== undefined ? user : _tokenOrUser;
  localStorage.setItem('mp_user', JSON.stringify(u));
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('mp_user')); } catch { return null; }
}

async function logout() {
  try { await fetch(API + '/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
  localStorage.removeItem('mp_user');
  window.location.href = '/login.html';
}

function requireAuth() {
  if (!localStorage.getItem('mp_user')) {
    window.location.href = '/login.html';
    return null;
  }
  return getUser();
}
