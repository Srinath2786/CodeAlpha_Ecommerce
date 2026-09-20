// Plain fetch wrapper — no build step, no bundler. Works when the frontend
// is served by Express itself (same origin) or by a separate static server
// (Live Server etc.), as long as API_BASE_URL below is correct for your setup.
const API_BASE_URL = window.API_BASE_URL || '/api';
const apiAuthRoot = /\/(shop|account|checkout|admin)\//.test(location.pathname) ? '../' : '';

async function apiRequest(path, { method = 'GET', body, params, auth = true } = {}) {
  let url = API_BASE_URL + path;
  if (params) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    if (query) url += '?' + query;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = localStorage.getItem('token');
    if (token) headers.Authorization = 'Bearer ' + token;
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw { status: 0, message: 'Could not reach the server. Is the backend running?' };
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try { data = JSON.parse(text); } catch { /* non-JSON response, e.g. 204 */ }
  }

  if (!response.ok) {
    if (response.status === 401 && auth) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!location.pathname.endsWith('login.html')) {
        location.href = `${apiAuthRoot}login.html`;
      }
    }
    throw {
      status: response.status,
      message:
        data?.message ||
        (response.status === 403 && 'You do not have permission to do that.') ||
        (response.status === 404 && 'The requested resource was not found.') ||
        (response.status === 500 && 'Something went wrong on our end. Please try again.') ||
        'An unexpected error occurred.',
      fieldErrors: data?.fieldErrors || null,
    };
  }

  return data;
}

const api = {
  // auth
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => apiRequest('/auth/me'),
  updateProfile: (payload) => apiRequest('/auth/me', { method: 'PUT', body: payload }),
  dashboard: () => apiRequest('/dashboard'),

  // products / categories
  listProducts: (params) => apiRequest('/products', { params, auth: false }),
  getProduct: (id) => apiRequest(`/products/${id}`, { auth: false }),
  listCategories: () => apiRequest('/categories', { auth: false }),

  // cart
  getCart: () => apiRequest('/cart'),
  addCartItem: (productId, quantity) => apiRequest('/cart/items', { method: 'POST', body: { productId, quantity } }),
  updateCartItem: (itemId, quantity) => apiRequest(`/cart/items/${itemId}`, { method: 'PUT', params: { quantity } }),
  removeCartItem: (itemId) => apiRequest(`/cart/items/${itemId}`, { method: 'DELETE' }),
  clearCart: () => apiRequest('/cart', { method: 'DELETE' }),

  // wishlist / reviews
  getWishlist: () => apiRequest('/wishlist'),
  addToWishlist: (productId) => apiRequest(`/wishlist/${productId}`, { method: 'POST' }),
  removeFromWishlist: (productId) => apiRequest(`/wishlist/${productId}`, { method: 'DELETE' }),
  getReviews: (productId) => apiRequest(`/reviews/product/${productId}`, { auth: false }),
  saveReview: (productId, payload) => apiRequest(`/reviews/product/${productId}`, { method: 'POST', body: payload }),
  deleteReview: (reviewId) => apiRequest(`/reviews/${reviewId}`, { method: 'DELETE' }),

  // orders
  checkout: (payload) => apiRequest('/orders/checkout', { method: 'POST', body: payload }),
  myOrders: (page = 0, size = 10) => apiRequest('/orders', { params: { page, size } }),
  getOrder: (id) => apiRequest(`/orders/${id}`),

  // admin
  adminCreateProduct: (payload) => apiRequest('/admin/products', { method: 'POST', body: payload }),
  adminUpdateProduct: (id, payload) => apiRequest(`/admin/products/${id}`, { method: 'PUT', body: payload }),
  adminUpdateStock: (id, stock) => apiRequest(`/admin/products/${id}/stock`, { method: 'PATCH', body: { stock } }),
  adminDeleteProduct: (id) => apiRequest(`/admin/products/${id}`, { method: 'DELETE' }),
  adminCreateCategory: (payload) => apiRequest('/admin/categories', { method: 'POST', body: payload }),
  adminAllOrders: (page = 0, size = 15) => apiRequest('/admin/orders', { params: { page, size } }),
  adminUpdateOrderStatus: (id, status) => apiRequest(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status } }),
  adminDashboard: () => apiRequest('/admin/dashboard'),
  adminSalesAnalytics: () => apiRequest('/admin/analytics/sales'),
  adminOrdersAnalytics: () => apiRequest('/admin/analytics/orders'),
  adminProductsAnalytics: () => apiRequest('/admin/analytics/products'),
  adminCustomersAnalytics: () => apiRequest('/admin/analytics/customers'),
  adminLowStock: () => apiRequest('/admin/low-stock'),
  adminCustomers: () => apiRequest('/admin/customers'),
  adminCategories: () => apiRequest('/admin/categories'),
  adminDeleteCategory: (id) => apiRequest(`/admin/categories/${id}`, { method: 'DELETE' }),
  adminCoupons: () => apiRequest('/admin/coupons'),
  adminToggleCoupon: (id, active) => apiRequest(`/admin/coupons/${id}`, { method: 'PATCH', body: { active } }),
  adminReviews: () => apiRequest('/admin/reviews'),
  adminDeleteReview: (id) => apiRequest(`/admin/reviews/${id}`, { method: 'DELETE' }),
};
