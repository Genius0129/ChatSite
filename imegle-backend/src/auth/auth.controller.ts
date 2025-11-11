import { Controller, Get, Post, Body, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('test')
  test() {
    console.log('✅ Test endpoint called - backend is responding');
    return { message: 'Backend is working!', timestamp: Date.now() };
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    console.log('🔵 Google OAuth initiation endpoint called');
    // Initiates Google OAuth flow
    // Note: Will fail if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not configured
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req, @Res() res) {
    console.log('📥 [CONTROLLER] Google OAuth callback received - Route matched!');
    console.log('   Request URL:', req.url);
    console.log('   Query params:', req.query);
    console.log('   Has code:', !!req.query.code);
    console.log('   User in request:', req.user ? 'present' : 'missing');
    console.log('   Request headers origin:', req.headers.origin);
    console.log('   Request headers host:', req.headers.host);
    
    try {
      if (!req.user) {
        console.error('❌ No user data in OAuth callback');
        console.error('   This usually means Passport authentication failed');
        console.error('   Check if Google OAuth credentials are correct');
        const useHttps = req.protocol === 'https' || req.secure;
        const defaultProtocol = useHttps ? 'https' : 'http';
        let frontendUrl = process.env.CLIENT_URL || `${defaultProtocol}://localhost:3000`;
        if (useHttps && frontendUrl.startsWith('http://')) {
          frontendUrl = frontendUrl.replace('http://', 'https://');
        }
        return res.redirect(`${frontendUrl}?error=oauth_failed&reason=no_user`);
      }

      console.log('✅ User data received from Google:', {
        email: req.user.email,
        name: req.user.name,
      });

      console.log('🔄 Validating Google user...');
      const user = await this.authService.validateGoogleUser(req.user);
      console.log('✅ User validated/created:', user.id);

      console.log('🔄 Generating JWT token...');
      const result = await this.authService.login(user);
      console.log('✅ JWT token generated');

      // Redirect to frontend with token
      // Use HTTPS if backend is using HTTPS, otherwise use CLIENT_URL from env
      const useHttps = req.protocol === 'https' || req.secure;
      const defaultProtocol = useHttps ? 'https' : 'http';
      const frontendUrl = process.env.CLIENT_URL || `${defaultProtocol}://localhost:3000`;
      
      // Ensure frontend URL uses the same protocol as the request
      let finalFrontendUrl = frontendUrl;
      if (useHttps && frontendUrl.startsWith('http://')) {
        finalFrontendUrl = frontendUrl.replace('http://', 'https://');
      }
      
      const redirectUrl = `${finalFrontendUrl}/auth/callback?token=${result.access_token}&user=${encodeURIComponent(JSON.stringify(result.user))}`;
      console.log('🔄 Redirecting to frontend:', finalFrontendUrl);
      console.log('   Request protocol:', req.protocol);
      console.log('   Using HTTPS:', useHttps);
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('❌ Error in Google OAuth callback:', error);
      console.error('   Error stack:', error.stack);
      const useHttps = req.protocol === 'https' || req.secure;
      const defaultProtocol = useHttps ? 'https' : 'http';
      let frontendUrl = process.env.CLIENT_URL || `${defaultProtocol}://localhost:3000`;
      if (useHttps && frontendUrl.startsWith('http://')) {
        frontendUrl = frontendUrl.replace('http://', 'https://');
      }
      res.redirect(`${frontendUrl}?error=oauth_error&message=${encodeURIComponent(error.message)}`);
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req) {
    const user = await this.authService.getUserById(req.user.userId);
    if (!user) {
      return { error: 'User not found' };
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      plan: user.plan,
      subscriptionExpiry: user.subscriptionExpiry,
    };
  }

  @Get('subscription-status')
  @UseGuards(JwtAuthGuard)
  async getSubscriptionStatus(@Req() req) {
    return await this.authService.checkSubscriptionStatus(req.user.userId);
  }
}

