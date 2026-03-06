// ─────────────────────────────────────────────
// Product Service — MongoDB (Mongoose)
// ─────────────────────────────────────────────

import { Product } from '../../models/product.model.js'

export const productStore = {
  async create({ name, price, categoryId, description = '', stock = 0, image = '' }) {
    return Product.create({ name, price, categoryId, description, stock, image })
  },

  async getById(id) {
    return Product.findById(id)
  },

  async list({ categoryId, search, page = 1, limit = 20, onlyActive = true } = {}) {
    const filter = {}

    if (onlyActive) filter.active = true
    if (categoryId) filter.categoryId = categoryId
    if (search) {
      const regex = new RegExp(search, 'i')
      filter.$or = [{ name: regex }, { description: regex }]
    }

    const total = await Product.countDocuments(filter)
    const offset = (Number(page) - 1) * Number(limit)
    const items = await Product.find(filter).skip(offset).limit(Number(limit))

    return {
      items,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    }
  },

  async update(id, data) {
    const allowed = ['name', 'price', 'categoryId', 'description', 'stock', 'image', 'active']
    const update = {}
    for (const key of allowed) {
      if (data[key] !== undefined) update[key] = data[key]
    }
    return Product.findByIdAndUpdate(id, update, { new: true })
  },

  async delete(id) {
    const result = await Product.findByIdAndDelete(id)
    return !!result
  },
}
