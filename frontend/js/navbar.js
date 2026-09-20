function renderNavbar() {
  const mount = document.getElementById('navbar');
  if (!mount) return;

  const user = auth.getUser();
  const isAuth = auth.isAuthenticated();
  const isAdmin = auth.isAdmin();
  const appRoot = /\/(shop|account|checkout|admin)\//.test(location.pathname) ? '../' : '';

  mount.innerHTML = `
    <header class="navbar">
      <div class="navbar-inner">
        <a href="${appRoot}index.html" class="brand"><span class="brand-dot"></span>ShopWave</a>

        <nav class="nav-links">
          <a href="${appRoot}products.html">Shop</a>
          <a href="${appRoot}categories.html">Categories</a>
          <a href="${appRoot}products.html?sortBy=price&direction=asc">Deals</a>
          ${isAdmin ? `<a href="${appRoot}admin-products.html">Manage Products</a><a href="${appRoot}admin-orders.html">Manage Orders</a>` : ''}
        </nav>

        <div class="nav-right">
          <a href="${appRoot}cart.html" class="cart-link" aria-label="Cart">
            🛒
            <span id="cart-badge" class="cart-badge hidden">0</span>
          </a>

          ${
            isAuth
              ? `
            <div class="user-menu">
              <button class="user-chip" id="user-menu-btn">
                <span class="avatar">${(user?.fullName || 'U').charAt(0).toUpperCase()}</span>
                <span>${(user?.fullName || '').split(' ')[0]}</span>
              </button>
              <div class="dropdown" id="user-dropdown">
                <a href="${isAdmin ? `${appRoot}admin/dashboard.html` : `${appRoot}account/dashboard.html`}">Dashboard</a>
                <a href="${appRoot}profile.html">Profile</a>
                <a href="${appRoot}orders.html">My Orders</a>
                <a href="${appRoot}wishlist.html">Wishlist</a>
                <button class="logout" id="logout-btn">Logout</button>
              </div>
            </div>`
              : `
            <a href="${appRoot}login.html" class="btn btn-secondary btn-sm">Login</a>
            <a href="${appRoot}register.html" class="btn btn-primary btn-sm">Sign up</a>`
          }
        </div>
      </div>
    </header>
  `;

  if (isAuth) {
    const btn = document.getElementById('user-menu-btn');
    const dropdown = document.getElementById('user-dropdown');
    btn.addEventListener('click', () => dropdown.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (!btn.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.remove('open');
    });
    document.getElementById('logout-btn').addEventListener('click', () => auth.logout());

    refreshCartBadge();
  }
}

async function refreshCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  try {
    const cart = await api.getCart();
    if (cart.itemCount > 0) {
      badge.textContent = cart.itemCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  } catch {
    // not fatal — badge just won't show
  }
}

document.addEventListener('DOMContentLoaded', renderNavbar);
