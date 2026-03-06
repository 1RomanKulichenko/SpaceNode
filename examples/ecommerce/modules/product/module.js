// ─────────────────────────────────────────────
// Product Module — Products
// ─────────────────────────────────────────────
// GET  /products         — all products (public)
// GET  /products/:id     — single product (public)
// POST /products         — create (admin)
// PUT  /products/:id     — update (admin)
// DELETE /products/:id   — delete (admin)

export default {
  prefix: '/products',
  pipe: ['cors', 'logger'],

  routes: [
    ['GET', '',     'list'],
    ['GET', '/:id', 'getById'],

    ['POST',   '',     'create',  ['auth', 'admin', 'dto:createProductDto']],
    ['PUT',    '/:id', 'update',  ['auth', 'admin', 'dto:updateProductDto']],
    ['DELETE', '/:id', 'remove',  ['auth', 'admin']],
  ],
}
