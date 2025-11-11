# Fix Google OAuth for Network Access

When accessing your app from another network, Google OAuth fails because the callback URL uses `localhost`, which doesn't work across networks.

## The Problem

- **Current callback URL:** `localhost:3002/api/auth/google/callback`
- **What happens:** When accessed from another network, `localhost` refers to the client's machine, not your server
- **Error:** `ERR_CONNECTION_REFUSED` - can't connect to localhost:3002

## Solution Options

### Option 1: Use Server IP Address (Quick Fix)

If Google allows IP addresses in redirect URIs, use your server's IP:

1. **Find your server's IP address:**
   ```powershell
   # On the server machine, run:
   ipconfig
   # Look for IPv4 Address (e.g., 192.168.135.180)
   ```

2. **Update Google Cloud Console:**
   - Go to: https://console.cloud.google.com/apis/credentials
   - Edit your OAuth 2.0 Client ID
   - **Authorized redirect URIs:** Add:
     ```
     http://192.168.135.180:3002/api/auth/google/callback
     https://192.168.135.180:3002/api/auth/google/callback
     ```
   - **Authorized JavaScript origins:** Add:
     ```
     http://192.168.135.180:3000
     https://192.168.135.180:3000
     ```

3. **Update Backend `.env` file:**
   ```env
   GOOGLE_CALLBACK_URL=http://192.168.135.180:3002/api/auth/google/callback
   # Or if using HTTPS:
   GOOGLE_CALLBACK_URL=https://192.168.135.180:3002/api/auth/google/callback
   
   CLIENT_URL=http://192.168.135.180:3000
   # Or if using HTTPS:
   CLIENT_URL=https://192.168.135.180:3000
   ```

4. **Update Frontend `.env` file:**
   ```env
   NEXT_PUBLIC_SERVER_URL=http://192.168.135.180:3002
   # Or if using HTTPS:
   NEXT_PUBLIC_SERVER_URL=https://192.168.135.180:3002
   ```

5. **Restart backend:**
   ```powershell
   cd E:\ChatSite\imegle-backend
   npm run start:dev
   ```

### Option 2: Use Domain Name (Recommended for Production)

For production, use a domain name:

1. **Get a domain name** (or use a free one like `noip.com` or `duckdns.org`)
2. **Point it to your server's IP** (DNS A record)
3. **Update Google Cloud Console** with domain-based URLs
4. **Update `.env` files** with domain URLs

### Option 3: Use ngrok (For Testing)

For quick testing without changing Google Console:

1. **Install ngrok:**
   - Download from: https://ngrok.com/download
   - Or use: `choco install ngrok` (if you have Chocolatey)

2. **Start ngrok tunnel:**
   ```powershell
   ngrok http 3002
   ```

3. **Copy the ngrok URL** (e.g., `https://abc123.ngrok.io`)

4. **Update Google Cloud Console:**
   - Add redirect URI: `https://abc123.ngrok.io/api/auth/google/callback`
   - Add JavaScript origin: `https://abc123.ngrok.io`

5. **Update Backend `.env`:**
   ```env
   GOOGLE_CALLBACK_URL=https://abc123.ngrok.io/api/auth/google/callback
   CLIENT_URL=https://abc123.ngrok.io
   ```

**Note:** ngrok URLs change each time you restart (unless you have a paid plan with a fixed domain).

---

## Step-by-Step: Fix with IP Address

### Step 1: Find Your Server IP

On the server machine (where backend runs):

```powershell
ipconfig
```

Look for **IPv4 Address** under your network adapter (e.g., `192.168.135.180`)

### Step 2: Update Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   ```
   http://YOUR_SERVER_IP:3002/api/auth/google/callback
   https://YOUR_SERVER_IP:3002/api/auth/google/callback
   ```
   Replace `YOUR_SERVER_IP` with your actual IP (e.g., `192.168.135.180`)

4. Under **Authorized JavaScript origins**, add:
   ```
   http://YOUR_SERVER_IP:3000
   https://YOUR_SERVER_IP:3000
   ```

5. Click **Save**

### Step 3: Update Backend Configuration

Edit `imegle-backend/.env`:

```env
# Replace localhost with your server IP
GOOGLE_CALLBACK_URL=http://192.168.135.180:3002/api/auth/google/callback
CLIENT_URL=http://192.168.135.180:3000

