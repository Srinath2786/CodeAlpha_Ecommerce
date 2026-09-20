function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatINR(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function formatDate(isoString) {
  return new Date(isoString.replace(' ', 'T')).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(isoString) {
  return new Date(isoString.replace(' ', 'T')).toLocaleString('en-IN');
}

function productImageUrl(url) {
  const fallback = 'https://placehold.co/800x800/f1eee7/116052?text=ShopWave';
  if (!url) return fallback;
  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return escapeHtml(parsed.href);
  } catch {
    // Use the neutral fallback for malformed admin-entered image URLs.
  }
  return fallback;
}

function productCardHtml(p) {
  const outOfStock = p.stock <= 0;
  const hasDiscount = Number(p.originalPrice) > Number(p.price);
  const discount = hasDiscount ? Math.round((1 - Number(p.price) / Number(p.originalPrice)) * 100) : 0;
  return `
    <article class="product-card">
      <a href="product-details.html?id=${p.id}" class="product-card-link">
      <div class="product-img-wrap">
        <img src="${productImageUrl(p.imageUrl)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.src='https://placehold.co/800x800/f1eee7/116052?text=ShopWave'" />
        ${outOfStock ? '<span class="badge-overlay badge-stock">Out of stock</span>' : ''}
        ${p.category ? `<span class="badge-overlay badge-category">${escapeHtml(p.category.name)}</span>` : ''}
      </div>
      </a>
      <div class="product-body">
        <div class="product-name">${escapeHtml(p.name)}</div>
        ${p.rating ? `<div class="product-rating" aria-label="${p.rating} out of 5 stars">${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5 - Math.round(p.rating))} <span>(${p.reviewCount || 0})</span></div>` : ''}
        <div class="product-footer">
          <span class="product-price">${formatINR(p.price)}</span>
          ${hasDiscount ? `<span class="product-original-price">${formatINR(p.originalPrice)}</span><span class="product-discount">${discount}% off</span>` : ''}
        </div>
        <div class="product-actions">
          <button class="btn btn-primary btn-sm add-card-cart" data-product-id="${p.id}" ${outOfStock ? 'disabled' : ''}>${outOfStock ? 'Out of stock' : 'Add to cart'}</button>
          <button class="icon-btn add-card-wishlist" data-product-id="${p.id}" aria-label="Add ${escapeHtml(p.name)} to wishlist" title="Add to wishlist">♡</button>
        </div>
      </div>
    </article>
  `;
}

async function handleProductCardAction(event) {
  const button = event.target.closest('[data-product-id]');
  if (!button) return;
  event.preventDefault();
  if (!auth.isAuthenticated()) {
    location.href = `login.html?redirect=${encodeURIComponent(location.pathname.split('/').pop() + location.search)}`;
    return;
  }
  button.disabled = true;
  try {
    if (button.classList.contains('add-card-cart')) {
      await api.addCartItem(button.dataset.productId, 1);
      button.textContent = 'Added';
      refreshCartBadge();
    } else {
      await api.addToWishlist(button.dataset.productId);
      button.textContent = '♥';
    }
  } catch (err) {
    button.title = err.message;
  } finally {
    setTimeout(() => { button.disabled = false; }, 1200);
  }
}

document.addEventListener('click', handleProductCardAction);

function rememberRecentlyViewed(product) {
  const stored = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
  const next = [product, ...stored.filter((item) => item.id !== product.id)].slice(0, 6);
  localStorage.setItem('recentlyViewed', JSON.stringify(next));
}

function recentlyViewedHtml() {
  const items = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
  return items.length ? `<section class="home-section recently-viewed"><div class="section-title"><h2 class="display-title" style="font-size:2rem;">Recently viewed</h2></div><div class="grid-products">${items.map(productCardHtml).join('')}</div></section>` : '';
}

function statusBadgeHtml(status) {
  return `<span class="badge-status status-${status}">${status}</span>`;
}

function loadingHtml(label = 'Loading...') {
  return `<div class="spinner-wrap"><div class="spinner"></div><span>${label}</span></div>`;
}

function emptyStateHtml(title, subtitle, actionHtml = '') {
  return `
    <div class="empty-state">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(subtitle)}</p>
      ${actionHtml}
    </div>
  `;
}

function errorBannerHtml(message) {
  return message ? `<div class="error-banner">${escapeHtml(message)}</div>` : '';
}

function paginationHtml(page, totalPages) {
  if (totalPages <= 1) return '';
  return `
    <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:32px;">
      <button class="btn btn-secondary btn-sm" id="prev-page" ${page === 0 ? 'disabled' : ''}>Previous</button>
      <span style="font-size:0.875rem;color:var(--gray-500);">Page ${page + 1} of ${totalPages}</span>
      <button class="btn btn-secondary btn-sm" id="next-page" ${page >= totalPages - 1 ? 'disabled' : ''}>Next</button>
    </div>
  `;
}
