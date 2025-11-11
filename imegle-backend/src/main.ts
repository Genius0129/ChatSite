import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cors from 'cors';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  try {
    // Check if HTTPS certificates exist
    const keyPath = path.join(__dirname, '..', 'key.pem');
    const certPath = path.join(__dirname, '..', 'cert.pem');
    const useHttps = fs.existsSync(keyPath) && fs.existsSync(certPath);
    
    let app;
    if (useHttps) {
      const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
      app = await NestFactory.create(AppModule, { httpsOptions });
      console.log('🔒 HTTPS enabled for backend');
    } else {
      app = await NestFactory.create(AppModule);
      console.log('🔓 HTTP mode (no HTTPS certificates found)');
    }
    
    const configService = app.get(ConfigService);
    const port = configService.get('PORT') || 3002;
    const clientUrl = configService.get('CLIENT_URL') || 'http://localhost:3000';

    // Request logging middleware (for debugging) - MUST be before other middleware
    app.use((req: any, res: any, next: any) => {
      // Log ALL requests to auth endpoints
      if (req.url && req.url.includes('/api/auth')) {
        console.log('🌐 [MIDDLEWARE] Request received:', req.method, req.url);
        console.log('   Query:', JSON.stringify(req.query));
        console.log('   Headers origin:', req.headers.origin);
        console.log('   Headers host:', req.headers.host);
      }
      next();
    });

    // Security middleware
    app.use(helmet());
    
    // CORS configuration
    // Allow all origins for development (restrict in production)
    const allowedOrigins = [
      clientUrl,
      'http://localhost:3000',
      'https://localhost:3000',
      'http://127.0.0.1:3000',
      'https://127.0.0.1:3000',
      // Allow any IP in local network for development (HTTP and HTTPS)
      /^http:\/\/192\.168\.\d+\.\d+:3000$/,
      /^https:\/\/192\.168\.\d+\.\d+:3000$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:3000$/,
      /^https:\/\/10\.\d+\.\d+\.\d+:3000$/,
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:3000$/,
      /^https:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:3000$/,
    ];
    
    app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        // Check if origin matches allowed patterns
        const isAllowed = allowedOrigins.some(allowed => {
          if (typeof allowed === 'string') {
            return origin === allowed;
          }
          if (allowed instanceof RegExp) {
            return allowed.test(origin);
          }
          return false;
        });
        
        if (isAllowed) {
          callback(null, true);
        } else {
          console.warn(`⚠️  CORS blocked origin: ${origin}`);
          callback(null, true); // Allow anyway for development
        }
      },
      credentials: true,
    }));

    // Global validation pipe
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    // Global error handler for unhandled errors
    app.use((err: any, req: any, res: any, next: any) => {
      console.error('❌ [GLOBAL ERROR HANDLER] Unhandled error:', err);
      console.error('   URL:', req.url);
      console.error('   Method:', req.method);
      console.error('   Error message:', err.message);
      console.error('   Error stack:', err.stack);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error', message: err.message });
      }
    });
    
    // Note: Catch-all removed - it was causing false warnings
    // NestJS routes are matched before this middleware runs

    await app.listen(port, '0.0.0.0');
    console.log(`🚀 imegle.io backend running on port ${port}`);
    console.log(`📡 WebSocket server ready for connections`);
    if (useHttps) {
      console.log(`🌐 HTTPS accessible at: https://localhost:${port} and https://192.168.135.180:${port}`);
      console.log(`⚠️  HTTP requests will fail - use HTTPS URLs`);
    } else {
      console.log(`🌐 HTTP accessible at: http://localhost:${port} and http://0.0.0.0:${port}`);
    }
  } catch (error) {
    console.error('❌ Failed to start backend:', error);
    console.error('   Error details:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

bootstrap();

