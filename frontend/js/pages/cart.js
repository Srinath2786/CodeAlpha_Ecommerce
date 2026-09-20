function cartItemHtml(item) {
  const overStock = item.quantity > item.availableStock;
  return `
    <div class="card-pad" style="display:flex;gap:16px;border-top:1px solid var(--gray-100);" data-item-id="${item.id}">
      <img src="${productImageUrl(item.imageUrl)}" onerror="this.src='https://placehold.co/120x120/f1eee7/116052?text=ShopWave'" alt="" style="width:80px;height:80px;border-radius:10px;object-fit:cover;background:var(--gray-100);flex-shrink:0;" />
      <div style="flex:1;min-width:0;">
        <a href="product-details.html?id=${item.productId}" style="font-weight:600;color:var(--gray-900);">${escapeHtml(item.productName)}</a>
        <p style="font-size:0.85rem;color:var(--gray-500);margin:2px 0;">${formatINR(item.price)} each</p>
        ${overStock ? `<p style="font-size:0.75rem;color:var(--red-600);">Only ${item.availableStock} left — please reduce quantity</p>` : ''}

        <div style="display:flex;align-items:center;gap:12px;margin-top:10px;">
          <div class="qty-control">
            <button class="qty-minus" data-id="${item.id}" data-qty="${item.quantity}">−</button>
            <span>${item.quantity}</span>
            <button class="qty-plus" data-id="${item.id}" data-qty="${item.quantity}" data-max="${item.availableStock}" ${item.quantity >= item.availableStock ? 'disabled' : ''}>+</button>
          </div>
          <button class="remove-item" data-id="${item.id}" style="background:none;border:none;font-size:0.75rem;color:var(--gray-400);cursor:pointer;">Remove</button>
        </div>
      </div>
      <div style="font-weight:700;color:var(--gray-900);flex-shrink:0;">${formatINR(item.subtotal)}</div>
    </div>
  `;
}

async function renderCart() {
  const mount = document.getElementById('content');
  mount.innerHTML = loadingHtml('Loading cart...');

  try {
    const cart = await api.getCart();

    if (cart.items.length === 0) {
      mount.innerHTML = `
        <div class="content-heading"><span class="eyebrow">Your selection</span><h1>Your Cart</h1><p>Review your finds before you take them home.</p></div>
        ${emptyStateHtml('Your cart is empty', 'Browse our products and add something you like.', `<a href="products.html" class="btn btn-primary">Browse products</a>`)}
      `;
      return;
    }

    const hasOverStock = cart.items.some((i) => i.quantity > i.availableStock);

    mount.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div class="content-heading"><span class="eyebrow">Your selection</span><h1>Your Cart</h1><p>Review your finds before you take them home.</p></div>
        <button id="clear-cart" style="background:none;border:none;font-size:0.85rem;color:var(--gray-500);cursor:pointer;">Clear cart</button>
      </div>
      <div id="cart-error"></div>
      <div class="card" style="margin-bottom:24px;">
        ${cart.items.map(cartItemHtml).join('')}
      </div>
      <div class="card card-pad" style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <p style="font-size:0.85rem;color:var(--gray-500);margin:0;">Total (${cart.itemCount} items)</p>
          <p style="font-size:1.5rem;font-weight:700;margin:2px 0 0;">${formatINR(cart.total)}</p>
        </div>
        <button id="checkout-btn" class="btn btn-primary" ${hasOverStock ? 'disabled' : ''}>Proceed to Checkout</button>
      </div>
    `;

    attachCartHandlers();
  } catch (err) {
    mount.innerHTML = errorBannerHtml(err.message);
  }
}

function attachCartHandlers() {
  const errorMount = document.getElementById('cart-error');

  document.getElementById('clear-cart').addEventListener('click', async () => {
    try {
      await api.clearCart();
      refreshCartBadge();
      renderCart();
    } catch (err) {
      errorMount.innerHTML = errorBannerHtml(err.message);
    }
  });

  document.getElementById('checkout-btn')?.addEventListener('click', () => {
    location.href = 'checkout.html';
  });

  document.querySelectorAll('.qty-minus').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const newQty = parseInt(btn.dataset.qty, 10) - 1;
      if (newQty < 1) return;
      await updateQuantity(btn.dataset.id, newQty);
    });
  });

  document.querySelectorAll('.qty-plus').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const newQty = parseInt(btn.dataset.qty, 10) + 1;
      if (newQty > parseInt(btn.dataset.max, 10)) return;
      await updateQuantity(btn.dataset.id, newQty);
    });
  });

  document.querySelectorAll('.remove-item').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await api.removeCartItem(btn.dataset.id);
        refreshCartBadge();
        renderCart();
      } catch (err) {
        errorMount.innerHTML = errorBannerHtml(err.message);
      }
    });
  });
}

async function updateQuantity(itemId, quantity) {
  const errorMount = document.getElementById('cart-error');
  try {
    await api.updateCartItem(itemId, quantity);
    refreshCartBadge();
    renderCart();
  } catch (err) {
    errorMount.innerHTML = errorBannerHtml(err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  renderCart();
});
