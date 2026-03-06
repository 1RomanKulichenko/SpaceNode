# ⚡ SpaceNode

v1.0.2

**Official Site**
https://spacenode.org/

**Revolutionary Node.js microservice framework.**
Auto-discovery modules, pipeline middleware, DI container, event bus, WebSocket — zero dependencies.

> 2× faster than Express. Faster than Fastify. Faster than raw Node.js.

## Install

```bash
npm install spacenode
```

## Quick Start

```
my-api/
  app.js
  modules/
    auth/
      module.js
      auth.controller.js
      auth.service.js
      auth.dto.js
```

**app.js** — 2 lines to run a full microservice:

```js
import { createApp } from 'spacenode'

const app = await createApp()
app.listen(3000)
```

**modules/auth/module.js** — declarative config:

```js
export default {
  name: 'auth',
  prefix: '/auth',
  routes: [
    ['POST', '/login',    'login',    ['dto:loginDto']],
    ['POST', '/register', 'register', ['dto:registerDto']],
    ['GET',  '/me',       'me',       ['auth']],
  ],
}
```

**modules/auth/auth.controller.js** — clean handlers:

```js
// Destructured style — pick only what you need:
export async function login({ body, send, check }, { authService }) {
  const result = await authService.login(body.email, body.password)
  check(result, 401, 'Invalid credentials')
  send(result)
}

// Or use the full request object:
export async function me(request, services) {
  const profile = await services.userService.getProfile(request.user.id)
  request.send({ user: request.user, profile })
}
```

**modules/auth/auth.dto.js** — built-in validation:

```js
export const loginDto = {
  email: ['string', 'required', 'email'],
  password: ['string', 'required', 'min:6'],
}
```

**modules/auth/auth.service.js** — auto-injected via DI:

```js
export const authService = {
  async login(email, password) { /* ... */ },
}
```

That's it. No wiring, no boilerplate. Drop a folder → it works.

## Static Site Server

Serve a static site in 3 lines:

```js
import { createApp } from 'spacenode'

const app = await createApp({ static: './public' })
app.listen(3000)
```

```
my-site/
  app.js
  public/
    index.html
    about.html
    style.css
```

LRU cache, ETag, 304, streaming, path traversal protection out of the box.

For SPA frameworks (React, Vue, Angular) — add `spa: true` to fallback all routes to `index.html`:

```js
const app = await createApp({ static: './public', spa: true })
```



### Auto-Discovery Modules
Drop a folder in `modules/` → framework discovers it automatically.
Convention: `module.js` + `*.controller.js` + `*.service.js` + `*.dto.js`.

### Pipeline Middleware (No `next()`)
```js
// Guards are pure functions — return, throw, or merge state
['GET', '/admin', 'dashboard', ['auth', 'role:admin', 'rateLimit:100']]
```
No callback hell. No `next()`. Each pipe returns or throws.

### DI Container
Services from ALL modules are collected and injected as the second handler argument:
```js
export async function createOrder({ body, send }, { orderService, authService, emailService }) {
  // All services available — zero imports
}
```

Supports singleton, transient, and scoped lifetimes with circular dependency detection.

### Event Bus
Decoupled inter-module communication:
```js
// In controller:
export async function checkout({ send, emit }, { orderService }) {
  const order = await orderService.create(/* ... */)
  await emit('order:created', { orderId: order.id })
  send(201, order)
}

// In another module's module.js:
export default {
  on: { 'order:created': 'onOrderCreated' },
}
```

### WebSocket

Built-in RFC 6455 WebSocket support — no dependencies:

```js
const app = await createApp()

app.ws('/chat', (ws, req, services) => {
  ws.on('message', (data) => {
    ws.send(`Echo: ${data}`)
  })

  ws.on('close', () => {
    console.log('Client disconnected')
  })
})

app.listen(3000)
```

Features: fragment assembly, ping/pong heartbeat, backpressure control (`ws.pause()` / `ws.resume()`), DI services injection, origin validation via `config.wsOrigins`.

