import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import { AuthService } from '../auth/auth.service';

export interface Plan {
  id: string;
  name: string;
  price: number; // in INR
  duration: number; // in days
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: 'premium',
    name: 'Premium',
    price: 299,
    duration: 30,
    features: [
      'Ad-free experience',
      'Priority matching',
      'HD video quality',
      'Unlimited skips',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 499,
    duration: 30,
    features: [
      'All Premium features',
      'Advanced filters',
      'Gender preference',
      'Location-based matching',
      '24/7 priority support',
    ],
  },
];

@Injectable()
export class PaymentService {
  private razorpay: Razorpay;

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const keyId = this.configService.get('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get('RAZORPAY_KEY_SECRET');

    if (keyId && keySecret) {
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    }
  }

  getPlans(): Plan[] {
    return PLANS;
  }

  async createOrder(userId: string, planId: string, amount: number) {
    if (!this.razorpay) {
      throw new Error('Razorpay not configured');
    }

    const plan = PLANS.find(p => p.id === planId);
    if (!plan) {
      throw new Error('Invalid plan');
    }

    const options = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `order_${userId}_${Date.now()}`,
      notes: {
        userId,
        planId,
        planName: plan.name,
      },
    };

    try {
      const order = await this.razorpay.orders.create(options);
      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: this.configService.get('RAZORPAY_KEY_ID'),
      };
    } catch (error) {
      console.error('Razorpay order creation error:', error);
      throw new Error('Failed to create order');
    }
  }

  async verifyPayment(orderId: string, paymentId: string, signature: string): Promise<boolean> {
    if (!this.razorpay) {
      throw new Error('Razorpay not configured');
    }

    const crypto = require('crypto');
    const keySecret = this.configService.get('RAZORPAY_KEY_SECRET');
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    return generatedSignature === signature;
  }

  async activateSubscription(userId: string, planId: string, paymentId: string) {
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) {
      throw new Error('Invalid plan');
    }

    const expiryDate = Date.now() + plan.duration * 24 * 60 * 60 * 1000;
    await this.authService.updateUserPlan(userId, planId as 'premium' | 'pro', paymentId, expiryDate);

    return {
      success: true,
      plan: planId,
      expiresAt: expiryDate,
    };
  }
}

