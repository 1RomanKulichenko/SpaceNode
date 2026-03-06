# REST example

This example demonstrates a minimal REST API using SpaceNode's `createApp()` and `setRoute()`.

Run:

```bash
node examples/rest/index.js
```

Endpoints:

- `GET /api/hello` → returns `{ hello: 'world' }`
- `POST /api/echo` → echoes JSON body
