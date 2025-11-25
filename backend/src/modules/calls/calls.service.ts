import { Injectable } from '@nestjs/common';
import { ClickhouseService } from '../clickhouse/clickhouse.service';
import { CreateNotesDto } from './dto/create-notes.dto';
import { GetCallLogsDto } from './dto/get-call-logs.dto';
import { ExportCallDto } from './dto/export-call.dto';

@Injectable()
export class CallsService {
  constructor(private readonly clickhouseService: ClickhouseService) {}

  async getCallNotes(callSid: string, userId: string) {
    return this.clickhouseService.getCallNotes(callSid, userId);
  }

  async updateCallNotes(createNotesDto: CreateNotesDto) {
    return this.clickhouseService.updateCallNotes(createNotesDto);
  }

  async getFilteredCalls(userId: string, getCallLogsDto: GetCallLogsDto) {
    return this.clickhouseService.getFilteredCalls(userId, getCallLogsDto);
  }

  async exportCalls(userId: string, exportCallDto: ExportCallDto) {
    return this.clickhouseService.exportCalls(userId, exportCallDto);
  }

  async getAnalytics(userId: string, getCallLogsDto: GetCallLogsDto) {
    return this.clickhouseService.getAnalytics(userId, getCallLogsDto);
  }

  async fetchSummary(callSid: string) {
    return this.clickhouseService.fetchSummary(callSid);
  }
}
