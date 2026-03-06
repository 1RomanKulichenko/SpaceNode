// ─────────────────────────────────────────────
// Cart DTOs — Validation schemas
// ─────────────────────────────────────────────

export const addItemDto = {
  productId: ['string', 'required'],
  quantity:  ['number', 'min:1', 'max:99'],
}

export const updateItemDto = {
  quantity: ['number', 'required', 'min:0', 'max:99'],
}
