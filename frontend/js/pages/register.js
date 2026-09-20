document.addEventListener('DOMContentLoaded', () => {
  if (auth.isAuthenticated()) {
    location.href = 'index.html';
    return;
  }

  const form = document.getElementById('register-form');
  const errorMount = document.getElementById('error-mount');
  const submitBtn = document.getElementById('submit-btn');

  function clearFieldErrors() {
    for (const id of ['fullName', 'email', 'password']) {
      const el = document.getElementById('err-' + id);
      el.textContent = '';
      el.classList.add('hidden');
    }
  }

  function showFieldErrors(fieldErrors) {
    for (const [field, message] of Object.entries(fieldErrors)) {
      const el = document.getElementById('err-' + field);
      if (el) {
        el.textContent = message;
        el.classList.remove('hidden');
      }
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMount.innerHTML = '';
    clearFieldErrors();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    try {
      const data = await api.register({
        fullName: document.getElementById('fullName').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
        phone: document.getElementById('phone').value.trim(),
        address: document.getElementById('address').value.trim(),
      });
      auth.setSession(data.token, data.user);
      location.href = 'index.html';
    } catch (err) {
      errorMount.innerHTML = errorBannerHtml(err.message);
      if (err.fieldErrors) showFieldErrors(err.fieldErrors);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create account';
    }
  });
});
