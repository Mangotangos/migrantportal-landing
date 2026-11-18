(function () {
  'use strict';
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var BAR_SCALE_STEP = 5;
  var GROWTH_TICK_STEP = 50000;
  var state = { data: null, scope: 'metro' };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function svgEl(tag, attrs, text) {
    var n = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function pct(v) { return v === null || v === undefined ? null : v.toFixed(1) + '%'; }
  function num(v) { return v === null || v === undefined ? null : v.toLocaleString('en-US'); }

  function barRows(data, scope) {
    var rows = [];
    data.counties.forEach(function (c) {
      if (c.foreignBornPct === null) return;
      if (scope === 'metro' && !c.metro) return;
      rows.push({ name: c.name + ' County, ' + c.state, value: c.foreignBornPct });
    });
    data.areas.forEach(function (a) {
      rows.push({ name: a.name + ' (' + a.period + ')', value: a.foreignBornPct });
    });
    return rows.sort(function (a, b) { return b.value - a.value; });
  }

  function renderBars() {
    var host = document.getElementById('cd-bars');
    host.textContent = '';
    var rows = barRows(state.data, state.scope);
    var top = rows.length ? rows[0].value : 0;
    var scaleMax = Math.max(BAR_SCALE_STEP, Math.ceil(top / BAR_SCALE_STEP) * BAR_SCALE_STEP);
    document.getElementById('cd-scale-note').textContent =
      'All bars use one scale, 0 to ' + scaleMax + ' percent. Statewide and metro figures cover slightly different years because the Census releases estimates on a rolling basis.';
    rows.forEach(function (r) {
      var row = el('div', 'cd-bar-row');
      row.appendChild(el('div', 'cd-bar-name', r.name));
      var track = el('div', 'cd-bar-track');
      var fill = el('div', 'cd-bar-fill');
      fill.style.width = Math.min(100, r.value / scaleMax * 100) + '%';
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(el('div', 'cd-bar-val', pct(r.value)));
      host.appendChild(row);
    });
  }

  function cell(tr, text) {
    var td = el('td', text ? '' : 'cd-na', text || 'Not yet loaded');
    tr.appendChild(td);
  }

  function renderTable() {
    var body = document.getElementById('cd-county-body');
    body.textContent = '';
    state.data.counties.forEach(function (c) {
      if (state.scope === 'metro' && !c.metro) return;
      var tr = document.createElement('tr');
      tr.appendChild(el('td', '', c.name));
      tr.appendChild(el('td', '', c.state));
      var fb = pct(c.foreignBornPct);
      if (fb && c.foreignBornMoe !== null) fb += ' ±' + c.foreignBornMoe.toFixed(1);
      cell(tr, fb);
      cell(tr, pct(c.nonEnglishPct));
      cell(tr, num(c.population));
      body.appendChild(tr);
    });
  }

  function renderGrowth() {
    var points = state.data.growth;
    var host = document.getElementById('cd-growth');
    host.textContent = '';
    if (!points || points.length < 2) return;
    var W = 560, H = 250, left = 60, right = 540, base = 200, top = 20;
    var max = Math.ceil(Math.max.apply(null, points.map(function (p) { return p.value; })) / 50000) * 50000;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Kansas City metro foreign-born population by year' });
    for (var tick = 0; tick <= max; tick += GROWTH_TICK_STEP) {
      var y = base - tick / max * (base - top);
      svg.appendChild(svgEl('line', { x1: left, x2: right, y1: y, y2: y, stroke: '#d6dde1', 'stroke-dasharray': tick === 0 ? '0' : '3 4' }));
      svg.appendChild(svgEl('text', { x: left - 8, y: y + 4, 'text-anchor': 'end', 'font-size': 12, fill: '#55666f' }, tick / 1000 + 'k'));
    }
    var slot = (right - left) / points.length;
    var barW = Math.min(110, slot * 0.5);
    points.forEach(function (p, i) {
      var h = p.value / max * (base - top);
      var x = left + slot * i + (slot - barW) / 2;
      var last = i === points.length - 1;
      svg.appendChild(svgEl('rect', { x: x, y: base - h, width: barW, height: h, fill: last ? '#0D7A8A' : '#e6f7f8', stroke: '#0D7A8A' }));
      svg.appendChild(svgEl('text', { x: x + barW / 2, y: base - h - 8, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 600, fill: '#14232b' }, num(p.value)));
      svg.appendChild(svgEl('text', { x: x + barW / 2, y: base + 20, 'text-anchor': 'middle', 'font-size': 13, fill: '#55666f' }, String(p.year)));
    });
    host.appendChild(svg);
  }

  function renderOrigins() {
    var host = document.getElementById('cd-origins');
    host.textContent = '';
    (state.data.originsKansas || []).forEach(function (name) { host.appendChild(el('li', '', name)); });
  }

  function renderMeta() {
    document.getElementById('cd-updated').textContent =
      'Census ACS ' + state.data.meta.acsPeriod + '. Last updated ' + state.data.meta.updated + '.';
  }

  function render() {
    renderMeta();
    renderBars();
    renderTable();
    renderGrowth();
    renderOrigins();
    document.getElementById('cd-btn-metro').setAttribute('aria-pressed', String(state.scope === 'metro'));
    document.getElementById('cd-btn-ks').setAttribute('aria-pressed', String(state.scope === 'ks'));
  }

  function setScope(scope) { state.scope = scope; render(); }

  function showError() {
    var note = document.getElementById('cd-error');
    if (note) note.hidden = false;
  }

  function init() {
    document.getElementById('cd-btn-metro').addEventListener('click', function () { setScope('metro'); });
    document.getElementById('cd-btn-ks').addEventListener('click', function () { setScope('ks'); });
    fetch('/data/community-data.json?v=1')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) { state.data = data; render(); })
      .catch(function (err) {
        if (window.console) console.warn('community-data load failed', err);
        showError();
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
