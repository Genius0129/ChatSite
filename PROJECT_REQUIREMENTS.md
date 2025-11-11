# 📋 Project Requirements

Complete list of requirements for the imegle.io video chat platform.

---

## 🖥️ System Requirements

### Minimum Requirements

- **Operating System:**
  - Windows 10/11
  - macOS 10.15+
  - Linux (Ubuntu 20.04+, Debian 11+, or similar)

- **Node.js:** Version 18.0.0 or higher
  - Download: https://nodejs.org/
  - Verify: `node --version`

- **Package Manager:**
  - npm 9.0.0+ (comes with Node.js)
  - Or yarn 1.22.0+
  - Verify: `npm --version`

- **RAM:** Minimum 2GB (4GB+ recommended)
- **Disk Space:** 500MB+ for dependencies

### Recommended for Development

- **RAM:** 8GB+
- **CPU:** Multi-core processor
- **Disk Space:** 2GB+ (for node_modules and build files)

---

## 📦 Software Dependencies

### Frontend Dependencies

**Core:**
- Next.js 14.0.4+
- React 18.2.0+
- React DOM 18.2.0+
- TypeScript 5.3.3+

**UI & Styling:**
- Tailwind CSS 3.4.0+
- PostCSS 8.4.32+
- Autoprefixer 10.4.16+
- react-icons 4.12.0+

**Real-time Communication:**
- socket.io-client 4.6.1+
- WebRTC API (browser native)

**Authentication:**
- @react-oauth/google 0.11.1+
- axios 1.6.2+

**Development Tools:**
- ESLint 8.56.0+
- eslint-config-next 14.0.4+

### Backend Dependencies

**Core Framework:**
- NestJS 10.3.0+
- Node.js 18.0.0+
- TypeScript 5.3.3+

**Authentication & Security:**
- @nestjs/passport 10.0.3+
- @nestjs/jwt 10.2.0+
- passport 0.7.0+
- passport-google-oauth20 2.0.0+
- passport-jwt 4.0.1+
- jsonwebtoken 9.0.2+
- helmet 7.1.0+
- express-rate-limit 7.1.5+

**Real-time Communication:**
- socket.io 4.6.1+
- @nestjs/platform-socket.io 10.3.0+
- @nestjs/websockets 10.3.0+

**Data Storage:**
- redis 4.6.12+ (optional, for production scaling)
- @socket.io/redis-adapter 8.2.1+ (optional)

**Payment Processing (Optional):**
- razorpay 2.9.2+

**Utilities:**
- @nestjs/config 3.3.0+
- class-validator 0.14.0+
- class-transformer 0.5.1+
- cors 2.8.5+
- dotenv 16.3.1+

---

## 🌐 Browser Requirements

### Supported Browsers

**Desktop:**
- ✅ Chrome 90+ (recommended)
- ✅ Microsoft Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+ (macOS)
- ✅ Opera 76+

**Mobile:**
- ✅ Chrome Mobile (Android)
- ✅ Safari iOS 14+
- ✅ Samsung Internet 14+

### Required Browser Features

- **WebRTC API** - For video/audio chat
- **getUserMedia()** - For camera/microphone access
- **WebSocket support** - For real-time messaging
- **LocalStorage** - For storing user preferences
- **ES6+ JavaScript** - Modern JavaScript support

### Browser Permissions Required

- **Camera** - For video chat
- **Microphone** - For audio chat
- **Notifications** (optional) - For chat alerts

---

## 🔧 Development Environment Requirements

### Required Tools

1. **Code Editor:**
   - Visual Studio Code (recommended)
   - Or any editor with TypeScript support

2. **Git:**
   - Git 2.30.0+ (for version control)
   - Download: https://git-scm.com/

3. **Terminal/Command Line:**
   - Windows: PowerShell or Command Prompt
   - macOS/Linux: Terminal or iTerm2

### Optional Development Tools

