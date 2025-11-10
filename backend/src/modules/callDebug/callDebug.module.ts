import { forwardRef, Module } from '@nestjs/common';
import { TwilioModule } from '../twilio/twilio.module';
import { ClickhouseModule } from '../clickhouse/clickhouse.module';
import { LoggerModule } from '../logger/logger.module';
import { CallDebugService } from './callDebug.service';

@Module({
  imports: [ClickhouseModule, LoggerModule, forwardRef(() => TwilioModule)],
  providers: [CallDebugService],
  exports: [CallDebugService],
})
export class CallDebugModule {}
