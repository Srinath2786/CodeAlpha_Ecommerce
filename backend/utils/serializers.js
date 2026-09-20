// Maps a raw DB user row to the shape sent to clients — never includes the password hash.
function toUserResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    role: row.role,
  };
}

function toCategoryResponse(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, description: row.description };
}

function toProductResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    originalPrice: row.original_price ?? null,
    stock: row.stock,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    active: !!row.active,
    category: row.category_id
      ? { id: row.category_id, name: row.category_name }
      : null,
  };
}

function paginate(query) {
  const page = Math.max(0, parseInt(query.page, 10) || 0);
  const size = Math.min(100, Math.max(1, parseInt(query.size, 10) || 12));
  return { page, size, offset: page * size };
}

function pageResponse(content, page, size, totalElements) {
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  return {
    content,
    page,
    size,
    totalElements,
    totalPages,
    last: page >= totalPages - 1,
  };
}

module.exports = { toUserResponse, toCategoryResponse, toProductResponse, paginate, pageResponse };
