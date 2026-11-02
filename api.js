const API = 'https://migrant-portal-production-3826.up.railway.app';

// Opt in to the 'navigator' role name on every API call. Without this header the API keeps answering
// 'connector' for older app builds. Wrapping fetch also covers pages that call the API directly.
const _nativeFetch = window.fetch.bind(window);
window.fetch = function (input, init = {}) {
  const url = typeof input === 'string' ? input : input?.url || '';
  if (!url.startsWith(API)) return _nativeFetch(input, init);
  const headers = new Headers(init.headers || (typeof input === 'string' ? undefined : input.headers));
  headers.set('X-Role-Format', 'navigator');
  return _nativeFetch(input, { ...init, headers });
};

let _isLogoutInProgress = false;

function _handle401() {
  if (_isLogoutInProgress) return;
  localStorage.removeItem('mp_user');
  localStorage.removeItem('mp_token');
  if (!window.location.pathname.endsWith('login')) {
    window.location.replace('/login');
  }
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
  const data = await r.json().catch(() => ({}));
  if (r.status === 401) { _handle401(); throw new Error(_extractDetail(data.detail) || 'Session expired'); }
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
  if (r.status === 401) { _handle401(); throw new Error('Session expired'); }
  const data = await r.json();
  if (!r.ok) throw new Error(_extractDetail(data.detail));
  return data;
}

async function apiGet(path) {
  const r = await _fetchWithRetry(path, { headers: _authHeaders(), credentials: 'include' });
  if (r.status === 401) { _handle401(); throw new Error('Session expired'); }
  const data = await r.json();
  if (!r.ok) throw new Error(_extractDetail(data.detail));
  return data;
}

async function apiDelete(path) {
  const r = await _fetchWithRetry(path, { method: 'DELETE', headers: _authHeaders(), credentials: 'include' });
  if (r.status === 401) { _handle401(); throw new Error('Session expired'); }
  if (!r.ok) { const data = await r.json().catch(() => ({})); throw new Error(data.detail || 'Request failed'); }
  return r.status === 204 ? null : await r.json();
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

// Sessions saved before the rename still carry role 'connector'; present them as 'navigator'.
function getUser() {
  let user;
  try { user = JSON.parse(localStorage.getItem('mp_user')); } catch { return null; }
  return user?.role === 'connector' ? { ...user, role: 'navigator' } : user;
}

// Role helpers. 'navigator' is the needs-submitter role; 'connector' is its legacy name, still accepted
// from older API responses and cached sessions. Every role check goes through these, not raw strings.
function isNavigatorRole(role) {
  return role === 'navigator' || role === 'connector';
}
function hasNavigatorRole(user) {
  return isNavigatorRole(user?.role);
}
// Pages call isConnector(): it exists in every api.js version, so a page and a cached api.js from
// different deploys can never disagree on the name. Retire with the connector compat layer (Stage E).
function isConnector(user) {
  return hasNavigatorRole(user);
}
// Mirrors the API's can_submit_needs rule.
function canSubmitNeeds(user) {
  return hasNavigatorRole(user) || user?.role === 'admin' || (user?.role === 'responder' && user?.can_submit_needs === true);
}

async function logout() {
  _isLogoutInProgress = true;
  localStorage.removeItem('mp_user');
  localStorage.removeItem('mp_token');
  try { await fetch(API + '/auth/logout', { method: 'POST', headers: _authHeaders(), credentials: 'include' }); } catch(e) { console.error('Logout error:', e); }
  window.location.replace('/login');
}

function requireAuth() {
  if (!localStorage.getItem('mp_user')) {
    window.location.replace('/login');
    return null;
  }
  const user = getUser();
  if (user?.status === 'pending') {
    window.location.replace('/pending');
    return null;
  }
  if (user?.status === 'rejected') {
    localStorage.removeItem('mp_user');
    localStorage.removeItem('mp_token');
    window.location.replace('/login');
    return null;
  }
  return user;
}

// HTML escape helper — wrap any backend string before injecting via innerHTML/template literals
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// URL escape — only allow http/https/mailto/tel; blocks javascript:, data:, etc.
function escUrl(s) {
  const v = String(s == null ? '' : s).trim();
  if (!/^(https?:\/\/|mailto:|tel:|\/)/i.test(v)) return '#';
  return esc(v);
}
