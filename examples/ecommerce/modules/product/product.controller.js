// ─────────────────────────────────────────────
// Product Controller — Request handlers
// ─────────────────────────────────────────────

/**
 * GET /products?categoryId=1&search=iphone&page=1&limit=20
 * Public — anyone can browse products.
 */
export async function list({ query, send }, { productStore }) {
  const { categoryId, search, page, limit } = query
  const result = await productStore.list({ categoryId, search, page, limit })
  send(result)
}

/**
 * GET /products/:id
 * Public — view a single product.
 */
export async function getById({ params, check, send }, { productStore }) {
  const product = await productStore.getById(params.id)
  check(product, 404, 'Product not found')
  send(product)
}

/**
 * POST /products
 * Admin only. Body: { name, price, categoryId, description?, stock?, image? }
 */
export async function create(request, { categoryStore, productStore }) {
  const { body, user, check, emit, send } = request

  const category = await categoryStore.getById(body.categoryId)
  check(category, 400, 'Category not found')

  const product = await productStore.create(body)

  await emit('product:created', { productId: product._id, adminId: user.id })

  send(201, product)
}

/**
 * PUT /products/:id
 * Admin only. Body: fields to update.
 */
export async function update(request, { productStore }) {
  const { params, body, user, check, emit, send } = request

  const product = await productStore.update(params.id, body)
  check(product, 404, 'Product not found')

  await emit('product:updated', { productId: product._id, adminId: user.id })

  send(product)
}

/**
 * DELETE /products/:id
 * Admin only. Delete a product.
 */
export async function remove(request, { productStore }) {
  const { params, user, check, emit, send } = request

  const product = await productStore.getById(params.id)
  check(product, 404, 'Product not found')

  await productStore.delete(params.id)

  await emit('product:deleted', { productId: params.id, adminId: user.id })

  send(204)
}
