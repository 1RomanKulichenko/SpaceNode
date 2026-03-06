// ─────────────────────────────────────────────
// Cart Service — MongoDB (Mongoose)
// ─────────────────────────────────────────────

import { Cart } from '../../models/cart.model.js'

export const cartStore = {
  async list(userId) {
    const cart = await Cart.findOne({ userId }).populate('items.productId', 'name price image')
    if (!cart || !cart.items.length) return { items: [], total: 0, count: 0 }

    // Filter out items whose product was deleted (populate returns null)
    const validItems = cart.items.filter(i => i.productId && typeof i.productId === 'object')
    const total = validItems.reduce((sum, i) => sum + i.productId.price * i.quantity, 0)
    return { items: validItems, total, count: validItems.length }
  },

  async getCart(userId) {
    return Cart.findOne({ userId })
  },

  async addItem(userId, productId, quantity = 1) {
    const has = await Cart.exists({ userId, 'items.productId': productId })

    if (has) {
      return Cart.findOneAndUpdate(
        { userId, 'items.productId': productId },
        { $inc: { 'items.$.quantity': quantity } },
        { new: true }
      )
    }

    return Cart.findOneAndUpdate(
      { userId },
      { $push: { items: { productId, quantity } } },
      { new: true, upsert: true }
    )
  },

  async updateItem(userId, productId, quantity) {
    if (quantity <= 0) return this.removeItem(userId, productId)

    return Cart.findOneAndUpdate(
      { userId, 'items.productId': productId },
      { $set: { 'items.$.quantity': quantity } },
      { new: true }
    )
  },

  async removeItem(userId, productId) {
    return Cart.findOneAndUpdate(
      { userId },
      { $pull: { items: { productId } } },
      { new: true }
    )
  },

  async clear(userId) {
    return Cart.findOneAndUpdate({ userId }, { $set: { items: [] } }, { new: true })
  },
}
