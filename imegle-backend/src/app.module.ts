import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatGateway } from './chat/chat.gateway';
import { ChatService } from './chat/chat.service';
import { RedisService } from './redis/redis.service';
import { StatsController } from './stats/stats.controller';
import { StatsService } from './stats/stats.service';
import { AuthModule } from './auth/auth.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    PaymentModule,
  ],
  controllers: [StatsController],
  providers: [ChatGateway, ChatService, RedisService, StatsService],
})
export class AppModule {}
