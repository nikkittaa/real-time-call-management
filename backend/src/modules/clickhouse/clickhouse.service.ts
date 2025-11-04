import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import { formatDateForClickHouse } from 'src/utils/formatDatefoClickhouse';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { CallLog } from 'src/common/interfaces/call-logs.interface';
import { CreateNotesDto } from '../calls/dto/create-notes.dto';
import { GetCallLogsDto } from '../calls/dto/get-call-logs.dto';
import { ExportCallDto } from '../calls/dto/export-call.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ClickhouseService implements OnModuleInit {
  private client: ClickHouseClient;

  constructor(private configService: ConfigService) {
    this.configService = configService;
  }

  onModuleInit() {
    this.client = createClient({
      url: this.configService.get('CLICKHOUSE_URL'),
      username: this.configService.get('CLICKHOUSE_USERNAME'),
      password: this.configService.get('CLICKHOUSE_PASSWORD'),
      database: this.configService.get('CLICKHOUSE_DATABASE'),
    });
  }

  async insertCallLog(callData: any) {
    await this.client.insert({
      table: 'call_logs',
      values: [callData],
      format: 'JSONEachRow',
    });
  }

  async getCallLog(callSid: string) {
    const query = `
    SELECT call_sid, 
      argMax(from_number, created_at) as from_number, 
      argMax(to_number, created_at) as to_number, 
      argMax(status,  created_at) as status,
      argMax(duration, created_at) as duration,
      argMax(start_time, created_at) as start_time,
      argMax(end_time, created_at) as end_time ,
      argMax(notes, created_at) as notes,
      argMax(recording_sid, created_at) as recording_sid,
      argMax(recording_url, created_at) as recording_url,
      argMax(user_id, created_at) as user_id
    FROM call_logs
    WHERE call_sid = '${callSid}'
    GROUP BY call_sid
  `;

    const resultSet = await this.client.query({
      query,
      format: 'JSONEachRow',
    });

    const result: CallLog[] = await resultSet.json();
    return result[0];
  }

  async getUserCallLogs(userId: string, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT 
        call_sid, 
        argMax(from_number, created_at) as from_number, 
        argMax(to_number, created_at) as to_number, 
        argMax(status,  created_at) as status,
        argMax(duration, created_at) as duration,
        argMax(start_time, created_at) as start_time,
        argMax(end_time, created_at) as end_time ,
        argMax(notes, created_at) as notes,
        argMax(recording_sid, created_at) as recording_sid,
        argMax(recording_url, created_at) as recording_url
      FROM call_logs
      WHERE user_id = '${userId}' 
      GROUP BY call_sid
      ORDER BY start_time DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const resultSet = await this.client.query({
      query,
      format: 'JSONEachRow',
    });

    const result: CallLog[] = await resultSet.json();
    return { data: result };
  }

  async getFilteredCalls(userId: string, getCallLogsDto: GetCallLogsDto) {
    const { page, limit, from, to, phone, status } = getCallLogsDto;
    const offset = (page - 1) * limit;
    const conditions: string[] = [];

    conditions.push(`argMax(user_id, created_at) = '${userId}'`);

    // Handle date range
    if (from) {
      const toDate =
        formatDateForClickHouse(to) || formatDateForClickHouse(new Date());
      conditions.push(
        `start_time BETWEEN '${formatDateForClickHouse(from)}' AND '${toDate}'`,
      );
    }

    // Phone filter
    if (phone) {
      conditions.push(`from_number = '${phone}' OR to_number = '${phone}'`);
    }

    // Status filter
    if (status) {
      conditions.push(`status = '${status}'`);
    }

    const whereClause = conditions.length
      ? ` HAVING ${conditions.join(' AND ')}`
      : '';

    const query = `
      SELECT 
        call_sid, 
        argMax(from_number, created_at) AS from_number, 
        argMax(to_number, created_at) AS to_number, 
        argMax(status, created_at) AS status,
        argMax(duration, created_at) AS duration,
        argMax(start_time, created_at) AS start_time,
        argMax(end_time, created_at) AS end_time,
        argMax(notes, created_at) AS notes,
        argMax(recording_sid, created_at) AS recording_sid,
        argMax(recording_url, created_at) AS recording_url
      FROM call_logs
      GROUP BY call_sid
      ${whereClause}
      ORDER BY argMax(start_time, created_at) as start_time DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const resultSet = await this.client.query({ query, format: 'JSONEachRow' });
    const result: CallLog[] = await resultSet.json();

    return { data: result };
  }

  async updateRecordingInfo(
    callSid: string,
    recordingSid: string,
    recordingUrl: string,
  ) {
    const callData = await this.getCallLog(callSid);
    callData.recording_sid = recordingSid;
    callData.recording_url = recordingUrl;
    await this.insertCallLog(callData);
  }

  async exportCalls(userId: string, exportCallDto: ExportCallDto) {
    const { from, to, phone, status } = exportCallDto;
    const conditions: string[] = [];
    conditions.push(`argMax(user_id, created_at) = '${userId}'`);

    // Handle date range
    if (from) {
      const toDate =
        formatDateForClickHouse(to) || formatDateForClickHouse(new Date());
      conditions.push(
        `start_time BETWEEN '${formatDateForClickHouse(from)}' AND '${toDate}'`,
      );
    }

    // Phone filter
    if (phone) {
      conditions.push(`from_number = '${phone}' OR to_number = '${phone}'`);
    }

    // Status filter
    if (status) {
      conditions.push(`status = '${status}'`);
    }

    const whereClause = conditions.length
      ? ` HAVING ${conditions.join(' AND ')}`
      : '';

    const query = `
      SELECT 
        call_sid, 
        argMax(from_number, created_at) AS from_number, 
        argMax(to_number, created_at) AS to_number, 
        argMax(status, created_at) AS status,
        argMax(duration, created_at) AS duration,
        argMax(start_time, created_at) AS start_time,
        argMax(end_time, created_at) AS end_time,
        argMax(notes, created_at) AS notes,
        argMax(recording_sid, created_at) AS recording_sid,
        argMax(recording_url,created_at) AS recording_url
      FROM call_logs
      GROUP BY call_sid
      ${whereClause}
      ORDER BY argMax(start_time, created_at) as start_time DESC
    `;

    const resultSet = await this.client.query({
      query: query,
      format: 'JSONEachRow',
    });

    const result: CallLog[] = await resultSet.json();

    const csv = [
      Object.keys(result[0]).join(','), // header
      ...result.map((row) =>
        Object.values(row)
          .map((v) => `"${String(v).replace(/"/g, '""')}"`) // escape quotes
          .join(','),
      ),
    ].join('\n');

    return csv;
  }

  async getAnalytics(userId: string, getCallLogsDto: GetCallLogsDto) {
    const { from, to, phone, status } = getCallLogsDto;
    const conditions: string[] = [];
    conditions.push(`argMax(user_id, created_at) = '${userId}'`);

    // Handle date range
    if (from) {
      const toDate =
        formatDateForClickHouse(to) || formatDateForClickHouse(new Date());
      conditions.push(
        `(argMax(start_time, created_at) BETWEEN '${formatDateForClickHouse(from)}' AND '${toDate}')`,
      );
    }
    // Phone filter
    if (phone) {
      conditions.push(
        `(argMax(from_number, created_at) = '${phone}' OR argMax(to_number, created_at) = '${phone}')`,
      );
    }
    // Status filter
    if (status) {
      conditions.push(`status = '${status}'`);
    }

    const whereClause = conditions.length
      ? ` HAVING ${conditions.join(' AND ')}`
      : '';

    // Subquery: get the "latest" values per call_sid
    const baseSubquery = `
      SELECT
        call_sid,
        argMax(duration, created_at) AS duration,
        argMax(status, created_at) AS status
      FROM call_logs
      GROUP BY call_sid
       ${whereClause}
    `;
    //console.log("here", baseSubquery);
    // Totals: total calls, avg duration, success rate
    const totalsQuery = `
      SELECT
        COUNT(*) AS total_calls,
        AVG(duration) AS avg_duration,
        SUM(status = 'completed') / COUNT(*) * 100 AS success_rate
      FROM (${baseSubquery}) AS t
    `;

    const totalsResultSet = await this.client.query({
      query: totalsQuery,
      format: 'JSONEachRow',
    });

    const totalsArray = await totalsResultSet.json();
    const totals = totalsArray as {
      total_calls: number;
      avg_duration: number;
      success_rate: number;
    }[];

    // Status distribution
    const statusQuery = `
      SELECT
        status,
        COUNT(*) AS count
      FROM (${baseSubquery}) AS t
      GROUP BY status
      ORDER BY count DESC
    `;

    const statusResultSet = await this.client.query({
      query: statusQuery,
      format: 'JSONEachRow',
    });

    const statusData = await statusResultSet.json();

    return {
      total_calls: Number(totals[0].total_calls || 0),
      avg_duration: Math.round(Number(totals[0].avg_duration || 0)),
      success_rate: Math.round(Number(totals[0].success_rate || 0)),
      status_distribution: statusData, // [{ status: 'completed', count: 123 }, ...]
    };
  }

  async getCallNotes(callSid: string, userId: string) {
    const query = `SELECT 
  argMax(notes, created_at) AS notes
FROM call_logs_new    
WHERE call_sid = '${callSid}' 
  AND user_id = '${userId}'
GROUP BY call_sid`;

    const resultSet = await this.client.query({
      query: query,
      format: 'JSONEachRow',
    });

    const result: { notes: string }[] = await resultSet.json();
    return result[0];
  }

  async updateCallNotes(createNotesDto: CreateNotesDto) {
    const { id: callSid, notes } = createNotesDto;

    const callData = await this.getCallLog(callSid);
    callData.notes = notes;
    await this.insertCallLog(callData);

    return { updated: true, message: 'Note updated successfully' };
  }

  async deleteCallNotes(callSid: string) {
    const callData = await this.getCallLog(callSid);
    callData.notes = '';
    await this.insertCallLog(callData);

    return { updated: true, message: 'Note deleted successfully' };
  }

  async getUserById(userId: string) {
    const query = `
      SELECT * FROM users WHERE user_id = '${userId}'`;

    const resultSet = await this.client.query({
      query: query,
      format: 'JSONEachRow',
    });

    const rows: User[] = await resultSet.json();
    return rows[0];
  }

  async getUserByUsername(username: string) {
    const query = `
      SELECT * FROM users WHERE username = '${username}'`;

    const resultSet = await this.client.query({
      query: query,
      format: 'JSONEachRow',
    });

    const rows: User[] = await resultSet.json();
    return rows[0];
  }

  async getAllUsers() {
    const query = `
      SELECT * FROM users`;

    const resultSet = await this.client.query({
      query: query,
      format: 'JSONEachRow',
    });

    const rows: User[] = await resultSet.json();
    return rows;
  }

  async createUser(username: string, password: string) {
    try {
      const existingUser = await this.client.query({
        query: `SELECT username FROM users WHERE username = '${username}' LIMIT 1`,
        format: 'JSON',
      });

      const rows = await existingUser.json();
      const data = rows.data;

      if (data.length > 0) {
        throw new ConflictException('Username already exists');
      }

      const salt = await bcrypt.genSalt();
      const encryptedPassword = await bcrypt.hash(password, salt);

      await this.client.insert({
        table: 'users',
        values: [{ username: username, password: encryptedPassword }],
        format: 'JSONEachRow',
      });

      return { message: 'User created successfully' };
    } catch (error) {
      const err = error as Error;
      throw new ConflictException(`Username already exists: ${err.message}`);
    }
  }

  async validateUserPassword(
    username: string,
    password: string,
  ): Promise<boolean> {
    const user = await this.getUserByUsername(username);
    if (!user) {
      return false;
    }
    return bcrypt.compare(password, user.password);
  }
}
