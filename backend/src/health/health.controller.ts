import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { FirebaseService } from '../modules/firebase/firebase.service';
import { ClickhouseService } from '../modules/clickhouse/clickhouse.service';
import { TwilioService } from '../modules/twilio/twilio.service';
import { GetCallLogsDto } from 'src/modules/calls/dto/get-call-logs.dto';

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
      const err = error as Error;
      status.firebase = `error: ${err.message}`;
    }

    try {
      const result = await this.clickhouseService.getAnalytics(
        '1234567890',
        new GetCallLogsDto(),
      );
      status.clickhouse = result ? 'ok' : 'error';
    } catch (error) {
      const err = error as Error;
      status.clickhouse = `error: ${err.message}`;
    }

    try {
      status.twilio = await this.twilioService.checkHealth();
    } catch (error) {
      const err = error as Error;
      status.twilio = `error: ${err.message}`;
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
