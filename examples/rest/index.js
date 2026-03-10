import { createApp } from '../../src/index.js'

// Minimal REST example using imperative routes
const app = await createApp({ static: false })

app.setRoute('GET', '/api/hello', ({ send }) => {
  send({ hello: 'world' })
})

app.setRoute('POST', '/api/echo', async ({ body, send }) => {
  send(200, { echoed: body })
})

app.listen(3001)
console.log('Example REST app listening on http://localhost:3001')
