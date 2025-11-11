# Deployment Testing Guide - Step by Step

This guide will help you test your deployment using Docker Compose.

## Prerequisites

Before starting, ensure you have:
- ✅ Docker Desktop installed and running
- ✅ Docker Compose installed (comes with Docker Desktop)
- ✅ All environment variables configured

---

## Step 1: Check Docker Installation

Open PowerShell or Command Prompt and run:

```powershell
docker --version
docker-compose --version
```

**Expected output:**
```
Docker version 24.x.x
docker-compose version 2.x.x
```

If you see errors, install Docker Desktop from: https://www.docker.com/products/docker-desktop

---

## Step 2: Stop Development Servers

If you have development servers running, stop them:

1. **Stop Frontend** (if running):
   - Press `Ctrl+C` in the terminal where `npm run dev:https` is running

2. **Stop Backend** (if running):
   - Press `Ctrl+C` in the terminal where `npm run start:dev` is running

3. **Check if ports are free:**
```powershell
# Check port 3000 (frontend)
netstat -ano | findstr ":3000"

# Check port 3002 (backend)
netstat -ano | findstr ":3002"

# Check port 6379 (Redis)
netstat -ano | findstr ":6379"
```

If any ports are in use, stop those processes or change the ports in `docker-compose.imegle.yml`.

---

## Step 3: Prepare Environment Variables

### 3.1 Backend Environment Variables

Create or update `imegle-backend/.env`:

```env
# Server Configuration
PORT=3002
NODE_ENV=production

# Redis Configuration
REDIS_URL=redis://redis:6379

# Client URL (for CORS and redirects)
CLIENT_URL=http://localhost:3000

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Google OAuth (if using Google login)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3002/api/auth/google/callback

# Razorpay (if using payment)
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
```

### 3.2 Frontend Environment Variables

Create or update `imegle-frontend/.env`:

```env
NEXT_PUBLIC_SERVER_URL=http://localhost:3002
```

**Note:** The docker-compose file will override these with environment variables, but having them helps with local testing.

---

## Step 4: Update Docker Compose Configuration

The `docker-compose.imegle.yml` file needs environment variables. You can either:

**Option A: Use environment variables in docker-compose (Recommended)**

Update `docker-compose.imegle.yml` to include all necessary environment variables:

```yaml
backend:
  environment:
    - NODE_ENV=production
    - PORT=3002
    - REDIS_URL=redis://redis:6379
    - CLIENT_URL=http://localhost:3000
    - JWT_SECRET=${JWT_SECRET:-change-this-secret}
    - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-}
    - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:-}
    - GOOGLE_CALLBACK_URL=${GOOGLE_CALLBACK_URL:-http://localhost:3002/api/auth/google/callback}
```

**Option B: Use .env file**

Create a `.env` file in the root directory:

```env
JWT_SECRET=your-super-secret-jwt-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3002/api/auth/google/callback
```

---

## Step 5: Build Docker Images

Navigate to the project root and build the images:

```powershell
cd E:\ChatSite
docker-compose -f docker-compose.imegle.yml build
```

**Expected output:**
```
Building backend...
Building frontend...
Successfully built ...
```

**This may take 5-10 minutes the first time** as it downloads base images and installs dependencies.

---

## Step 6: Start All Services

Start all containers:

```powershell
docker-compose -f docker-compose.imegle.yml up -d
```

The `-d` flag runs containers in detached mode (background).

**Expected output:**
```
Creating network "chatsite_imegle-network" ... done
Creating volume "chatsite_redis-data" ... done
Creating imegle-redis ... done
Creating imegle-backend ... done
Creating imegle-frontend ... done
```

---

## Step 7: Check Container Status

Verify all containers are running:

```powershell
docker-compose -f docker-compose.imegle.yml ps
```

**Expected output:**
```
NAME                STATUS          PORTS
imegle-backend     Up 30 seconds   0.0.0.0:3002->3002/tcp
imegle-frontend    Up 30 seconds   0.0.0.0:3000->3000/tcp
imegle-redis       Up 30 seconds   0.0.0.0:6379->6379/tcp
```

All containers should show **STATUS: Up**.

---

## Step 8: Check Container Logs

View logs to ensure everything started correctly:

### 8.1 Check Backend Logs

```powershell
docker-compose -f docker-compose.imegle.yml logs backend
```

**Look for:**
- ✅ "Nest application successfully started"
- ✅ "Listening on port 3002"
- ❌ Any error messages

### 8.2 Check Frontend Logs

```powershell
docker-compose -f docker-compose.imegle.yml logs frontend
```

**Look for:**
- ✅ "Ready on http://localhost:3000"
- ❌ Any build or runtime errors

### 8.3 Check Redis Logs

```powershell
docker-compose -f docker-compose.imegle.yml logs redis
```

**Look for:**
- ✅ "Ready to accept connections"

### 8.4 View All Logs Together

```powershell
docker-compose -f docker-compose.imegle.yml logs -f
```

Press `Ctrl+C` to exit log view.

