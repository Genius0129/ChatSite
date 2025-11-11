# 🔐 Google OAuth Setup Guide

The "400 Bad Request" error occurs because Google OAuth credentials are not configured. Follow these steps to set it up.

## Step 1: Create Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project** (or select existing)
   - Click the project dropdown at the top
   - Click "New Project"
   - Enter project name: "imegle" (or any name)
   - Click "Create"

3. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "+ CREATE CREDENTIALS" → "OAuth client ID"
   - If prompted, configure OAuth consent screen first:
     - User Type: "External" (for testing) or "Internal" (for Google Workspace)
     - App name: "imegle.io"
     - User support email: Your email
     - Developer contact: Your email
     - Click "Save and Continue"
     - Scopes: Click "Save and Continue" (default is fine)
     - Test users: Add your email, click "Save and Continue"
     - Click "Back to Dashboard"

5. **Create OAuth Client ID**
   - Application type: "Web application"
   - Name: "imegle-web-client"
   - **Authorized JavaScript origins:**
     ```
     http://localhost:3000
     https://localhost:3000
     ```
     ⚠️ **Important:** Google does NOT accept local IP addresses (like `192.168.135.180`). Use `localhost` only for local development.
   - **Authorized redirect URIs:**
     ```
     https://localhost:3002/api/auth/google/callback
     ```
     ⚠️ **Important:** 
     - Use `https://` (not `http://`) if your backend has HTTPS certificates
     - Use `localhost` only (Google doesn't accept IP addresses)
     - If your backend is HTTP-only, use `http://localhost:3002/api/auth/google/callback`
   - Click "Create"
   - **Copy the Client ID and Client Secret** (you'll need these)

## Step 2: Configure Backend Environment Variables

1. **Create/Edit `.env` file in `imegle-backend/` folder:**

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALLBACK_URL=https://localhost:3002/api/auth/google/callback

# Note: For network access, you still use localhost in the callback URL
# because Google OAuth redirects work through localhost even when accessed via IP

# JWT Secret (generate a random string)
JWT_SECRET=your-random-jwt-secret-key-here

# Other required variables
PORT=3002
CLIENT_URL=http://localhost:3000
# Or for network access:
# CLIENT_URL=https://192.168.135.180:3000

# Redis (optional, for production)
REDIS_URL=redis://localhost:6379

# Razorpay (optional, for payments)
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
```

2. **Replace the placeholder values:**
   - `your-client-id-here.apps.googleusercontent.com` → Your actual Google Client ID
   - `your-client-secret-here` → Your actual Google Client Secret
   - `your-random-jwt-secret-key-here` → Generate a random string (e.g., use `openssl rand -base64 32`)

## Step 3: Configure Frontend (Optional)

If you want to show Google login button with proper branding, update `imegle-frontend/.env`:

```env
NEXT_PUBLIC_SERVER_URL=http://localhost:3002
# Or for network access:
# NEXT_PUBLIC_SERVER_URL=https://192.168.135.180:3002

NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
```

## Step 4: Restart Backend

```powershell
cd E:\ChatSite\imegle-backend
npm run start:dev
```

You should see:
```
✅ Google OAuth configured successfully
```

Instead of:
```
⚠️  Google OAuth not configured...
```

## Step 5: Test Google Sign-In

1. Go to: `http://localhost:3000` (or your network URL)
2. Click "Sign in with Google"
3. You should be redirected to Google's login page
4. After logging in, you'll be redirected back to the app

## 🔍 Troubleshooting

### Still getting 400 error?

1. **Check backend console** - Look for the warning message about Google OAuth
2. **Verify .env file** - Make sure it's in `imegle-backend/` folder
3. **Check environment variables** - Restart backend after changing .env
4. **Verify redirect URI** - Must match exactly in Google Console
5. **Check callback URL** - Make sure `GOOGLE_CALLBACK_URL` matches your backend URL

### Redirect URI mismatch?

The redirect URI in Google Console must **exactly match** the `GOOGLE_CALLBACK_URL` in your `.env` file.

**Use localhost only:**
```
http://localhost:3002/api/auth/google/callback
```

⚠️ **Important:** Google OAuth does NOT accept IP addresses. Even if you access your app via `192.168.135.180:3000`, you must use `localhost` in the OAuth configuration. The OAuth flow will still work when accessed via IP address.

### OAuth consent screen issues?

- For testing: Use "External" user type and add your email as a test user
- For production: Complete the OAuth consent screen verification process

## 📝 Quick Checklist

- [ ] Created Google Cloud project
- [ ] Enabled Google+ API
- [ ] Created OAuth 2.0 credentials
- [ ] Added authorized redirect URIs
- [ ] Copied Client ID and Secret
- [ ] Created `.env` file in `imegle-backend/`
- [ ] Added `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env`
- [ ] Restarted backend server
- [ ] Tested Google sign-in

## 🚀 Production Notes

For production deployment:
1. Change OAuth consent screen to "Production"
2. Complete Google's verification process (if required)
3. Update redirect URIs to your production domain
4. Use HTTPS for all URLs
5. Keep Client Secret secure (never commit to git)

