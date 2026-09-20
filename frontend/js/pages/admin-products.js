let categories = [];
let editingProductId = null;

function categoryOptionsHtml(selectedId) {
  return (
    `<option value="">None</option>` +
    categories.map((c) => `<option value="${c.id}" ${String(c.id) === String(selectedId) ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')
  );
}

function renderForm(product = null) {
  editingProductId = product?.id || null;
  document.getElementById('form-mount').innerHTML = `
    <div class="card card-pad" style="margin-bottom:24px;">
      <h2 style="margin-top:0;font-size:1rem;">${product ? 'Edit product' : 'New product'}</h2>
      <form id="product-form">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="field" style="grid-column:span 2;">
            <label>Name</label>
            <input class="input" id="p-name" required value="${escapeHtml(product?.name || '')}" />
          </div>
          <div class="field" style="grid-column:span 2;">
            <label>Description</label>
            <textarea class="input" id="p-description" rows="3">${escapeHtml(product?.description || '')}</textarea>
          </div>
          <div class="field">
            <label>Price (₹)</label>
            <input class="input" id="p-price" type="number" min="0" step="0.01" required value="${product?.price ?? ''}" />
          </div>
          <div class="field">
            <label>Stock</label>
            <input class="input" id="p-stock" type="number" min="0" required value="${product?.stock ?? ''}" />
          </div>
          <div class="field">
            <label>Category</label>
            <select class="input" id="p-category">${categoryOptionsHtml(product?.category?.id)}</select>
          </div>
          <div class="field">
            <label>Image URL</label>
            <input class="input" id="p-image" type="url" value="${escapeHtml(product?.imageUrl || '')}" placeholder="https://..." />
            <img id="p-image-preview" class="admin-image-preview" src="${productImageUrl(product?.imageUrl)}" alt="Product preview" />
          </div>
        </div>
        <div style="display:flex;gap:12px;">
          <button type="submit" class="btn btn-primary" id="form-submit-btn">${product ? 'Save changes' : 'Create product'}</button>
          <button type="button" class="btn btn-secondary" id="form-cancel-btn">Cancel</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('form-cancel-btn').addEventListener('click', () => {
    document.getElementById('form-mount').innerHTML = '';
  });

  document.getElementById('p-image').addEventListener('input', (event) => {
    document.getElementById('p-image-preview').src = productImageUrl(event.target.value.trim());
  });

  document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorMount = document.getElementById('error-mount');
    const submitBtn = document.getElementById('form-submit-btn');
    errorMount.innerHTML = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const payload = {
      name: document.getElementById('p-name').value.trim(),
      description: document.getElementById('p-description').value.trim(),
      price: parseFloat(document.getElementById('p-price').value),
      stock: parseInt(document.getElementById('p-stock').value, 10),
      categoryId: document.getElementById('p-category').value || null,
      imageUrl: document.getElementById('p-image').value.trim(),
    };

    try {
      if (editingProductId) {
        await api.adminUpdateProduct(editingProductId, payload);
      } else {
        await api.adminCreateProduct(payload);
      }
      document.getElementById('form-mount').innerHTML = '';
      loadProducts();
    } catch (err) {
      errorMount.innerHTML = errorBannerHtml(err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = editingProductId ? 'Save changes' : 'Create product';
    }
  });
}

function productRowHtml(p) {
  return `
    <tr data-id="${p.id}">
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="${productImageUrl(p.imageUrl)}" onerror="this.src='https://placehold.co/120x120/f1eee7/116052?text=Image'" style="width:42px;height:42px;border-radius:8px;object-fit:cover;background:var(--gray-100);" alt="" />
          <span style="font-weight:500;">${escapeHtml(p.name)}</span>
        </div>
      </td>
      <td style="color:var(--gray-500);">${p.category ? escapeHtml(p.category.name) : '—'}</td>
      <td>${formatINR(p.price)}</td>
      <td>
        <input type="number" min="0" class="input stock-input" style="width:80px;padding:4px 8px;" value="${p.stock}" data-id="${p.id}" data-original="${p.stock}" />
      </td>
      <td style="text-align:right;">
        <button class="edit-btn" data-id="${p.id}" style="background:none;border:none;color:var(--brand-700);cursor:pointer;font-weight:600;margin-right:12px;">Edit</button>
        <button class="delete-btn" data-id="${p.id}" style="background:none;border:none;color:var(--red-600);cursor:pointer;font-weight:600;">Delete</button>
      </td>
    </tr>
  `;
}

let allProducts = [];

async function loadProducts() {
  const mount = document.getElementById('table-mount');
  mount.innerHTML = loadingHtml('Loading products...');

  try {
    const data = await api.listProducts({ page: 0, size: 100, sortBy: 'createdAt', direction: 'desc' });
    allProducts = data.content;

    mount.innerHTML = `
      <div class="card" style="overflow-x:auto;">
        <table>
          <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th style="text-align:right;">Actions</th></tr></thead>
          <tbody>${allProducts.map(productRowHtml).join('')}</tbody>
        </table>
      </div>
    `;

    attachTableHandlers();
  } catch (err) {
    mount.innerHTML = errorBannerHtml(err.message);
  }
}

function attachTableHandlers() {
  const errorMount = document.getElementById('error-mount');

  document.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const product = allProducts.find((p) => p.id === parseInt(btn.dataset.id, 10));
      renderForm(product);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  document.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this product? This cannot be undone.')) return;
      try {
        await api.adminDeleteProduct(btn.dataset.id);
        loadProducts();
      } catch (err) {
        errorMount.innerHTML = errorBannerHtml(err.message);
      }
    });
  });

  document.querySelectorAll('.stock-input').forEach((input) => {
    input.addEventListener('change', async () => {
      if (input.value === input.dataset.original) return;
      try {
        await api.adminUpdateStock(input.dataset.id, parseInt(input.value, 10));
        loadProducts();
      } catch (err) {
        errorMount.innerHTML = errorBannerHtml(err.message);
        loadProducts();
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;

  try {
    categories = await api.listCategories();
  } catch {
    categories = [];
  }

  document.getElementById('add-product-btn').addEventListener('click', () => {
    renderForm(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  loadProducts();
});
