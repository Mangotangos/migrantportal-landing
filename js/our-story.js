(function () {
  const API = 'https://migrant-portal-production-3826.up.railway.app/impact';
  // The band starts hidden and is shown only when real totals arrive.
  fetch(API)
    .then(function (r) {
      if (!r.ok) throw new Error('impact request failed: ' + r.status);
      return r.json();
    })
    .then(function (d) {
      const offline = window.MP_OFFLINE;
      const totals = {
        'os-families': d.total_families_helped + offline.families,
        'os-responders': d.total_responders,
        'os-needs': d.total_fulfilled + offline.needs,
        'os-orgs': d.total_orgs,
      };
      if (!Object.values(totals).every(Number.isFinite)) throw new Error('impact response incomplete');
      Object.keys(totals).forEach(function (id) {
        document.getElementById(id).textContent = totals[id].toLocaleString('en-US');
      });
      document.getElementById('os-stats').hidden = false;
    })
    .catch(function (err) {
      console.warn('Our Story stats hidden:', err.message);
    });
})();
