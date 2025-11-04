import {
  Controller,
  Post,
  Body,
  UseGuards,
  Res,
  BadRequestException,
  Get,
  Query,
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
import type { TwilioCallEvent } from 'src/common/interfaces/twilio-callevent.interface';
import type { TwilioRecordingEvent } from 'src/common/interfaces/twilio-recordingevent.interface';

@Controller('twilio')
export class TwilioController {
  constructor(
    private readonly clickhouseService: ClickhouseService,
    private twilioService: TwilioService,
    private firebaseService: FirebaseService,
  ) {}

  @Post('make')
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
  twiml(@Res() res: Response) {
    res.type('text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
    <Response>
        <Say voice="alice">Hello, this is a call from our application. Please stay on the line.</Say>
        <Say voice="alice">Thank you for calling. Have a great day!</Say>
    </Response>`);
  }

  @Post('events')
  async handleEvent(@Body() body: TwilioCallEvent) {
    const userData = await this.firebaseService.read(`calls/${body.CallSid}`);
    const user = userData.val() as { user_id: string } | undefined;
    const userId = user?.user_id;

    await this.firebaseService.write(`calls/${userId}/${body.CallSid}`, {
      status: body.CallStatus,
      from_number: body.From,
      to_number: body.To,
    });
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
    }
    return 'OK';
  }

  @Post('recording-events')
  async handleRecordingEvent(@Body() body: TwilioRecordingEvent) {
    const { CallSid, RecordingSid, RecordingUrl } = body;

    if (!CallSid || !RecordingSid || !RecordingUrl) {
      return 'Missing required recording fields';
    }
    await this.clickhouseService.updateRecordingInfo(
      CallSid,
      RecordingSid,
      RecordingUrl,
    );
    return 'OK';
  }

  @Get('summary')
  @UseGuards(AuthGuard('jwt'))
  async getSummary(@Query('callSid') callSid: string) {
    if(!callSid) {
      return 'CallSid is required';
    }

    return this.twilioService.fetchSummary(callSid);
  }
}
