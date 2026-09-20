const STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
let adminOrdersPage = 0;

function statusSelectHtml(order) {
  return `
    <select class="input status-select" style="width:auto;padding:4px 8px;font-size:0.8rem;" data-id="${order.id}">
      ${STATUSES.map((s) => `<option value="${s}" ${s === order.status ? 'selected' : ''}>${s}</option>`).join('')}
    </select>
  `;
}

function orderRowHtml(order) {
  return `
    <tr data-id="${order.id}">
      <td style="font-weight:600;"><a href="order-details.html?id=${order.id}">#SW${String(order.id).padStart(5, '0')}</a></td>
      <td>
        ${escapeHtml(order.shippingName)}
        <div style="font-size:0.75rem;color:var(--gray-400);">${escapeHtml(order.shippingPhone)}</div>
      </td>
      <td style="color:var(--gray-500);">${order.items.length}</td>
      <td>${formatINR(order.totalAmount)}</td>
      <td><span class="badge-status status-${order.paymentStatus}">${order.paymentStatus}</span><div class="payment-method">${order.paymentMethod || '—'}</div></td>
      <td style="color:var(--gray-500);">${formatDate(order.createdAt)}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          ${statusBadgeHtml(order.status)}
          ${statusSelectHtml(order)}
        </div>
      </td>
    </tr>
  `;
}

async function loadOrders() {
  const mount = document.getElementById('table-mount');
  mount.innerHTML = loadingHtml('Loading orders...');

  try {
    const data = await api.adminAllOrders(adminOrdersPage, 15);

    if (data.content.length === 0) {
      mount.innerHTML = emptyStateHtml('No orders yet', 'Orders placed by customers will appear here.');
      return;
    }

    mount.innerHTML = `
      <div class="card" style="overflow-x:auto;">
        <table>
          <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Placed</th><th>Status</th></tr></thead>
          <tbody>${data.content.map(orderRowHtml).join('')}</tbody>
        </table>
      </div>
      ${paginationHtml(data.page, data.totalPages)}
    `;

    document.querySelectorAll('.status-select').forEach((select) => {
      select.addEventListener('change', async () => {
        const errorMount = document.getElementById('error-mount');
        try {
          await api.adminUpdateOrderStatus(select.dataset.id, select.value);
          loadOrders();
        } catch (err) {
          errorMount.innerHTML = errorBannerHtml(err.message);
          loadOrders();
        }
      });
    });

    document.getElementById('prev-page')?.addEventListener('click', () => {
      adminOrdersPage -= 1;
      loadOrders();
    });
    document.getElementById('next-page')?.addEventListener('click', () => {
      adminOrdersPage += 1;
      loadOrders();
    });
  } catch (err) {
    mount.innerHTML = errorBannerHtml(err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAdmin()) return;
  loadOrders();
});
