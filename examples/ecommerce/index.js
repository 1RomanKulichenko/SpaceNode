// ─────────────────────────────────────────────
// SpaceNode — E-Commerce REST API Example
// ─────────────────────────────────────────────
// Full-featured online store REST API example:
//   • Registration / login / tokens
//   • Roles: user, admin
//   • Products: CRUD (admin) + listing (public)
//   • Categories: CRUD (admin) + listing (public)
//   • Cart: add / remove / list / clear (authenticated)
//
// Run:   node examples/ecommerce/index.js
// Port:  3000

import 'dotenv/config'
import mongoose from 'mongoose'
import { createApp, defineAuth, defineGuard } from 'spacenode'
import { Token } from './models/token.model.js'
import { User } from './models/user.model.js'

// ── Connect to MongoDB ──

await mongoose.connect(process.env.MONGO_URI)
console.log('✅ MongoDB connected')

// ── Auth setup ──

defineAuth(async (token) => {
  const session = await Token.findOne({ token })
  if (!session) return null
  const user = await User.findById(session.userId)
  if (!user) return null
  return user.toSafe()
})

// ── Custom guard: admin only ──

defineGuard('admin', () => (request) => {
  if (!request.user) {
    request.error(401, 'Authorization required')
  }
  if (request.user.role !== 'admin') {
    request.error(403, 'Admin access only')
  }
})

// ── Create application ──

const app = await createApp({
  openapi: true,
  watch: true,
  debug: true,
})

// ── Root route ──

app.setRoute('GET', '/', ({ send }) => {
  send({
    name: 'SpaceNode E-Commerce API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /auth/register': 'Register',
        'POST /auth/login': 'Login',
        'GET  /auth/me': 'Profile (auth)',
      },
      products: {
        'GET    /products': 'List products',
        'GET    /products/:id': 'Single product',
        'POST   /products': 'Create product (admin)',
        'PUT    /products/:id': 'Update product (admin)',
        'DELETE /products/:id': 'Delete product (admin)',
      },
      categories: {
        'GET    /categories': 'List categories',
        'GET    /categories/:id': 'Single category',
        'POST   /categories': 'Create category (admin)',
        'PUT    /categories/:id': 'Update category (admin)',
        'DELETE /categories/:id': 'Delete category (admin)',
      },
      cart: {
        'GET    /cart': 'Cart contents (auth)',
        'POST   /cart/items': 'Add to cart (auth)',
        'PUT    /cart/items/:id': 'Update quantity (auth)',
        'DELETE /cart/items/:id': 'Remove from cart (auth)',
        'DELETE /cart': 'Clear cart (auth)',
      },
    },
  })
})

// ── Start ──

app.listen(3000, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║   E-Commerce API started                  ║
  ║   http://localhost:3000                   ║
  ╚═══════════════════════════════════════════╝
  `)
})
