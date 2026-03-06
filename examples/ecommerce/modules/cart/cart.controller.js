// ─────────────────────────────────────────────
// Cart Controller — Request handlers
// ─────────────────────────────────────────────

/**
 * GET /cart
 * Get current user's cart contents.
 */
export async function list({ user, send }, { cartStore }) {
  const cart = await cartStore.list(user.id)
  send(cart)
}

/**
 * POST /cart/items
 * Add a product to the cart.
 * Body: { productId: number, quantity?: number }
 */
export async function addItem(request, { productStore, cartStore }) {
  const { body, user, check, emit, send } = request
  const { productId, quantity = 1 } = body

  const product = await productStore.getById(productId)
  check(product, 404, 'Product not found')
  check(product.active, 400, 'Product is not available for purchase')
  check(product.stock >= quantity, 400, `Not enough stock (available: ${product.stock})`)

  const item = await cartStore.addItem(user.id, productId, quantity)

  await emit('cart:item-added', { userId: user.id, productId, quantity })

  send(201, { message: `${product.name} added to cart`, item })
}

/**
 * PUT /cart/items/:id
 * Update item quantity in the cart.
 * Body: { quantity: number }
 * :id is productId
 */
export async function updateItem(request, { productStore, cartStore }) {
  const { params, body, user, check, send } = request
  const productId = params.id
  const { quantity } = body

  if (quantity > 0) {
    const product = await productStore.getById(productId)
    check(product, 404, 'Product not found')
    check(product.stock >= quantity, 400, `Not enough stock (available: ${product.stock})`)
  }

  const item = await cartStore.updateItem(user.id, productId, quantity)
  check(item, 404, 'Product not found in cart')

  send(item)
}

/**
 * DELETE /cart/items/:id
 * Remove a product from the cart.
 * :id is productId
 */
export async function removeItem(request, { cartStore }) {
  const { params, user, check, emit, send } = request
  const productId = params.id

  const cartBefore = await cartStore.getCart(user.id)
  const hadItem = cartBefore?.items.some(i => String(i.productId) === String(productId))
  check(hadItem, 404, 'Product not found in cart')

  await cartStore.removeItem(user.id, productId)

  await emit('cart:item-removed', { userId: user.id, productId })

  send({ message: 'Product removed from cart' })
}

/**
 * DELETE /cart
 * Clear the entire cart.
 */
export async function clear({ user, send }, { cartStore }) {
  await cartStore.clear(user.id)
  send({ message: 'Cart cleared' })
}
