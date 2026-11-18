(function () {
  'use strict';
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var BAR_SCALE_STEP = 5;
  var SEGMENT_LABEL_MIN = 8;
  var MIN_START_FOR_GROWTH = 1000;
  var REGION_COLORS = {
    'Latin America': '#0D7A8A', 'Asia': '#F59E0B', 'Africa': '#D13A06', 'Europe': '#1a2e44', 'Other': '#8d9ba3'
  };
  var CD = window.CD;
  var t = CD.t;
  var state = { data: null, scope: 'metro', lineMode: 'num' };

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
  function pctChange(a, b) { return (b - a) / a * 100; }
  function clear(id) { var n = document.getElementById(id); n.textContent = ''; return n; }
  function scopeSeries() { return state.data.series[state.scope]; }
  function windowLabel(i) { var y = state.data.series.years[i]; return (y - 4) + '-' + y; }
  function scopeName() { return t('scope.' + state.scope + '.name'); }

  /* Round a maximum up to a tidy axis (1, 2, 2.5, 5 x 10^n) with about four gridlines. */
  function niceScale(maxValue) {
    var raw = maxValue / 4;
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var step = [1, 2, 2.5, 5, 10].map(function (m) { return m * mag; }).filter(function (s) { return s >= raw; })[0];
    return { step: step, max: Math.ceil(maxValue / step) * step };
  }

  function axisLabel(value, isShare) {
    if (isShare) return value + '%';
    return value >= 1000 ? (value / 1000) + 'k' : String(value);
  }

  function fastestRegion(series) {
    var best = null;
    Object.keys(series.regions).forEach(function (name) {
      var vals = series.regions[name];
      if (vals[0] < MIN_START_FOR_GROWTH) return;
      var change = pctChange(vals[0], vals[vals.length - 1]);
      if (!best || change > best.change) best = { name: name, change: change };
    });
    return best;
  }

  function renderStats() {
    var s = scopeSeries();
    var last = s.foreign.length - 1;
    var share0 = s.foreign[0] / s.pop[0] * 100;
    var share1 = s.foreign[last] / s.pop[last] * 100;
    var fastest = fastestRegion(s);
    var tiles = [
      [num(s.foreign[last]), t('stat.now', { scope: scopeName(), window: windowLabel(last) })],
      ['+' + Math.round(pctChange(s.foreign[0], s.foreign[last])) + '%',
        t('stat.change', { window: windowLabel(0), n: num(s.foreign[last] - s.foreign[0]) })],
      [share1.toFixed(1) + '%', t('stat.share', { x: share0.toFixed(1) })]
    ];
    if (fastest) {
      tiles.push(['+' + Math.round(fastest.change) + '%', t('stat.fastest', { region: CD.region(fastest.name) })]);
    }
    var host = clear('cd-stats');
    tiles.forEach(function (tile) {
      var panel = el('div', 'cd-panel');
      panel.appendChild(el('div', 'cd-big', tile[0]));
      panel.appendChild(el('p', '', tile[1]));
      host.appendChild(panel);
    });
  }

  function barRows() {
    var rows = [];
    state.data.counties.forEach(function (c) {
      if (c.foreignBornPct === null || (state.scope === 'metro' && !c.metro)) return;
      rows.push({ name: t('bars.county', { name: c.name, st: c.state }), value: c.foreignBornPct });
    });
    state.data.areas.forEach(function (a) {
      rows.push({ name: CD.area(a.name) + ' (' + a.period + ')', value: a.foreignBornPct });
    });
    return rows.sort(function (a, b) { return b.value - a.value; });
  }

  function renderBars() {
    var host = clear('cd-bars');
    var rows = barRows();
    var top = rows.length ? rows[0].value : 0;
    var scaleMax = Math.max(BAR_SCALE_STEP, Math.ceil(top / BAR_SCALE_STEP) * BAR_SCALE_STEP);
    document.getElementById('cd-scale-note').textContent = t('bars.scale', { max: scaleMax });
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

  function renderCities() {
    var host = clear('cd-cities');
    var cities = state.data.cities.filter(function (c) { return c.foreignBornPct !== null; });
    var top = cities.length ? cities[0].foreignBornPct : 0;
    var scaleMax = Math.max(BAR_SCALE_STEP, Math.ceil(top / BAR_SCALE_STEP) * BAR_SCALE_STEP);
    cities.forEach(function (c) {
      var row = el('div', 'cd-city-row');
      var label = el('div', '', c.name + ', ' + c.state);
      label.appendChild(el('span', 'cd-stack-total', t('city.residents', { n: num(c.population) })));
      row.appendChild(label);
      var track = el('div', 'cd-bar-track');
      var fill = el('div', 'cd-bar-fill');
      fill.style.width = Math.min(100, c.foreignBornPct / scaleMax * 100) + '%';
      track.appendChild(fill);
      row.appendChild(track);
      var value = pct(c.foreignBornPct) + (c.foreignBornMoe !== null ? ' ±' + c.foreignBornMoe.toFixed(1) : '');
      row.appendChild(el('div', 'cd-bar-val', value));
      host.appendChild(row);
    });
  }

  function lineValues() {
    var s = scopeSeries();
    if (state.lineMode === 'num') return s.foreign;
    return s.foreign.map(function (f, i) { return f / s.pop[i] * 100; });
  }

  function drawGrid(svg, scale, geo, isShare) {
    for (var tick = 0; tick <= scale.max + 1e-9; tick += scale.step) {
      var y = geo.bottom - tick / scale.max * (geo.bottom - geo.top);
      svg.appendChild(svgEl('line', { x1: geo.left, x2: geo.right, y1: y, y2: y, stroke: '#d6dde1', 'stroke-dasharray': tick ? '3 4' : '0' }));
      svg.appendChild(svgEl('text', { x: geo.left - 8, y: y + 4, 'text-anchor': 'end', 'font-size': 12, fill: '#55666f' },
        axisLabel(Math.round(tick * 10) / 10, isShare)));
    }
  }

  function renderLine() {
    var host = clear('cd-line');
    var vals = lineValues();
    var isShare = state.lineMode === 'pct';
    var geo = { left: 56, right: 700, top: 24, bottom: 256 };
    var scale = niceScale(Math.max.apply(null, vals));
    var last = vals.length - 1;
    var svg = svgEl('svg', { viewBox: '0 0 720 300', role: 'img', 'aria-label': t('line.aria') });
    drawGrid(svg, scale, geo, isShare);
    var xs = vals.map(function (_, i) { return geo.left + 20 + i * ((geo.right - geo.left - 40) / last); });
    var ys = vals.map(function (v) { return geo.bottom - v / scale.max * (geo.bottom - geo.top); });
    var path = xs.map(function (x, i) { return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + ys[i].toFixed(1); }).join(' ');
    svg.appendChild(svgEl('path', { d: path + ' L' + xs[last] + ' ' + geo.bottom + ' L' + xs[0] + ' ' + geo.bottom + ' Z', fill: '#e6f7f8' }));
    svg.appendChild(svgEl('path', { d: path, fill: 'none', stroke: '#0D7A8A', 'stroke-width': 3, 'stroke-linejoin': 'round' }));
    xs.forEach(function (x, i) {
      var label = isShare ? vals[i].toFixed(1) + '%' : num(vals[i]);
      var dot = svgEl('circle', { cx: x, cy: ys[i], r: (i === 0 || i === last) ? 5 : 3, fill: '#0D7A8A' });
      dot.appendChild(svgEl('title', {}, windowLabel(i) + ': ' + label));
      svg.appendChild(dot);
      if (i % 2 === 0 || i === last) {
        svg.appendChild(svgEl('text', { x: x, y: geo.bottom + 22, 'text-anchor': 'middle', 'font-size': 12, fill: '#55666f' }, String(state.data.series.years[i])));
      }
      if (i === 0 || i === last) {
        svg.appendChild(svgEl('text', { x: x + (i ? 4 : -4), y: ys[i] - 12, 'text-anchor': i ? 'end' : 'start', 'font-size': 14, 'font-weight': 600, fill: '#14232b' }, label));
      }
    });
    host.appendChild(svg);
    document.getElementById('cd-line-note').textContent = t(isShare ? 'line.note.share' : 'line.note.num', { scope: scopeName() });
    document.getElementById('cd-mode-num').setAttribute('aria-pressed', String(!isShare));
    document.getElementById('cd-mode-pct').setAttribute('aria-pressed', String(isShare));
  }

  function renderRegionLegend(id, order) {
    var legend = clear(id);
    order.forEach(function (name) {
      var item = el('span');
      var sw = el('i', 'cd-swatch');
      sw.style.background = REGION_COLORS[name];
      item.appendChild(sw);
      item.appendChild(document.createTextNode(CD.region(name)));
      legend.appendChild(item);
    });
  }

  function renderStack() {
    var order = state.data.regionOrder;
    var s = scopeSeries();
    var years = state.data.series.years;
    renderRegionLegend('cd-stack-legend', order);
    var host = clear('cd-stack');
    var scale = niceScale(Math.max.apply(null, s.foreign));
    var geo = { left: 56, right: 700, top: 20, bottom: 262 };
    var svg = svgEl('svg', { viewBox: '0 0 720 300', role: 'img', 'aria-label': t('stack.aria') });
    drawGrid(svg, scale, geo, false);
    var slot = (geo.right - geo.left) / years.length;
    var barWidth = slot * 0.66;
    years.forEach(function (yr, i) {
      var x = geo.left + slot * i + (slot - barWidth) / 2;
      var acc = 0;
      order.forEach(function (name) {
        var v = s.regions[name][i];
        var rect = svgEl('rect', { x: x, y: geo.bottom - (acc + v) / scale.max * (geo.bottom - geo.top), width: barWidth, height: v / scale.max * (geo.bottom - geo.top), fill: REGION_COLORS[name] });
        rect.appendChild(svgEl('title', {}, windowLabel(i) + ' ' + CD.region(name) + ': ' + num(v)));
        svg.appendChild(rect);
        acc += v;
      });
      if (i % 2 === 0 || i === years.length - 1) {
        svg.appendChild(svgEl('text', { x: x + barWidth / 2, y: geo.bottom + 20, 'text-anchor': 'middle', 'font-size': 12, fill: '#55666f' }, String(yr)));
      }
    });
    host.appendChild(svg);
  }

  function changeRows(hostId, rows, maxAbs) {
    var host = clear(hostId);
    rows.forEach(function (r) {
      var row = el('div', 'cd-change-row');
      row.appendChild(el('div', '', r.name));
      var track = el('div', 'cd-bar-track');
      var fill = el('div', r.pct < 0 ? 'cd-bar-fill-coral' : 'cd-bar-fill-teal');
      fill.style.width = Math.max(2, Math.abs(r.pct) / maxAbs * 100) + '%';
      track.appendChild(fill);
      row.appendChild(track);
      var sign = r.pct < 0 ? '−' : '+';
      var value = el('div', 'cd-bar-count', sign + Math.abs(Math.round(r.pct)) + '% ');
      value.appendChild(el('small', '', '(' + sign + num(Math.abs(r.add)) + ')'));
      row.appendChild(value);
      host.appendChild(row);
    });
  }

  function renderChange() {
    var s = scopeSeries();
    var last = s.foreign.length - 1;
    var regions = state.data.regionOrder.map(function (name) {
      var vals = s.regions[name];
      return { name: CD.region(name), pct: pctChange(vals[0], vals[last]), add: vals[last] - vals[0] };
    }).sort(function (a, b) { return b.pct - a.pct; });
    var counties = state.data.countyChange.filter(function (c) { return state.scope === 'ks' || c.metro; })
      .map(function (c) { return { name: c.name + ', ' + c.state, pct: c.pct, add: c.add }; });
    var maxAbs = Math.max.apply(null, regions.concat(counties).map(function (r) { return Math.abs(r.pct); }));
    changeRows('cd-change-region', regions, maxAbs);
    changeRows('cd-change-county', counties, maxAbs);
    document.getElementById('cd-change-title').textContent = t('change.title', { window: windowLabel(0) });
  }

  function cell(tr, text) { tr.appendChild(el('td', text ? '' : 'cd-na', text || t('table.na'))); }

  function renderTable() {
    var body = clear('cd-county-body');
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

  function regionTotal(regions) {
    return Object.keys(regions).reduce(function (sum, k) { return sum + regions[k]; }, 0);
  }

  function regionBar(c, order, total) {
    var bar = el('div', 'cd-stack-bar');
    bar.setAttribute('role', 'img');
    bar.setAttribute('aria-label', t('regionmix.aria', {
      name: c.name,
      list: order.map(function (n) { return CD.region(n) + ' ' + Math.round(c.regions[n] / total * 100) + '%'; }).join(', ')
    }));
    order.forEach(function (name) {
      var share = c.regions[name] / total * 100;
      if (share <= 0) return;
      var seg = el('div', name === 'Asia' ? 'cd-seg dark-text' : 'cd-seg', share >= SEGMENT_LABEL_MIN ? Math.round(share) + '%' : '');
      seg.style.width = share + '%';
      seg.style.background = REGION_COLORS[name];
      seg.title = CD.region(name) + ': ' + num(c.regions[name]) + ' (' + share.toFixed(1) + '%)';
      bar.appendChild(seg);
    });
    return bar;
  }

  function renderRegionMix() {
    var order = state.data.regionOrder;
    renderRegionLegend('cd-region-legend', order);
    var host = clear('cd-region-mix');
    state.data.counties.forEach(function (c) {
      if (!c.regions || (state.scope === 'metro' && !c.metro)) return;
      var total = regionTotal(c.regions);
      if (!total) return;
      var row = el('div', 'cd-stack-row');
      var label = el('div', '', c.name + ', ' + c.state);
      label.appendChild(el('span', 'cd-stack-total', t('regionmix.total', { n: num(total) })));
      row.appendChild(label);
      row.appendChild(regionBar(c, order, total));
      host.appendChild(row);
    });
  }

  function shortCountry(name) { return CD.country(name.replace(/,\s*excluding.*$/i, '')); }

  function renderCountries() {
    var profile = state.data.profiles[state.scope];
    document.getElementById('cd-country-scope').textContent = t('scope.' + state.scope + '.note');
    var host = clear('cd-countries');
    var max = profile.countries.length ? profile.countries[0].count : 1;
    profile.countries.forEach(function (c, i) {
      var row = el('div', 'cd-country-row');
      row.appendChild(el('div', '', (i + 1) + '. ' + shortCountry(c.name)));
      var track = el('div', 'cd-bar-track');
      var fill = el('div', 'cd-bar-fill-teal');
      fill.style.width = (c.count / max * 100) + '%';
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(el('div', 'cd-bar-count', num(c.count)));
      host.appendChild(row);
    });
  }

  function renderLanguages() {
    var profile = state.data.profiles[state.scope];
    var host = clear('cd-languages');
    var max = profile.languages.length ? profile.languages[0].speakers : 1;
    profile.languages.forEach(function (l) {
      var row = el('div', 'cd-lang-row');
      row.appendChild(el('div', '', CD.language(l.name)));
      var track = el('div', 'cd-bar-track');
      var limited = el('div', 'cd-bar-fill-lep');
      limited.style.width = (l.limited / max * 100) + '%';
      var well = el('div', 'cd-bar-fill-well');
      well.style.width = ((l.speakers - l.limited) / max * 100) + '%';
      track.appendChild(limited);
      track.appendChild(well);
      row.appendChild(track);
      row.appendChild(el('div', 'cd-bar-count', num(l.speakers)));
      host.appendChild(row);
    });
  }

  function render() {
    document.getElementById('cd-updated').textContent =
      t('updated', { period: state.data.meta.acsPeriod, date: state.data.meta.updated });
    renderStats();
    renderBars();
    renderCities();
    renderLine();
    renderStack();
    renderChange();
    renderTable();
    renderRegionMix();
    renderCountries();
    renderLanguages();
    document.getElementById('cd-btn-metro').setAttribute('aria-pressed', String(state.scope === 'metro'));
    document.getElementById('cd-btn-ks').setAttribute('aria-pressed', String(state.scope === 'ks'));
  }

  function showError() {
    var note = document.getElementById('cd-error');
    if (note) note.hidden = false;
  }

  function bind(id, handler) { document.getElementById(id).addEventListener('click', handler); }

  function init() {
    bind('cd-btn-metro', function () { state.scope = 'metro'; render(); });
    bind('cd-btn-ks', function () { state.scope = 'ks'; render(); });
    bind('cd-mode-num', function () { state.lineMode = 'num'; renderLine(); });
    bind('cd-mode-pct', function () { state.lineMode = 'pct'; renderLine(); });
    fetch('/data/community-data.json?v=2')
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
