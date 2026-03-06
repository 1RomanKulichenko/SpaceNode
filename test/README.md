# SpaceNode — Test Suite

Unit tests for the SpaceNode framework core. Tests run with Node.js built-in test runner (`node:test`) — no external testing dependencies required.

## Running Tests

```bash
cd test
npm test
```

This runs `app.test.js` by default. To run all test files:

```bash
cd test
node --test *.test.js
```

To run a specific test file:

```bash
node --test container.test.js
```

---

## Test Files

| File                | Module       | Tests | Description                                              |
|---------------------|--------------|-------|----------------------------------------------------------|
| `app.test.js`       | `app.js`     | 32    | App creation, routing, inject, modules, auth, guards, WS |
| `container.test.js` | `container.js` | 20  | DI container: register, resolve, singletons, scopes     |
| `context.test.js`   | `context.js` | 28    | Request context, body parsing, cookies, send/check/guard |
| `events.test.js`    | `events.js`  | 15    | Event bus: on/off/once/emit, error surfacing             |
| `guards.test.js`    | `guards.js`  | 38    | Built-in guards: auth, role, rateLimit, cors, compress   |
| `loader.test.js`    | `loader.js`  | 20    | Module loader: resolvePipes, buildRoutes, createModule   |
| `pipeline.test.js`  | `pipeline.js`| 14    | Pipe execution, after hooks, built-in key protection     |
| **Total**           |              |**167**|                                                          |

---

## What's Covered

### `app.test.js` — Application Core

- **createApp** — instance creation, config defaults, `setDb()`
- **setRoute** — imperative routing (GET, POST, params, 404, validation)
- **inject** — fake HTTP requests for testing (defaults, errors, headers, query)
- **addModule** — programmatic module registration with routes & services
- **setAuth / addGuard** — per-app auth verifier and custom guards
- **onError** — custom error handlers
- **ws** — WebSocket handler registration
- **events** — event bus on app instance
- **container** — DI container access and service registration
- **pipes** — middleware execution before handlers
- **status codes** — `send(201, data)`, `send(204)`

### `container.test.js` — Dependency Injection

- Register / resolve plain objects and factories
- Singleton (lazy, cached) and transient (new instance each time) modes
- Circular dependency detection with chain in error message
- `getAll()` — frozen snapshot of all services
- Scoped containers (per-request DI)
- Unregister / clear operations

### `context.test.js` — Request Context

- Core request properties (`method`, `path`, `params`, `query`, `headers`)
- Cookie parsing with `__proto__` protection
- `x-forwarded-for` IP resolution (trustProxy on/off)
- `send()` — JSON response, custom status, 204, double-send protection
- `check()` / `guard()` — assertion helpers
- `error()` / `redirect()` / `setHeader()` / `cookie()`
- Body parsing: JSON, URL-encoded, multipart, size limits, prototype pollution protection

### `events.test.js` — Event Bus

- `on()` / `emit()` — register and fire listeners
- `once()` — single-fire handlers
- `off()` — remove specific or all listeners
- Error surfacing via `event:error`
- `clear()` / `destroy()`

### `guards.test.js` — Built-in Guards & Middleware

- **auth** — token verification, 401/500 handling, per-app verifier priority
- **role** — role checking, multi-role support (`role:admin,moderator`)
- **rateLimit** — request throttling, 429 response, rate limit headers
- **cors** — wildcard, origin reflection, explicit origin, OPTIONS preflight
- **logger** — after-hook logging
- **compress** — br/gzip/deflate detection, forced encoding, buffer compression
- **security** — security headers, CSP in strict mode

### `loader.test.js` — Module Loader

- **resolvePipes** — function pipes, built-in guards, `dto:` pipes, custom/app guards
- **buildRoutes** — tuple format, object format, string format (throws), missing handler detection, module-level pipe merging, DTO schema detection
- **createModule** — defaults, controllers, services, lifecycle hooks

### `pipeline.test.js` — Request Pipeline

- Sequential pipe execution
- Data merging into request context
- Built-in key protection (prevents pipes from overwriting `send`, `check`, etc.)
- After-hook collection and LIFO execution
- Early exit when `send()` called by a pipe
- Non-function pipe skipping
