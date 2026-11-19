// Mobile menu for the marketing pages. Replaces inline onclick handlers that toggled/closed .mobile-nav:
// data-nav="toggle" on the hamburger, data-nav="close" on the close button and menu links.
// The hamburger's aria-expanded mirrors the menu state so screen readers announce open/closed.
function syncExpanded(menu) {
  const isOpen = menu.classList.contains('open');
  document.querySelectorAll('[data-nav="toggle"]').forEach(function (button) {
    button.setAttribute('aria-expanded', String(isOpen));
  });
}

document.addEventListener('click', function (event) {
  const trigger = event.target.closest('[data-nav]');
  if (!trigger) return;
  const menu = document.querySelector('.mobile-nav');
  if (!menu) return;
  if (trigger.dataset.nav === 'toggle') menu.classList.toggle('open');
  else if (trigger.dataset.nav === 'close') menu.classList.remove('open');
  syncExpanded(menu);
});

const initialMenu = document.querySelector('.mobile-nav');
if (initialMenu) syncExpanded(initialMenu);
