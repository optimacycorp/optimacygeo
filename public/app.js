const form = document.getElementById('contactForm');
const statusEl = document.getElementById('formStatus');
const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.getElementById('siteNav');
const mainContent = document.getElementById('main-content');

function syncHeaderState() {
  document.body.classList.toggle('header-scrolled', window.scrollY > 18);
}

function closeMenu() {
  if (!menuToggle || !siteNav) {
    return;
  }

  siteNav.classList.remove('is-open');
  menuToggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('nav-open');
}

if (menuToggle && siteNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('nav-open', isOpen);
  });

  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });

  document.addEventListener('click', (event) => {
    if (!siteNav.classList.contains('is-open')) {
      return;
    }

    if (!siteNav.contains(event.target) && !menuToggle.contains(event.target)) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && siteNav.classList.contains('is-open')) {
      closeMenu();
      menuToggle.focus();
    }
  });
}

if (form && statusEl) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    statusEl.textContent = 'Sending your project details...';
    statusEl.classList.remove('error');

    const formData = new FormData(form);
    const supportNeeds = formData.getAll('supportNeeds');
    const payload = Object.fromEntries(formData.entries());
    payload.supportNeeds = supportNeeds;
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
      if (mainContent) {
        statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } catch (error) {
      statusEl.textContent = error.message || 'Unable to send your message right now.';
      statusEl.classList.add('error');
    } finally {
      submitButton.disabled = false;
    }
  });
}

syncHeaderState();
window.addEventListener('scroll', syncHeaderState, { passive: true });
