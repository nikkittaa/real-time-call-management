import { forwardRef, Module } from '@nestjs/common';
import { TwilioModule } from '../twilio/twilio.module';
import { ClickhouseModule } from '../clickhouse/clickhouse.module';
import { LoggerModule } from '../logger/logger.module';
import { CallDebugService } from './callDebug.service';
import { CallDebugController } from './callDebug.controller';

@Module({
  imports: [ClickhouseModule, LoggerModule, forwardRef(() => TwilioModule)],
  providers: [CallDebugService],
  controllers: [CallDebugController],
  exports: [CallDebugService],
})
export class CallDebugModule {}
