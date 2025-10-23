import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClickhouseService } from './clickhouse.service';

@Module({
    imports:[ConfigModule.forRoot({
        isGlobal: true,
    })],
    providers: [ClickhouseService],
    exports: [ClickhouseService],
})
export class ClickhouseModule {}

