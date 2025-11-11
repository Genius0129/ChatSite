import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    const clientID = configService.get('GOOGLE_CLIENT_ID') || 'dummy-client-id';
    const clientSecret = configService.get('GOOGLE_CLIENT_SECRET') || 'dummy-client-secret';
    
    // Always call super() with values (use dummy if not configured)
    super({
      clientID,
      clientSecret,
      callbackURL: configService.get('GOOGLE_CALLBACK_URL') || 'https://localhost:3002/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
    
    // Warn if using dummy or placeholder values
    if (clientID === 'dummy-client-id' || clientSecret === 'dummy-client-secret' ||
        clientID === 'your-client-id-here.apps.googleusercontent.com' || 
        clientSecret === 'your-client-secret-here') {
      console.warn('⚠️  Google OAuth not configured!');
      console.warn('   Current values are placeholders. You need to:');
      console.warn('   1. Go to: https://console.cloud.google.com/apis/credentials');
      console.warn('   2. Create OAuth 2.0 credentials (or use existing)');
      console.warn('   3. Copy Client ID and Client Secret');
      console.warn('   4. Update imegle-backend/.env file:');
      console.warn('      GOOGLE_CLIENT_ID=your-actual-client-id');
      console.warn('      GOOGLE_CLIENT_SECRET=your-actual-client-secret');
      console.warn('   5. Restart the backend server');
      console.warn('   See GOOGLE_OAUTH_SETUP.md for detailed instructions');
    } else {
      console.log('✅ Google OAuth configured successfully');
      console.log(`   Client ID: ${clientID.substring(0, 20)}...`);
      console.log(`   Callback URL: ${configService.get('GOOGLE_CALLBACK_URL') || 'https://localhost:3002/api/auth/google/callback'}`);
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      console.log('🔍 GoogleStrategy.validate called');
      console.log('   Profile ID:', profile.id);
      console.log('   Profile emails:', profile.emails?.map((e: any) => e.value));
      
      if (!profile.emails || !profile.emails[0]) {
        console.error('❌ No email in Google profile');
        return done(new Error('No email in Google profile'), null);
      }

      const { name, emails, photos } = profile;
      const user = {
        email: emails[0].value,
        name: name.givenName + ' ' + name.familyName,
        picture: photos?.[0]?.value || '',
        googleId: profile.id,
        accessToken,
      };
      
      console.log('✅ GoogleStrategy validated user:', user.email);
      done(null, user);
    } catch (error) {
      console.error('❌ Error in GoogleStrategy.validate:', error);
      done(error, null);
    }
  }
}

