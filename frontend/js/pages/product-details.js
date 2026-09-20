let currentProduct = null;
let quantity = 1;

function renderProduct(p) {
  const outOfStock = p.stock <= 0;
  const hasDiscount = Number(p.originalPrice) > Number(p.price);
  const discount = hasDiscount ? Math.round((1 - Number(p.price) / Number(p.originalPrice)) * 100) : 0;
  const isNew = new Date(p.createdAt || Date.now()) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  document.getElementById('content').innerHTML = `
    <div class="two-col">
      <div class="product-img-wrap" style="border-radius:12px;">
        <img src="${productImageUrl(p.imageUrl)}" onerror="this.src='https://placehold.co/800x800/f1eee7/116052?text=ShopWave'" alt="${escapeHtml(p.name)}" />
      </div>
      <div>
        <div class="product-badges">${p.category ? `<span class="badge-category" style="position:static;">${escapeHtml(p.category.name)}</span>` : ''}${hasDiscount ? `<span class="product-discount-badge">${discount}% off</span>` : ''}${isNew ? '<span class="product-new-badge">New</span>' : ''}</div>
        <h1 style="margin:12px 0 4px;font-size:1.5rem;">${escapeHtml(p.name)}</h1>
        <p style="font-size:1.5rem;font-weight:700;color:var(--brand-700);margin:8px 0;">${formatINR(p.price)} ${hasDiscount ? `<del class="product-original-price">${formatINR(p.originalPrice)}</del>` : ''}</p>
        <p style="color:var(--gray-600);line-height:1.6;">${escapeHtml(p.description || '')}</p>
        <p style="margin-top:12px;font-size:0.9rem;${outOfStock ? 'color:var(--red-600);font-weight:600;' : 'color:var(--gray-500);'}">
          ${outOfStock ? 'Out of stock' : p.stock <= 5 ? `Only ${p.stock} left - order soon` : p.stock + ' units available'}
        </p>

        <div id="error-mount"></div>

        ${
          !outOfStock
            ? `
          <div style="display:flex;align-items:center;gap:12px;margin-top:20px;">
            <div class="qty-control">
              <button id="qty-minus">−</button>
              <span id="qty-display">1</span>
              <button id="qty-plus">+</button>
            </div>
            <button id="add-to-cart-btn" class="btn btn-primary" style="flex:1;">Add to Cart</button>
          </div>`
            : ''
        }
        <button id="wishlist-btn" class="btn btn-secondary" style="width:100%;margin-top:10px;">♡ Add to wishlist</button>
      </div>
    </div>
    <section class="home-section" style="padding-left:0;padding-right:0;">
      <span class="eyebrow">Customer notes</span>
      <h2 class="display-title" style="font-size:2rem;margin-top:6px;">Reviews <span id="review-summary"></span></h2>
      <div id="review-list"></div>
      <div id="review-form-mount"></div>
    </section>
    <section class="home-section" style="padding-left:0;padding-right:0;"><div class="section-title"><h2 class="display-title" style="font-size:2rem;">Related products</h2></div><div id="related-products" class="grid-products"><p>Loading related products...</p></div></section>
    ${recentlyViewedHtml()}
  `;

  if (!outOfStock) {
    document.getElementById('qty-minus').addEventListener('click', () => {
      quantity = Math.max(1, quantity - 1);
      document.getElementById('qty-display').textContent = quantity;
    });
    document.getElementById('qty-plus').addEventListener('click', () => {
      quantity = Math.min(p.stock, quantity + 1);
      document.getElementById('qty-display').textContent = quantity;
    });
    document.getElementById('add-to-cart-btn').addEventListener('click', handleAddToCart);
  }

  document.getElementById('wishlist-btn').addEventListener('click', async (event) => {
    if (!auth.isAuthenticated()) {
      location.href = `login.html?redirect=${encodeURIComponent('product-details.html' + location.search)}`;
      return;
    }
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await api.addToWishlist(p.id);
      button.textContent = '♥ Saved to wishlist';
    } catch (err) {
      button.textContent = err.message;
      setTimeout(() => { button.textContent = '♡ Add to wishlist'; button.disabled = false; }, 1800);
    }
  });
}

