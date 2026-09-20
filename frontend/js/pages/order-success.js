document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  const mount = document.getElementById('success-mount');
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { mount.innerHTML = emptyStateHtml('Order not found', 'Your order confirmation link is missing an order id.'); return; }
  mount.innerHTML = loadingHtml('Loading confirmation...');
  try {
    const order = await api.getOrder(id);
    const delivery = new Date(new Date(String(order.createdAt).replace(' ', 'T')).getTime() + 5 * 86400000);
    mount.innerHTML = `<section class="confirmation card card-pad"><div class="confirmation-mark">✓</div><span class="eyebrow">Order confirmed</span><h1>Order placed successfully</h1><p class="confirmation-order">Order #SW-${String(order.id).padStart(5, '0')}</p><p>Estimated delivery: <strong>${delivery.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></p><p class="section-intro">Your ${order.paymentMethod === 'MOCK_ONLINE' ? 'mock online payment' : 'cash on delivery'} order is now being prepared.</p><div class="confirmation-actions"><a class="btn btn-primary" href="../account/order-tracking.html?id=${order.id}">Track order</a><a class="btn btn-secondary" href="../account/order-details.html?id=${order.id}">View order</a><a class="btn btn-secondary" href="../products.html">Continue shopping</a></div></section>`;
  } catch (error) { mount.innerHTML = errorBannerHtml(error.message); }
});
