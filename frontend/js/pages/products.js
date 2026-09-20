const state = {
  search: '',
  categoryId: '',
  sort: 'createdAt,desc',
  page: 0,
};

function syncStateFromUrl() {
  const params = new URLSearchParams(location.search);
  state.search = params.get('search') || '';
  state.categoryId = params.get('categoryId') || '';
  state.sort = params.get('sort') || 'createdAt,desc';
  state.page = parseInt(params.get('page') || '0', 10);
}

function syncUrlFromState() {
  const params = new URLSearchParams();
  if (state.search) params.set('search', state.search);
  if (state.categoryId) params.set('categoryId', state.categoryId);
  if (state.sort !== 'createdAt,desc') params.set('sort', state.sort);
  if (state.page) params.set('page', state.page);
  history.replaceState(null, '', 'products.html' + (params.toString() ? '?' + params.toString() : ''));
}

async function loadCategories() {
  const select = document.getElementById('category-select');
  try {
    const categories = await api.listCategories();
    for (const c of categories) {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      select.appendChild(opt);
    }
    select.value = state.categoryId;
  } catch {
    // non-fatal — filter just won't populate
  }
}

async function loadProducts() {
  const mount = document.getElementById('results');
  mount.innerHTML = loadingHtml('Loading products...');

  const [sortBy, direction] = state.sort.split(',');
  try {
    const data = await api.listProducts({
      search: state.search || undefined,
      categoryId: state.categoryId || undefined,
      sortBy,
      direction,
      page: state.page,
      size: 12,
    });

    if (data.content.length === 0) {
      mount.innerHTML = emptyStateHtml('No products found', 'Try a different search term or category.');
      return;
    }

    mount.innerHTML = `
      <div class="grid-products">${data.content.map(productCardHtml).join('')}</div>
      ${paginationHtml(data.page, data.totalPages)}
    `;

    document.getElementById('prev-page')?.addEventListener('click', () => {
      state.page -= 1;
      syncUrlFromState();
      loadProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.getElementById('next-page')?.addEventListener('click', () => {
      state.page += 1;
      syncUrlFromState();
      loadProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  } catch (err) {
    mount.innerHTML = errorBannerHtml(err.message);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  syncStateFromUrl();
  document.getElementById('search-input').value = state.search;
  document.getElementById('sort-select').value = state.sort;

  await loadCategories();
  await loadProducts();

  document.getElementById('search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    state.search = document.getElementById('search-input').value.trim();
    state.page = 0;
    syncUrlFromState();
    loadProducts();
  });

  document.getElementById('category-select').addEventListener('change', (e) => {
    state.categoryId = e.target.value;
    state.page = 0;
    syncUrlFromState();
    loadProducts();
  });

  document.getElementById('sort-select').addEventListener('change', (e) => {
    state.sort = e.target.value;
    state.page = 0;
    syncUrlFromState();
    loadProducts();
  });
});