- **Docker Desktop** - For containerized deployment
- **Postman/Insomnia** - For API testing
- **Chrome DevTools** - For debugging
- **mkcert** - For local HTTPS certificates

---

## 🔐 Environment Configuration

### Required Environment Variables

#### Backend (`imegle-backend/.env`)

**Essential:**
```env
PORT=3002
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

**Authentication (Required for Google Login):**
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3002/api/auth/google/callback
JWT_SECRET=your-random-secret-key
```

**Redis (Optional, for production):**
```env
REDIS_URL=redis://localhost:6379
```

**Payment (Optional):**
```env
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
```

#### Frontend (`imegle-frontend/.env`)

**Essential:**
```env
NEXT_PUBLIC_SERVER_URL=http://localhost:3002
```

**Optional:**
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

---

## 🌍 Network Requirements

### Development

- **Local Network Access:**
  - Backend must be accessible on port 3002
  - Frontend must be accessible on port 3000
  - Firewall must allow these ports

- **HTTPS (Optional for local dev):**
  - Required only if accessing via IP address (not localhost)
  - Use `mkcert` for local SSL certificates
  - See `setup-https.md` for instructions

### Production

- **HTTPS Required:**
  - WebRTC requires HTTPS in production
  - SSL certificate required
  - Valid domain name recommended

- **Ports:**
  - Port 80 (HTTP) - Redirects to HTTPS
  - Port 443 (HTTPS) - Main application
  - Port 3002 (Backend API) - Or use reverse proxy

- **Firewall:**
  - Allow incoming connections on required ports
  - Configure CORS properly

---

## 🗄️ Database & Storage

### Current Setup

- **No Database Required** (for basic functionality)
  - User interests stored in browser localStorage
  - Room data stored in memory (Redis optional)

### Optional Services

**Redis (Recommended for Production):**
- Version 7.0+
- Used for:
  - Session storage
  - Room management
  - Queue management
  - Distributed WebSocket connections
- Supports 5000-10000+ concurrent users

**PostgreSQL/MySQL (Future):**
- For user accounts
- Chat history
- Analytics

---

## 🔑 Third-Party Services

### Required Services

**None** - The app can run without external services.

### Optional Services

**Google OAuth 2.0:**
- For "Sign in with Google" feature
- Requires Google Cloud Console account
- See `GOOGLE_OAUTH_SETUP.md` for setup

**Razorpay:**
- For subscription payments
- Requires Razorpay account
- See payment module documentation

**Redis Cloud:**
- For production Redis hosting
- Alternative to self-hosted Redis

---

## 🐳 Docker Requirements (Optional)

### For Containerized Deployment

- **Docker Desktop:**
  - Windows: Docker Desktop 4.0+
  - macOS: Docker Desktop 4.0+
  - Linux: Docker Engine 20.10+

- **Docker Compose:**
  - Version 2.0+ (comes with Docker Desktop)

### Docker Images Used

- **Base Images:**
  - node:18-alpine (for both frontend and backend)
  - redis:7-alpine (for Redis service)

---

## 📱 Mobile Requirements

### iOS

- iOS 14.0+
- Safari browser
- Camera and microphone permissions

### Android

- Android 8.0+ (API level 26+)
- Chrome browser recommended
- Camera and microphone permissions

---

## 🚀 Production Deployment Requirements

### Server Requirements

**Minimum:**
- 2 CPU cores
- 4GB RAM
- 20GB storage
- Ubuntu 20.04+ / Debian 11+ / CentOS 8+

**Recommended:**
- 4+ CPU cores
- 8GB+ RAM
- 50GB+ storage
- SSD storage preferred

### Production Services

**Web Server:**
- Nginx 1.18+ (recommended)
- Or Apache 2.4+
- For reverse proxy and SSL termination

**Process Manager:**
- PM2 (recommended)
- Or systemd
- For keeping Node.js processes running

**SSL Certificate:**
- Let's Encrypt (free)
- Or commercial SSL certificate
- Required for HTTPS

