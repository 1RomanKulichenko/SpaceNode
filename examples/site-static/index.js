import { createApp } from 'spacenode'

// Serve the existing site/public as a static site.
// Path is relative to this script's location (examples/site-static/)
const app = await createApp({ 
    static: './public', 
    spa: false, 
    watch: true, 
    debug: true 
})

app.listen(3003)
console.log('Static site example: http://localhost:3003')
