// ─────────────────────────────────────────────
// E-Commerce API — Integration Tests (real MongoDB)
// ─────────────────────────────────────────────
// Runs full API flow against real database.
// Cleans up all test data after completion.
//
// Usage:  node --test examples/ecommerce/test.js
//    or:  cd examples/ecommerce && node --test test.js

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import 'dotenv/config'
import mongoose from 'mongoose'
import { createApp, defineAuth, defineGuard } from 'spacenode'
import { Token } from './models/token.model.js'
import { User } from './models/user.model.js'
import { Product } from './models/product.model.js'
import { Category } from './models/category.model.js'
import { Cart } from './models/cart.model.js'

// ── Test state ──

let app
const TEST_PREFIX = `__test_${Date.now()}_`
const testEmail = `${TEST_PREFIX}user@test.com`
const adminEmail = `${TEST_PREFIX}admin@test.com`
let userToken = null
let adminToken = null
let categoryId = null
let productId = null

// ── Setup ──

before(async () => {
  await mongoose.connect(process.env.MONGO_URI)

  defineAuth(async (token) => {
    const session = await Token.findOne({ token })
    if (!session) return null
    const user = await User.findById(session.userId)
    if (!user) return null
    return user.toSafe()
  })

  defineGuard('admin', () => (request) => {
    if (!request.user) request.error(401, 'Authorization required')
    if (request.user.role !== 'admin') request.error(403, 'Admin access only')
  })

  app = await createApp({
    baseUrl: import.meta.url,
    debug: false,
  })
})

// ── Cleanup ──

after(async () => {
  // Delete all test data
  await User.deleteMany({ email: { $in: [testEmail, adminEmail] } })
  await Token.deleteMany({})
  if (categoryId) await Category.findByIdAndDelete(categoryId)
  if (productId) await Product.findByIdAndDelete(productId)
  // Clean carts for test users
  const testUsers = await User.find({ email: { $in: [testEmail, adminEmail] } })
  for (const u of testUsers) {
    await Cart.deleteMany({ userId: u._id })
  }
  await mongoose.disconnect()
})

// ═══════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════

describe('Auth', () => {
  it('POST /auth/register — should register a new user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      body: { name: 'Test User', email: testEmail, password: 'secret123' },
    })
    assert.strictEqual(res.statusCode, 201)
    assert.ok(res.json.token)
    assert.strictEqual(res.json.user.email, testEmail)
    assert.strictEqual(res.json.user.role, 'user')
    userToken = res.json.token
  })

  it('POST /auth/register — should reject duplicate email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      body: { name: 'Dup', email: testEmail, password: 'secret123' },
    })
    assert.strictEqual(res.statusCode, 409)
  })

  it('POST /auth/register — should reject invalid body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      body: { name: 'X', email: 'bad', password: '1' },
    })
    assert.strictEqual(res.statusCode, 400)
  })

  it('POST /auth/login — should login with valid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      body: { email: testEmail, password: 'secret123' },
    })
    assert.strictEqual(res.statusCode, 200)
    assert.ok(res.json.token)
    userToken = res.json.token
  })

  it('POST /auth/login — should reject wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      body: { email: testEmail, password: 'wrong' },
    })
    assert.strictEqual(res.statusCode, 401)
  })

  it('POST /auth/login — should reject nonexistent email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      body: { email: 'nobody@test.com', password: 'secret123' },
    })
    assert.strictEqual(res.statusCode, 401)
  })

  it('GET /auth/me — should return current user', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.json.user.email, testEmail)
  })

  it('GET /auth/me — should reject without token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
    })
    assert.strictEqual(res.statusCode, 401)
  })

  it('GET /auth/me — should reject invalid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: 'Bearer invalidtoken123' },
    })
    assert.strictEqual(res.statusCode, 401)
  })

  // Create admin for subsequent tests
  it('should create admin user for further tests', async () => {
    const admin = await User.create({
      name: 'Test Admin',
      email: adminEmail,
      password: 'admin123',
      role: 'admin',
    })
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      body: { email: adminEmail, password: 'admin123' },
    })
    assert.strictEqual(res.statusCode, 200)
    adminToken = res.json.token
  })
})

