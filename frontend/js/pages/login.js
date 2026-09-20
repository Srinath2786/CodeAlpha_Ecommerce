document.addEventListener('DOMContentLoaded', () => {
  // Already logged in? Skip straight past the login form.
  if (auth.isAuthenticated()) {
    location.href = auth.isAdmin() ? 'admin/dashboard.html' : 'account/dashboard.html';
    return;
  }

  const form = document.getElementById('login-form');
  const errorMount = document.getElementById('error-mount');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMount.innerHTML = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
      const data = await api.login({
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
      });
      auth.setSession(data.token, data.user);

      const redirect = new URLSearchParams(location.search).get('redirect');
      location.href = redirect ? decodeURIComponent(redirect) : (auth.isAdmin() ? 'admin/dashboard.html' : 'account/dashboard.html');
    } catch (err) {
      errorMount.innerHTML = errorBannerHtml(err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log in';
    }
  });
});
