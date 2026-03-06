// ─────────────────────────────────────────────
// Auth Controller — Request handlers
// ─────────────────────────────────────────────

/**
 * POST /auth/register
 * Body: { name, email, password }
 * → { user, token }
 */
export async function register(request, { userStore, tokenStore }) {
  const { body, guard, check, emit, send } = request
  const { name, email, password } = body

  const existing = await userStore.getByEmail(email)
  guard(existing, 409, 'User with this email already exists')

  const user = await userStore.create({ name, email, password })
  check(user, 500, 'Failed to create user')

  const token = await tokenStore.create(user._id)

  await emit('auth:register', { userId: user._id, email })

  const safe = user.toSafe()
  send(201, {
    user: { id: safe.id, name: safe.name, email: safe.email, role: safe.role },
    token,
  })
}

/**
 * POST /auth/login
 * Body: { email, password }
 * → { user, token }
 */
export async function login(request, { userStore, tokenStore }) {
  const { body, check, emit, send } = request
  const { email, password } = body

  const user = await userStore.getByEmail(email)
  check(user, 401, 'Invalid email or password')

  const valid = await userStore.verifyPassword(user, password)
  check(valid, 401, 'Invalid email or password')

  const token = await tokenStore.create(user._id)

  await emit('auth:login', { userId: user._id, email })

  const safe = user.toSafe()
  send({
    user: { id: safe.id, name: safe.name, email: safe.email, role: safe.role },
    token,
  })
}

/**
 * GET /auth/me
 * Headers: Authorization: Bearer <token>
 * → { user }
 */
export function me({ user, send }) {
  send({ user })
}
