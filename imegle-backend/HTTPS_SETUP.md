# 🔒 Backend HTTPS Setup

The backend has been configured to automatically use HTTPS when certificates are present.

## ✅ What's Done

1. ✅ Certificates copied to backend folder (`key.pem` and `cert.pem`)
2. ✅ Backend code updated to detect and use HTTPS
3. ✅ CORS updated to allow HTTPS origins
4. ✅ WebSocket gateway updated to allow HTTPS origins

## 🚀 How to Use

### The backend will automatically use HTTPS if certificates exist!

Just restart your backend:

```powershell
cd E:\ChatSite\imegle-backend
npm run start:dev
```

You should see:
```
🔒 HTTPS enabled for backend
🚀 imegle.io backend running on port 3002
📡 WebSocket server ready for connections
```

### Access URLs

- **HTTPS:** `https://192.168.135.180:3002`
- **HTTP:** `http://192.168.135.180:3002` (if certificates not found)

The backend will automatically choose based on whether certificates exist.

## ✅ Verification

After restarting, check:
1. Backend console shows "🔒 HTTPS enabled for backend"
2. Frontend can connect without mixed content errors
3. WebSocket connections work (wss:// instead of ws://)

