# 🏠 Local Development Setup Guide

## ⚠️ HTTPS Not Required for Local Development!

**Good News:** You don't need HTTPS for local development! Browsers treat `localhost` and `127.0.0.1` as secure contexts even on HTTP.

---

## ✅ Solution 1: Use localhost (Recommended)

### For Frontend:
```bash
# Access via localhost instead of IP
http://localhost:3000
```

### For Backend:
```bash
# Update frontend .env
NEXT_PUBLIC_SERVER_URL=http://localhost:3002
```

**Why this works:**
- Browsers allow `getUserMedia()` on `localhost` even with HTTP
- No SSL certificate needed
- Works for camera/microphone access

---

## ✅ Solution 2: Use IP Address with HTTP

If you need to access from other devices on your network:

### Step 1: Configure Next.js to accept connections

Create or update `imegle-frontend/package.json`:

```json
{
  "scripts": {
    "dev": "next dev -H 0.0.0.0 -p 3000",
    "dev:local": "next dev"
  }
}
```

### Step 2: Access via HTTP (not HTTPS)

```bash
# Use HTTP, not HTTPS
http://192.168.135.180:3000
```

### Step 3: Update Code (Already Done!)

The code has been updated to allow local network IPs (192.168.x.x, 10.x.x.x, 172.x.x.x) for development.

---

## ✅ Solution 3: Set Up Local HTTPS (Advanced)

If you really need HTTPS for local development:

### Step 1: Install mkcert

```bash
# Windows (using Chocolatey)
choco install mkcert

# Or download from: https://github.com/FiloSottile/mkcert/releases
```

### Step 2: Create Local CA

```bash
mkcert -install
```

### Step 3: Generate Certificate

```bash
# In imegle-frontend directory
mkcert -key-file key.pem -cert-file cert.pem localhost 192.168.135.180
```

### Step 4: Configure Next.js

Create `imegle-frontend/server.js`:

```javascript
const { createServer } = require('https')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const httpsOptions = {
  key: fs.readFileSync('./key.pem'),
  cert: fs.readFileSync('./cert.pem'),
}

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(3000, '0.0.0.0', (err) => {
    if (err) throw err
    console.log('> Ready on https://localhost:3000')
  })
})
```

### Step 5: Update package.json

```json
{
  "scripts": {
    "dev": "node server.js"
  }
}
```

---

## 🎯 Recommended Setup for Development

### Option A: Single Machine Development

```bash
# Frontend
cd imegle-frontend
npm run dev
# Access: http://localhost:3000

# Backend
cd imegle-backend
npm run start:dev
# Access: http://localhost:3002
```

**Frontend .env:**
```env
NEXT_PUBLIC_SERVER_URL=http://localhost:3002
```

---

### Option B: Network Access (Multiple Devices)

```bash
# Frontend - allow network access
cd imegle-frontend
npm run dev -- -H 0.0.0.0
# Access: http://192.168.135.180:3000

# Backend - allow network access
cd imegle-backend
# Update .env: CLIENT_URL=http://192.168.135.180:3000
npm run start:dev
```

**Frontend .env:**
```env
NEXT_PUBLIC_SERVER_URL=http://192.168.135.180:3002
```

**Backend .env:**
```env
CLIENT_URL=http://192.168.135.180:3000
```

---

## 🔧 Fixing Your Current Issue

### Problem:
- Trying to access `https://192.168.135.180:5173`
- Getting SSL error

### Solution:

1. **Use HTTP instead:**
   ```
   http://192.168.135.180:3000
   ```
   (Note: Next.js default port is 3000, not 5173)

2. **Or use localhost:**
   ```
   http://localhost:3000
   ```

3. **Update Next.js to accept network connections:**
   ```bash
   # In imegle-frontend/package.json
   "dev": "next dev -H 0.0.0.0"
   ```

---

## ✅ Verification

After setup, test camera access:

1. Open browser console (F12)
2. Run:
   ```javascript
   navigator.mediaDevices.getUserMedia({ video: true, audio: true })
     .then(stream => {
       console.log('✅ Camera access works!')
       stream.getTracks().forEach(track => track.stop())
     })
     .catch(err => {
       console.error('❌ Error:', err.message)
     })
   ```

---

## 📝 Quick Reference

| Scenario | URL | HTTPS Needed? |
|----------|-----|---------------|
| Local development (single machine) | `http://localhost:3000` | ❌ No |
| Network access (same network) | `http://192.168.x.x:3000` | ❌ No* |
| Production | `https://imegle.io` | ✅ Yes |

*Code updated to allow local network IPs for development

---

## 🆘 Troubleshooting

### Issue: Still getting "browser doesn't support" error

**Check:**
1. Are you using `http://` (not `https://`)?
2. Are you using `localhost` or local IP (192.168.x.x)?
3. Is your browser modern? (Chrome 60+, Firefox 55+, Edge 79+)

### Issue: Can't access from other devices

**Solution:**
1. Make sure Next.js is bound to `0.0.0.0`:
   ```bash
   npm run dev -- -H 0.0.0.0
   ```
2. Check firewall allows port 3000
3. Use HTTP, not HTTPS

### Issue: Camera still not working

**Solution:**
1. Check browser permissions (click lock icon in address bar)
2. Make sure you're not on HTTPS with IP address
3. Try `http://localhost:3000` first

---

## 🎉 Summary

**For local development:**
- ✅ Use `http://localhost:3000` (easiest)
- ✅ Or `http://192.168.x.x:3000` (for network access)
- ❌ Don't use HTTPS on local IP addresses
- ✅ Code updated to support local network IPs

**For production:**
- ✅ Must use HTTPS
- ✅ Get SSL certificate
- ✅ See `DEPLOYMENT_GUIDE_COMPLETE.md`

---

**Your code is now updated to work with local network IPs on HTTP!** 🚀


