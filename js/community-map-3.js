(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var COLORS = ['#e6f7f8', '#a9dde2', '#5fbcc6', '#1d93a2', '#0a5560'];
  var NA_COLOR = '#e3e7ea';
  var DEFAULT_COUNTY = '20209';
  var KC_VIEW = 'kc';
  var KS_VIEW = 'ks';
  var RANK_SIZE = 6;
  var MIN_GROWTH_BASE = 500;
  var PEAK_NEAR_END = 2;
  var SHORT = { '20209': 'Wyandotte', '20091': 'Johnson', '20103': 'Leavenworth', '20121': 'Miami', '29095': 'Jackson', '29047': 'Clay', '29165': 'Platte', '29037': 'Cass' };
  /* Vertical nudge (px) for county names so they sit clear of the city dots in the crowded middle. */
  var LABEL_DY = { '20209': -30, '20091': 54, '29095': 46, '29047': -34, '29165': -26 };
  /* Cities that get a name on the map: [text, side of the dot, vertical nudge]. */
  var CITY_LABELS = {
    'Kansas City,KS': ['KCK', 'end', 0], 'Kansas City,MO': ['KCMO', 'start', 0], 'Overland Park,KS': ['Overland Park', 'start', -9],
    'Olathe,KS': ['Olathe', 'end', 8], 'Independence,MO': ['Independence', 'start', 0], "Lee's Summit,MO": ["Lee's Summit", 'start', 0]
  };
  var CD = window.CD;
  var t = CD.t;
  var MEASURES = {
    fb: { label: t('measure.fb.label'), breaks: [3, 6, 10, 20], note: t('measure.fb.note'), get: function (v) { return v.fb; } },
    ne: { label: t('measure.ne.label'), breaks: [5, 10, 20, 40], note: t('measure.ne.note'), get: function (v) { return v.ne; } },
    gr: { label: t('measure.gr.label'), breaks: [10, 25, 40, 55], note: t('measure.gr.note'), get: function (v) { return v.growth; } }
  };
  var state = { data: null, view: KC_VIEW, measure: 'fb', selected: DEFAULT_COUNTY, city: null, cities: true };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function sv(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function byId(id) { return document.getElementById(id); }
  function clear(id) { var n = byId(id); n.textContent = ''; return n; }
  function fmt(n) { return n.toLocaleString('en-US'); }
  function stateOf(fips) { return fips.slice(0, 2) === '20' ? 'KS' : 'MO'; }
  function nameOf(fips) { return state.data.values[fips].name + ', ' + stateOf(fips); }

  function valueText(v, measure) {
    if (v === null || v === undefined) return t('detail.noData');
    if ((measure || state.measure) === 'gr') return (v >= 0 ? '+' : '−') + Math.abs(Math.round(v)) + '%';
    return v.toFixed(1) + '%';
  }

  function colorFor(v) {
    if (v === null || v === undefined) return NA_COLOR;
    var breaks = MEASURES[state.measure].breaks;
    var i = 0;
    while (i < breaks.length && v >= breaks[i]) i++;
    return COLORS[i];
  }

  function items() {
    var measure = MEASURES[state.measure];
    return state.data.views[state.view].counties.filter(function (c) { return state.data.values[c.id]; })
      .map(function (c) { return { c: c, v: measure.get(state.data.values[c.id]), data: state.data.values[c.id] }; });
  }

  function addHatchDefs(svg) {
    var defs = sv('defs', {});
    var pat = sv('pattern', { id: 'cdm-hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    pat.appendChild(sv('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: '#14232b', 'stroke-opacity': '0.35', 'stroke-width': 1.6 }));
    defs.appendChild(pat);
    svg.appendChild(defs);
  }

  function countyPath(it) {
    var core = state.data.core.indexOf(it.c.id) >= 0 && state.view === KC_VIEW;
    var selected = state.selected === it.c.id && !state.city;
    var p = sv('path', {
      d: it.c.d, fill: colorFor(it.v), tabindex: 0, role: 'img', 'data-id': it.c.id,
      'class': 'cdm-county' + (core ? ' core' : '') + (selected ? ' sel' : ''),
      'aria-label': t('detail.title', { name: nameOf(it.c.id) }) + ': ' + MEASURES[state.measure].label + ' ' + valueText(it.v) + (it.data.flag ? t('rough.suffix') : '')
    });
    var pick = function () { selectCounty(it.c.id); };
    p.addEventListener('mouseenter', pick);
    p.addEventListener('focus', pick);
    p.addEventListener('click', pick);
    return p;
  }

  function drawCounties(svg) {
    var list = items();
    list.forEach(function (it) { svg.appendChild(countyPath(it)); });
    list.forEach(function (it) {
      if (it.data.flag && it.v !== null) svg.appendChild(sv('path', { d: it.c.d, fill: 'url(#cdm-hatch)', 'class': 'cdm-hatch' }));
    });
    [].slice.call(svg.querySelectorAll('.core, .sel')).forEach(function (n) { svg.appendChild(n); });
  }

  function drawLabels(svg) {
    if (state.view !== KC_VIEW) return;
    items().forEach(function (it) {
      if (!SHORT[it.c.id]) return;
      var dark = it.v !== null && it.v >= MEASURES[state.measure].breaks[2];
      svg.appendChild(sv('text', { x: it.c.cx, y: it.c.cy + 4 + (LABEL_DY[it.c.id] || 0), 'class': 'cdm-lbl' + (dark ? ' dark' : '') }, SHORT[it.c.id]));
    });
  }

  function cityDot(c) {
    var radius = 3 + Math.sqrt(c.pop) / 110;
    var key = c.name + ',' + c.state;
    var dot = sv('circle', {
      cx: c.x, cy: c.y, r: radius, fill: state.measure === 'fb' ? colorFor(c.fb) : '#1a2e44', tabindex: 0, role: 'img', 'data-key': key,
      'class': 'cdm-dot' + (state.city === key ? ' sel' : ''),
      'aria-label': t('city.aria', { name: c.name, st: c.state, pct: c.fb.toFixed(1), n: fmt(c.pop) })
    });
    var pick = function () { selectCity(c); };
    dot.addEventListener('mouseenter', pick);
    dot.addEventListener('focus', pick);
    dot.addEventListener('click', pick);
    return { dot: dot, radius: radius, key: key };
  }

  function drawCities(svg) {
    if (state.view !== KC_VIEW || !state.cities) return;
    state.data.cities.slice().sort(function (a, b) { return b.pop - a.pop; }).forEach(function (c) {
      var made = cityDot(c);
      svg.appendChild(made.dot);
      var label = CITY_LABELS[made.key];
      if (!label) return;
      var offset = label[1] === 'end' ? -(made.radius + 3) : made.radius + 3;
      svg.appendChild(sv('text', { x: c.x + offset, y: c.y + 3.5 + label[2], 'class': 'cdm-lbl city', 'text-anchor': label[1] }, label[0]));
    });
  }

  function drawMap() {
    var view = state.data.views[state.view];
    var svg = clear('cdm-map');
    svg.setAttribute('viewBox', '0 0 ' + view.w + ' ' + view.h);
    addHatchDefs(svg);
    drawCounties(svg);
    drawLabels(svg);
    drawCities(svg);
    byId('cdm-cities-wrap').hidden = state.view !== KC_VIEW;
  }

  function legendItem(swatchClass, text, color) {
    var s = el('span');
    var sw = el('i', swatchClass);
    if (color) sw.style.background = color;
    s.appendChild(sw);
    s.appendChild(document.createTextNode(text));
    return s;
  }

  function drawLegend() {
    var measure = MEASURES[state.measure];
    var b = measure.breaks;
    var lg = clear('cdm-legend');
    [t('legend.under', { x: b[0] }), b[0] + '-' + b[1] + '%', b[1] + '-' + b[2] + '%', b[2] + '-' + b[3] + '%', t('legend.over', { x: b[3] })].forEach(function (text, i) {
      lg.appendChild(legendItem('', text, COLORS[i]));
    });
    lg.appendChild(legendItem('hat', t('legend.rough')));
    var showDots = state.view === KC_VIEW && state.cities;
    if (showDots) lg.appendChild(legendItem('dotkey', t(state.measure === 'fb' ? 'legend.citySized' : 'legend.city')));
    byId('cdm-note').textContent = t('map.note', { label: measure.label, note: measure.note }) +
      (showDots && state.measure !== 'fb' ? t('map.dotsNote') : '');
  }

  function rankOf(fips, getter) {
    var vals = items().map(function (i) { return { id: i.c.id, v: getter(i.data) }; })
      .filter(function (x) { return x.v !== null && x.v !== undefined; })
      .sort(function (a, b) { return b.v - a.v; });
    var idx = vals.findIndex(function (x) { return x.id === fips; });
    return idx < 0 ? t('rank.na') : t('rank.format', { i: idx + 1, n: vals.length });
  }

  function windowText(i) { var y = state.data.years[i]; return (y - 4) + '-' + y; }

  function sparkText(x, y, anchor, text, strong) {
    return sv('text', { x: x, y: y, 'text-anchor': anchor, 'font-size': 10, 'font-weight': strong ? 600 : 400, fill: strong ? '#14232b' : '#55666f' }, text);
  }

  /* Line with the first and last values labeled, years underneath, and the peak marked when the line peaks before the end. */
  function sparkline(series) {
    var pts = series.filter(function (v) { return v !== null; });
    if (pts.length < 2) return null;
    var max = Math.max.apply(null, pts), min = Math.min.apply(null, pts);
    var pad = (max - min) * 0.15 || 1;
    var L = 8, R = 232, T = 26, B = 64, n = pts.length, last = n - 1;
    var x = function (i) { return L + i * (R - L) / last; };
    var y = function (v) { return B - (v - (min - pad)) / ((max + pad) - (min - pad)) * (B - T); };
    var svg = sv('svg', { viewBox: '0 0 240 96', role: 'img', 'aria-label': t('spark.aria', { a: fmt(pts[0]), w0: windowText(0), b: fmt(pts[last]), w1: windowText(state.data.years.length - 1) }) });
    var d = pts.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ');
    svg.appendChild(sv('path', { d: d, fill: 'none', stroke: '#0D7A8A', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }));
    var peak = pts.indexOf(max);
    var endLabelY = y(pts[last]) - 8;
    if (peak > 0 && peak < last && max > pts[last]) {
      svg.appendChild(sv('circle', { cx: x(peak), cy: y(max), r: 3, fill: '#ffffff', stroke: '#0D7A8A', 'stroke-width': 1.8 }));
      var nearEnd = last - peak <= PEAK_NEAR_END;
      if (nearEnd) endLabelY = y(pts[last]) + 16;
      svg.appendChild(nearEnd ? sparkText(x(peak) - 7, y(max) + 3, 'end', fmt(max), false)
        : sparkText(x(peak), y(max) - 7, 'middle', fmt(max), false));
    }
    svg.appendChild(sv('circle', { cx: x(0), cy: y(pts[0]), r: 3.5, fill: '#0D7A8A' }));
    svg.appendChild(sv('circle', { cx: x(last), cy: y(pts[last]), r: 3.5, fill: '#0D7A8A' }));
    svg.appendChild(sparkText(L, y(pts[0]) - 8, 'start', fmt(pts[0]), true));
    svg.appendChild(sparkText(R, endLabelY, 'end', fmt(pts[last]), true));
    svg.appendChild(sparkText(L, 88, 'start', windowText(0), false));
    svg.appendChild(sparkText(R, 88, 'end', windowText(state.data.years.length - 1), false));
    return svg;
  }

  function changeText(v) {
    var diff = v.fbn - v.series[0];
    var sign = diff < 0 ? '−' : '+';
    var pct = v.growth === null ? '' : ' (' + valueText(v.growth, 'gr') + ')';
    return t('spark.change', { sign: sign, n: fmt(Math.abs(diff)), pct: pct });
  }

  function sparkBox(v) {
    var sp = sparkline(v.series);
    if (!sp) return null;
    var box = el('div', 'cdm-spark');
    box.appendChild(el('div', 'cdm-spark-change', changeText(v)));
    box.appendChild(el('div', 'cd-small', t('spark.title', { w: windowText(0) })));
    box.appendChild(sp);
    box.appendChild(el('p', 'cdm-note', t(v.flag ? 'spark.flagged' : 'spark.normal')));
    return box;
  }

  function countyDetail(host, fips) {
    var v = state.data.values[fips];
    var measure = MEASURES[state.measure];
    host.appendChild(el('h3', '', t('detail.title', { name: nameOf(fips) })));
    host.appendChild(el('div', 'cdm-big', valueText(measure.get(v))));
    host.appendChild(el('div', 'cd-small', measure.label));
    var dl = el('dl');
    var na = t('rank.na');
    [[t('detail.bornAbroad'), v.fb.toFixed(1) + '% ±' + v.moe.toFixed(1)], [t('detail.nonEnglish'), v.ne === null ? na : v.ne.toFixed(1) + '%'],
      [t('detail.population'), fmt(v.pop)], [t('detail.foreignBorn'), fmt(v.fbn)], [t('detail.growth'), valueText(v.growth, 'gr')],
      [t('detail.birthplace'), v.top ? CD.country(v.top.name) + ' (' + v.top.pct + '%)' : na]].forEach(function (r) {
      dl.appendChild(el('dt', '', r[0]));
      dl.appendChild(el('dd', '', r[1]));
    });
    host.appendChild(dl);
    host.appendChild(el('p', 'cdm-note', t('detail.rank', {
      share: rankOf(fips, function (d) { return d.fb; }), count: rankOf(fips, function (d) { return d.fbn; })
    })));
    if (v.flag) host.appendChild(el('div', 'cdm-warn', t('detail.warn')));
    var spark = sparkBox(v);
    if (spark) host.appendChild(spark);
  }

  function cityDetail(host, c) {
    host.appendChild(el('h3', '', c.name + ', ' + c.state));
    host.appendChild(el('div', 'cdm-big', c.fb.toFixed(1) + '%'));
    host.appendChild(el('div', 'cd-small', t('city.born')));
    var dl = el('dl');
    [[t('city.moe'), '±' + c.moe.toFixed(1)], [t('city.residentsLabel'), fmt(c.pop)]].forEach(function (r) {
      dl.appendChild(el('dt', '', r[0]));
      dl.appendChild(el('dd', '', r[1]));
    });
    host.appendChild(dl);
    host.appendChild(el('p', 'cdm-note', t('city.note')));
  }

  function copyLink(btn) {
    var url = location.href;
    var label = t('copy.label');
    var done = function () { btn.textContent = t('copy.done'); setTimeout(function () { btn.textContent = label; }, 1800); };
    var fallback = function () { btn.textContent = url; };
    try { navigator.clipboard.writeText(url).then(done, fallback); } catch (e) { fallback(); }
  }

  function drawDetail() {
    var host = clear('cdm-detail');
    var city = state.city && state.data.cities.filter(function (c) { return c.name + ',' + c.state === state.city; })[0];
    if (city) cityDetail(host, city);
    else if (state.selected && state.data.values[state.selected]) countyDetail(host, state.selected);
    else host.appendChild(el('p', 'cd-small', t('hint')));
    var btn = el('button', 'cdm-btn', t('copy.label'));
    btn.type = 'button';
    btn.addEventListener('click', function () { copyLink(btn); });
    host.appendChild(btn);
  }

  /* Rough estimates are not ranked, and growth needs a real starting count so tiny counties do not top the list. */
  function rankable(item) {
    if (item.v === null || item.data.flag) return false;
    return state.measure !== 'gr' || (item.data.series[0] || 0) >= MIN_GROWTH_BASE;
  }

  function drawRank() {
    byId('cdm-rank-title').textContent = t('rank.title', { label: MEASURES[state.measure].label });
    var ol = clear('cdm-rank');
    items().filter(rankable).sort(function (a, b) { return b.v - a.v; }).slice(0, RANK_SIZE).forEach(function (i) {
      var li = el('li');
      li.appendChild(el('span', '', nameOf(i.c.id)));
      li.appendChild(el('strong', '', valueText(i.v)));
      li.addEventListener('click', function () { selectCounty(i.c.id); });
      ol.appendChild(li);
    });
  }

  function writeHash() {
    try { history.replaceState(null, '', '#county-' + state.selected); } catch (e) { /* the link is optional */ }
  }

  function refreshSelection() {
    [].slice.call(document.querySelectorAll('#cdm-map .cdm-county')).forEach(function (n) {
      n.classList.toggle('sel', !state.city && n.getAttribute('data-id') === state.selected);
    });
    [].slice.call(document.querySelectorAll('#cdm-map .cdm-dot')).forEach(function (n) {
      n.classList.toggle('sel', n.getAttribute('data-key') === state.city);
    });
    var sel = document.querySelector('#cdm-map .cdm-county.sel');
    if (sel) sel.parentNode.appendChild(sel);
    drawDetail();
  }

  function selectCounty(fips) { state.selected = fips; state.city = null; writeHash(); refreshSelection(); }
  function selectCity(c) { state.city = c.name + ',' + c.state; refreshSelection(); }

  function press(ids, active) {
    ids.forEach(function (id) { byId(id).setAttribute('aria-pressed', String(id === active)); });
  }

  function render() {
    drawMap();
    drawLegend();
    drawDetail();
    drawRank();
    press(['cdm-fb', 'cdm-ne', 'cdm-gr'], 'cdm-' + state.measure);
  }

  function inView(fips) {
    return state.data.views[state.view].counties.some(function (c) { return c.id === fips; });
  }

  function setView(view) {
    state.view = view;
    state.city = null;
    if (!inView(state.selected)) state.selected = DEFAULT_COUNTY;
    render();
  }

  function readHash() {
    var m = /^#county-(\d{5})$/.exec(location.hash || '');
    if (!m || !state.data.values[m[1]]) return;
    var inKc = state.data.views[KC_VIEW].counties.some(function (c) { return c.id === m[1]; });
    if (!inKc && state.view === KC_VIEW) byId('cd-btn-ks').click();
    state.selected = m[1];
    state.city = null;
  }

  function bind() {
    byId('cd-btn-metro').addEventListener('click', function () { if (state.data) setView(KC_VIEW); });
    byId('cd-btn-ks').addEventListener('click', function () { if (state.data) setView(KS_VIEW); });
    ['fb', 'ne', 'gr'].forEach(function (k) {
      byId('cdm-' + k).addEventListener('click', function () { state.measure = k; render(); });
    });
    byId('cdm-show-cities').addEventListener('change', function (e) { state.cities = e.target.checked; render(); });
    window.addEventListener('hashchange', function () { readHash(); render(); });
  }

  function showError() { byId('cdm-error').hidden = false; }

  function init() {
    bind();
    fetch('/data/community-map.json?v=1')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) { state.data = data; readHash(); render(); })
      .catch(function (err) {
        if (window.console) console.warn('community-map load failed', err);
        showError();
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
