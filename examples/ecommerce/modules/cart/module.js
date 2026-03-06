// ─────────────────────────────────────────────
// Cart Module — User shopping cart
// ─────────────────────────────────────────────

export default {
  prefix: '/cart',
  pipe: ['cors', 'logger', 'auth'],

  routes: [
    ['GET',    '',           'list'],
    ['POST',   '/items',     'addItem',    ['dto:addItemDto']],
    ['PUT',    '/items/:id', 'updateItem', ['dto:updateItemDto']],
    ['DELETE', '/items/:id', 'removeItem'],
    ['DELETE', '',           'clear'],
  ],
}
