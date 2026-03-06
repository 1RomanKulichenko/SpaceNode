import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema({
  name:        { type: String, required: true, minlength: 2 },
  description: { type: String, default: '' },
  icon:        { type: String, default: '' },
}, { timestamps: true })

export const Category = mongoose.model('Category', categorySchema)
