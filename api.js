const API = 'https://migrant-portal-production.up.railway.app';

async function apiPost(path, body) {
  const token = localStorage.getItem('mp_token');
  const r = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) },
    body: JSON.stringify(body)
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

async function apiPatch(path, body) {
  const token = localStorage.getItem('mp_token');
  const r = await fetch(API + path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) },
    body: JSON.stringify(body)
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

async function apiGet(path) {
  const token = localStorage.getItem('mp_token');
  const r = await fetch(API + path, {
    headers: token ? { 'Authorization': 'Bearer ' + token } : {}
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

function saveSession(token, user) {
  localStorage.setItem('mp_token', token);
  localStorage.setItem('mp_user', JSON.stringify(user));
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('mp_user')); } catch { return null; }
}

function logout() {
  localStorage.removeItem('mp_token');
  localStorage.removeItem('mp_user');
  window.location.href = '/login.html';
}

async function apiDelete(path) {
  const token = localStorage.getItem('mp_token');
  const r = await fetch(API + path, {
    method: 'DELETE',
    headers: token ? { 'Authorization': 'Bearer ' + token } : {}
  });
  if (!r.ok) { const data = await r.json().catch(() => ({})); throw new Error(data.detail || 'Request failed'); }
  return r.status === 204 ? null : r.json();
}

function requireAuth() {
  if (!localStorage.getItem('mp_token')) {
    window.location.href = '/login.html';
    return null;
  }
  return getUser();
}
