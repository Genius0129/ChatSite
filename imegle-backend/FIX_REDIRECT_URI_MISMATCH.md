# 🔧 Fix "redirect_uri_mismatch" Error

## ✅ Step-by-Step Fix

### Step 1: Verify Backend Configuration

Your `.env` file should have:
```env
GOOGLE_CALLBACK_URL=https://localhost:3002/api/auth/google/callback
```

✅ **Already done!** Your `.env` file is correct.

---

### Step 2: Restart Backend (CRITICAL!)

The backend must be restarted to load the new `.env` value:

```powershell
cd E:\ChatSite\imegle-backend
# Stop current server (Ctrl+C if running)
npm run start:dev
```

**Check the console output** - you should see:
```
✅ Google OAuth configured successfully
   Callback URL: https://localhost:3002/api/auth/google/callback
```

If you see a different URL, the backend didn't load the new value. Restart again.

---

### Step 3: Update Google Cloud Console

1. **Go to:** https://console.cloud.google.com/apis/credentials
2. **Click** on your OAuth 2.0 Client ID
3. **Scroll down** to "Authorized redirect URIs"
4. **Remove ALL existing entries** (especially any `http://` versions)
5. **Add exactly this:**
   ```
   https://localhost:3002/api/auth/google/callback
   ```
   ⚠️ **Must be EXACTLY this** - no trailing slash, no extra spaces, must be `https://`

6. **Click "SAVE"** (important!)

---

### Step 4: Wait 1-2 Minutes

Google's changes can take 1-2 minutes to propagate. Wait before testing.

---

### Step 5: Test Again

1. Go to your frontend
2. Click "Sign in with Google"
3. Should work now!

---

## 🔍 Troubleshooting

### Still getting error?

1. **Check backend console** - What callback URL does it show?
   ```
   ✅ Google OAuth configured successfully
      Callback URL: ???
   ```
   Must be: `https://localhost:3002/api/auth/google/callback`

2. **Check Google Console** - Copy the exact redirect URI from Google Console and compare:
   - Must match character-for-character
   - Must be `https://` (not `http://`)
   - Must be `localhost` (not IP address)
   - No trailing slash

3. **Clear browser cache** - Sometimes browsers cache OAuth redirects

4. **Try incognito/private window** - To rule out browser cache issues

---

## ✅ Verification Checklist

- [ ] `.env` file has `GOOGLE_CALLBACK_URL=https://localhost:3002/api/auth/google/callback`
- [ ] Backend restarted and shows correct callback URL in console
- [ ] Google Cloud Console has exactly `https://localhost:3002/api/auth/google/callback`
- [ ] No other redirect URIs in Google Console (removed old ones)
- [ ] Waited 1-2 minutes after saving in Google Console
- [ ] Tried in incognito/private window

---

## 🎯 Common Mistakes

❌ **Wrong:** `http://localhost:3002/api/auth/google/callback` (HTTP instead of HTTPS)
❌ **Wrong:** `https://192.168.135.180:3002/api/auth/google/callback` (IP instead of localhost)
❌ **Wrong:** `https://localhost:3002/api/auth/google/callback/` (trailing slash)
✅ **Correct:** `https://localhost:3002/api/auth/google/callback`

