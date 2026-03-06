// ─────────────────────────────────────────────
// Auth Service — MongoDB (Mongoose)
// ─────────────────────────────────────────────

import { randomBytes } from 'node:crypto'
import { User } from '../../models/user.model.js'
import { Token } from '../../models/token.model.js'

// ── User Service ──

export const userStore = {
  async create({ name, email, password, role = 'user' }) {
    const existing = await User.findOne({ email })
    if (existing) return null

    const user = await User.create({ name, email, password, role })
    return user
  },

  async getById(id) {
    return User.findById(id)
  },

  async getByEmail(email) {
    return User.findOne({ email })
  },

  async verifyPassword(user, password) {
    return user.verifyPassword(password)
  },
}

// ── Token Service ──

export const tokenStore = {
  async create(userId) {
    const token = randomBytes(32).toString('hex')
    await Token.create({ token, userId })
    return token
  },

  async get(token) {
    return Token.findOne({ token })
  },

  async revoke(token) {
    await Token.deleteOne({ token })
  },
}
