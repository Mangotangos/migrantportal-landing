/* Admin announcements banner for the role dashboards (navigator, responder, org).
   Needs api.js loaded first (apiGet). Injects itself at the top of <main class="main">. */
(function () {
  const DISMISS_KEY = 'mp_dismissed_anns';

  function readDismissed() {
    try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]'); } catch (_) { return []; }
  }

  function dismiss(id, card, host) {
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify([...readDismissed(), id])); } catch (_) { /* storage blocked: banner returns next load */ }
    card.remove();
    if (!host.children.length) host.style.display = 'none';
  }

  function buildCard(announcement, host) {
    const isUrgent = Boolean(announcement.urgent);
    const card = document.createElement('div');
    card.style.cssText = `display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-radius:10px;border:1.5px solid ${isUrgent ? '#FECACA' : '#BFDBFE'};background:${isUrgent ? '#FEF2F2' : '#EFF6FF'}`;

    const icon = document.createElement('span');
    icon.style.cssText = 'font-size:18px;flex-shrink:0';
    icon.textContent = isUrgent ? '⚠️' : '📢';

    const title = document.createElement('div');
    title.style.cssText = `font-weight:700;font-size:13px;color:${isUrgent ? '#B91C1C' : '#1D4ED8'};margin-bottom:2px`;
    title.textContent = announcement.title || '';

    const body = document.createElement('div');
    body.style.cssText = 'font-size:12px;color:#374151;line-height:1.5';
    body.textContent = announcement.body || '';

    const content = document.createElement('div');
    content.style.flex = '1';
    content.append(title, body);

    const close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss announcement');
    close.style.cssText = 'background:none;border:none;cursor:pointer;font-size:18px;color:#9CA3AF;flex-shrink:0;padding:0';
    close.textContent = '×';
    close.addEventListener('click', () => dismiss(announcement.id, card, host));

    card.append(icon, content, close);
    return card;
  }

  async function loadAnnouncements() {
    const main = document.querySelector('main.main');
    if (!main || typeof apiGet !== 'function') return;
    try {
      const dismissed = readDismissed();
      const visible = (await apiGet('/announcements/active')).filter(a => !dismissed.includes(a.id));
      if (!visible.length) return;
      const host = document.createElement('div');
      host.id = 'annBanner';
      host.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-bottom:14px';
      visible.forEach(a => host.appendChild(buildCard(a, host)));
      main.prepend(host);
    } catch (err) {
      console.error('loadAnnouncements failed:', err);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadAnnouncements);
  else loadAnnouncements();
})();
