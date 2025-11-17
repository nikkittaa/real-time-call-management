import { Body, Controller, HttpException, Post } from '@nestjs/common';
import { CallDebugService } from './callDebug.service';
import { CallEnqueDto } from './dto/call-enque.dto';

@Controller('call-debug')
export class CallDebugController {
  constructor(private readonly callDebugService: CallDebugService) {}

  @Post('process-call-logs')
  async processCallLogs(@Body('callSid') callSid: string, @Body('userId') userId: string) {
   
    const result =
      await this.callDebugService.insertCallDebugInfoWithDelay({callSid, userId});
    if (result.ok) {
      return { status: 'done' };
    } else {
      throw new HttpException(result.message || 'Failed', 500);
    }
  }
}
