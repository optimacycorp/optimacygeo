const form = document.getElementById('contactForm');
const statusEl = document.getElementById('formStatus');
const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.getElementById('siteNav');

if (menuToggle && siteNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

if (form && statusEl) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    statusEl.textContent = 'Sending your project details...';
    statusEl.classList.remove('error');

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Something went wrong.');
      }

      form.reset();
      statusEl.textContent = result.message;
    } catch (error) {
      statusEl.textContent = error.message || 'Unable to send your message right now.';
      statusEl.classList.add('error');
    } finally {
      submitButton.disabled = false;
    }
  });
}
