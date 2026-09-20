document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;

  const user = auth.getUser();
  const summaryAvatar = document.querySelector('.profile-summary .avatar');
  if (summaryAvatar) summaryAvatar.textContent = (user?.fullName || 'U').charAt(0).toUpperCase();
  document.getElementById('email').value = user?.email || '';
  document.getElementById('fullName').value = user?.fullName || '';
  document.getElementById('phone').value = user?.phone || '';
  document.getElementById('address').value = user?.address || '';
  document.getElementById('profile-name').textContent = user?.fullName || 'Your account';
  document.getElementById('profile-role').textContent = user?.role === 'ADMIN' ? 'Administrator' : 'Customer';
  loadProfileStats();

  const form = document.getElementById('profile-form');
  const errorMount = document.getElementById('error-mount');
  const successMount = document.getElementById('success-mount');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMount.innerHTML = '';
    successMount.innerHTML = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
      const updated = await api.updateProfile({
        fullName: document.getElementById('fullName').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        address: document.getElementById('address').value.trim(),
      });
      auth.updateUser(updated);
      successMount.innerHTML = `<div class="success-banner">Profile updated successfully.</div>`;
    } catch (err) {
      errorMount.innerHTML = errorBannerHtml(err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save changes';
    }
  });
});

async function loadProfileStats() {
  try {
    const data = await api.dashboard();
    document.getElementById('profile-orders').textContent = data.stats.orders;
    document.getElementById('profile-wishlist').textContent = data.stats.wishlistItems;
    document.getElementById('profile-cart').textContent = data.stats.cartItems;
    if (data.user?.created_at) document.getElementById('member-since').textContent = `Member since ${new Date(data.user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`;
  } catch { /* The profile form remains usable if stats are unavailable. */ }
}
