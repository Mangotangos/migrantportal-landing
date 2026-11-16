async function eoSubscribe(e) {
  e.preventDefault();
  if (e.target.querySelector('[name="hp_name"]').value) return;
  const email = document.getElementById('eo-email').value;
  const btn = document.getElementById('eo-btn');
  const msg = document.getElementById('eo-msg');
  msg.style.display = 'block';
  if (!navigator.onLine) {
    msg.style.color = '#f9a8a8';
    msg.textContent = 'Network error. Please try again.';
    return;
  }
  btn.disabled = true; btn.textContent = 'Subscribing…';
  try {
    const fd = new FormData();
    fd.set('field_0', email);
    fd.set('hpc4b27b6e-eb38-11e9-be00-06b4694bee2a', '');
    const r = await fetch('https://eomail5.com/form/2e646492-2bee-11f1-bc0c-4794b1b22e22', {
      method: 'POST', mode: 'cors', cache: 'no-cache', body: fd
    });
    const data = await r.json().catch(() => ({}));
    if (data.success) {
      msg.style.color = '#90e0c8';
      msg.textContent = 'Thanks for subscribing!';
      document.getElementById('eo-email').value = '';
    } else {
      msg.style.color = '#f9a8a8';
      msg.textContent = 'Something went wrong. Please try again.';
    }
  } catch (_) {
    msg.style.color = '#f9a8a8';
    msg.textContent = 'Network error. Please try again.';
  }
  btn.disabled = false; btn.textContent = 'Subscribe';
}

document.getElementById('eo-subscribe-form').addEventListener('submit', eoSubscribe);
