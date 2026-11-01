/* EN/ES for the role dashboards (navigator-dashboard, responder-dashboard).
   Translates the rendered DOM so templates stay in English; shares the site-wide
   `mp_lang` preference with i18n.js. Vocabulary follows i18n.js ("need" = "solicitud"). */
(function () {
  'use strict';
  const STORAGE_KEY = 'mp_lang';

  const ES = {
    // chrome
    'Browse Needs': 'Ver Solicitudes', 'My Dashboard': 'Mi Panel', 'Dashboard': 'Panel', 'Overview': 'Resumen',
    'Account': 'Cuenta', 'My Profile': 'Mi Perfil', 'Profile & Settings': 'Perfil y Configuración', 'Support': 'Soporte', 'Resources': 'Recursos', 'Help & Support': 'Ayuda y Soporte', 'Sign Out': 'Cerrar Sesión', 'Profile': 'Perfil',
    'Navigator': 'Navegador', 'Responder': 'Ayudante', 'Volunteer': 'Voluntario', 'Donor': 'Donante',
    'Professional': 'Profesional', 'Church': 'Iglesia', 'can submit': 'puede enviar',
    'Actions': 'Acciones', 'Loading…': 'Cargando…', 'See all →': 'Ver todas →', 'View →': 'Ver →', 'Today': 'Hoy',
    // shared vocabulary
    'Need': 'Solicitud', 'Family': 'Familia', 'Families': 'Familias', 'Category': 'Categoría', 'Urgency': 'Urgencia',
    'Location': 'Ubicación', 'Submitted': 'Enviadas', 'Responses': 'Respuestas', 'Fulfilled': 'Completada',
    'Urgent': 'Urgente', 'High': 'Alta', 'Medium': 'Media', 'Low': 'Baja', 'Closed': 'Cerrada', 'Pending': 'Pendiente',
    'Recent Activity': 'Actividad Reciente', 'Nothing yet': 'Aún nada',
    'Activity from your needs and responses will appear here.': 'La actividad de tus solicitudes y respuestas aparecerá aquí.',
    'All time': 'Total', 'Needs': 'Solicitudes', 'Submit': 'Enviar', 'Browse': 'Explorar',
    // categories
    'Housing': 'Vivienda', 'Food': 'Alimentos', 'Clothing': 'Ropa', 'Furniture': 'Muebles', 'Transportation': 'Transporte',
    'Employment': 'Empleo', 'Legal': 'Legal', 'Medical': 'Médica', 'Education': 'Educación', 'Translation': 'Traducción', 'Other': 'Otra',
    // navigator
    'Navigator Dashboard': 'Panel del Navegador',
    "Manage your families and the needs you've submitted": 'Administra tus familias y las solicitudes que has enviado',
    '+ Submit a Need': '+ Enviar una Solicitud', 'My Needs': 'Mis Solicitudes', 'My Recent Needs': 'Mis Solicitudes Recientes',
    "Every need you've submitted, with who has offered to help": 'Todas las solicitudes que has enviado, con quién se ofreció a ayudar',
    'Search needs…': 'Buscar solicitudes…',
    'Families on your caseload. Names are visible only to you.': 'Familias de tu lista de casos. Los nombres solo los ves tú.',
    '+ Add a Family': '+ Agregar una Familia', 'Add a Family': 'Agregar una Familia', 'New family': 'Nueva familia',
    'Family name': 'Nombre de la familia', 'Country of origin': 'País de origen', 'Language': 'Idioma', 'Adults': 'Adultos',
    'Children': 'Niños', 'Save family': 'Guardar familia', 'Country': 'País', 'Household': 'Hogar',
    "You haven't submitted a need yet": 'Aún no has enviado una solicitud',
    'Add a family, post a real need from your caseload, and get matched with a local responder.': 'Agrega una familia, publica una necesidad real de tu lista de casos y conéctate con un ayudante local.',
    'Submit Your First Need': 'Envía Tu Primera Solicitud',
    'Added by you': 'Agregadas por ti', 'Open Needs': 'Solicitudes Abiertas', 'Active now': 'Activas ahora',
    'Awaiting Response': 'Esperando Respuesta', 'No responder yet': 'Aún sin ayudante', 'Awaiting response': 'Esperando respuesta',
    'Mark fulfilled': 'Marcar como completada', 'Saving…': 'Guardando…',
    'No needs yet': 'Aún no hay solicitudes', 'Add a family, then post the first need from your caseload.': 'Agrega una familia y publica la primera solicitud de tu lista de casos.',
    'No families yet': 'Aún no hay familias', 'Add a family to attach needs to it. Only you can see their names.': 'Agrega una familia para vincularle solicitudes. Solo tú ves sus nombres.',
    'No responders yet.': 'Aún no hay ayudantes.', 'Could not load responders. Try again.': 'No se pudieron cargar los ayudantes. Inténtalo de nuevo.',
    'Could not load your needs. Please refresh.': 'No se pudieron cargar tus solicitudes. Actualiza la página.',
    'You submitted': 'Enviaste', ' offered to help with ': ' se ofreció a ayudar con ', ' marked fulfilled': ' marcada como completada',
    'Mark this need as fulfilled? Responders who helped will be notified.': '¿Marcar esta solicitud como completada? Se avisará a los ayudantes que colaboraron.',
    // responder
    'Responder Dashboard': 'Panel del Ayudante',
    'Find families nearby and follow the help you have offered': 'Encuentra familias cercanas y sigue la ayuda que has ofrecido',
    'Browse All Needs': 'Ver Todas las Solicitudes', 'Help a Family Nearby': 'Ayuda a una Familia Cercana',
    'Needs Near You': 'Solicitudes Cerca de Ti', 'Near You': 'Cerca de Ti', 'My Responses': 'Mis Respuestas',
    'My Submitted Needs': 'Mis Solicitudes Enviadas', 'Shifts': 'Turnos', 'Donations': 'Donaciones',
    'Every need you have offered to help with': 'Todas las solicitudes en las que te has ofrecido a ayudar',
    'Needs you submitted, with who has offered to help': 'Solicitudes que enviaste, con quién se ofreció a ayudar',
    "You haven't responded to a need yet": 'Aún no has respondido a ninguna solicitud',
    'As soon as a family near you needs help, you will see it here and get a notification.': 'Apenas una familia cerca de ti necesite ayuda, la verás aquí y recibirás una notificación.',
    'Set My Location': 'Establecer Mi Ubicación', 'Open Near You': 'Abiertas Cerca de Ti', 'Families helped': 'Familias ayudadas',
    'Saved': 'Guardadas', 'Bookmarked needs': 'Solicitudes guardadas', 'Set your location': 'Establece tu ubicación', 'In your state': 'En tu estado',
    'Distance': 'Distancia', 'My offer': 'Mi oferta', 'Respond →': 'Responder →', 'Offered': 'Ofrecida', 'In progress': 'En progreso',
    'Done, awaiting navigator': 'Hecha, esperando al navegador',
    'No open needs near you yet': 'Aún no hay solicitudes abiertas cerca de ti',
    'Change the distance in your profile': 'Cambia la distancia en tu perfil',
    'Add your city so we can find needs near you': 'Agrega tu ciudad para encontrar solicitudes cerca de ti',
    'We need your city and state to match you with families nearby and to notify you.': 'Necesitamos tu ciudad y estado para conectarte con familias cercanas y notificarte.',
    'Set my location →': 'Establecer mi ubicación →',
    'No responses yet': 'Aún no hay respuestas', 'Offers you make show up here so you can follow them to the end.': 'Las ofertas que hagas aparecerán aquí para que les des seguimiento hasta el final.',
    'Add your city in your profile to see needs near you': 'Agrega tu ciudad en tu perfil para ver solicitudes cerca de ti',
    'Open needs in your state': 'Solicitudes abiertas en tu estado',
    'No submitted needs yet': 'Aún no hay solicitudes enviadas', 'Needs you submit will appear here.': 'Las solicitudes que envíes aparecerán aquí.',
    'Families you add will appear here.': 'Las familias que agregues aparecerán aquí.',
    'Could not load needs near you. Browse all needs instead.': 'No se pudieron cargar las solicitudes cercanas. Mejor explora todas las solicitudes.',
    'New need posted': 'Nueva solicitud publicada a', 'New need posted:': 'Nueva solicitud publicada:', ' from you: ': ' de ti: ',
    'You offered to help with': 'Te ofreciste a ayudar con', ' fulfilled, thank you': ' completada, gracias',
    // notification bell panel
    'Notifications': 'Notificaciones', 'Mark all read': 'Marcar todo como leído',
  };

  // Dynamic strings: [pattern, replacement-fn]
  const plural = (n, one, many) => (Number(n) === 1 ? one : many);
  const PATTERNS = [
    [/^(\d+) responders?( ▾)?$/, (m) => `${m[1]} ${plural(m[1], 'ayudante', 'ayudantes')}${m[2] || ''}`],
    [/^Show (\d+) responders?$/, (m) => `Mostrar ${m[1]} ${plural(m[1], 'ayudante', 'ayudantes')}`],
    [/^Within (\d+) mi$/, (m) => `A menos de ${m[1]} mi`],
    [/^(\d+)d ago$/, (m) => `hace ${m[1]} d`],
    [/^(\d+)A (\d+)C$/, (m) => `${m[1]}A ${m[2]}N`],
    [/^We will notify you within (\d+) miles when a family needs help\.$/, (m) => `Te avisaremos a menos de ${m[1]} millas cuando una familia necesite ayuda.`],
    [/^Open needs within (\d+) miles of (.*)$/, (m) => `Solicitudes abiertas a menos de ${m[1]} millas de ${m[2]}`],
    [/^Responder · (.*)$/, (m) => `Ayudante · ${m[1].split(' · ').map(translateCore).join(' · ')}`],
    [/^Could not mark that need fulfilled: (.*)$/, (m) => `No se pudo marcar como completada: ${m[1]}`],
    [/^Could not save that family: (.*)$/, (m) => `No se pudo guardar la familia: ${m[1]}`],
  ];

  function translateCore(core) {
    if (Object.prototype.hasOwnProperty.call(ES, core)) return ES[core];
    for (const [re, fn] of PATTERNS) {
      const m = core.match(re);
      if (m) return fn(m);
    }
    if (core.includes(' · ')) {
      const parts = core.split(' · ').map(translateCore);
      return parts.join(' · ');
    }
    const emoji = core.match(/^([^A-Za-zÀ-ÿ0-9<]+\s)(.+)$/); // "👗 Clothing"
    if (emoji) return emoji[1] + translateCore(emoji[2]);
    return core;
  }

  // Keeps leading/trailing whitespace; some keys intentionally carry it (' from you: ').
  function translate(raw) {
    if (Object.prototype.hasOwnProperty.call(ES, raw)) return ES[raw];
    const lead = raw.match(/^\s*/)[0];
    const trail = raw.match(/\s*$/)[0];
    const core = raw.trim();
    if (!core) return raw;
    const out = translateCore(core);
    return out === core ? raw : lead + out + trail;
  }

  const lang = () => { try { return localStorage.getItem(STORAGE_KEY) === 'es' ? 'es' : 'en'; } catch (_) { return 'en'; } };
  window.tr = (s) => (lang() === 'es' ? translate(s) : s);

  const nodeState = new WeakMap();   // text node -> { orig, shown }
  const attrState = new WeakMap();   // element -> { attr: { orig, shown } }
  const ATTRS = ['placeholder', 'aria-label', 'title'];
  let everTranslated = false;
  let observer = null;
  let scheduled = false;

  function applyNodes(toEs) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && /^(SCRIPT|STYLE|NOSCRIPT)$/.test(n.parentElement.tagName)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const st = nodeState.get(n);
      const orig = st && n.nodeValue === st.shown ? st.orig : n.nodeValue; // code changed it -> new original
      const target = toEs ? translate(orig) : orig;
      if (target !== orig) everTranslated = true;
      if (n.nodeValue !== target) n.nodeValue = target;
      nodeState.set(n, { orig, shown: target });
    }
  }

  function applyAttrs(toEs) {
    document.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(',')).forEach((el) => {
      const states = attrState.get(el) || {};
      ATTRS.forEach((a) => {
        if (!el.hasAttribute(a)) return;
        const cur = el.getAttribute(a);
        const st = states[a];
        const orig = st && cur === st.shown ? st.orig : cur;
        const target = toEs ? translate(orig) : orig;
        if (target !== orig) everTranslated = true;
        if (cur !== target) el.setAttribute(a, target);
        states[a] = { orig, shown: target };
      });
      attrState.set(el, states);
    });
  }

  function apply() {
    scheduled = false;
    const toEs = lang() === 'es';
    if (!toEs && !everTranslated) return;
    if (observer) observer.disconnect();
    document.documentElement.lang = toEs ? 'es' : 'en';
    applyNodes(toEs);
    applyAttrs(toEs);
    document.querySelectorAll('.mp-lang-toggle').forEach((b) => { b.textContent = toEs ? 'EN' : 'ES'; b.setAttribute('aria-label', toEs ? 'Cambiar a inglés' : 'Cambiar a español'); });
    if (observer) observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function schedule() { if (!scheduled) { scheduled = true; setTimeout(apply, 0); } }

  window.setDashLang = (l) => {
    try { localStorage.setItem(STORAGE_KEY, l); } catch (_) { /* storage unavailable */ }
    apply();
  };
  window.toggleDashLang = () => window.setDashLang(lang() === 'es' ? 'en' : 'es');
  window.applyDashLang = apply;

  function init() {
    observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    apply();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
