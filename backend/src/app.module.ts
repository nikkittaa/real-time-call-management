import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClickhouseService } from './modules/clickhouse/clickhouse.service';
import { ClickhouseModule } from './modules/clickhouse/clickhouse.module';
import { CallsModule } from './modules/calls/calls.module';
import { FirebaseModule } from './modules/firebase/firebase.module';
import { FirebaseService } from './modules/firebase/firebase.service';
import { TwilioModule } from './modules/twilio/twilio.module';
import { HealthController } from './health/health.controller';
import { TwilioService } from './modules/twilio/twilio.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
      isGlobal: true,
    }),
    UsersModule,
    AuthModule,
    ClickhouseModule,
    CallsModule,
    FirebaseModule,
    TwilioModule,
  ],
  controllers: [AppController,  HealthController],
  providers: [AppService, ClickhouseService, FirebaseService, ConfigService, TwilioService],
})
export class AppModule {}
