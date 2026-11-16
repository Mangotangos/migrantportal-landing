// Delegated event actions. Replaces inline on* attributes so pages can run without 'unsafe-inline'.
//
//   data-action="name"   click      data-change="name"   change     data-input="name"   input
//   data-submit="name"   submit     data-keydown="name"  keydown    data-href="/path"   click -> navigate
//   data-args='[...]'    JSON args; {"$":"this"} = the element, {"$":"event"} = the event,
//                        {"$":"value"} / {"$":"checked"} = the element's value / checked
//   data-aN="x"          string arg at position N (used for server data, so it never needs JSON escaping)
//   data-nN="5"          numeric arg at position N
//   data-prevent         preventDefault on the event (was `return false`)
//
// Only functions passed to mpRegister() can run, so markup can never reach arbitrary globals.
// Handlers run per element from the target upward, so event.stopPropagation() still stops outer handlers.
(function () {
  // back / reload / print are the only built-ins (they replaced history.back(), location.reload(), window.print()).
  const registry = Object.assign(Object.create(null), {
    back: function () { history.back(); },
    reload: function () { location.reload(); },
    print: function () { window.print(); },
    // data-target="id": hide that element / scroll it into view. stop: event.stopPropagation() (pass the event).
    hide: function () { const t = document.getElementById(this.dataset.target); if (t) t.style.display = 'none'; },
    scrollTo: function () { const t = document.getElementById(this.dataset.target); if (t) t.scrollIntoView({ behavior: 'smooth' }); },
    stop: function (event) { event.stopPropagation(); },
  });

  // Lets tests (and the console) check that markup names a registered action; a typo would otherwise be a silent no-op.
  window.mpHasAction = function (name) { return name in registry; };

  window.mpRegister = function (fns) {
    Object.assign(registry, fns);
  };

  function resolveArgs(el, event) {
    let args = [];
    if (el.dataset.args) {
      try { args = JSON.parse(el.dataset.args); } catch (_) { args = []; }
    }
    args = args.map(function (a) {
      if (!a || typeof a !== 'object') return a;
      if (a.$ === 'this') return el;
      if (a.$ === 'event') return event;
      if (a.$ === 'value') return el.value;
      if (a.$ === 'checked') return el.checked;
      return a;
    });
    Object.keys(el.dataset).forEach(function (key) {
      const m = /^([an])(\d+)$/.exec(key);
      if (!m) return;
      args[Number(m[2])] = m[1] === 'n' ? Number(el.dataset[key]) : el.dataset[key];
    });
    return args;
  }

  function dispatch(event, attr) {
    const selector = '[data-' + attr + ']' + (attr === 'action' ? ', [data-href]' : '');
    for (let el = event.target.closest ? event.target.closest(selector) : null; el; el = el.parentElement && el.parentElement.closest(selector)) {
      if (el.hasAttribute('data-prevent')) event.preventDefault();
      const name = el.dataset[attr];
      if (name) {
        const fn = registry[name];
        if (fn) {
          const result = fn.apply(el, resolveArgs(el, event));
          if (result === false) event.preventDefault();
        }
      } else if (attr === 'action' && el.dataset.href) {
        window.location.href = el.dataset.href;
      }
      if (event.cancelBubble) return;
    }
  }

  ['click', 'change', 'input', 'submit', 'keydown'].forEach(function (type) {
    const attr = type === 'click' ? 'action' : type;
    document.addEventListener(type, function (event) { dispatch(event, attr); });
  });
})();
