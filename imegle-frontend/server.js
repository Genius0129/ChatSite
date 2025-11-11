const { createServer } = require('https')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')
const path = require('path')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

// Check if certificate files exist
const keyPath = path.join(__dirname, 'key.pem')
const certPath = path.join(__dirname, 'cert.pem')

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.error('❌ Certificate files not found!')
  console.error('Please run: mkcert -key-file key.pem -cert-file cert.pem localhost 192.168.135.180')
  console.error('See setup-https.md for detailed instructions')
  process.exit(1)
}

const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
}

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(3000, '0.0.0.0', (err) => {
    if (err) throw err
    console.log('✅ HTTPS server ready!')
    console.log('> Local: https://localhost:3000')
    console.log('> Network: https://192.168.135.180:3000')
    console.log('')
    console.log('⚠️  Browser will show certificate warning - click "Advanced" → "Proceed"')
  })
})

