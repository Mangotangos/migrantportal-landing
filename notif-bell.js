/**
 * MigrantPortal — Notification Bell
 * Self-injects a fixed bell icon + dropdown into any page.
 * Requires api.js (apiGet, apiPatch) to be loaded first.
 */
(function () {
  if (!localStorage.getItem('mp_token')) return; // not logged in

  // ── Inject styles
  const style = document.createElement('style');
  style.textContent = `
    #mp-bell-btn {
      position: fixed; top: 10px; right: 16px; z-index: 1200;
      width: 36px; height: 36px; border-radius: 50%;
      background: white; border: 1px solid #E8E8E8;
      box-shadow: 0 2px 8px rgba(0,0,0,.12);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: box-shadow .15s;
    }
    #mp-bell-btn:hover { box-shadow: 0 4px 14px rgba(0,0,0,.18); }
    #mp-bell-badge {
      position: absolute; top: -4px; right: -4px;
      background: #FF6129; color: white;
      font-size: 10px; font-weight: 700; font-family: Inter, sans-serif;
      min-width: 16px; height: 16px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      padding: 0 4px; border: 2px solid white;
      pointer-events: none;
    }
    #mp-bell-badge.hidden { display: none; }
    #mp-notif-panel {
      position: fixed; top: 54px; right: 12px; z-index: 1200;
      width: 340px; max-height: 460px;
      background: white; border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,.18);
      border: 1px solid #E8E8E8;
      display: none; flex-direction: column;
      font-family: Inter, sans-serif;
      overflow: hidden;
    }
    #mp-notif-panel.open { display: flex; }
    .mp-notif-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px 12px; border-bottom: 1px solid #E8E8E8; flex-shrink: 0;
    }
    .mp-notif-title { font-size: 14px; font-weight: 700; color: #0D0D0D; }
    .mp-notif-read-all {
      font-size: 12px; color: #009DA5; background: none; border: none;
      cursor: pointer; font-family: Inter, sans-serif; font-weight: 500;
    }
    .mp-notif-read-all:hover { text-decoration: underline; }
    .mp-notif-list { overflow-y: auto; flex: 1; }
    .mp-notif-list::-webkit-scrollbar { width: 4px; }
    .mp-notif-list::-webkit-scrollbar-thumb { background: #E8E8E8; border-radius: 2px; }
    .mp-notif-item {
      display: flex; gap: 10px; padding: 12px 16px;
      border-bottom: 1px solid #F4F4F4; cursor: pointer;
      transition: background .1s;
    }
    .mp-notif-item:last-child { border-bottom: none; }
    .mp-notif-item:hover { background: #F4F4F4; }
    .mp-notif-item.unread { background: #f0fbfc; }
    .mp-notif-item.unread:hover { background: #e0f5f6; }
    .mp-notif-dot {
      width: 8px; height: 8px; border-radius: 50%; background: #009DA5;
      flex-shrink: 0; margin-top: 5px;
    }
    .mp-notif-dot.read { background: transparent; }
    .mp-notif-body { flex: 1; min-width: 0; }
    .mp-notif-ntitle { font-size: 13px; font-weight: 600; color: #0D0D0D; line-height: 1.3; }
    .mp-notif-nbody { font-size: 12px; color: #555; margin-top: 2px; line-height: 1.4; }
    .mp-notif-time { font-size: 11px; color: #999; margin-top: 4px; }
    .mp-notif-empty {
      padding: 36px 16px; text-align: center; color: #999; font-size: 13px;
    }
    .mp-notif-loading { padding: 24px; text-align: center; color: #999; font-size: 12px; }
  `;
  document.head.appendChild(style);

  // ── Bell button
  const btn = document.createElement('button');
  btn.id = 'mp-bell-btn';
  btn.setAttribute('aria-label', 'Notifications');
  btn.innerHTML = `
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
    <span id="mp-bell-badge" class="hidden">0</span>
  `;
  document.body.appendChild(btn);

  // ── Panel
  const panel = document.createElement('div');
  panel.id = 'mp-notif-panel';
  panel.innerHTML = `
    <div class="mp-notif-header">
      <span class="mp-notif-title">Notifications</span>
      <button class="mp-notif-read-all" id="mp-mark-all">Mark all read</button>
    </div>
    <div class="mp-notif-list" id="mp-notif-list">
      <div class="mp-notif-loading">Loading…</div>
    </div>
  `;
  document.body.appendChild(panel);

  // ── Time helper
  function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  // ── Type → link
  function notifLink(n) {
    if (n.need_id) return `need.html?id=${n.need_id}`;
    return null;
  }

  // ── Render list
  function renderList(notifs) {
    const el = document.getElementById('mp-notif-list');
    if (!notifs.length) {
      el.innerHTML = '<div class="mp-notif-empty">You\'re all caught up!</div>';
      return;
    }
    el.innerHTML = notifs.map(n => `
      <div class="mp-notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}" data-link="${notifLink(n) || ''}">
        <div class="mp-notif-dot ${n.read ? 'read' : ''}"></div>
        <div class="mp-notif-body">
          <div class="mp-notif-ntitle">${n.title}</div>
          <div class="mp-notif-nbody">${n.body}</div>
          <div class="mp-notif-time">${timeAgo(n.created_at)}</div>
        </div>
      </div>
    `).join('');

    el.querySelectorAll('.mp-notif-item').forEach(item => {
      item.addEventListener('click', async () => {
        const id = item.dataset.id;
        const link = item.dataset.link;
        try { await apiPatch(`/notifications/${id}/read`, {}); } catch(e) {}
        item.classList.remove('unread');
        item.querySelector('.mp-notif-dot')?.classList.add('read');
        if (link) window.location.href = link;
      });
    });
  }

  // ── Load & update badge
  async function loadNotifs() {
    try {
      const notifs = await apiGet('/notifications');
      const unread = notifs.filter(n => !n.read).length;
      const badge = document.getElementById('mp-bell-badge');
      if (unread > 0) {
        badge.textContent = unread > 99 ? '99+' : unread;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
      renderList(notifs);
    } catch(e) {}
  }

  // ── Toggle panel
  let panelOpen = false;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panelOpen = !panelOpen;
    panel.classList.toggle('open', panelOpen);
    if (panelOpen) loadNotifs();
  });

  // ── Mark all read
  document.getElementById('mp-mark-all').addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await apiPatch('/notifications/read-all', {});
      document.getElementById('mp-bell-badge').classList.add('hidden');
      // Re-render all as read
      document.querySelectorAll('.mp-notif-item').forEach(el => {
        el.classList.remove('unread');
        el.querySelector('.mp-notif-dot')?.classList.add('read');
      });
    } catch(e) {}
  });

  // ── Close on outside click
  document.addEventListener('click', (e) => {
    if (panelOpen && !panel.contains(e.target) && e.target !== btn) {
      panelOpen = false;
      panel.classList.remove('open');
    }
  });

  // ── Poll unread count every 60s
  async function pollCount() {
    try {
      const data = await apiGet('/notifications/unread-count');
      const badge = document.getElementById('mp-bell-badge');
      if (data.count > 0) {
        badge.textContent = data.count > 99 ? '99+' : data.count;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    } catch(e) {}
  }

  pollCount();
  setInterval(pollCount, 60000);
})();
