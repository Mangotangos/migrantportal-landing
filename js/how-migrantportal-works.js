(function () {
  const API_BASE = 'https://migrant-portal-production-3826.up.railway.app';
  function countUp(el, target, suffix, duration) {
    const start = performance.now();
    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      const val = Math.floor(t * target);
      el.textContent = val.toLocaleString() + suffix;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  fetch(API_BASE + '/impact')
    .then(r => r.json())
    .then(d => {
      const total = (d.total_active || 0) + (d.total_fulfilled || 0);
      countUp(document.getElementById('stat-needs'), total, '', 1200);
      countUp(document.getElementById('stat-responders'), d.total_responders || 0, '', 1200);
      countUp(document.getElementById('stat-families'), d.total_families_helped || 0, '', 1200);
      countUp(document.getElementById('stat-orgs'), d.total_orgs || 0, '', 1200);
    })
    .catch(() => {});
})();