**Domain Name:**
- Valid domain name
- DNS configured
- A record pointing to server IP

### Monitoring (Optional)

- **Application Monitoring:**
  - PM2 monitoring
  - Or New Relic / Datadog

- **Logging:**
  - Winston / Pino (Node.js)
  - Or centralized logging service

---

## 🔒 Security Requirements

### Development

- Environment variables in `.env` files (not committed to git)
- CORS configured for development origins
- Rate limiting enabled

### Production

- **HTTPS Required** - SSL/TLS certificate
- **Environment Variables** - Secure storage
- **CORS** - Restricted to production domain
- **Rate Limiting** - DDoS protection
- **Helmet.js** - Security headers
- **Input Validation** - All user inputs
- **JWT Secret** - Strong, random secret
- **Google OAuth Secrets** - Secure storage

---

## 📊 Performance Requirements

### Target Metrics

- **Matching Time:** < 2 seconds average
- **Message Latency:** < 100ms
- **Connection Success Rate:** > 95%
- **Video Quality:** 720p default, 1080p optional
- **Concurrent Users:** 100+ (single server), 5000+ (with Redis)

### Scalability

- **Horizontal Scaling:** Supported via Redis
- **Load Balancing:** Supported
- **CDN:** Optional for static assets

---

## 🧪 Testing Requirements

### Development Testing

- Manual testing in browser
- Chrome DevTools for debugging
- Network tab for WebSocket monitoring

### Optional Testing Tools

- Jest (included in backend)
- React Testing Library (can be added)
- Postman (for API testing)

---

## 📚 Documentation Requirements

### Required Documentation

- ✅ README.md - Project overview
- ✅ LOCAL_DEVELOPMENT_SETUP.md - Development setup
- ✅ DEPLOYMENT_TESTING.md - Deployment guide
- ✅ GOOGLE_OAUTH_SETUP.md - OAuth configuration
- ✅ PROJECT_REQUIREMENTS.md - This file

### Optional Documentation

- API documentation
- Architecture diagrams
- Contributing guidelines

---

## ✅ Quick Checklist

### Before Starting Development

- [ ] Node.js 18+ installed
- [ ] npm/yarn installed
- [ ] Git installed
- [ ] Code editor installed
- [ ] Backend `.env` file created
- [ ] Frontend `.env` file created
- [ ] Google OAuth configured (if using Google login)
- [ ] Ports 3000 and 3002 available

### Before Production Deployment

- [ ] All environment variables configured
- [ ] SSL certificate obtained
- [ ] Domain name configured
- [ ] Redis installed (if using)
- [ ] Firewall configured
- [ ] Process manager (PM2) installed
- [ ] Monitoring set up
- [ ] Backup strategy in place

---

## 🆘 Support & Troubleshooting

### Common Issues

1. **Node.js version too old:**
   - Solution: Update to Node.js 18+

2. **Port already in use:**
   - Solution: Change port or stop conflicting service

3. **Camera/microphone not working:**
   - Solution: Check browser permissions and HTTPS requirement

4. **Google OAuth not working:**
   - Solution: Check redirect URIs match exactly

5. **WebSocket connection failed:**
   - Solution: Check firewall and CORS settings

### Getting Help

- Check documentation files in project root
- Review error logs in console
- Check browser DevTools for errors
- Verify all environment variables are set

---

## 📝 Version Information

**Current Project Version:** 1.0.0

**Last Updated:** Based on current codebase

**Compatibility:**
- Node.js: 18.0.0 - 20.x.x
- Next.js: 14.0.4+
- NestJS: 10.3.0+
- React: 18.2.0+

---

**For specific setup instructions, see:**
- `LOCAL_DEVELOPMENT_SETUP.md` - Development setup
- `DEPLOYMENT_TESTING.md` - Deployment guide
- `GOOGLE_OAUTH_SETUP.md` - OAuth setup

