// ─────────────────────────────────────────────
// Category DTOs — Validation schemas
// ─────────────────────────────────────────────

export const createCategoryDto = {
  name:        ['string', 'required', 'min:2', 'max:100'],
  description: ['string', 'max:500'],
  icon:        ['string', 'max:200'],
}

export const updateCategoryDto = {
  name:        ['string', 'min:2', 'max:100'],
  description: ['string', 'max:500'],
  icon:        ['string', 'max:200'],
}
