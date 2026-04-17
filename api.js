const API = 'https://migrant-portal-production.up.railway.app';

let _isLogoutInProgress = false;

function _handle401() {
  if (_isLogoutInProgress) return;
  localStorage.removeItem('mp_user');
  localStorage.removeItem('mp_token');
  window.location.replace('/login.html');
}

async function _fetchWithRetry(path, options) {
  try {
    return await fetch(API + path, options);
  } catch {
    await new Promise(r => setTimeout(r, 1500));
    try {
      return await fetch(API + path, options);
    } catch {
      throw new Error('Connection error. Please check your internet and try again.');
    }
  }
}

async function apiPost(path, body) {
  const r = await _fetchWithRetry(path, {
    method: 'POST',
    headers: _authHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (r.status === 401) { _handle401(); throw new Error('Session expired'); }
  if (!r.ok) throw new Error(_extractDetail(data.detail));
  return data;
}

function _extractDetail(detail) {
  if (!detail) return 'Request failed';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(e => e.msg || JSON.stringify(e)).join('; ');
  return JSON.stringify(detail);
}

async function apiPatch(path, body) {
  const r = await _fetchWithRetry(path, {
    method: 'PATCH',
    headers: _authHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (r.status === 401) { _handle401(); throw new Error('Session expired'); }
  if (!r.ok) throw new Error(_extractDetail(data.detail));
  return data;
}

async function apiGet(path) {
  const r = await _fetchWithRetry(path, { headers: _authHeaders(), credentials: 'include' });
  const data = await r.json();
  if (r.status === 401) { _handle401(); throw new Error('Session expired'); }
  if (!r.ok) throw new Error(_extractDetail(data.detail));
  return data;
}

async function apiDelete(path) {
  const r = await _fetchWithRetry(path, { method: 'DELETE', headers: _authHeaders(), credentials: 'include' });
  if (r.status === 401) { _handle401(); throw new Error('Session expired'); }
  if (!r.ok) { const data = await r.json().catch(() => ({})); throw new Error(data.detail || 'Request failed'); }
  return r.status === 204 ? null : r.json();
}

function saveSession(tokenOrUser, user) {
  if (user !== undefined) {
    localStorage.setItem('mp_token', tokenOrUser);
    localStorage.setItem('mp_user', JSON.stringify(user));
  } else {
    localStorage.setItem('mp_user', JSON.stringify(tokenOrUser));
  }
}

function _authHeaders(extra = {}) {
  const token = localStorage.getItem('mp_token');
  return token ? { Authorization: `Bearer ${token}`, ...extra } : { ...extra };
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('mp_user')); } catch { return null; }
}

async function logout() {
  _isLogoutInProgress = true;
  localStorage.removeItem('mp_user');
  localStorage.removeItem('mp_token');
  try { await fetch(API + '/auth/logout', { method: 'POST', headers: _authHeaders(), credentials: 'include' }); } catch {}
  window.location.replace('/login.html');
}

function requireAuth() {
  if (!localStorage.getItem('mp_user')) {
    window.location.replace('/login.html');
    return null;
  }
  const user = getUser();
  if (user?.status === 'pending') {
    window.location.replace('/pending.html');
    return null;
  }
  if (user?.status === 'rejected') {
    localStorage.removeItem('mp_user');
    localStorage.removeItem('mp_token');
    window.location.replace('/login.html');
    return null;
  }
  return user;
}
