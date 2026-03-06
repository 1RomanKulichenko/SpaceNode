import mongoose from 'mongoose'

const tokenSchema = new mongoose.Schema({
  token:  { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

export const Token = mongoose.model('Token', tokenSchema)
