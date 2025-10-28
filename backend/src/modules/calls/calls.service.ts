import { Injectable } from '@nestjs/common';
import { ClickhouseService } from '../clickhouse/clickhouse.service';
import { CreateNotesDto } from './dto/create-notes.dto';
import { GetCallLogsDto } from './dto/get-call-logs.dto';

@Injectable()
export class CallsService {
  constructor(private readonly clickhouseService: ClickhouseService) {}

  async getCalls(userId: string, page: number, limit: number) {
    return this.clickhouseService.getUserCallLogs(userId, page, limit);
  }

  async getCallNotes(callSid: string, userId: string){
    return this.clickhouseService.getCallNotes(callSid, userId);
  }

  async updateCallNotes(createNotesDto: CreateNotesDto){
    return this.clickhouseService.updateCallNotes(createNotesDto);
  }

  async deleteCallNotes(callSid: string, user_id: string){
    return this.clickhouseService.deleteCallNotes(callSid, user_id);
  }

  async getFilteredCalls(userId: string, getCallLogsDto: GetCallLogsDto){
    return this.clickhouseService.getFilteredCalls(userId, getCallLogsDto);
  }
}
