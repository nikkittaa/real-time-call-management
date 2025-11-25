import { Module } from '@nestjs/common';
import { CallsService } from './calls.service';
import { ClickhouseModule } from '../clickhouse/clickhouse.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { CallController } from './call.controller';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [ClickhouseModule, FirebaseModule],
  controllers: [CallController],
  providers: [CallsService, JwtService],
})
export class CallsModule {}