### Static File Serving

```js
const app = await createApp({
  static: './public',
  spa: true,  // SPA mode — fallback to index.html for client-side routes
})
```

Features: LRU cache, ETag + 304 responses, streaming for large files, 40+ MIME types, path traversal protection.

### Hot Reload

```js
const app = await createApp({ watch: true })
```

File watcher auto-restarts the server on changes. Uses parent/child process architecture with 150ms debounce. Ignores `node_modules/` and `.git/`.

### OpenAPI

```js
const app = await createApp({
  openapi: {
    title: 'My API',
    version: '1.0.0',
  }
})
// → GET /openapi.json
```

Auto-generates OpenAPI 3.0.3 spec from your modules: routes, path parameters, DTO schemas → JSON Schema, security requirements, tags. Add route-level metadata:

```js
['POST', '/login', 'login', ['dto:loginDto'], {
  summary: 'User login',
  responses: { 200: { description: 'Success' } }
}]
```

### Built-in Guards

| Guard | Usage | Description |
|-------|-------|-------------|
| `auth` | `['auth']` | Bearer token → calls your `defineAuth()` verifier |
| `role:admin` | `['auth', 'role:admin']` | Check user role (requires auth first) |
| `rateLimit:100` | `['rateLimit:100']` | 100 req/min per IP, sliding window |
| `cors` | `['cors']` | CORS headers + preflight |
| `cors:origin` | `['cors:https://example.com']` | CORS with specific origin |
| `logger` | `['logger']` | Request timing log |
| `compress` | `['compress']` | Brotli/Gzip/Deflate response compression |
| `security` | `['security']` | Security headers (XSS, HSTS, X-Frame, etc.) |
| `security:strict` | `['security:strict']` | + CSP, Permissions-Policy, COOP, CORP |

Custom guards:
```js
import { defineGuard } from 'spacenode'

defineGuard('isAdmin', async (request, services) => {
  if (request.user.role !== 'admin') request.error(403, 'Forbidden')
})
```

### Built-in DTO Validation

```js
export const userDto = {
  email: ['string', 'required', 'email'],
  name: ['string', 'required', 'min:2', 'max:50'],
  age: ['number', 'min:18', 'max:99'],
  role: ['string', 'enum:user,admin,seller'],
  bio: ['string', 'optional', 'max:500'],
  metadata: {
    provider: ['string', 'default:github'],
  },
}
```

Built-in rules: `string`, `number`, `boolean`, `array`, `object`, `email`, `url`, `uuid`, `date`, `required`, `optional`, `min`, `max`, `length`, `pattern`, `enum`, `default`.

Supports nested objects and custom validator functions. Also supports Zod/Joi/Yup via `registerAdapter()`.

### Global Pipes

Apply pipes to ALL routes:
```js
const app = await createApp({
  pipe: ['cors', 'logger', 'compress'],
})
```

### Module Lifecycle Hooks

```js
export default {
  name: 'payments',
  prefix: '/payments',
  routes: [...],

  async onInit(services) {
    // Called after all modules loaded — setup connections, caches
  },

  async onDestroy() {
    // Called during graceful shutdown — cleanup resources
  },
}
```

### Cookies

```js
// Read
const token = request.cookies.sessionId

// Set
request.cookie('sessionId', 'abc123', {
  httpOnly: true,
  secure: true,
  sameSite: 'Strict',
  maxAge: 86400_000,
})
```

### Testing with `inject()`

Test routes without starting the server:

```js
const app = await createApp()

const res = await app.inject({
  method: 'POST',
  url: '/auth/login',
  body: { email: 'test@test.com', password: '123456' },
  headers: { 'Authorization': 'Bearer token' },
})

console.log(res.statusCode) // 200
console.log(res.json)       // { token: '...' }
```

### Programmatic Routes

```js
app.setRoute('GET', '/health', (request) => {
  request.send({ status: 'ok' })
}, ['logger'])
```