// ═══════════════════════════════════════════
//  CATEGORIES
// ═══════════════════════════════════════════

describe('Categories', () => {
  it('POST /categories — should reject without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/categories',
      body: { name: 'Test Category' },
    })
    assert.strictEqual(res.statusCode, 401)
  })

  it('POST /categories — should reject non-admin', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/categories',
      body: { name: 'Test Category' },
      headers: { authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.statusCode, 403)
  })

  it('POST /categories — should create category (admin)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/categories',
      body: { name: `${TEST_PREFIX}Electronics`, description: 'Test category' },
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.strictEqual(res.statusCode, 201)
    assert.ok(res.json._id)
    assert.strictEqual(res.json.name, `${TEST_PREFIX}Electronics`)
    categoryId = res.json._id
  })

  it('GET /categories — should list categories (public)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/categories',
    })
    assert.strictEqual(res.statusCode, 200)
    assert.ok(Array.isArray(res.json))
    assert.ok(res.json.some(c => c._id === categoryId))
  })

  it('GET /categories/:id — should get single category', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/categories/${categoryId}`,
    })
    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.json._id, categoryId)
  })

  it('GET /categories/:id — should 404 for nonexistent', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString()
    const res = await app.inject({
      method: 'GET',
      url: `/categories/${fakeId}`,
    })
    assert.strictEqual(res.statusCode, 404)
  })

  it('PUT /categories/:id — should update category (admin)', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/categories/${categoryId}`,
      body: { name: `${TEST_PREFIX}Updated Electronics` },
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.json.name, `${TEST_PREFIX}Updated Electronics`)
  })

  it('PUT /categories/:id — should reject non-admin', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/categories/${categoryId}`,
      body: { name: 'Hacked' },
      headers: { authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.statusCode, 403)
  })
})

// ═══════════════════════════════════════════
//  PRODUCTS
// ═══════════════════════════════════════════

describe('Products', () => {
  it('POST /products — should reject without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/products',
      body: { name: 'Phone', price: 999, categoryId },
    })
    assert.strictEqual(res.statusCode, 401)
  })

  it('POST /products — should reject non-admin', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/products',
      body: { name: 'Phone', price: 999, categoryId },
      headers: { authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.statusCode, 403)
  })

  it('POST /products — should create product (admin)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/products',
      body: {
        name: `${TEST_PREFIX}iPhone 16`,
        price: 999,
        categoryId,
        description: 'Test product',
        stock: 10,
      },
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.strictEqual(res.statusCode, 201)
    assert.ok(res.json._id)
    assert.strictEqual(res.json.name, `${TEST_PREFIX}iPhone 16`)
    assert.strictEqual(res.json.price, 999)
    assert.strictEqual(res.json.stock, 10)
    productId = res.json._id
  })

  it('POST /products — should reject invalid body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/products',
      body: { name: 'X', price: -1 },
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.strictEqual(res.statusCode, 400)
  })

  it('POST /products — should reject invalid category', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString()
    const res = await app.inject({
      method: 'POST',
      url: '/products',
      body: { name: 'Test', price: 10, categoryId: fakeId },
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.strictEqual(res.statusCode, 400)
  })

  it('GET /products — should list products (public)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/products',
    })
    assert.strictEqual(res.statusCode, 200)
    assert.ok(res.json.items)
    assert.ok(res.json.total >= 1)
    assert.ok(res.json.page === 1)
  })

  it('GET /products?search= — should filter by search', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/products?search=${TEST_PREFIX}iPhone`,
    })
    assert.strictEqual(res.statusCode, 200)
    assert.ok(res.json.items.length >= 1)
    assert.ok(res.json.items[0].name.includes('iPhone'))
  })

  it('GET /products?categoryId= — should filter by category', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/products?categoryId=${categoryId}`,
    })
    assert.strictEqual(res.statusCode, 200)
    assert.ok(res.json.items.length >= 1)
  })

  it('GET /products/:id — should get single product', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/products/${productId}`,
    })
    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.json._id, productId)
  })

  it('GET /products/:id — should 404 for nonexistent', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString()
    const res = await app.inject({
      method: 'GET',
      url: `/products/${fakeId}`,
    })
    assert.strictEqual(res.statusCode, 404)
  })

  it('PUT /products/:id — should update product (admin)', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/products/${productId}`,
      body: { price: 1099, stock: 5 },
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.json.price, 1099)
    assert.strictEqual(res.json.stock, 5)
  })

  it('PUT /products/:id — should reject non-admin', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/products/${productId}`,
      body: { price: 1 },
      headers: { authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.statusCode, 403)
  })
})

