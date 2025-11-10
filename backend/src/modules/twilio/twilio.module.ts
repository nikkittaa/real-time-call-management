import { forwardRef, Module } from '@nestjs/common';
import { ClickhouseModule } from '../clickhouse/clickhouse.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { TwilioService } from './twilio.service';
import { TwilioController } from './twilio.controller';
import { CallDebugModule } from '../callDebug/callDebug.module';

@Module({
  imports: [
    ClickhouseModule,
    FirebaseModule,
    forwardRef(() => CallDebugModule),
  ],
  controllers: [TwilioController],
  providers: [TwilioService],
  exports: [TwilioService],
})
export class TwilioModule {}
