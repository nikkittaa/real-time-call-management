import { Module } from '@nestjs/common';
import { ClickhouseModule } from '../clickhouse/clickhouse.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { TwilioService } from './twilio.service';
import { TwilioController } from './twilio.controller';


@Module({
  imports: [ClickhouseModule, FirebaseModule],
  controllers: [TwilioController],
  providers: [TwilioService],
})
export class TwilioModule {}