---

## Database

Two approaches — pick what fits your project:

```js
// Option 1: Pass connection via config.db → available as request.db
import mongoose from 'mongoose'
await mongoose.connect('mongodb://127.0.0.1:27017/myapp')

const app = await createApp({ db: mongoose.connection })

// In controller:
export async function stats({ db, send }) {
  const count = await db.collection('users').countDocuments()
  send({ count })
}
```

```js
// Option 2: Use models directly (Mongoose global connection)
import mongoose from 'mongoose'
await mongoose.connect('mongodb://127.0.0.1:27017/myapp')

const app = await createApp()

// In controller — models work through global connection:
import { User } from './user.model.js'

export async function stats({ send }) {
  const count = await User.countDocuments()
  send({ count })
}
```

`config.db` accepts any database reference (Mongoose connection, Knex instance, pg pool, etc.).

## Auth Setup

```js
import { createApp, defineAuth } from 'spacenode'

defineAuth(async (token) => {
  const session = await Session.findOne({ token, active: true })
  if (!session) return null
  return await User.findById(session.userId) // returned as request.user
})

const app = await createApp()
app.listen(3000)
```

## API Reference

### `createApp(config?)`
| Option | Default | Description |
|--------|---------|-------------|
| `modulesDir` | `'./modules'` | Path to modules folder |
| `db` | `null` | Database reference → `request.db` |
| `debug` | `false` | Enable debug logging |
| `pipe` | `[]` | Global pipes for all routes |
| `static` | `false` | Static files directory (e.g. `'./public'`) |
| `spa` | `false` | SPA mode — fallback to index.html |
| `watch` | `false` | Hot reload on file changes |
| `openapi` | `false` | OpenAPI spec generation (`true` or `{ title, version }`) |
| `wsOrigins` | `null` | Allowed WebSocket origins |
| `timeout` | `30000` | Server timeout (ms) |
| `keepAliveTimeout` | `5000` | Keep-alive timeout (ms) |
| `shutdownTimeout` | `5000` | Graceful shutdown grace period (ms) |

### Request Object (first handler arg)
```js
{
  method, path, params, query, headers, cookies, body, ip,
  db,       // your database reference
  user,     // set by auth guard
  config,   // app config
  send(data),           // send(200, data) or send(data)
  check(val, 404, msg), // assert — if falsy, throw HttpError
  guard(val, 409, msg), // inverse assert — if truthy, throw
  error(500, msg),      // throw HttpError
  emit(event, data),    // emit event
  setHeader(k, v),
  redirect(url, 302),
  html(content, 200),
  cookie(name, value, opts),
}
```

### Exports
```js
import {
  createApp,          // create app with auto-discovery
  dir,                // ESM path helper: dir(import.meta.url, '.env')
  defineAuth,         // define auth verification logic
  defineGuard,        // register custom named guard
  dto,                // create DTO schema
  validate,           // validate data against schema
  registerAdapter,    // register Zod/Joi/Yup adapter
  setBodyParser,      // plug custom body parser (e.g. busboy)
  createModule,       // programmatic module creation
  HttpError,          // throwable HTTP error
  ValidationError,    // 400 validation error
  ModuleError,        // module config error
  Logger,             // structured logger
  EventBus,           // event bus (for manual usage)
  Router,             // trie router (for advanced usage)
  Container,          // DI container (for advanced usage)
  ScopedContainer,    // scoped DI container
} from 'spacenode'
```

## Benchmarks

50 connections, 3 rounds × 30s averaged, Node.js v22:

| Framework | Avg RPS | Avg Latency | vs Raw HTTP |
|-----------|---------|-------------|-------------|
| Raw Node.js | 7,974 | 6.26ms | baseline |
| **SpaceNode** | **9,796** | **5.17ms** | **+22.8%** |
| Fastify 5 | 7,494 | 6.68ms | -6.0% |
| Express 5 | 3,971 | 12.57ms | -50.2% |

## License

MIT
