import { Module } from '@nestjs/common';
import { TwilioController } from './twilio.controller';
import { CallsService } from './calls.service';
import { TwilioService } from './twilio.service';
import { ClickhouseModule } from '../clickhouse/clickhouse.module';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [ClickhouseModule, FirebaseModule],
  controllers: [TwilioController],
  providers: [CallsService, TwilioService],
})
export class CallsModule {}
