// ─────────────────────────────────────────────
// Auth DTOs — Input validation schemas
// ─────────────────────────────────────────────

export const registerDto = {
  name:     ['string', 'required', 'min:2', 'max:50'],
  email:    ['string', 'required', 'email'],
  password: ['string', 'required', 'min:6', 'max:100'],
}

export const loginDto = {
  email:    ['string', 'required', 'email'],
  password: ['string', 'required', 'min:1'],
}
