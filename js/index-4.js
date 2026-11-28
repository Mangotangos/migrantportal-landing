(function(){
  const API = 'https://migrant-portal-production-3826.up.railway.app/impact';
  // Help given outside the portal (Thanksgiving 2026), added on top of the live counts.
  var OFFLINE_NEEDS = 10;
  var OFFLINE_FAMILIES = 6;
  function animateCount(el, target) {
    if (!el || isNaN(target)) return;
    var start = 0, duration = 1200, step = Math.ceil(target / 60);
    var timer = setInterval(function(){
      start += step;
      if (start >= target) { start = target; clearInterval(timer); }
      el.textContent = start.toLocaleString();
    }, duration / 60);
  }
  fetch(API)
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(d){
      if (!d) return;
      var totalNeeds = (d.total_active || 0) + (d.total_fulfilled || 0) + OFFLINE_NEEDS;
      animateCount(document.getElementById('stat-needs'),      totalNeeds);
      animateCount(document.getElementById('stat-responses'),  d.total_responders      || 0);
      var famVal = (d.total_families_helped || 0) + OFFLINE_FAMILIES;
      var famCard = document.getElementById('stat-families');
      if (famVal > 0) { animateCount(famCard, famVal); }
      else if (famCard && famCard.closest) { famCard.closest('.live-stat-card').style.display = 'none'; }
      animateCount(document.getElementById('stat-orgs'),       d.total_orgs            || 0);
    })
    .catch(function(){
      ['stat-needs','stat-responses','stat-families','stat-orgs'].forEach(function(id){
        var el = document.getElementById(id);
        if (el) el.textContent = '—';
      });
    });
})();
