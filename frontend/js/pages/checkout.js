document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  const mount = document.getElementById('content');
  mount.innerHTML = loadingHtml('Loading cart...');

  let cart;
  try {
    cart = await api.getCart();
  } catch (err) {
    mount.innerHTML = errorBannerHtml(err.message);
    return;
  }

  if (cart.items.length === 0) {
    location.href = 'cart.html';
    return;
  }

  const user = auth.getUser();

  mount.innerHTML = `
    <div class="checkout-steps"><span class="active">1 Address</span><span>2 Review order</span><span>3 Payment</span><span>4 Confirmation</span></div>
    <div class="two-col">
      <div class="card card-pad">
        <div id="error-mount"></div>
        <h2 style="margin-top:0;">Shipping details</h2>
        <form id="checkout-form">
          <div class="field">
            <label for="shippingName">Full name</label>
            <input class="input" id="shippingName" required value="${escapeHtml(user?.fullName || '')}" />
            <div class="field-error hidden" id="err-shippingName"></div>
          </div>
          <div class="field">
            <label for="shippingAddress">Address</label>
            <textarea class="input" id="shippingAddress" rows="3" required>${escapeHtml(user?.address || '')}</textarea>
            <div class="field-error hidden" id="err-shippingAddress"></div>
          </div>
          <div class="field">
            <label for="shippingPhone">Phone</label>
            <input class="input" id="shippingPhone" required value="${escapeHtml(user?.phone || '')}" />
            <div class="field-error hidden" id="err-shippingPhone"></div>
          </div>
          <fieldset class="field payment-options"><legend>Payment</legend><label><input type="radio" name="paymentMethod" value="COD" checked> Cash on Delivery</label><label><input type="radio" name="paymentMethod" value="MOCK_ONLINE"> Mock online payment <small>(demo only, no card details stored)</small></label></fieldset>
          <button type="submit" class="btn btn-primary btn-block" id="submit-btn">Review and place order — ${formatINR(cart.total)}</button>
        </form>
      </div>

      <div class="card card-pad" style="height:fit-content;">
        <h2 style="margin-top:0;">Order summary</h2>
        <div style="max-height:320px;overflow-y:auto;">
          ${cart.items
            .map(
              (item) => `
            <div style="display:flex;justify-content:space-between;font-size:0.9rem;padding:6px 0;">
              <span style="color:var(--gray-600);">${escapeHtml(item.productName)} × ${item.quantity}</span>
              <span style="font-weight:600;">${formatINR(item.subtotal)}</span>
            </div>`
            )
            .join('')}
        </div>
        <div style="border-top:1px solid var(--gray-100);margin-top:16px;padding-top:16px;display:flex;justify-content:space-between;font-weight:700;">
          <span>Total</span>
          <span>${formatINR(cart.total)}</span>
        </div>
      </div>
    </div>
  `;

  document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorMount = document.getElementById('error-mount');
    const submitBtn = document.getElementById('submit-btn');
    errorMount.innerHTML = '';
    for (const id of ['shippingName', 'shippingAddress', 'shippingPhone']) {
      document.getElementById('err-' + id).classList.add('hidden');
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Placing order...';

    try {
      const order = await api.checkout({
        shippingName: document.getElementById('shippingName').value.trim(),
        shippingAddress: document.getElementById('shippingAddress').value.trim(),
        shippingPhone: document.getElementById('shippingPhone').value.trim(),
        paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value,
      });
      location.href = `checkout/order-success.html?id=${order.id}`;
    } catch (err) {
      errorMount.innerHTML = errorBannerHtml(err.message);
      if (err.fieldErrors) {
        for (const [field, message] of Object.entries(err.fieldErrors)) {
          const el = document.getElementById('err-' + field);
          if (el) {
            el.textContent = message;
            el.classList.remove('hidden');
          }
        }
      }
      submitBtn.disabled = false;
      submitBtn.textContent = `Place Order — ${formatINR(cart.total)}`;
    }
  });
});
