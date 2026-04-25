/**
 * MigrantPortal i18n — EN/ES toggle
 * Strategy: cache original English text nodes on first run, translate via
 * lookup dictionary. Explicit data-i18n attributes win over auto-match.
 * No substring matching — only full text-node matches to avoid surprises.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'mp_lang';
  const DATA_ATTR = 'data-i18n';
  const PLACEHOLDER_ATTR = 'data-i18n-placeholder';
  const TITLE_ATTR = 'data-i18n-title';
  const ORIG_CACHE = new WeakMap();
  const ORIG_ATTR_CACHE = new WeakMap();

  // Case-insensitive lookup map (built once)
  let ES_LC = null;
  function esLookup(key) {
    if (!ES_LC) {
      ES_LC = {};
      Object.keys(ES).forEach(function (k) { ES_LC[k.toLowerCase()] = ES[k]; });
    }
    return ES[key] || ES_LC[(key || '').toLowerCase()];
  }

  const ES = {
    // ── Nav (shared)
    'Home': 'Inicio',
    'How It Works': 'Cómo Funciona',
    'Our Vision': 'Nuestra Visión',
    'Find Help': 'Buscar Ayuda',
    'Browse Requests': 'Ver Solicitudes',
    'FAQ': 'Preguntas Frecuentes',
    'Contact': 'Contacto',
    'Sign In': 'Iniciar Sesión',
    'Sign Out': 'Cerrar Sesión',
    'Sign out': 'Cerrar sesión',
    'Sign up': 'Regístrate',
    'Log In': 'Iniciar Sesión',
    'Log in': 'Iniciar sesión',
    'Register': 'Registrarse',
    'Dashboard': 'Panel',
    'Profile': 'Perfil',
    'Submit a Need': 'Enviar una Solicitud',
    'Submit Need': 'Enviar Solicitud',
    'Donate': 'Donar',
    'Donate Now': 'Donar Ahora',
    'Get Started': 'Comenzar',
    'Learn More': 'Conoce Más',
    'Open menu': 'Abrir menú',
    'Close menu': 'Cerrar menú',
    'Skip to main content': 'Saltar al contenido principal',
    'Main navigation': 'Navegación principal',
    'Navigation menu': 'Menú de navegación',
    'Back to Homepage': 'Volver a la página principal',
    'Back to Home': 'Volver al inicio',

    // ── Index / landing
    'Help a migrant family now': 'Ayuda a una familia migrante ahora',
    'Help a Migrant Family Now': 'Ayuda a una familia migrante ahora',
    'The Immigrant Needs Network Connecting Families with Help': 'La red de necesidades de inmigrantes que conecta familias con ayuda',
    'MigrantPortal — Migrant Resource Platform & Immigrant Needs Network': 'MigrantPortal — Plataforma de recursos para migrantes y red de necesidades',
    'Where Help Meets Hope': 'Donde la Ayuda Se Encuentra con la Esperanza',
    'Meet a need': 'Conoce una necesidad',
    'Respond to an urgent need in minutes': 'Responde a una necesidad urgente en minutos',
    'Share a need': 'Comparte una necesidad',
    'Post what your family needs': 'Publica lo que necesita tu familia',
    'Give a gift': 'Haz una donación',
    'Fund a specific need directly': 'Financia una necesidad específica directamente',
    'MigrantPortal — Help a Migrant Family Now': 'MigrantPortal — Ayuda a una familia migrante ahora',
    'Connecting migrants in need with faith communities, volunteers, and donors.': 'Conectamos migrantes en necesidad con comunidades de fe, voluntarios y donantes.',
    'MigrantPortal connects migrants in need with faith communities, volunteers, and donors. Submit needs, respond with compassion, and track impact — all in one app.': 'MigrantPortal conecta a migrantes en necesidad con comunidades de fe, voluntarios y donantes. Envía solicitudes, responde con compasión y sigue el impacto — todo en una sola aplicación.',
    'Our Mission': 'Nuestra Misión',
    'How it Works': 'Cómo Funciona',
    'For Migrants': 'Para Migrantes',
    'For Responders': 'Para Ayudantes',
    'For Sponsors': 'Para Patrocinadores',
    'For Donors': 'Para Donantes',
    'For Churches': 'Para Iglesias',
    'For Faith Communities': 'Para Comunidades de Fe',
    'Ready to help?': '¿Listo para ayudar?',
    'Ready to make a difference?': '¿Listo para hacer la diferencia?',
    'Join us': 'Únete a nosotros',
    'Join our community': 'Únete a nuestra comunidad',
    'See how you can help': 'Mira cómo puedes ayudar',
    'Impact': 'Impacto',
    'Our Story': 'Nuestra Historia',
    'Press Kit': 'Kit de Prensa',
    'Privacy Policy': 'Política de Privacidad',
    'Privacy': 'Privacidad',
    'Terms of Service': 'Términos de Servicio',
    'Terms': 'Términos',
    'Child Safety': 'Protección Infantil',
    'All Rights Reserved': 'Todos los derechos reservados',
    'Follow us': 'Síguenos',

    // ── Login
    'Welcome back': 'Bienvenido de nuevo',
    'Welcome Back': 'Bienvenido de Nuevo',
    'Sign in to your account': 'Inicia sesión en tu cuenta',
    'Email': 'Correo electrónico',
    'Email address': 'Correo electrónico',
    'Email Address': 'Correo Electrónico',
    'Password': 'Contraseña',
    'Forgot password?': '¿Olvidaste tu contraseña?',
    'Forgot your password?': '¿Olvidaste tu contraseña?',
    'Remember me': 'Recuérdame',
    'New to MigrantPortal?': '¿Nuevo en MigrantPortal?',
    "Don't have an account?": '¿No tienes una cuenta?',
    'Create an account': 'Crear una cuenta',
    'Create Account': 'Crear Cuenta',
    'Sign in': 'Iniciar sesión',
    'Already have an account?': '¿Ya tienes una cuenta?',

    // ── Register
    'Create Your Account': 'Crea tu cuenta',
    'Create your account': 'Crea tu cuenta',
    'Join MigrantPortal': 'Únete a MigrantPortal',
    'Full Name': 'Nombre Completo',
    'First Name': 'Nombre',
    'Last Name': 'Apellido',
    'Confirm Password': 'Confirmar Contraseña',
    'Phone': 'Teléfono',
    'Phone Number': 'Número de Teléfono',
    'I am a...': 'Soy un/a...',
    'Select your role': 'Selecciona tu rol',
    'Migrant in Need': 'Migrante en necesidad',
    'Migrant': 'Migrante',
    'Navigator': 'Navegador',
    'Responder': 'Ayudante',
    'Sponsor': 'Patrocinador',
    'Donor': 'Donante',
    'Connector': 'Conector',
    'I agree to the': 'Acepto los',
    'and': 'y',
    'Next': 'Siguiente',
    'Back': 'Atrás',
    'Previous': 'Anterior',
    'Continue': 'Continuar',
    'Submit': 'Enviar',
    'Cancel': 'Cancelar',
    'Save': 'Guardar',
    'Edit': 'Editar',
    'Delete': 'Eliminar',
    'Close': 'Cerrar',
    'Search': 'Buscar',

    // ── Pending page
    'Application Submitted!': '¡Solicitud enviada!',
    'Application Submitted': 'Solicitud enviada',
    'What happens next': 'Qué sigue ahora',
    "Check": 'Revisa',
    'your email': 'tu correo electrónico',
    'for updates on your application': 'para actualizaciones sobre tu solicitud',
    'Our team reviews your application (usually 1–2 business days)': 'Nuestro equipo revisa tu solicitud (normalmente 1–2 días hábiles)',
    "You'll receive an email once your account is approved": 'Recibirás un correo cuando tu cuenta sea aprobada',
    'Sign in to access your dashboard and start serving': 'Inicia sesión para acceder a tu panel y comenzar a servir',
    'Verify Your Email': 'Verifica tu correo',
    'Resend Verification Email': 'Reenviar correo de verificación',
    "We'll email you once your application has been reviewed. Check your inbox (and spam folder) so you don't miss it.": 'Te enviaremos un correo cuando tu solicitud sea revisada. Revisa tu bandeja de entrada (y carpeta de spam) para no perdértelo.',
    'Questions? Email us at': '¿Preguntas? Escríbenos a',

    // ── Contact
    'Get in Touch': 'Ponte en Contacto',
    'Contact Us': 'Contáctanos',
    'Have questions?': '¿Tienes preguntas?',
    "We'd love to hear from you": 'Nos encantaría saber de ti',
    'Your Name': 'Tu Nombre',
    'Name': 'Nombre',
    'Subject': 'Asunto',
    'Message': 'Mensaje',
    'Send Message': 'Enviar Mensaje',
    'Send': 'Enviar',
    'Thank you!': '¡Gracias!',
    'Your message has been sent.': 'Tu mensaje ha sido enviado.',

    // ── Find Help
    'Find Help Near You': 'Encuentra Ayuda Cerca de Ti',
    'Find help near you': 'Encuentra ayuda cerca de ti',
    'Search by city, state, or ZIP': 'Buscar por ciudad, estado o código postal',
    'Search nonprofits': 'Buscar organizaciones',
    'No organizations found': 'No se encontraron organizaciones',
    'Loading...': 'Cargando...',
    'Loading': 'Cargando',
    'Organizations': 'Organizaciones',
    'Services': 'Servicios',
    'All Categories': 'Todas las Categorías',
    'Visit Website': 'Visitar Sitio Web',
    'Call': 'Llamar',

    // ── Submit Need
    'Submit Your Need': 'Envía tu Solicitud',
    'Tell us what you need': 'Cuéntanos qué necesitas',
    'Describe what you need': 'Describe lo que necesitas',
    'Description': 'Descripción',
    'Urgency': 'Urgencia',
    'Category': 'Categoría',
    'Location': 'Ubicación',
    'ZIP Code': 'Código Postal',
    'Urgent': 'Urgente',
    'High': 'Alta',
    'Medium': 'Media',
    'Low': 'Baja',
    'Food': 'Alimentos',
    'Shelter': 'Refugio',
    'Clothing': 'Ropa',
    'Medical': 'Médico',
    'Transportation': 'Transporte',
    'Legal': 'Legal',
    'Education': 'Educación',
    'Other': 'Otro',
    'Submit Request': 'Enviar Solicitud',

    // ── Requests / browse
    'All Requests': 'Todas las Solicitudes',
    'Open Requests': 'Solicitudes Abiertas',
    'Filter by': 'Filtrar por',
    'Filter': 'Filtrar',
    'Status': 'Estado',
    'All': 'Todas',
    'Open': 'Abierta',
    'In Progress': 'En Proceso',
    'Fulfilled': 'Completada',
    'Completed': 'Completada',
    'Closed': 'Cerrada',
    'No requests found': 'No se encontraron solicitudes',
    'Respond': 'Responder',
    'I can help': 'Puedo ayudar',
    'View details': 'Ver detalles',
    'View Details': 'Ver Detalles',
    'See all': 'Ver todas',

    // ── Need detail
    'Need Details': 'Detalles de la Solicitud',
    'Posted by': 'Publicado por',
    'Posted': 'Publicado',
    'ago': 'atrás',
    'Print QR': 'Imprimir Código QR',
    'Print QR Code': 'Imprimir Código QR',
    'Scan to help': 'Escanea para ayudar',
    'Share this need': 'Comparte esta solicitud',

    // ── Thank-you / donations
    'Thank you for your gift!': '¡Gracias por tu donación!',
    'Thank you for your donation!': '¡Gracias por tu donación!',
    'Your generosity makes a real difference.': 'Tu generosidad hace una verdadera diferencia.',
    'You helped meet a real need today.': 'Hoy ayudaste a cubrir una necesidad real.',
    'Donate again': 'Donar de nuevo',
    'Share this': 'Compartir esto',
    'Share on Facebook': 'Compartir en Facebook',
    'Share on Twitter': 'Compartir en Twitter',
    'Share via Email': 'Compartir por correo',
    'Return to dashboard': 'Volver al panel',

    // ── Offline / misc
    "You're offline": 'Estás sin conexión',
    'Saved pages available.': 'Páginas guardadas disponibles.',
    'Try again': 'Intentar de nuevo',
    'Retry': 'Reintentar',
    'Something went wrong': 'Algo salió mal',
    'Please try again.': 'Por favor intenta de nuevo.',

    // ── Language toggle itself
    'Español': 'Español',
    'English': 'English',
    'Switch to Spanish': 'Cambiar a español',
    'Switch to English': 'Cambiar a inglés'
  };

  function cacheOriginal(el) {
    if (!ORIG_CACHE.has(el)) {
      ORIG_CACHE.set(el, el.textContent);
    }
  }

  function cacheOriginalAttr(el, attr) {
    if (!ORIG_ATTR_CACHE.has(el)) ORIG_ATTR_CACHE.set(el, {});
    const store = ORIG_ATTR_CACHE.get(el);
    if (!(attr in store)) store[attr] = el.getAttribute(attr);
  }

  function translatableElements() {
    return document.querySelectorAll(
      'h1, h2, h3, h4, h5, h6, p, li, span, button, label, a, th, td, figcaption, legend, summary, strong, em'
    );
  }

  function applyLang(lang) {
    const toEs = lang === 'es';
    document.documentElement.lang = toEs ? 'es' : 'en';

    // Explicit data-i18n wins
    document.querySelectorAll('[' + DATA_ATTR + ']').forEach(function (el) {
      cacheOriginal(el);
      const key = el.getAttribute(DATA_ATTR) || ORIG_CACHE.get(el);
      const translated = esLookup(key);
      if (toEs && translated) {
        el.textContent = translated;
      } else {
        el.textContent = ORIG_CACHE.get(el);
      }
    });

    // Auto-match on text content — leaf elements AND text nodes inside mixed content
    translatableElements().forEach(function (el) {
      if (el.hasAttribute(DATA_ATTR)) return;

      if (el.children.length === 0) {
        // Pure text leaf — replace whole textContent
        const txt = (el.textContent || '').trim();
        if (!txt) return;
        cacheOriginal(el);
        const original = (ORIG_CACHE.get(el) || '').trim();
        const translated = esLookup(original);
        if (toEs && translated) {
          el.textContent = translated;
        } else {
          el.textContent = ORIG_CACHE.get(el);
        }
      } else {
        // Mixed content (e.g. <p> with <a> inside) — walk direct text nodes only
        el.childNodes.forEach(function (node) {
          if (node.nodeType !== Node.TEXT_NODE) return;
          const txt = (node.textContent || '').trim();
          if (!txt) return;
          if (!ORIG_CACHE.has(node)) ORIG_CACHE.set(node, node.textContent);
          const original = (ORIG_CACHE.get(node) || '').trim();
          const translated = esLookup(original);
          if (toEs && translated) {
            node.textContent = translated;
          } else {
            node.textContent = ORIG_CACHE.get(node);
          }
        });
      }
    });

    // Placeholders
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(function (el) {
      cacheOriginalAttr(el, 'placeholder');
      const orig = (ORIG_ATTR_CACHE.get(el) || {}).placeholder || '';
      if (toEs && esLookup(orig)) {
        el.setAttribute('placeholder', esLookup(orig));
      } else if (orig) {
        el.setAttribute('placeholder', orig);
      }
    });

    // aria-label on nav/buttons (for a11y)
    document.querySelectorAll('[aria-label]').forEach(function (el) {
      cacheOriginalAttr(el, 'aria-label');
      const orig = (ORIG_ATTR_CACHE.get(el) || {})['aria-label'] || '';
      if (toEs && esLookup(orig)) {
        el.setAttribute('aria-label', esLookup(orig));
      } else if (orig) {
        el.setAttribute('aria-label', orig);
      }
    });

    // Update toggle button label
    document.querySelectorAll('.mp-lang-toggle').forEach(function (btn) {
      btn.textContent = toEs ? 'EN' : 'ES';
      btn.setAttribute('aria-label', toEs ? 'Switch to English' : 'Switch to Spanish');
    });

    try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) { /* ignored */ }
  }

  function injectToggle() {
    // Inject once into .nav-right (desktop) and .mobile-nav (first child area)
    const target =
      document.querySelector('.nav-right') ||
      document.querySelector('nav');
    if (!target) return;
    if (target.querySelector('.mp-lang-toggle')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mp-lang-toggle';
    btn.setAttribute('aria-label', 'Switch to Spanish');
    btn.textContent = 'ES';
    btn.style.cssText = [
      'background:transparent',
      'border:1.5px solid #0D7A8A',
      'color:#0D7A8A',
      'font-size:12px',
      'font-weight:700',
      'padding:6px 10px',
      'border-radius:6px',
      'cursor:pointer',
      'margin-right:6px',
      'min-height:32px',
      'min-width:36px',
      'letter-spacing:0.5px'
    ].join(';');
    btn.addEventListener('click', function () {
      const current = (document.documentElement.lang || 'en').toLowerCase();
      applyLang(current === 'es' ? 'en' : 'es');
    });

    // Insert before the first child to appear leftmost within nav-right
    target.insertBefore(btn, target.firstChild);
  }

  function init() {
    injectToggle();
    let initial = 'en';
    try { initial = localStorage.getItem(STORAGE_KEY) || 'en'; } catch (_) { /* ignored */ }
    if (initial === 'es') applyLang('es');
    else applyLang('en');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-apply whenever dynamic content is rendered (requests/dashboard lists)
  window.mpReapplyI18n = function () {
    const current = (document.documentElement.lang || 'en').toLowerCase();
    applyLang(current === 'es' ? 'es' : 'en');
  };
})();
