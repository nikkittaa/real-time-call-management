import { Controller, Post, Body, Query, Req, UseGuards, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ClickhouseService } from '../clickhouse/clickhouse.service';
import { ConfigService } from '@nestjs/config';
import { TwilioService } from './twilio.service';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from 'src/common/decorators/get-jwt-payload.decorator';
import { User } from '../users/user.entity';
import { formatDateForClickHouse } from 'src/utils/formatDatefoClickhouse';



@Controller('twilio')
export class TwilioController {
  constructor(private readonly clickhouseService: ClickhouseService,
     private twilioService: TwilioService) {}

  @Post('make')
  @UseGuards(AuthGuard('jwt'))
  async makeCall(@Body('to') to: string, @GetUser() user: User) {
    const call = await this.twilioService.makeCall(to,  user.id);

    return {
      message: 'Call initiated successfully',
      sid: call.sid,
      status: call.status,
      to,
      userId: user.id,
    };
  }

  @Post('voice')
twiml(@Res() res: Response) {
  res.type('text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Hello, this is a call from our application. Please stay on the line.</Say>
</Response>`);
}

  @Post('events')
  async handleEvent(@Body() body: any, @Query('userId') userId?: string) {
    await this.clickhouseService.updateCallStatus(body.CallSid, body.CallStatus);
    if(body.CallStatus === 'completed' || body.CallStatus === 'failed' || body.CallStatus === 'busy' || body.CallStatus === 'no-answer' || body.CallStatus === 'canceled'){
      const fullCall = await this.twilioService.fetchFullCallLog(body.CallSid);
      await this.clickhouseService.updateCallEndTime(body.CallSid, fullCall.endTime, Number(fullCall.duration) || 0);
    }
    return 'OK';
  }
}
