# 🚀 Best Deployment Guide for imegle.io

Complete guide to deploying your video chat platform for optimal performance and reliability.

---

## 🎯 Recommended Deployment Strategy

### **Best Option: Railway.app** ⭐ (Recommended)

**Why Railway is Best:**
- ✅ **Easiest Setup** - Zero configuration needed
- ✅ **Automatic HTTPS** - Free SSL certificates
- ✅ **Built-in Redis** - One-click Redis addon
- ✅ **Docker Support** - Works with your existing Docker setup
- ✅ **Auto-deploy from Git** - Push to deploy
- ✅ **Free Tier Available** - $5/month for production
- ✅ **WebSocket Support** - Perfect for Socket.io
- ✅ **Global CDN** - Fast worldwide

**Cost:** $5-20/month (depending on usage)

---

## 🏆 Top 3 Deployment Options

### 1. Railway.app (Best for Beginners) ⭐

**Pros:**
- Easiest to set up
- Automatic HTTPS
- Built-in Redis
- Great documentation
- Free tier available

**Cons:**
- Slightly more expensive than VPS
- Less control than VPS

**Best For:** Quick deployment, small to medium scale

---

### 2. DigitalOcean Droplet (Best Value) 💰

**Pros:**
- Very affordable ($6-12/month)
- Full control
- Great performance
- Easy scaling
- Good documentation

