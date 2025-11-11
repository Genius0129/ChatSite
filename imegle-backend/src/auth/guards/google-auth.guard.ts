import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private configService?: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    console.log('🔐 GoogleAuthGuard: Checking authentication...');
    console.log('   URL:', request.url);
    console.log('   Method:', request.method);
    console.log('   Query:', JSON.stringify(request.query));
    console.log('   Has code param:', !!request.query.code);
    console.log('   Full URL:', request.protocol + '://' + request.get('host') + request.url);
    
    try {
      const result = super.canActivate(context);
      if (result instanceof Promise) {
        return result.catch((err) => {
          console.error('❌ GoogleAuthGuard canActivate failed:', err);
          console.error('   Error message:', err.message);
          console.error('   Error stack:', err.stack);
          throw err;
        });
      }
      return result;
    } catch (err) {
      console.error('❌ GoogleAuthGuard canActivate error:', err);
      throw err;
    }
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    if (err) {
      console.error('❌ GoogleAuthGuard error:', err);
      console.error('   Error message:', err.message);
      console.error('   Error stack:', err.stack);
      console.error('   Request URL:', request.url);
      
      // Don't redirect here - let the controller handle it
      // Just return null so the controller can handle the error
      return null;
    }
    
    if (!user) {
      console.warn('⚠️ GoogleAuthGuard: No user returned');
      console.warn('   Info:', JSON.stringify(info));
      console.warn('   Request URL:', request.url);
      
      // Don't redirect here - let the controller handle it
      // Just return null so the controller can handle the error
      return null;
    }
    
    console.log('✅ GoogleAuthGuard: User authenticated:', user.email);
    return user;
  }
}