---

## Step 9: Test the Application

### 9.1 Test Frontend

Open your browser and navigate to:
```
http://localhost:3000
```

**What to check:**
- ✅ Page loads without errors
- ✅ Dashboard displays correctly
- ✅ No console errors (F12 → Console tab)

### 9.2 Test Backend API

Open a new browser tab and test the backend:

```
http://localhost:3002/api/auth/test
```

**Expected response:**
```json
{
  "message": "Backend is working!",
  "timestamp": 1234567890
}
```

### 9.3 Test WebSocket Connection

1. Open `http://localhost:3000` in your browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Look for Socket.IO connection messages
5. Check Network tab → WS (WebSocket) → Should show connection to `ws://localhost:3002`

---

## Step 10: Test Core Features

### 10.1 Test User Authentication

1. Click "Sign in with Google" (if configured)
2. Or test without authentication if your app allows it

### 10.2 Test Chat Matching

1. Select interests (if applicable)
2. Click "Start Chatting"
3. Wait for a match
4. Test video/audio/text chat

### 10.3 Test Multiple Users

1. Open `http://localhost:3000` in **two different browser windows** (or incognito)
2. Start chat in both
3. They should match with each other
4. Test video chat between them

---

## Step 11: Monitor Performance

### 11.1 Check Container Resource Usage

```powershell
docker stats
```

This shows CPU, memory, and network usage for each container.

### 11.2 Check Container Health

```powershell
docker-compose -f docker-compose.imegle.yml ps
```

All containers should show as "healthy" or "Up".

---

## Step 12: Test Restart/Recovery

### 12.1 Test Container Restart

```powershell
# Restart a specific container
docker-compose -f docker-compose.imegle.yml restart backend

# Restart all containers
docker-compose -f docker-compose.imegle.yml restart
```

### 12.2 Test Stop and Start

```powershell
# Stop all containers
docker-compose -f docker-compose.imegle.yml stop

# Start again
docker-compose -f docker-compose.imegle.yml start
```

### 12.3 Test Complete Rebuild

```powershell
# Stop and remove containers
docker-compose -f docker-compose.imegle.yml down

# Rebuild and start
docker-compose -f docker-compose.imegle.yml up -d --build
```

---

## Troubleshooting

### Problem: Containers won't start

**Solution:**
```powershell
# Check logs for errors
docker-compose -f docker-compose.imegle.yml logs

# Remove containers and try again
docker-compose -f docker-compose.imegle.yml down
docker-compose -f docker-compose.imegle.yml up -d --build
```

### Problem: Port already in use

**Solution:**
```powershell
# Find process using port
netstat -ano | findstr ":3000"
netstat -ano | findstr ":3002"

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or change ports in docker-compose.imegle.yml
```

### Problem: Frontend can't connect to backend

**Solution:**
1. Check `NEXT_PUBLIC_SERVER_URL` in frontend environment
2. Verify backend is running: `docker-compose -f docker-compose.imegle.yml ps`
3. Check backend logs: `docker-compose -f docker-compose.imegle.yml logs backend`

### Problem: Build fails

**Solution:**
```powershell
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose -f docker-compose.imegle.yml build --no-cache
```

### Problem: Redis connection error

**Solution:**
1. Check Redis is running: `docker-compose -f docker-compose.imegle.yml ps redis`
2. Check Redis logs: `docker-compose -f docker-compose.imegle.yml logs redis`
3. Verify `REDIS_URL=redis://redis:6379` in backend environment

---

## Step 13: Clean Up (Optional)

When you're done testing:

```powershell
# Stop all containers
docker-compose -f docker-compose.imegle.yml down

# Remove containers and volumes (⚠️ This deletes Redis data)
docker-compose -f docker-compose.imegle.yml down -v

# Remove images (optional)
docker-compose -f docker-compose.imegle.yml down --rmi all
```

---

## Quick Reference Commands

```powershell
# Build images
docker-compose -f docker-compose.imegle.yml build

# Start services
docker-compose -f docker-compose.imegle.yml up -d

# Stop services
docker-compose -f docker-compose.imegle.yml stop

# View logs
docker-compose -f docker-compose.imegle.yml logs -f

# Check status
docker-compose -f docker-compose.imegle.yml ps

# Restart a service
docker-compose -f docker-compose.imegle.yml restart backend

# Rebuild and restart
docker-compose -f docker-compose.imegle.yml up -d --build

# Clean up
docker-compose -f docker-compose.imegle.yml down
```

---

## Next Steps

After successful local testing:

1. **Deploy to Production:**
   - Update environment variables for production
   - Use HTTPS (required for WebRTC)
   - Set up proper domain names
   - Configure production database/Redis

2. **Set up CI/CD:**
   - Automate builds and deployments
   - Set up automated testing

3. **Monitor Production:**
   - Set up logging and monitoring
   - Configure alerts
   - Monitor performance metrics

---

**Need help?** Check the logs first: `docker-compose -f docker-compose.imegle.yml logs`

