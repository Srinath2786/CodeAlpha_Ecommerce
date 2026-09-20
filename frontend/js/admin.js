document.addEventListener('DOMContentLoaded', () => {
  if (!requireAdmin()) return;
  const main = document.querySelector('main.dashboard-page');
  if (main) {
    main.classList.add('dashboard-layout');
    main.insertAdjacentHTML('afterbegin', '<aside class="dashboard-sidebar admin-sidebar"><span class="eyebrow">ShopWave</span><h2>Admin</h2><nav><a class="active" href="dashboard.html">Overview</a><a href="products.html">Products</a><a href="categories.html">Categories</a><a href="orders.html">Orders</a><a href="customers.html">Customers</a><a href="coupons.html">Coupons</a><a href="reviews.html">Reviews</a><a href="settings.html">Settings</a><button id="admin-logout" type="button">Log out</button></nav></aside>');
    document.getElementById('admin-logout').addEventListener('click', () => auth.logout());
  }
  loadAdminDashboard();
});

async function loadAdminDashboard() {
  try {
    const data = await api.adminDashboard();
    document.getElementById('admin-revenue').textContent = formatAdminCurrency(data.stats.revenue);
    document.getElementById('admin-orders').textContent = data.stats.orders;
    document.getElementById('admin-users').textContent = data.stats.users;
    document.getElementById('admin-recent-orders').innerHTML = data.recentOrders.length ? data.recentOrders.map((order) => `
      <a class="dashboard-row" href="orders.html"><strong>#SW${String(order.id).padStart(4, '0')}</strong><span>${escapeHtml(order.full_name)}</span><span>${formatAdminCurrency(order.final_amount)}</span><span>${order.status.replaceAll('_', ' ')}</span></a>`).join('') : '<p>No orders yet.</p>';
    document.getElementById('admin-low-stock').innerHTML = data.lowStock.length ? data.lowStock.map((product) => `
      <a class="dashboard-row" href="products.html"><strong>${escapeHtml(product.name)}</strong><span>${product.stock} units left</span><span>${formatAdminCurrency(product.price)}</span><span>Review stock</span></a>`).join('') : '<p>All active products have healthy stock.</p>';
  } catch (err) {
    document.querySelector('.dashboard-page').insertAdjacentHTML('beforeend', `<p class="error-banner">${escapeHtml(err.message)}</p>`);
  }
}

function formatAdminCurrency(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}
