function orderItemRowHtml(item) {
  return `
    <div style="display:flex;justify-content:space-between;padding:14px 20px;border-top:1px solid var(--gray-100);">
      <div>
        <p style="font-weight:600;margin:0;">${escapeHtml(item.productName)}</p>
        <p style="font-size:0.85rem;color:var(--gray-500);margin:2px 0 0;">${formatINR(item.priceAtPurchase)} × ${item.quantity}</p>
      </div>
      <span style="font-weight:700;">${formatINR(item.priceAtPurchase * item.quantity)}</span>
    </div>
  `;
}

function orderTimelineHtml(status) {
  const stages = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  const currentIndex = stages.indexOf(status);
  if (status === 'CANCELLED') return '<div class="order-timeline"><div class="timeline-step current"><span class="timeline-dot">!</span><span class="timeline-label">Order cancelled</span></div></div>';
  return `<div class="order-timeline">${stages.map((stage, index) => `<div class="timeline-step ${index < currentIndex ? 'complete' : ''} ${index === currentIndex ? 'current' : ''}"><span class="timeline-dot">${index < currentIndex ? '✓' : index === currentIndex ? '●' : '○'}</span><span class="timeline-label">${stage.replaceAll('_', ' ')}</span></div>`).join('')}</div>`;
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  const id = new URLSearchParams(location.search).get('id');
  const mount = document.getElementById('content');
  mount.innerHTML = loadingHtml('Loading order...');

  if (!id) {
    mount.innerHTML = emptyStateHtml('Order not found', 'No order id was provided.', `<a href="orders.html" class="btn btn-primary">Back to orders</a>`);
    return;
  }

  try {
    const order = await api.getOrder(id);

    mount.innerHTML = `
      <a href="orders.html" style="color:var(--brand-700);font-size:0.875rem;">← Back to orders</a>

      <div style="display:flex;align-items:center;justify-content:space-between;margin:16px 0 20px;">
        <h1 style="margin:0;">Order #${order.id}</h1>
        <div style="display:flex;align-items:center;gap:8px;">${statusBadgeHtml(order.status)}<a class="btn btn-primary btn-sm" href="account/order-tracking.html?id=${order.id}">Track order</a></div>
      </div>

      <div class="card card-pad" style="margin-bottom:20px;">
        <h2 style="margin-top:0;font-size:1rem;">Shipping details</h2>
        <p style="font-size:0.9rem;color:var(--gray-600);margin:4px 0;">${escapeHtml(order.shippingName)}</p>
        <p style="font-size:0.9rem;color:var(--gray-600);margin:4px 0;">${escapeHtml(order.shippingAddress)}</p>
        <p style="font-size:0.9rem;color:var(--gray-600);margin:4px 0;">${escapeHtml(order.shippingPhone)}</p>
        <p style="font-size:0.75rem;color:var(--gray-400);margin-top:12px;">Placed on ${formatDateTime(order.createdAt)}</p>
      </div>

      <div class="card card-pad order-payment" style="margin-bottom:20px;">
        <div><span class="eyebrow">Payment</span><strong>${escapeHtml(order.paymentMethod || 'Not recorded')}</strong></div>
        <div><span class="eyebrow">Status</span><strong>${escapeHtml(order.paymentStatus || 'PENDING')}</strong></div>
        <div><span class="eyebrow">Amount</span><strong>${formatINR(order.paymentAmount || order.totalAmount)}</strong></div>
      </div>

      <div class="card card-pad" style="margin-bottom:20px;">
        <h2 style="margin-top:0;font-size:1rem;">Delivery progress</h2>
        ${orderTimelineHtml(order.status)}
      </div>

      <div class="card">
        ${order.items.map(orderItemRowHtml).join('')}
      </div>

      <div class="card card-pad" style="margin-top:16px;display:flex;justify-content:space-between;">
        <span style="font-weight:600;">Total</span>
        <span style="font-weight:700;font-size:1.25rem;">${formatINR(order.totalAmount)}</span>
      </div>
    `;
  } catch (err) {
    mount.innerHTML = emptyStateHtml(
      err.status === 404 ? 'Order not found' : 'Something went wrong',
      err.message,
      `<a href="orders.html" class="btn btn-primary">Back to orders</a>`
    );
  }
});
