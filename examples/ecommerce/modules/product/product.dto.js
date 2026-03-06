// ─────────────────────────────────────────────
// Product DTOs — Validation schemas
// ─────────────────────────────────────────────

export const createProductDto = {
  name:        ['string', 'required', 'min:2', 'max:200'],
  price:       ['number', 'required', 'min:0'],
  categoryId:  ['string', 'required'],
  description: ['string', 'max:2000'],
  stock:       ['number', 'min:0'],
  image:       ['string', 'max:500'],
}

export const updateProductDto = {
  name:        ['string', 'min:2', 'max:200'],
  price:       ['number', 'min:0'],
  categoryId:  ['string'],
  description: ['string', 'max:2000'],
  stock:       ['number', 'min:0'],
  image:       ['string', 'max:500'],
  active:      ['boolean'],
}