function starsHtml(rating) {
  return `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;
}

async function renderReviews(productId) {
  const list = document.getElementById('review-list');
  const summaryMount = document.getElementById('review-summary');
  try {
    const data = await api.getReviews(productId);
    summaryMount.textContent = `(${data.summary.average || '0.0'} / 5, ${data.summary.count} review${data.summary.count === 1 ? '' : 's'})`;
    list.innerHTML = data.reviews.length
      ? data.reviews.map((review) => `<article class="card card-pad" style="margin:12px 0;"><strong>${escapeHtml(review.user_name)}</strong><div style="color:#d97706;margin:6px 0;">${starsHtml(review.rating)}</div><p>${escapeHtml(review.comment)}</p></article>`).join('')
      : '<p style="color:var(--gray-500);">No reviews yet. Be the first to share your experience.</p>';
  } catch (err) {
    list.innerHTML = errorBannerHtml(err.message);
  }
}

async function renderRelatedProducts(product) {
  const mount = document.getElementById('related-products');
  if (!product.category?.id) { mount.innerHTML = '<p style="color:var(--gray-500);">Explore more from our collection.</p>'; return; }
  try {
    const data = await api.listProducts({ categoryId: product.category.id, page: 0, size: 4 });
    const related = data.content.filter((item) => item.id !== product.id);
    mount.innerHTML = related.length ? related.map(productCardHtml).join('') : '<p style="color:var(--gray-500);">More products are coming soon.</p>';
  } catch (err) { mount.innerHTML = errorBannerHtml(err.message); }
}

function renderReviewForm(productId) {
  if (!auth.isAuthenticated()) return;
  document.getElementById('review-form-mount').innerHTML = `
    <form id="review-form" class="card card-pad" style="margin-top:20px;">
      <h3>Share your experience</h3>
      <div class="field"><label for="review-rating">Rating</label><select id="review-rating" class="input"><option value="5">5 - Excellent</option><option value="4">4 - Good</option><option value="3">3 - Okay</option><option value="2">2 - Poor</option><option value="1">1 - Terrible</option></select></div>
      <div class="field"><label for="review-comment">Review</label><textarea id="review-comment" class="input" rows="4" minlength="3" maxlength="1000" required></textarea></div>
      <div id="review-error"></div><button class="btn btn-primary" type="submit">Post review</button>
    </form>`;
  document.getElementById('review-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const error = document.getElementById('review-error');
    try {
      await api.saveReview(productId, { rating: Number(document.getElementById('review-rating').value), comment: document.getElementById('review-comment').value });
      await renderReviews(productId);
      event.target.reset();
    } catch (err) { error.innerHTML = errorBannerHtml(err.message); }
  });
}

async function handleAddToCart() {
  const errorMount = document.getElementById('error-mount');
  const btn = document.getElementById('add-to-cart-btn');

  if (!auth.isAuthenticated()) {
    location.href = `login.html?redirect=${encodeURIComponent('product-details.html' + location.search)}`;
    return;
  }

  errorMount.innerHTML = '';
  btn.disabled = true;
  btn.textContent = 'Adding...';

  try {
    await api.addCartItem(currentProduct.id, quantity);
    btn.textContent = 'Added ✓';
    refreshCartBadge();
    setTimeout(() => {
      btn.textContent = 'Add to Cart';
      btn.disabled = false;
    }, 1500);
  } catch (err) {
    errorMount.innerHTML = errorBannerHtml(err.message);
    btn.disabled = false;
    btn.textContent = 'Add to Cart';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const id = new URLSearchParams(location.search).get('id');
  const mount = document.getElementById('content');
  mount.innerHTML = loadingHtml('Loading product...');

  if (!id) {
    mount.innerHTML = emptyStateHtml('Product not found', 'No product id was provided.');
    return;
  }

  try {
    currentProduct = await api.getProduct(id);
    rememberRecentlyViewed(currentProduct);
    renderProduct(currentProduct);
    renderReviews(id);
    renderReviewForm(id);
    renderRelatedProducts(currentProduct);
  } catch (err) {
    mount.innerHTML = emptyStateHtml(
      err.status === 404 ? 'Product not found' : 'Something went wrong',
      err.message,
      `<a href="products.html" class="btn btn-primary">Browse products</a>`
    );
  }
});
