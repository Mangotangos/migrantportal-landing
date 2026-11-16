(function() {
  const form = document.getElementById('contactForm');
  const btn = document.getElementById('submitBtn');
  const successMsg = document.getElementById('successMsg');
  const formLoadTime = Date.now();
  let lastSubmitTime = 0;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    // 1. Honeypot check — bots fill this field
    if (document.getElementById('website').value !== '') return;

    // 2. Timing check — reject if submitted in < 3 seconds (bot speed)
    if (Date.now() - formLoadTime < 3000) {
      _mpToast('Please take a moment to fill out the form.', true);
      return;
    }

    // 3. Rate limit — 60 second cooldown between submissions
    if (lastSubmitTime && Date.now() - lastSubmitTime < 60000) {
      _mpToast('Please wait a moment before sending another message.', true);
      return;
    }

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const subject = document.getElementById('subject').value;
    const message = document.getElementById('message').value.trim();

    if (!firstName || !lastName || !email || !subject || !message) {
      _mpToast('Please fill in all required fields.', true);
      return;
    }

    // 4. reCAPTCHA token check
    const captchaToken = typeof grecaptcha !== 'undefined' ? grecaptcha.getResponse() : '';
    if (!captchaToken) {
      _mpToast('Please complete the CAPTCHA verification.', true);
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Sending…';
    lastSubmitTime = Date.now();

    try {
      const res = await fetch('https://migrant-portal-production-3826.up.railway.app/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, subject, message, captchaToken })
      });

      if (res.ok) {
        form.style.display = 'none';
        successMsg.classList.add('visible');
      } else {
        throw new Error('Server error');
      }
    } catch (_) {
      // Fallback: open mailto
      const body = encodeURIComponent(`Name: ${firstName} ${lastName}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`);
      window.location.href = `mailto:support@migrantportal.com?subject=${encodeURIComponent(subject)}&body=${body}`;
      btn.disabled = false;
      btn.textContent = 'Send Message';
      if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
    }
  });
})();
