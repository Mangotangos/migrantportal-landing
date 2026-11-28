// Show login/join or dashboard link
const user = getUser();
if (user) {
  document.getElementById('login-link').textContent = user.name?.split(' ')[0] || 'Dashboard';
  document.getElementById('login-link').href = 'dashboard';
  document.getElementById('join-link').style.display = 'none';
}

const CAT_EMOJI = { housing:'🏠', food:'🍽️', clothing:'👗', furniture:'🛋️', transportation:'🚗', employment:'💼', legal:'⚖️', medical:'🏥', education:'📚', translation:'🌐', childcare:'👶', financial:'💰', other:'📦' };

async function loadImpact() {
  try {
    const d = await apiGet('/impact');

    // Stats
    document.getElementById('s-fulfilled').textContent = d.total_fulfilled;
    // +6 families helped outside the portal (Thanksgiving 2026). Keep in sync with index-4.js.
    const OFFLINE_FAMILIES = 6;
    document.getElementById('s-families').textContent = d.total_families_helped + OFFLINE_FAMILIES;
    document.getElementById('s-active').textContent = d.total_active;
    document.getElementById('s-responders').textContent = d.total_responders;
    document.getElementById('s-rate').textContent = d.fulfillment_rate + '%';
    const fundsUsd = (d.total_funds_disbursed_cents || 0) / 100;
    document.getElementById('s-funds').textContent = '$' + fundsUsd.toLocaleString('en-US', { maximumFractionDigits: 0 });
    document.getElementById('s-items').textContent = d.total_items_delivered || 0;
    document.getElementById('s-services').textContent = d.total_service_offers || 0;

    // Recent wins
    const wins = document.getElementById('wins-grid');
    if (!d.recent_wins.length) {
      wins.innerHTML = '<div class="empty">No fulfilled needs yet — be the first to help!</div>';
    } else {
      wins.innerHTML = d.recent_wins.map(n => `
        <a href="need?id=${encodeURIComponent(n.id)}" class="win-card" style="display:block;text-decoration:none;color:inherit">
          <div class="win-title">${CAT_EMOJI[n.category]||'📦'} ${esc(n.title)}</div>
          <div class="win-meta">${esc(n.city)}, ${esc(n.state)}</div>
          ${n.outcome_note ? `<div class="win-note">"${esc(n.outcome_note)}"</div>` : ''}
        </a>`).join('');
    }

    // Category bars
    const maxCat = Math.max(...d.categories.map(c => c.count), 1);
    document.getElementById('cat-bars').innerHTML = d.categories.length
      ? d.categories.map(c => `
        <div class="bar-row">
          <div class="bar-label">${CAT_EMOJI[c.category]||''} ${esc(c.category)}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.round(c.count/maxCat*100)}%"></div></div>
          <div class="bar-count">${c.count}</div>
        </div>`).join('')
      : '<div class="empty">No data yet.</div>';

    // City bars
    const maxCity = Math.max(...d.top_cities.map(c => c.count), 1);
    document.getElementById('city-bars').innerHTML = d.top_cities.length
      ? d.top_cities.map(c => `
        <div class="city-row">
          <div class="city-label">📍 ${esc(c.city)}, ${esc(c.state)}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.round(c.count/maxCity*100)}%"></div></div>
          <div class="bar-count">${c.count}</div>
        </div>`).join('')
      : '<div class="empty">No data yet.</div>';

    // Top responders
    document.getElementById('resp-list').innerHTML = d.top_responders.length
      ? d.top_responders.map((r, i) => `
        <div class="resp-row">
          <div class="resp-rank ${i===0?'gold':''}">${i+1}</div>
          <div><div class="resp-name">${esc(r.name)}</div><div class="resp-org">${esc(r.org_name||'Independent')}</div></div>
          <div class="resp-count">${r.count} response${r.count!==1?'s':''}</div>
        </div>`).join('')
      : '<div class="empty">No responses yet.</div>';

    document.getElementById('page-loading').style.display = 'none';
    document.getElementById('page-content').style.display = '';
  } catch(e) {
    document.getElementById('page-loading').textContent = 'Failed to load impact data.';
  }
}

loadImpact();
