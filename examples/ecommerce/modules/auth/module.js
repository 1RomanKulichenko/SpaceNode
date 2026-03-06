// ─────────────────────────────────────────────
// Auth Module — Register, Login, Profile
// ─────────────────────────────────────────────

export default {
  prefix: '/auth',
  pipe: ['cors', 'logger'],

  routes: [
    ['POST', '/register', 'register', ['dto:registerDto']],
    ['POST', '/login',    'login',    ['dto:loginDto']],
    ['GET',  '/me',       'me',       ['auth']],
  ],
}
