// ─────────────────────────────────────────────
// Category Service — MongoDB (Mongoose)
// ─────────────────────────────────────────────

import { Category } from '../../models/category.model.js'

export const categoryStore = {
  async list() {
    return Category.find()
  },

  async getById(id) {
    return Category.findById(id)
  },

  async create(data) {
    return Category.create({
      name:        data.name,
      description: data.description || '',
      icon:        data.icon || '',
    })
  },

  async update(id, data) {
    const allowed = ['name', 'description', 'icon']
    const update = {}
    for (const key of allowed) {
      if (data[key] !== undefined) update[key] = data[key]
    }
    return Category.findByIdAndUpdate(id, update, { new: true })
  },

  async delete(id) {
    const result = await Category.findByIdAndDelete(id)
    return !!result
  },
}
