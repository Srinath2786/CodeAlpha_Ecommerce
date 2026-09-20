document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  loadDashboard();
});

async function loadDashboard() {
  try {
    const data = await api.dashboard();
    const name = data.user?.full_name || data.user?.fullName || auth.getUser()?.fullName || 'there';
    document.getElementById('dashboard-name').textContent = name.split(' ')[0];
    document.getElementById('dashboard-welcome').textContent = `Here's your shopping overview, ${name.split(' ')[0]}.`;
    document.getElementById('stat-orders').textContent = data.stats.orders;
    document.getElementById('stat-wishlist').textContent = data.stats.wishlistItems;
    document.getElementById('stat-cart').textContent = data.stats.cartItems;
    document.getElementById('stat-spent').textContent = formatCurrency(data.stats.totalSpent);
    renderRecentOrders(data.recentOrders || []);
    renderRecommendations(data.recommendations || []);
  } catch (err) {
    document.getElementById('dashboard-welcome').textContent = err.message;
    document.getElementById('recent-orders').innerHTML = '';
    document.getElementById('recommendations').innerHTML = '';
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function renderRecentOrders(orders) {
  const mount = document.getElementById('recent-orders');
  mount.innerHTML = orders.length ? orders.map((order) => `
    <a class="dashboard-row" href="order-details.html?id=${order.id}">
    <strong>#SW${String(order.id).padStart(4, '0')}</strong><span>${formatCurrency(order.final_amount ?? order.finalAmount)}</span><span>${order.status.replaceAll('_', ' ')}</span><span>View / Track</span>
    </a>`).join('') : '<p>No orders yet. Start shopping to see them here.</p>';
}

function renderRecommendations(products) {
  const mount = document.getElementById('recommendations');
  mount.innerHTML = products.length ? products.map((product) => `
    <a class="dashboard-product" href="../product-details.html?id=${product.id}">
      <img src="${escapeHtml(product.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80')}" alt="${escapeHtml(product.name)}">
      <p>${escapeHtml(product.name)}</p>
    </a>`).join('') : '<p>No recommendations available yet.</p>';
}
