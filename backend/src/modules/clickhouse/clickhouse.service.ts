import { ConflictException, Injectable, OnModuleInit } from '@nestjs/common';
import { ClickHouseClient, createClient } from '@clickhouse/client';
import { formatDateForClickHouse } from 'src/utils/formatDatefoClickhouse';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { CallLog } from 'src/common/interfaces/call-logs.interface';
import { CreateNotesDto } from '../calls/dto/create-notes.dto';

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

  async getUserCallLogs(userId: string, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const query = `
      SELECT 
        call_sid, 
        from_number, 
        to_number, 
        status, 
        duration, 
        start_time, 
        end_time ,
        notes
      FROM call_logs 
      WHERE user_id = '${userId}' 
      ORDER BY start_time DESC
    LIMIT ${limit} OFFSET ${offset}
    `;

    const resultSet = await this.client.query({
      query,
      format: 'JSONEachRow',
    });


    const result: CallLog[] = await resultSet.json();
    return {data: result};
  }

  async getCallNotes(callSid: string, userId: string){
    const query = `SELECT notes FROM call_logs WHERE call_sid = '${callSid}' AND user_id = '${userId}'`;

    const resultSet = await this.client.query({
      query: query,
      format: 'JSONEachRow',
    });

    const result : {notes: string}[] = await resultSet.json();
    return result[0];
  }

  async updateCallNotes(createNotesDto: CreateNotesDto){
    const {id: callSid, user_id, notes} = createNotesDto;

    const checkQuery = `
    SELECT count() AS count
    FROM call_logs
    WHERE call_sid = '${callSid}' AND user_id = '${user_id}'
  `;

  const checkResult = await this.client.query({
    query: checkQuery,
    format: 'JSONEachRow',
  });

  const [{count}] : {count: number}[] = await checkResult.json();

  if (count === 0) {
    return { updated: false, message: 'No matching call found' };
  }

    const query = `ALTER TABLE call_logs UPDATE notes = '${notes}', updated_at = now() WHERE call_sid = '${callSid}' AND user_id = '${user_id}' `;

    const resultSet = await this.client.query({
      query: query,
      format: 'JSONEachRow',
    })

    return { updated: true, message: 'Note updated successfully' };
  }

  async deleteCallNotes(callSid: string, user_id: string){
    const checkQuery = `
    SELECT count() AS count
    FROM call_logs
    WHERE call_sid = '${callSid}' AND user_id = '${user_id}'
  `;

  const checkResult = await this.client.query({
    query: checkQuery,
    format: 'JSONEachRow',
  });

  const [{count}] : {count: number}[] = await checkResult.json();

  if (count === 0) {
    return { updated: false, message: 'No matching call found' };
  }
    const query = `ALTER TABLE call_logs UPDATE notes = '' , updated_at = now() WHERE call_sid = '${callSid}' AND user_id = '${user_id}' `;

    const resultSet = await this.client.query({
      query: query,
      format: 'JSONEachRow',
    });

    return { updated: true, message: 'Note deleted successfully' };
    
  }

  async getUserById(userId: string) {
    const query = `
      SELECT * FROM users WHERE user_id = '${userId}'`;

    const resultSet = await this.client.query({
      query: query,
      format: 'JSONEachRow',
    });

    const rows : User[] = await resultSet.json();
    return rows[0];
  }

  async getUserByUsername(username: string) {
    const query = `
      SELECT * FROM users WHERE username = '${username}'`;

    const resultSet = await this.client.query({
      query: query,
      format: 'JSONEachRow',
    });

    const rows : User[] = await resultSet.json();
    return rows[0];
  }

  async getAllUsers(){
    const query = `
      SELECT * FROM users`;

    const resultSet = await this.client.query({
      query: query,
      format: 'JSONEachRow',
    });

    const rows : User[] = await resultSet.json();
    return rows;
  }

  async createUser(username: string, password: string) {

    try{
      const existingUser = await this.client.query({
        query: `SELECT username FROM users WHERE username = '${username}' LIMIT 1`,
        format: 'JSON',
      });
    
      const rows = await existingUser.json();
      const data = rows.data;

      if(data.length > 0){
        throw new ConflictException('Username already exists');
      }

      const salt = await bcrypt.genSalt();
    const encryptedPassword = await bcrypt.hash(password, salt);
  

    await this.client.insert({
      table: 'users',
      values: [{username: username, password: encryptedPassword}],
      format: 'JSONEachRow',
    });

    return 'OK';
    }catch(error){
      throw new ConflictException('Username already exists');
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
