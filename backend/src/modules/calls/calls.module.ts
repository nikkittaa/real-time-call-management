import { Module } from '@nestjs/common';
import { TwilioController } from './twilio.controller';
import { CallsService } from './calls.service';
import { TwilioService } from './twilio.service';
import { ClickhouseModule } from '../clickhouse/clickhouse.module';

@Module({
  imports: [ClickhouseModule],
  controllers: [TwilioController],
  providers: [CallsService, TwilioService],
})
export class CallsModule {}