// ═══════════════════════════════════════════
//  CART
// ═══════════════════════════════════════════

describe('Cart', () => {
  it('GET /cart — should reject without auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/cart',
    })
    assert.strictEqual(res.statusCode, 401)
  })

  it('GET /cart — should return empty cart', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/cart',
      headers: { authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.statusCode, 200)
    assert.deepStrictEqual(res.json.items, [])
    assert.strictEqual(res.json.total, 0)
  })

  it('POST /cart/items — should add product to cart', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/cart/items',
      body: { productId, quantity: 2 },
      headers: { authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.statusCode, 201)
    assert.ok(res.json.message.includes('added to cart'))
  })

  it('POST /cart/items — should reject nonexistent product', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString()
    const res = await app.inject({
      method: 'POST',
      url: '/cart/items',
      body: { productId: fakeId, quantity: 1 },
      headers: { authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.statusCode, 404)
  })

  it('POST /cart/items — should reject exceeding stock', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/cart/items',
      body: { productId, quantity: 50 },
      headers: { authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.statusCode, 400)
    assert.ok(res.json.error.includes('stock'))
  })

  it('GET /cart — should show cart with item', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/cart',
      headers: { authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.statusCode, 200)
    assert.strictEqual(res.json.count, 1)
    assert.ok(res.json.total > 0)
  })

  it('PUT /cart/items/:id — should update quantity', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/cart/items/${productId}`,
      body: { quantity: 3 },
      headers: { authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.statusCode, 200)
  })

  it('PUT /cart/items/:id — should reject exceeding stock', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/cart/items/${productId}`,
      body: { quantity: 999 },
      headers: { authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.statusCode, 400)
  })

  it('DELETE /cart/items/:id — should remove item from cart', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/cart/items/${productId}`,
      headers: { authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.statusCode, 200)
    assert.ok(res.json.message.includes('removed'))
  })

  it('DELETE /cart/items/:id — should 404 for item not in cart', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString()
    const res = await app.inject({
      method: 'DELETE',
      url: `/cart/items/${fakeId}`,
      headers: { authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.statusCode, 404)
  })

  it('POST /cart/items + DELETE /cart — should clear entire cart', async () => {
    // Add item first
    await app.inject({
      method: 'POST',
      url: '/cart/items',
      body: { productId, quantity: 1 },
      headers: { authorization: `Bearer ${userToken}` },
    })

    // Clear
    const res = await app.inject({
      method: 'DELETE',
      url: '/cart',
      headers: { authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.statusCode, 200)
    assert.ok(res.json.message.includes('cleared'))

    // Verify empty
    const check = await app.inject({
      method: 'GET',
      url: '/cart',
      headers: { authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(check.json.count, 0)
  })
})

// ═══════════════════════════════════════════
//  DELETE operations (cleanup-safe order)
// ═══════════════════════════════════════════

describe('Delete operations', () => {
  it('DELETE /products/:id — should delete product (admin)', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/products/${productId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.strictEqual(res.statusCode, 204)
  })

  it('DELETE /products/:id — should 404 after deletion', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/products/${productId}`,
    })
    assert.strictEqual(res.statusCode, 404)
  })

  it('DELETE /products/:id — should reject non-admin', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString()
    const res = await app.inject({
      method: 'DELETE',
      url: `/products/${fakeId}`,
      headers: { authorization: `Bearer ${userToken}` },
    })
    assert.strictEqual(res.statusCode, 403)
  })

  it('DELETE /categories/:id — should delete category (admin)', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/categories/${categoryId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    })
    assert.strictEqual(res.statusCode, 204)
  })

  it('DELETE /categories/:id — should 404 after deletion', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/categories/${categoryId}`,
    })
    assert.strictEqual(res.statusCode, 404)
  })
})
