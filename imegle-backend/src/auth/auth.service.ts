import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';

export interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  googleId: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  googleId: string;
  plan: 'free' | 'premium' | 'pro';
  subscriptionId?: string;
  subscriptionExpiry?: number;
  createdAt: number;
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {}

  async validateGoogleUser(googleUser: GoogleUser): Promise<User> {
    // Check if user exists
    const existingUser = await this.redisService.getUserByEmail(googleUser.email);
    
    if (existingUser) {
      return existingUser;
    }

    // Create new user
    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
      googleId: googleUser.googleId,
      plan: 'free',
      createdAt: Date.now(),
    };

    await this.redisService.saveUser(user);
    return user;
  }

  async login(user: User) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        plan: user.plan,
        subscriptionExpiry: user.subscriptionExpiry,
      },
    };
  }

  async getUserById(userId: string): Promise<User | null> {
    return await this.redisService.getUserById(userId);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await this.redisService.getUserByEmail(email);
  }

  async updateUserPlan(userId: string, plan: 'free' | 'premium' | 'pro', subscriptionId?: string, expiry?: number): Promise<User | null> {
    const user = await this.getUserById(userId);
    if (!user) return null;

    user.plan = plan;
    if (subscriptionId) user.subscriptionId = subscriptionId;
    if (expiry) user.subscriptionExpiry = expiry;

    await this.redisService.saveUser(user);
    return user;
  }

  async checkSubscriptionStatus(userId: string): Promise<{ active: boolean; plan: string; expiresAt?: number }> {
    const user = await this.getUserById(userId);
    if (!user) {
      return { active: false, plan: 'free' };
    }

    if (user.plan === 'free') {
      return { active: false, plan: 'free' };
    }

    if (user.subscriptionExpiry && user.subscriptionExpiry < Date.now()) {
      // Subscription expired, downgrade to free
      await this.updateUserPlan(userId, 'free');
      return { active: false, plan: 'free' };
    }

    return {
      active: true,
      plan: user.plan,
      expiresAt: user.subscriptionExpiry,
    };
  }
}

