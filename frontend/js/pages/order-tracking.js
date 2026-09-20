function trackingTimelineHtml(status) {
  const stages = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  const currentIndex = stages.indexOf(status);
  if (status === 'CANCELLED') return '<div class="tracking-timeline"><div class="tracking-step current"><span class="tracking-dot">!</span><div><strong>Order cancelled</strong><small>This order will not be delivered.</small></div></div></div>';
  return `<div class="tracking-timeline">${stages.map((stage, index) => `<div class="tracking-step ${index < currentIndex ? 'complete' : ''} ${index === currentIndex ? 'current' : ''}"><span class="tracking-dot">${index < currentIndex ? '✓' : index === currentIndex ? '●' : '○'}</span><div><strong>${stage.replaceAll('_', ' ')}</strong>${index === currentIndex ? '<small>Current status</small>' : ''}</div></div>`).join('')}</div>`;
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  const mount = document.getElementById('tracking-mount');
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { mount.innerHTML = emptyStateHtml('Order not found', 'Choose an order from your order history.'); return; }
  mount.innerHTML = loadingHtml('Loading live tracking...');
  try {
    const order = await api.getOrder(id);
    const delivery = new Date(new Date(String(order.createdAt).replace(' ', 'T')).getTime() + 5 * 86400000);
    mount.innerHTML = `<a class="tracking-back" href="order-details.html?id=${order.id}">← Back to order</a><section class="tracking-hero"><span class="eyebrow">Live order tracking</span><h1>Order #SW-${String(order.id).padStart(5, '0')}</h1><p>Placed ${formatDateTime(order.createdAt)}</p><div class="tracking-delivery"><span>Estimated delivery</span><strong>${delivery.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></div></section><section class="card card-pad tracking-panel"><div class="tracking-panel-heading"><div><span class="eyebrow">Delivery progress</span><h2>${order.status.replaceAll('_', ' ')}</h2></div>${statusBadgeHtml(order.status)}</div>${trackingTimelineHtml(order.status)}</section><section class="card card-pad tracking-summary"><h2>Order summary</h2><p>${order.items.length} item${order.items.length === 1 ? '' : 's'} · ${formatINR(order.totalAmount)}</p><a class="btn btn-primary" href="order-details.html?id=${order.id}">View full order</a></section>`;
  } catch (error) { mount.innerHTML = errorBannerHtml(error.message); }
});
