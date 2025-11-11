# Quick Fix: Google OAuth from Another Network

Your server IP: **192.168.135.180**

## The Problem
When accessing from another network, Google redirects to `localhost:3002`, which doesn't work because `localhost` refers to the client's machine, not your server.

## Quick Fix (3 Steps)

### Step 1: Update Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   ```
   http://192.168.135.180:3002/api/auth/google/callback
   https://192.168.135.180:3002/api/auth/google/callback
   ```
4. Under **Authorized JavaScript origins**, add:
   ```
   http://192.168.135.180:3000
   https://192.168.135.180:3000
   ```
5. Click **Save**

⚠️ **Note:** If Google shows an error saying IP addresses aren't allowed, see "Alternative Solutions" below.

### Step 2: Update Backend `.env`

Edit `imegle-backend/.env` and change:

```env
# Change from:
GOOGLE_CALLBACK_URL=https://localhost:3002/api/auth/google/callback
CLIENT_URL=https://localhost:3000

# To:
GOOGLE_CALLBACK_URL=http://192.168.135.180:3002/api/auth/google/callback
CLIENT_URL=http://192.168.135.180:3000

# If using HTTPS, use:
# GOOGLE_CALLBACK_URL=https://192.168.135.180:3002/api/auth/google/callback
# CLIENT_URL=https://192.168.135.180:3000
```

### Step 3: Update Frontend `.env`

Edit `imegle-frontend/.env` and change:

```env
# Change from:
NEXT_PUBLIC_SERVER_URL=https://localhost:3002

# To:
NEXT_PUBLIC_SERVER_URL=http://192.168.135.180:3002

# If using HTTPS, use:
# NEXT_PUBLIC_SERVER_URL=https://192.168.135.180:3002
```

### Step 4: Restart Services

```powershell
# Stop backend (Ctrl+C), then:
cd E:\ChatSite\imegle-backend
npm run start:dev

# Stop frontend (Ctrl+C), then:
cd E:\ChatSite\imegle-frontend
npm run dev:https
```

### Step 5: Test

From another device/network:
1. Open: `http://192.168.135.180:3000`
2. Click "Sign in with Google"
3. Should work now! ✅

---

## Alternative Solutions (If Google Rejects IP Addresses)

### Option A: Use ngrok (Easiest for Testing)

1. **Install ngrok:**
   - Download: https://ngrok.com/download
   - Extract and add to PATH

2. **Start tunnel:**
   ```powershell
   ngrok http 3002
   ```

3. **Copy the ngrok URL** (e.g., `https://abc123.ngrok.io`)

4. **Update Google Console:**
   - Redirect URI: `https://abc123.ngrok.io/api/auth/google/callback`
   - JavaScript origin: `https://abc123.ngrok.io`

5. **Update `.env` files** with ngrok URL

**Note:** Free ngrok URLs change each restart. Paid plans have fixed domains.

### Option B: Use Domain Name

1. Get a free domain from:
   - https://www.noip.com (free dynamic DNS)
   - https://www.duckdns.org (free)
   - Or use your own domain

2. Point domain to your IP: `192.168.135.180`

3. Update Google Console and `.env` files with domain name

### Option C: VPN/Tunneling

Use a VPN or SSH tunnel to make the server appear as localhost to clients.

---

## Troubleshooting

### Still getting connection refused?

1. **Check firewall:**
   ```powershell
   # Allow port 3002
   netsh advfirewall firewall add rule name="Backend" dir=in action=allow protocol=TCP localport=3002
   ```

2. **Test backend directly:**
   From another device, try: `http://192.168.135.180:3002/api/auth/test`
   Should return: `{"message":"Backend is working!"}`

3. **Check backend is running:**
   ```powershell
   netstat -ano | findstr ":3002"
   ```
   Should show `LISTENING`

### Google shows "Invalid redirect URI"?

Google may not accept IP addresses. Use one of the alternative solutions above (ngrok, domain name, or VPN).

---

**For detailed instructions, see:** `FIX_NETWORK_OAUTH.md`

