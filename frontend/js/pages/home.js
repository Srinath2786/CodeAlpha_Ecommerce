document.addEventListener('DOMContentLoaded', async () => {
  const mount = document.getElementById('featured');
  mount.innerHTML = loadingHtml('Loading products...');

  try {
    const data = await api.listProducts({ page: 0, size: 8, sortBy: 'createdAt', direction: 'desc' });
    if (data.content.length === 0) {
      mount.innerHTML = emptyStateHtml('No products yet', 'Check back soon.');
      return;
    }
    mount.innerHTML = `<div class="grid-products">${data.content.map(productCardHtml).join('')}</div>`;
  } catch (err) {
    mount.innerHTML = errorBannerHtml(err.message);
  }
});
