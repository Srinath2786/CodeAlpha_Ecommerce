let ordersPage = 0;

function orderRowHtml(order) {
  return `
    <a href="order-details.html?id=${order.id}" class="card" style="display:flex;align-items:center;justify-content:space-between;padding:16px;margin-bottom:12px;">
      <div>
        <p style="font-weight:600;margin:0;">Order #${order.id}</p>
        <p style="font-size:0.85rem;color:var(--gray-500);margin:2px 0 0;">
          ${formatDate(order.createdAt)} · ${order.items.length} item${order.items.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div style="display:flex;align-items:center;gap:16px;">
        <span style="font-weight:700;">${formatINR(order.totalAmount)}</span>
        <span class="badge-status status-${order.paymentStatus}">${order.paymentStatus}</span>
        ${statusBadgeHtml(order.status)}<a class="btn btn-primary btn-sm" href="order-tracking.html?id=${order.id}">Track</a>
      </div>
    </a>
  `;
}

async function loadOrders() {
  const mount = document.getElementById('content');
  mount.innerHTML = loadingHtml('Loading orders...');

  try {
    const data = await api.myOrders(ordersPage, 10);

    if (data.content.length === 0) {
      mount.innerHTML = emptyStateHtml('No orders yet', 'Your order history will show up here once you place an order.', `<a href="products.html" class="btn btn-primary">Start shopping</a>`);
      return;
    }

    mount.innerHTML = `
      <div>${data.content.map(orderRowHtml).join('')}</div>
      ${paginationHtml(data.page, data.totalPages)}
    `;

    document.getElementById('prev-page')?.addEventListener('click', () => {
      ordersPage -= 1;
      loadOrders();
    });
    document.getElementById('next-page')?.addEventListener('click', () => {
      ordersPage += 1;
      loadOrders();
    });
  } catch (err) {
    mount.innerHTML = errorBannerHtml(err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  loadOrders();
});
