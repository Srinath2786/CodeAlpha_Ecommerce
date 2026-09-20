// Simple localStorage-backed auth state. No framework, no build step.
const authAppRoot = /\/(shop|account|checkout|admin)\//.test(location.pathname) ? '../' : '';

const auth = {
  getUser() {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  },
  getToken() {
    return localStorage.getItem('token');
  },
  isAuthenticated() {
    return !!this.getToken();
  },
  isAdmin() {
    return this.getUser()?.role === 'ADMIN';
  },
  setSession(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },
  updateUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    location.href = `${authAppRoot}index.html`;
  },
};

// Call at the top of any page that requires login. Redirects to login.html,
// preserving the page the user was trying to reach.
function requireAuth() {
  if (!auth.isAuthenticated()) {
    const redirect = encodeURIComponent(location.pathname.split('/').pop() + location.search);
    location.href = `${authAppRoot}login.html?redirect=${redirect}`;
    return false;
  }
  return true;
}

// Call at the top of any admin-only page.
function requireAdmin() {
  if (!requireAuth()) return false;
  if (!auth.isAdmin()) {
    location.href = `${authAppRoot}index.html`;
    return false;
  }
  return true;
}