# If using HTTPS:
# GOOGLE_CALLBACK_URL=https://192.168.135.180:3002/api/auth/google/callback
# CLIENT_URL=https://192.168.135.180:3000
```

### Step 4: Update Frontend Configuration

Edit `imegle-frontend/.env`:

```env
# Replace localhost with your server IP
NEXT_PUBLIC_SERVER_URL=http://192.168.135.180:3002

# If using HTTPS:
# NEXT_PUBLIC_SERVER_URL=https://192.168.135.180:3002
```

### Step 5: Ensure Backend is Accessible

Make sure your backend is listening on all interfaces (not just localhost):

Check `imegle-backend/src/main.ts` - it should have:
```typescript
await app.listen(port, '0.0.0.0');
```

This allows connections from any network interface.

### Step 6: Restart Services

```powershell
# Stop backend (Ctrl+C if running)
# Then restart:
cd E:\ChatSite\imegle-backend
npm run start:dev

# Stop frontend (Ctrl+C if running)
# Then restart:
cd E:\ChatSite\imegle-frontend
npm run dev:https
```

### Step 7: Test from Another Network

1. From another device/network, open: `http://YOUR_SERVER_IP:3000`
2. Click "Sign in with Google"
3. After Google login, you should be redirected back successfully

---

## Important Notes

### ⚠️ Google OAuth and IP Addresses

**Google may not accept IP addresses** in redirect URIs for security reasons. If you get an error when adding the IP-based redirect URI:

1. **Use a domain name** (Option 2 above)
2. **Use ngrok** for testing (Option 3 above)
3. **Use localhost only** and access via VPN/tunneling

### 🔒 HTTPS Requirement

For production, **HTTPS is required** for:
- WebRTC (video chat)
- Secure OAuth callbacks
- Browser security features

Make sure you have SSL certificates set up if using HTTPS.

### 🌐 Firewall Configuration

Ensure your firewall allows:
- **Port 3000** (frontend)
- **Port 3002** (backend)
- **Port 6379** (Redis, if external access needed)

**Windows Firewall:**
```powershell
# Allow port 3000
netsh advfirewall firewall add rule name="Frontend" dir=in action=allow protocol=TCP localport=3000

# Allow port 3002
netsh advfirewall firewall add rule name="Backend" dir=in action=allow protocol=TCP localport=3002
```

### 🔄 Dynamic IP Addresses

If your server's IP address changes:
- Use a **dynamic DNS service** (like noip.com, duckdns.org)
- Or use a **domain name** that points to your IP
- Update Google Console and `.env` files when IP changes

---

## Troubleshooting

### Still getting connection refused?

1. **Check backend is running:**
   ```powershell
   netstat -ano | findstr ":3002"
   ```
   Should show `LISTENING`

2. **Check firewall:**
   - Windows Firewall might be blocking connections
   - Add rules to allow ports 3000 and 3002

3. **Check backend binding:**
   - Backend must listen on `0.0.0.0`, not `127.0.0.1`
   - Check `imegle-backend/src/main.ts` has: `app.listen(port, '0.0.0.0')`

4. **Test backend directly:**
   - From another device, try: `http://YOUR_SERVER_IP:3002/api/auth/test`
   - Should return: `{"message":"Backend is working!"}`

### Google OAuth redirect URI mismatch?

1. **Check Google Console** - Redirect URI must match exactly
2. **Check `.env` file** - `GOOGLE_CALLBACK_URL` must match
3. **Check protocol** - HTTP vs HTTPS must match
4. **Check port** - Port number must match

### Can't access from other network?

1. **Check router/firewall** - May need to port forward
2. **Check server IP** - Make sure you're using the correct IP
3. **Test locally first** - Make sure it works on the same machine
4. **Check network** - Both devices must be on the same network (or use public IP)

---

## Quick Checklist

- [ ] Found server IP address
- [ ] Updated Google Cloud Console redirect URIs
- [ ] Updated Google Cloud Console JavaScript origins
- [ ] Updated `imegle-backend/.env` with IP-based URLs
- [ ] Updated `imegle-frontend/.env` with IP-based URLs
- [ ] Backend listening on `0.0.0.0` (not `127.0.0.1`)
- [ ] Firewall allows ports 3000 and 3002
- [ ] Restarted backend server
- [ ] Restarted frontend server
- [ ] Tested from another device/network

---

**Need more help?** Check the backend logs for detailed error messages.

