import { Injectable, OnModuleInit } from '@nestjs/common';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import { formatDateForClickHouse } from 'src/utils/formatDatefoClickhouse';

@Injectable()
export class ClickhouseService implements OnModuleInit {
  private client: ClickHouseClient;

  onModuleInit() {
    this.client = createClient({
      url: 'http://localhost:8123',
      username: 'default',
      password: '1234', // match users.xml
      database: 'call_management',
    });
  }

  async insertCallLog(callData: any) {
    await this.client.insert({
      table: 'call_logs',
      values: [callData],
      format: 'JSONEachRow',
    });
  }

  async fetchCallLogs(limit = 50) {
    const resultSet = await this.client.query({
      query: `SELECT * FROM call_management.call_logs ORDER BY start_time DESC LIMIT ${limit}`,
      format: 'JSONEachRow',
    });

    const rows = await resultSet.json();
    return rows;
  }

  async updateCallStatus(callSid: string, status: string) {
    const query = `
      ALTER TABLE call_logs 
      UPDATE status = '${status}' 
      WHERE call_sid = '${callSid}'`;

    await this.client.query({
      query: query,
      format: 'JSONEachRow',
    });
  }

  async updateCallEndTime(callSid: string, endTime: Date, duration: number) {
    const endTimeFormatted = formatDateForClickHouse(endTime);
    const query = `
      ALTER TABLE call_logs 
      UPDATE end_time = '${endTimeFormatted}' 
     , duration = ${duration} 
      WHERE call_sid = '${callSid}'`;

    await this.client.query({
      query: query,
      format: 'JSONEachRow',
    });
  }
}
