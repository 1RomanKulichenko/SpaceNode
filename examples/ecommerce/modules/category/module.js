// ─────────────────────────────────────────────
// Category Module — Product categories
// ─────────────────────────────────────────────

export default {
  prefix: '/categories',
  pipe: ['cors', 'logger'],

  routes: [
    ['GET', '',     'list'],
    ['GET', '/:id', 'getById'],

    ['POST',   '',     'create', ['auth', 'admin', 'dto:createCategoryDto']],
    ['PUT',    '/:id', 'update', ['auth', 'admin', 'dto:updateCategoryDto']],
    ['DELETE', '/:id', 'remove', ['auth', 'admin']],
  ],
}
