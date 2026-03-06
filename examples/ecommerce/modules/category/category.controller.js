// ─────────────────────────────────────────────
// Category Controller — Request handlers
// ─────────────────────────────────────────────

/**
 * GET /categories
 * Public — list all categories.
 */
export async function list({ send }, { categoryStore }) {
  const categories = await categoryStore.list()
  send(categories)
}

/**
 * GET /categories/:id
 * Public — single category.
 */
export async function getById({ params, check, send }, { categoryStore }) {
  const category = await categoryStore.getById(params.id)
  check(category, 404, 'Category not found')
  send(category)
}

/**
 * POST /categories
 * Admin only.
 */
export async function create(request, { categoryStore }) {
  const { body, user, emit, send } = request

  const category = await categoryStore.create(body)

  await emit('category:created', { categoryId: category._id, adminId: user.id })

  send(201, category)
}

/**
 * PUT /categories/:id
 * Admin only.
 */
export async function update(request, { categoryStore }) {
  const { params, body, user, check, emit, send } = request

  const category = await categoryStore.update(params.id, body)
  check(category, 404, 'Category not found')

  await emit('category:updated', { categoryId: category._id, adminId: user.id })

  send(category)
}

/**
 * DELETE /categories/:id
 * Admin only.
 */
export async function remove(request, { categoryStore }) {
  const { params, user, check, emit, send } = request

  const category = await categoryStore.getById(params.id)
  check(category, 404, 'Category not found')

  await categoryStore.delete(params.id)

  await emit('category:deleted', { categoryId: params.id, adminId: user.id })

  send(204)
}
