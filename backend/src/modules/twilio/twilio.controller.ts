import {
  Controller,
  Post,
  Body,
  UseGuards,
  Res,
  BadRequestException,
  Inject,
  Req,
  Param,
} from '@nestjs/common';
import type { Response } from 'express';
import { ClickhouseService } from '../clickhouse/clickhouse.service';
import { TwilioService } from './twilio.service';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from 'src/common/decorators/get-jwt-payload.decorator';
import { User } from '../users/user.entity';
import { formatDateForClickHouse } from 'src/utils/formatDatefoClickhouse';
import { FirebaseService } from '../firebase/firebase.service';
import { CallStatus } from 'src/common/enums/call-status.enum';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CallDebugService } from '../callDebug/callDebug.service';
import type { TwilioRecordingEvent } from 'src/common/interfaces/twilio-recordingevent.interface';
import type { TwilioCallEvent } from 'src/common/interfaces/twilio-callevent.interface';

@ApiTags('Twilio')
@Controller('twilio')
export class TwilioController {
  private readonly logger: Logger;
  constructor(
    private readonly clickhouseService: ClickhouseService,
    private twilioService: TwilioService,
    private firebaseService: FirebaseService,
    private callDebugService: CallDebugService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly parentLogger: Logger,
  ) {
    this.logger = this.parentLogger.child({ context: 'TwilioController' });
  }

  @Post('make')
  @ApiOperation({ summary: 'Make a call' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        to: { type: 'string', example: '+1234567890' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Call initiated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Call initiated successfully' },
        sid: { type: 'string', example: 'CA1234567890' },
        status: {
          type: 'enum',
          enum: Object.values(CallStatus),
          example: CallStatus.COMPLETED,
        },
        to: { type: 'string', example: '+1234567890' },
        userId: { type: 'string', example: '1234567890' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async makeCall(@Body('to') to: string, @GetUser() user: User) {
    try {
      const call = await this.twilioService.makeCall(to, user.user_id);
      return {
        message: 'Call initiated successfully',
        sid: call.sid,
        status: call.status,
        to,
        userId: user.user_id,
      };
    } catch (error) {
      const err = error as Error;
      throw new BadRequestException(`Failed to initiate call: ${err.message}`);
    }
  }

  @Post('voice')
  @ApiExcludeEndpoint()
  async twiml(@Req() req: Request, @Res() res: Response) {
    const callSid = (req.body as unknown as TwilioCallEvent)?.CallSid ?? 'test';

    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
  <Response>
      <Say voice="alice">Hello, this is a call from our application. Please stay on the line.</Say>
      <Say voice="alice">This is line 1</Say>
      <Say voice="alice">This is line 2</Say>
      <Say voice="alice">This is line 3</Say>
      <Say voice="alice">Thank you for calling. Have a great day!</Say>
  </Response>`;

    await this.clickhouseService.insertEventLog(
      callSid,
      JSON.stringify(req.body),
      JSON.stringify(twimlResponse),
    );

    res.type('text/xml').send(twimlResponse);
  }

  @Post('events')
  @ApiExcludeEndpoint()
  async handleEvent(@Body() body: TwilioCallEvent) {
    const userData = await this.firebaseService.read(`calls/${body.CallSid}`);
    const user = userData.val() as { user_id: string } | undefined;
    const userId = user?.user_id;

    await this.firebaseService.write(`calls/${userId}/${body.CallSid}`, {
      status: body.CallStatus,
      from_number: body.From,
      to_number: body.To,
    });

    await this.clickhouseService.insertEventLog(
      body.CallSid,
      JSON.stringify(body),
      '',
    );
    if (Object.values(CallStatus).includes(body.CallStatus as CallStatus)) {
      const fullCall = await this.twilioService.fetchFullCallLog(body.CallSid);
      await this.clickhouseService.insertCallLog({
        call_sid: fullCall.sid,
        from_number: fullCall.from,
        to_number: fullCall.to,
        status: fullCall.status,
        duration: Number(fullCall.duration) || 0,
        start_time: formatDateForClickHouse(fullCall.startTime),
        end_time: formatDateForClickHouse(fullCall.endTime),
        user_id: userId,
      });

      await this.firebaseService.delete(`calls/${userId}/${body.CallSid}`);
      await this.firebaseService.delete(`calls/${body.CallSid}`);

      this.callDebugService.insertCallDebugInfoWithDelay(body.CallSid);
    }
  }

  @Post(':callSid/start-recording')
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard('jwt'))
  async startRecording(@Param('callSid') callSid: string) {
    try{
      const res = await this.twilioService.startRecording(callSid);
      await this.clickhouseService.insertEventLog(
        callSid,
        'Recording started',
        JSON.stringify(res),
      );
      return res;
    }catch(error){
      const err = error as Error;
      throw new BadRequestException(`Failed to start recording: ${err.message}`);
    }
}

@Post(':callSid/stop-recording')
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard('jwt'))
  async stopRecording(@Param('callSid') callSid: string) {
    try{
      const res = await this.twilioService.stopRecording(callSid);
      await this.clickhouseService.insertEventLog(
        callSid,
        'Recording stopped',
        JSON.stringify(res),
      );
      return res;
    }catch(error){
      const err = error as Error;
      throw new BadRequestException(`Failed to stop recording: ${err.message}`);
    }
  }
    

  @Post('recording-events')
  @ApiExcludeEndpoint()
  async handleRecordingEvent(@Body() body: TwilioRecordingEvent) {
    const { CallSid, RecordingSid, RecordingUrl } = body;
    await this.clickhouseService.insertEventLog(
      body.CallSid,
      JSON.stringify(body),
      'OK',
    );

    if(body.RecordingStatus === 'completed'){
       await this.clickhouseService.updateRecordingInfo(
      CallSid,
      RecordingSid,
      RecordingUrl,
    );
    }
   
    return 'OK';
  }
}
