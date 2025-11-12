import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import { formatDateForClickHouse } from 'src/utils/formatDatefoClickhouse';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { CallLog } from 'src/common/interfaces/call-logs.interface';
import { CreateNotesDto } from '../calls/dto/create-notes.dto';
import { GetCallLogsDto } from '../calls/dto/get-call-logs.dto';
import { ExportCallDto } from '../calls/dto/export-call.dto';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CallDebugInfo } from 'src/common/interfaces/call-debug-info.interface';

@Injectable()
export class ClickhouseService implements OnModuleInit {
  private client: ClickHouseClient;
  private readonly logger: Logger;

  constructor(
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly parentLogger: Logger,
  ) {
    this.configService = configService;
    this.logger = this.parentLogger.child({ context: 'Clickhouse' });
  }

  onModuleInit() {
    this.client = createClient({
      url: this.configService.get('CLICKHOUSE_URL'),
      username: this.configService.get('CLICKHOUSE_USERNAME'),
      password: this.configService.get('CLICKHOUSE_PASSWORD'),
      database: this.configService.get('CLICKHOUSE_DATABASE'),
    });
  }

  // CALL LOGS OPERATIONS
  // ------------------------------------
  async insertCallLog(callData: any) {
    try {
      await this.client.insert({
        table: 'call_logs',
        values: [callData],
        format: 'JSONEachRow',
      });

      this.logger.info(`Inserted call log!`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to insert call log. Error: ${err.message}`);
      throw new InternalServerErrorException('Clickhouse insertion failed');
    }
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
    WHERE call_sid = {callSid:String}
    GROUP BY call_sid
  `;

    const resultSet = await this.client.query({
      query,
      query_params: { callSid },
      format: 'JSONEachRow',
    });

    try {
      const result: CallLog[] = await resultSet.json();
      return result[0];
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to get call log. Error: ${err.message}`);
      throw new InternalServerErrorException('Failed to get call log');
    }
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
      LIMIT {limit:UInt64} OFFSET {offset:UInt64}
    `;

    try {
      const resultSet = await this.client.query({
        query,
        query_params: { limit, offset },
        format: 'JSONEachRow',
      });
      const result: CallLog[] = await resultSet.json();
      this.logger.info(
        `Filtered calls for user: ${userId} - ${result.length} calls found`,
      );
      return { data: result };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to get filtered calls. Error: ${err.message}`);
      throw new InternalServerErrorException('Failed to get filtered calls');
    }
  }

  async updateRecordingInfo(
    callSid: string,
    recordingSid: string,
    recordingUrl: string,
  ) {
    try {
      const callData = await this.getCallLog(callSid);
      callData.recording_sid = recordingSid;
      callData.recording_url = recordingUrl;
      await this.insertCallLog(callData);
      this.logger.info(`Updated recording info for callSid: ${callSid}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to update recording info. Error: ${err.message}`,
      );
    }
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

    try {
      const resultSet = await this.client.query({
        query: query,
        format: 'JSONEachRow',
      });

      const result: CallLog[] = await resultSet.json();
      this.logger.info(
        `Exported calls for user: ${userId} - ${result.length} calls found`,
      );
      const csv = [
        Object.keys(result[0]).join(','), // header
        ...result.map((row) =>
          Object.values(row)
            .map((v) => `"${String(v).replace(/"/g, '""')}"`) // escape quotes
            .join(','),
        ),
      ].join('\n');

      return csv;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to export calls. Error: ${err.message}`);
      throw new InternalServerErrorException('Failed to export calls');
    }
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
    this.logger.info(`Analytics fetched for user: ${userId}`);

    return {
      total_calls: Number(totals[0].total_calls || 0),
      avg_duration: Math.round(Number(totals[0].avg_duration || 0)),
      success_rate: Math.round(Number(totals[0].success_rate || 0)),
      status_distribution: statusData, // [{ status: 'completed', count: 123 }, ...]
    };
  }

  async insertCallDebugInfo(callDebugInfo: CallDebugInfo) {
    try {
      await this.client.insert({
        table: 'calls',
        values: [callDebugInfo],
        format: 'JSONEachRow',
      });
      this.logger.info(
        `Inserted call debug info for callSid: ${callDebugInfo.callSid}`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to insert call debug info. Error: ${err.message}`,
      );
    }
  }

  async insertEventLog(
    callSid: string,
    eventData: string,
    eventResponse: string,
  ) {
    try {
      await this.client.insert({
        table: 'twilio_event_logs',
        values: [
          {
            call_sid: callSid,
            event_data: eventData,
            event_response: eventResponse,
          },
        ],
        format: 'JSONEachRow',
      });
      this.logger.info(`Inserted event log for callSid: ${callSid}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to insert event log. Error: ${err.message}`);
    }
  }

  async fetchSummary(callSid: string) {
    const query = `
      SELECT * FROM calls WHERE callSid = '${callSid}'`;
    const resultSet = await this.client.query({
      query: query,
      format: 'JSONEachRow',
    });
    const result: CallDebugInfo[] = await resultSet.json();
    return result[0];
  }

  // CALL NOTES OPERATIONS
  //----------------------------
  async getCallNotes(callSid: string, userId: string) {
    const query = `SELECT 
  argMax(notes, created_at) AS notes
  FROM call_logs   
  WHERE call_sid = {callSid:String} 
  AND user_id = {userId:String}
  GROUP BY call_sid`;

    const resultSet = await this.client.query({
      query: query,
      query_params: { callSid, userId },
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
    this.logger.info(`Updated call notes for callSid: ${callSid}`);
    return { updated: true, message: 'Note updated successfully' };
  }

  async deleteCallNotes(callSid: string) {
    const callData = await this.getCallLog(callSid);
    callData.notes = '';
    await this.insertCallLog(callData);
    this.logger.info(`Deleted call notes for callSid: ${callSid}`);
    return { updated: true, message: 'Note deleted successfully' };
  }

  // USER OPERATIONS
  //---------------------------
  async getUserById(userId: string) {
    const query = `
      SELECT * FROM users WHERE user_id = {userId:String}`;

    const resultSet = await this.client.query({
      query: query,
      query_params: { userId },
      format: 'JSONEachRow',
    });

    const rows: User[] = await resultSet.json();
    return rows[0];
  }

  async getUserByUsername(username: string) {
    const query = 'SELECT * FROM users WHERE username = {username:String}';
    const resultSet = await this.client.query({
      query,
      query_params: { username },
      format: 'JSONEachRow',
    });

    const rows: User[] = await resultSet.json();
    return rows[0];
  }

  async createUser(username: string, password: string) {
    try {
      const existingUser = await this.client.query({
        query:
          'SELECT username FROM users WHERE username = {username:String} LIMIT 1',
        query_params: { username },
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
