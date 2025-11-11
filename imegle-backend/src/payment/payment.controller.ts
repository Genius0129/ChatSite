import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Get('plans')
  getPlans() {
    return this.paymentService.getPlans();
  }

  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  async createOrder(@Req() req, @Body() body: { planId: string }) {
    const plans = this.paymentService.getPlans();
    const plan = plans.find(p => p.id === body.planId);
    
    if (!plan) {
      return { error: 'Invalid plan' };
    }

    return await this.paymentService.createOrder(req.user.userId, body.planId, plan.price);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  async verifyPayment(
    @Req() req,
    @Body() body: { orderId: string; paymentId: string; signature: string; planId: string },
  ) {
    const isValid = await this.paymentService.verifyPayment(
      body.orderId,
      body.paymentId,
      body.signature,
    );

    if (!isValid) {
      return { error: 'Payment verification failed' };
    }

    const result = await this.paymentService.activateSubscription(
      req.user.userId,
      body.planId,
      body.paymentId,
    );

    return result;
  }
}

