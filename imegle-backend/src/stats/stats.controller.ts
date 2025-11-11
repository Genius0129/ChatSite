import { Controller, Get } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('api/stats')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get()
  async getStats() {
    return await this.statsService.getStats();
  }
}

