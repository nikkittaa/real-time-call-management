import { Injectable } from '@nestjs/common';
import { ClickhouseService } from '../clickhouse/clickhouse.service';

@Injectable()
export class CallsService {
  constructor(private readonly clickhouseService: ClickhouseService) {}

  async getCalls(userId: string) {
    return this.clickhouseService.getUserCallLogs(userId);
  }
}
