import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true, minlength: 2, maxlength: 200 },
  price:       { type: Number, required: true, min: 0 },
  categoryId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  description: { type: String, default: '', maxlength: 2000 },
  stock:       { type: Number, default: 0, min: 0 },
  image:       { type: String, default: '' },
  active:      { type: Boolean, default: true },
}, { timestamps: true })

export const Product = mongoose.model('Product', productSchema)