**Cons:**
- Manual SSL setup (Let's Encrypt)
- Manual Redis setup
- Requires server management

**Best For:** Cost-effective, full control needed

---

### 3. AWS / Google Cloud (Best for Scale) 📈

**Pros:**
- Enterprise-grade
- Auto-scaling
- Global infrastructure
- Advanced features

**Cons:**
- Complex setup
- Higher cost
- Steeper learning curve

**Best For:** Large scale, enterprise needs

---

## 📋 Complete Deployment Checklist

### Pre-Deployment Requirements

- [ ] Domain name purchased (e.g., imegle.io)
- [ ] Google OAuth credentials configured
- [ ] Environment variables prepared
- [ ] SSL certificate ready (or use auto-SSL)
- [ ] Redis service available
- [ ] Docker images tested locally

---

## 🚀 Option 1: Deploy to Railway (Recommended)

### Step 1: Create Railway Account

1. Go to: https://railway.app
2. Sign up with GitHub
3. Create new project

### Step 2: Add Redis Service

1. Click **"+ New"** → **"Database"** → **"Add Redis"**
2. Railway automatically creates Redis instance
3. Note the `REDIS_URL` (auto-injected as environment variable)

### Step 3: Deploy Backend

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your repository
3. Railway detects Dockerfile automatically
4. Set root directory: `imegle-backend`
5. Add environment variables:

```env
NODE_ENV=production
PORT=3002
REDIS_URL=${{Redis.REDIS_URL}}  # Auto-injected
CLIENT_URL=https://yourdomain.com
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
JWT_SECRET=your-random-secret
```

6. Railway automatically:
   - Builds Docker image
   - Deploys backend
   - Provides HTTPS URL

### Step 4: Deploy Frontend

1. Click **"+ New"** → **"GitHub Repo"**
2. Select same repository
3. Set root directory: `imegle-frontend`
4. Add environment variables:

```env
NEXT_PUBLIC_SERVER_URL=https://your-backend-url.railway.app
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
```

5. Railway automatically:
   - Builds Next.js app
   - Deploys frontend
   - Provides HTTPS URL

### Step 5: Configure Custom Domain

1. Go to frontend service → **Settings** → **Domains**
2. Add your domain: `imegle.io`
3. Railway automatically:
   - Issues SSL certificate
   - Configures DNS
   - Sets up HTTPS

### Step 6: Update Environment Variables

Update backend `CLIENT_URL`:
```env
CLIENT_URL=https://imegle.io
```

Update Google OAuth redirect URI:
```
https://imegle.io/api/auth/google/callback
```

### Step 7: Test Deployment

1. Visit: `https://imegle.io`
2. Test Google login
3. Test video chat
4. Check logs in Railway dashboard

**Cost:** ~$10-20/month

---

## 🖥️ Option 2: Deploy to DigitalOcean Droplet

### Step 1: Create Droplet

1. Go to: https://digitalocean.com
2. Create Droplet:
   - **OS:** Ubuntu 22.04
   - **Plan:** Basic ($6/month) or Regular ($12/month)
   - **Region:** Choose closest to users
   - **Authentication:** SSH keys (recommended)

### Step 2: Initial Server Setup

SSH into your server:
```bash
ssh root@your-server-ip
```

Update system:
```bash
apt update && apt upgrade -y
```

Install Docker:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

Install Docker Compose:
```bash
apt install docker-compose -y
```

### Step 3: Clone Repository

```bash
git clone https://github.com/yourusername/chatsite.git
cd chatsite
```

### Step 4: Set Up Environment Variables

Create `.env` files:

**Backend (`imegle-backend/.env`):**
```env
NODE_ENV=production
PORT=3002
REDIS_URL=redis://redis:6379
CLIENT_URL=https://imegle.io
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://imegle.io/api/auth/google/callback
JWT_SECRET=your-random-secret
```

**Frontend (`imegle-frontend/.env`):**
```env
NEXT_PUBLIC_SERVER_URL=https://api.imegle.io
```

### Step 5: Update Docker Compose

Edit `docker-compose.imegle.yml`:
```yaml
services:
  backend:
    environment:
      - CLIENT_URL=https://imegle.io
      # ... other vars
```

### Step 6: Install Nginx (Reverse Proxy)

```bash
apt install nginx -y
```

Create Nginx config (`/etc/nginx/sites-available/imegle`):
```nginx
# Frontend
server {
    listen 80;
    server_name imegle.io www.imegle.io;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API
server {
    listen 80;
    server_name api.imegle.io;
    
    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/imegle /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Step 7: Install SSL (Let's Encrypt)

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d imegle.io -d www.imegle.io -d api.imegle.io
```

Certbot automatically:
- Issues SSL certificates
- Configures HTTPS
- Sets up auto-renewal

### Step 8: Deploy with Docker

```bash
cd /root/chatsite
docker-compose -f docker-compose.imegle.yml up -d --build
```

### Step 9: Set Up Auto-Start

Create systemd service (`/etc/systemd/system/imegle.service`):
```ini
[Unit]
Description=imegle.io Docker Compose
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/root/chatsite
ExecStart=/usr/bin/docker-compose -f docker-compose.imegle.yml up -d
ExecStop=/usr/bin/docker-compose -f docker-compose.imegle.yml down

[Install]
WantedBy=multi-user.target
```

Enable service:
```bash
systemctl enable imegle
systemctl start imegle
```

**Cost:** $6-12/month + domain (~$10/year)

---

## ☁️ Option 3: Deploy to Render

### Step 1: Create Render Account

1. Go to: https://render.com
2. Sign up with GitHub

### Step 2: Deploy Backend

1. Click **"New"** → **"Web Service"**
2. Connect GitHub repository
3. Configure:
   - **Name:** imegle-backend
   - **Root Directory:** imegle-backend
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start:prod`
   - **Environment:** Docker (if using Dockerfile)

4. Add environment variables (same as Railway)

### Step 3: Deploy Frontend

1. Click **"New"** → **"Web Service"**
2. Configure:
   - **Name:** imegle-frontend
   - **Root Directory:** imegle-frontend
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`

### Step 4: Add Redis

1. Click **"New"** → **"Redis"**
2. Render creates Redis instance
3. Update backend `REDIS_URL`

**Cost:** Free tier available, $7-25/month for production

---

## 🔧 Required Services & Configuration

### 1. Domain Name

**Recommended Providers:**
- Namecheap ($8-12/year)
- Google Domains ($12/year)
- Cloudflare ($8-10/year)

**DNS Configuration:**
```
A Record: @ → your-server-ip
A Record: api → your-server-ip (if using subdomain)
CNAME: www → imegle.io
```

### 2. Redis Service

**Options:**
- **Railway:** Built-in Redis addon
- **DigitalOcean:** Managed Redis ($15/month) or self-hosted
- **Redis Cloud:** Free tier available
- **Upstash:** Serverless Redis, free tier

**Recommended:** Railway Redis (easiest) or Upstash (serverless)

### 3. SSL Certificate

**Options:**
- **Let's Encrypt:** Free, auto-renewal (DigitalOcean)
- **Railway/Render:** Automatic SSL
- **Cloudflare:** Free SSL + CDN

**Recommended:** Let's Encrypt (free) or Railway auto-SSL

### 4. Google OAuth

**Required Configuration:**
1. Update Authorized JavaScript origins:
   ```
   https://imegle.io
   https://www.imegle.io
   ```

2. Update Authorized redirect URIs:
   ```
   https://imegle.io/api/auth/google/callback
   ```

3. Update backend `.env`:
   ```env
   GOOGLE_CALLBACK_URL=https://imegle.io/api/auth/google/callback
   CLIENT_URL=https://imegle.io
   ```

---

## 📊 Performance Optimization

### 1. Enable Redis (Required for Production)

**Why:** Supports 5000-10000+ concurrent users

**Configuration:**
```env
REDIS_URL=redis://your-redis-url:6379
```

### 2. Use CDN for Static Assets

**Options:**
- **Cloudflare:** Free CDN
- **Vercel:** For Next.js (if using Vercel for frontend)
- **AWS CloudFront:** Enterprise option

### 3. Enable Compression

Nginx config:
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

### 4. Set Up Monitoring

**Recommended Tools:**
- **PM2:** Process monitoring (if not using Docker)
- **Uptime Robot:** Free uptime monitoring
- **Sentry:** Error tracking (optional)

---

## 🔒 Security Best Practices

### 1. Environment Variables

- ✅ Never commit `.env` files
- ✅ Use secure secret management
- ✅ Rotate JWT secrets regularly

### 2. Firewall Configuration

```bash
# Allow only necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

### 3. Rate Limiting

Already configured in backend with `express-rate-limit`

### 4. CORS Configuration

Update backend CORS to only allow your domain:
```typescript
origin: ['https://imegle.io', 'https://www.imegle.io']
```

---

## 💰 Cost Comparison

| Service | Monthly Cost | Best For |
|---------|-------------|----------|
| **Railway** | $10-20 | Easiest setup, auto-SSL |
| **DigitalOcean** | $6-12 | Best value, full control |
| **Render** | $7-25 | Free tier available |
| **AWS** | $20-100+ | Enterprise scale |
| **Vercel (Frontend)** | Free-$20 | Next.js optimized |

**Total Estimated Cost:**
- **Budget:** $10-15/month (DigitalOcean + domain)
- **Recommended:** $15-25/month (Railway + domain)
- **Enterprise:** $50-200/month (AWS + services)

---

## 🎯 Recommended Architecture

### For Small Scale (0-1000 users)

```
Frontend (Railway/Render) → Backend (Railway/Render) → Redis (Railway/Upstash)
```

### For Medium Scale (1000-5000 users)

```
CDN (Cloudflare) → Frontend (Railway) → Backend (DigitalOcean) → Redis (Managed)
```

### For Large Scale (5000+ users)

```
CDN → Load Balancer → Multiple Backend Instances → Redis Cluster → Database
```

---

## 📝 Step-by-Step: Quick Deploy to Railway

### 1. Prepare Repository

```bash
# Make sure all code is committed
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Create Railway Project

1. Go to railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository

### 3. Add Redis

1. Click "+ New" → "Database" → "Add Redis"
2. Wait for Redis to start

### 4. Deploy Backend

1. Click "+ New" → "GitHub Repo"
2. Select repository
3. Set root directory: `imegle-backend`
4. Add environment variables (see above)
5. Deploy!

### 5. Deploy Frontend

1. Click "+ New" → "GitHub Repo"
2. Select repository
3. Set root directory: `imegle-frontend`
4. Add environment variables
5. Deploy!

### 6. Add Custom Domain

1. Go to frontend service → Settings → Domains
2. Add your domain
3. Update DNS records as instructed
4. Wait for SSL certificate (automatic)

### 7. Update Google OAuth

1. Go to Google Cloud Console
2. Update redirect URIs to your domain
3. Update backend environment variables

### 8. Test!

Visit your domain and test all features!

---

## 🆘 Troubleshooting

### Issue: WebSocket connection failed

**Solution:**
- Check firewall allows WebSocket connections
- Verify CORS configuration
- Check if reverse proxy supports WebSockets

### Issue: Video chat not working

**Solution:**
- Ensure HTTPS is enabled (required for WebRTC)
- Check browser console for errors
- Verify camera/microphone permissions

### Issue: High latency

**Solution:**
- Use CDN for static assets
- Deploy closer to users
- Enable Redis for better performance

### Issue: Out of memory

**Solution:**
- Upgrade server resources
- Enable Redis to offload memory
- Optimize Docker images

---

## ✅ Post-Deployment Checklist

- [ ] HTTPS working (green lock in browser)
- [ ] Google OAuth working
- [ ] Video chat working
- [ ] Redis connected
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] Domain DNS configured
- [ ] SSL certificate valid
- [ ] Environment variables secure
- [ ] Logs accessible

---

## 🎉 You're Live!

Your video chat platform is now deployed and ready for users!

**Next Steps:**
1. Monitor performance
2. Set up analytics
3. Configure backups
4. Plan for scaling

---

**Need help?** Check the logs in your hosting platform's dashboard!

