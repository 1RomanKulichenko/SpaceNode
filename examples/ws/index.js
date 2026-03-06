import { createApp } from 'spacenode'

// Minimal WebSocket example
const app = await createApp({ static: false })

app.ws('/ws', (socket) => {
  socket.on('message', (msg) => {
    socket.send(`Echo: ${msg}`)
  })
})

app.listen(3002)
console.log('WebSocket example listening on ws://localhost:3002/ws')
