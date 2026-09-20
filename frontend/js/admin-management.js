const managementType = document.body.dataset.management;

function managementTable(headers, rows) {
  return `<div class="card" style="overflow-x:auto"><table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

async function loadManagement() {
  const mount = document.getElementById('management-mount');
  try {
    if (managementType === 'customers') {
      const rows = await api.adminCustomers();
      mount.innerHTML = rows.length ? managementTable(['Customer', 'Email', 'Orders', 'Total spent'], rows.map((row) => `<tr><td><strong>${escapeHtml(row.fullName)}</strong></td><td>${escapeHtml(row.email)}</td><td>${row.orders}</td><td>${formatINR(row.totalSpent)}</td></tr>`).join('')) : '<p>No customers yet.</p>';
    } else if (managementType === 'categories') {
      const rows = await api.adminCategories();
      mount.innerHTML = managementTable(['Category', 'Products', 'Actions'], rows.map((row) => `<tr><td><strong>${escapeHtml(row.name)}</strong></td><td>${row.productCount}</td><td><button class="delete-category" data-id="${row.id}" class="btn btn-danger btn-sm">Delete</button></td></tr>`).join(''));
      document.querySelectorAll('.delete-category').forEach((button) => button.addEventListener('click', async () => { if (!confirm('Delete this category?')) return; await api.adminDeleteCategory(button.dataset.id); loadManagement(); }));
    } else if (managementType === 'coupons') {
      const rows = await api.adminCoupons();
      mount.innerHTML = rows.length ? managementTable(['Code', 'Discount', 'Used', 'Status', 'Action'], rows.map((row) => `<tr><td><strong>${escapeHtml(row.code)}</strong></td><td>${row.discountType === 'PERCENTAGE' ? `${row.discountValue}%` : formatINR(row.discountValue)}</td><td>${row.usedCount}</td><td>${row.active ? 'Active' : 'Inactive'}</td><td><button class="toggle-coupon btn btn-secondary btn-sm" data-id="${row.id}" data-active="${row.active}">${row.active ? 'Deactivate' : 'Activate'}</button></td></tr>`).join('')) : '<p>No coupons yet.</p>';
      document.querySelectorAll('.toggle-coupon').forEach((button) => button.addEventListener('click', async () => { await api.adminToggleCoupon(button.dataset.id, button.dataset.active !== 'true'); loadManagement(); }));
    } else if (managementType === 'reviews') {
      const rows = await api.adminReviews();
      mount.innerHTML = rows.length ? managementTable(['Product', 'Customer', 'Rating', 'Review', 'Action'], rows.map((row) => `<tr><td>${escapeHtml(row.productName)}</td><td>${escapeHtml(row.userName)}</td><td>${row.rating}/5</td><td>${escapeHtml(row.comment)}</td><td><button class="delete-review btn btn-danger btn-sm" data-id="${row.id}">Delete</button></td></tr>`).join('')) : '<p>No reviews yet.</p>';
      document.querySelectorAll('.delete-review').forEach((button) => button.addEventListener('click', async () => { if (!confirm('Delete this review?')) return; await api.adminDeleteReview(button.dataset.id); loadManagement(); }));
    }
  } catch (error) { mount.innerHTML = errorBannerHtml(error.message); }
}

document.addEventListener('DOMContentLoaded', () => { if (requireAdmin()) loadManagement(); });
