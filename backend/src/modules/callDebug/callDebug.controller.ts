import { Body, Controller, HttpException, Post } from '@nestjs/common';
import { CallDebugService } from './callDebug.service';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('call-debug')
export class CallDebugController {
  constructor(private readonly callDebugService: CallDebugService) {}

  @Post('process-call-logs')
  @ApiOperation({
    summary: 'Process call logs - add a call log to cloud tasks queue',
  })
  @ApiResponse({
    status: 200,
    description: 'Call log added to cloud tasks queue',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to add call log to cloud tasks queue',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        callSid: { type: 'string', example: 'CA1234567890' },
        userId: { type: 'string', example: '1234567890' },
      },
    },
  })
  async processCallLogs(
    @Body('callSid') callSid: string,
    @Body('userId') userId: string,
  ) {
    const result = await this.callDebugService.insertCallDebugInfoWithDelay({
      callSid,
      userId,
    });
    if (result.ok) {
      return { status: 'done' };
    } else {
      throw new HttpException(result.message || 'Failed', 500);
    }
  }
}
