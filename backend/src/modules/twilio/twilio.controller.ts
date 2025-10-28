import {
  Controller,
  Post,
  Body,
  Query,
  UseGuards,
  Res,
  BadRequestException,
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
    try{ 
      const call = await this.twilioService.makeCall(to, user.user_id);
      return {
        message: 'Call initiated successfully',
        sid: call.sid,
        status: call.status,
        to,
        userId: user.user_id,
      };
    } catch (error) {
      throw new BadRequestException('Failed to initiate call: ' + error.message);
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
  async handleEvent(@Body() body: any) {
    const  userData = await this.firebaseService.read(`calls/${body.CallSid}`);
    const userId = userData.val()?.user_id;

    await this.firebaseService.write(`calls/${userId}/${body.CallSid}`, {
      status: body.CallStatus,
      from_number: body.From,
      to_number: body.To,
    });
    if (
      Object.values(CallStatus).includes(body.CallStatus)
    ) {
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
        created_at: formatDateForClickHouse(fullCall.startTime),
      });

      await this.firebaseService.delete(`calls/${userId}/${body.CallSid}`);
      await this.firebaseService.delete(`calls/${body.CallSid}`);
    }
    return 'OK';
  }
}
