async function loadWishlist() {
  const mount = document.getElementById('wishlist-content');
  mount.innerHTML = loadingHtml('Loading wishlist...');
  try {
    const products = await api.getWishlist();
    if (!products.length) {
      mount.innerHTML = emptyStateHtml('Your wishlist is waiting', 'Save products here when you find something worth coming back to.', '<a href="products.html" class="btn btn-primary">Browse products</a>');
      return;
    }
    mount.innerHTML = `<div class="grid-products">${products.map((product) => `
      <div class="wishlist-entry">
        ${productCardHtml(product)}
        <div class="wishlist-actions">
          <button class="btn btn-secondary btn-sm wishlist-remove" data-product-id="${product.id}">Remove</button>
          <button class="btn btn-primary btn-sm wishlist-move" data-product-id="${product.id}" ${product.stock <= 0 ? 'disabled' : ''}>Add favorite to cart</button>
        </div>
      </div>`).join('')}</div>`;
    mount.querySelectorAll('.wishlist-remove').forEach((button) => button.addEventListener('click', async () => {
      button.disabled = true;
      await api.removeFromWishlist(button.dataset.productId);
      loadWishlist();
    }));
    mount.querySelectorAll('.wishlist-move').forEach((button) => button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await api.addCartItem(button.dataset.productId, 1);
        await api.removeFromWishlist(button.dataset.productId);
        refreshCartBadge();
        loadWishlist();
      } catch (err) {
        button.disabled = false;
        button.textContent = err.message;
      }
    }));
  } catch (err) {
    mount.innerHTML = errorBannerHtml(err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (requireAuth()) loadWishlist();
});
