import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { FirebaseService } from '../modules/firebase/firebase.service';
import { ClickhouseService } from '../modules/clickhouse/clickhouse.service';
import { TwilioService } from '../modules/twilio/twilio.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly clickhouseService: ClickhouseService,
    private readonly twilioService: TwilioService,
  ) {}

  @Get()
  async checkHealth() {
    const status = {
      firebase: 'unknown',
      clickhouse: 'unknown',
      twilio: 'unknown',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };

    try {
      await this.firebaseService.read('.info/connected');
      status.firebase = 'ok';
    } catch (error) {
      status.firebase = 'error';
    }

    try {
      const result = await this.clickhouseService.getAnalytics('1234567890');
      status.clickhouse = result ? 'ok' : 'error';
    } catch (error) {
      status.clickhouse = 'error';
    }

    try {
      status.twilio = await this.twilioService.checkHealth();
    } catch (error) {
      status.twilio = 'error';
    }

    if (
      status.firebase !== 'ok' ||
      status.clickhouse !== 'ok' ||
      status.twilio !== 'ok'
    ) {
      throw new HttpException(status, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return status;
  }
}
