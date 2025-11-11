# 🚀 Quick HTTPS Setup for Video Chat

## Problem
Your browser disables camera/microphone permissions when accessing via HTTP on a local network IP (`http://192.168.135.180:3000`). This is a browser security requirement.

## ✅ Solution 1: Use localhost (Easiest - if on same machine)

If you're accessing from the same computer where the server is running:

1. **Access via localhost instead:**
   ```
   http://localhost:3000
   ```

2. **Update your frontend .env file:**
   ```env
   NEXT_PUBLIC_SERVER_URL=http://localhost:3002
   ```

3. **Restart the frontend:**
   ```powershell
   cd imegle-frontend
   npm run dev
   ```

**That's it!** localhost works with HTTP for camera/microphone permissions.

---

## ✅ Solution 2: Setup HTTPS (Required for network access)

If you need to access from other devices on your network, you need HTTPS.

### Step 1: Install mkcert

**Windows (PowerShell as Administrator):**
```powershell
# Using Chocolatey
choco install mkcert

# OR download from: https://github.com/FiloSottile/mkcert/releases
# Extract and add to PATH
```

**Or download manually:**
- Go to: https://github.com/FiloSottile/mkcert/releases
- Download `mkcert-v1.4.4-windows-amd64.exe` (or latest)
- Rename to `mkcert.exe` and place in a folder in your PATH

### Step 2: Install Local CA

```powershell
mkcert -install
```

This installs a local Certificate Authority that your browser will trust.

### Step 3: Generate Certificate

```powershell
cd imegle-frontend
mkcert -key-file key.pem -cert-file cert.pem localhost 192.168.135.180
```

Replace `192.168.135.180` with your actual IP address.

### Step 4: Create HTTPS Server

Create `imegle-frontend/server.js`:

```javascript
const { createServer } = require('https')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')
const path = require('path')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert.pem')),
}

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(3000, '0.0.0.0', (err) => {
    if (err) throw err
    console.log('> Ready on https://localhost:3000')
    console.log('> Also accessible at https://192.168.135.180:3000')
  })
})
```

### Step 5: Update package.json

Add a new script to `imegle-frontend/package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:https": "node server.js",
    "dev:local": "next dev"
  }
}
```

### Step 6: Start with HTTPS

```powershell
cd imegle-frontend
npm run dev:https
```

### Step 7: Access via HTTPS

```
https://192.168.135.180:3000
```

**Note:** Your browser will show a warning about the certificate. Click "Advanced" → "Proceed to site" (this is safe because you created the certificate yourself).

---

## ✅ Solution 3: Browser Flag (Not Recommended)

You can force Chrome to allow insecure media, but this is **not recommended** for security reasons:

1. Close all Chrome windows
2. Start Chrome with flag:
   ```powershell
   chrome.exe --unsafely-treat-insecure-origin-as-secure=http://192.168.135.180:3000
   ```

**Warning:** This reduces security and is only for testing.

---

## 🎯 Recommended Approach

**For development on same machine:** Use `http://localhost:3000` (Solution 1)

**For network access:** Set up HTTPS (Solution 2) - takes 5 minutes and works properly

---

## ✅ Verification

After setup, test camera access:

1. Open browser console (F12)
2. Run:
   ```javascript
   navigator.mediaDevices.getUserMedia({ video: true, audio: true })
     .then(() => console.log('✅ Camera/microphone access works!'))
     .catch(err => console.error('❌ Error:', err))
   ```

3. Check browser settings - Camera/Microphone should now be enabled (not grayed out)

---

## 📝 Troubleshooting

**Certificate error?**
- Make sure you ran `mkcert -install`
- Check that `key.pem` and `cert.pem` exist in `imegle-frontend/` folder

**Port already in use?**
- Change port in `server.js` from `3000` to another port (e.g., `3001`)
- Update your access URL accordingly

**Still not working?**
- Make sure you're accessing via `https://` not `http://`
- Check browser console for errors
- Try clearing browser cache and cookies

