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
import { ConfigService } from '@nestjs/config';
import { jwt } from 'twilio';
import * as Twilio from 'twilio';
import VoiceResponse from 'twilio/lib/twiml/VoiceResponse';

@ApiTags('Twilio')
@Controller('twilio')
export class TwilioController {
  private readonly logger: Logger;
  constructor(
    private readonly clickhouseService: ClickhouseService,
    private twilioService: TwilioService,
    private firebaseService: FirebaseService,
    private callDebugService: CallDebugService,
    private configService: ConfigService,
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
      `${this.configService.get<string>('PUBLIC_URL')}/twilio/voice`,
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

    await this.firebaseService.write(`calls/${user?.user_id}/${body.CallSid}`, {
      status: body.CallStatus,
      from_number: body.From,
      to_number: body.To,
    });

    await this.clickhouseService.insertEventLog(
      body.CallSid,
      `${this.configService.get<string>('PUBLIC_URL')}/twilio/events`,
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
    try {
      const res = await this.twilioService.startRecording(callSid);
      await this.clickhouseService.insertEventLog(
        callSid,
        `${this.configService.get<string>('PUBLIC_URL')}/twilio/start-recording`,
        'Recording started',
        JSON.stringify(res),
      );
      return res;
    } catch (error) {
      const err = error as Error;
      throw new BadRequestException(
        `Failed to start recording: ${err.message}`,
      );
    }
  }

  @Post(':callSid/stop-recording')
  @ApiExcludeEndpoint()
  @UseGuards(AuthGuard('jwt'))
  async stopRecording(@Param('callSid') callSid: string) {
    try {
      const res = await this.twilioService.stopRecording(callSid);
      await this.clickhouseService.insertEventLog(
        callSid,
        `${this.configService.get<string>('PUBLIC_URL')}/twilio/stop-recording`,
        'Recording stopped',
        JSON.stringify(res),
      );
      return res;
    } catch (error) {
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
      `${this.configService.get<string>('PUBLIC_URL')}/twilio/recording-events`,
      JSON.stringify(body),
      'OK',
    );

    if (body.RecordingStatus === 'completed') {
      await this.clickhouseService.updateRecordingInfo(
        CallSid,
        RecordingSid,
        RecordingUrl,
      );
    }

    return 'OK';
  }

  @Get('token')
  @UseGuards(AuthGuard('jwt'))
  generateToken(@Query('identity') identity: string) {
    const twilioAccountSid = this.configService.get<string>(
      'TWILIO_ACCOUNT_SID',
    ) as string;
    const twilioApiKey = this.configService.get<string>(
      'TWILIO_API_KEY',
    ) as string;
    const twilioApiSecret = this.configService.get<string>(
      'TWILIO_API_SECRET',
    ) as string;

    const AccessToken = jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: this.configService.get<string>(
        'TWIML_APP_SID_OUTGOING',
      ) as string,
      incomingAllow: true,
    });

    const token = new AccessToken(
      twilioAccountSid,
      twilioApiKey,
      twilioApiSecret,
      { identity },
    );

    token.addGrant(voiceGrant);

    return {
      identity,
      token: token.toJwt(),
    };
  }

  @Post('events-child')
  @ApiExcludeEndpoint()
  async handleEventChild(@Body() body: TwilioCallEvent) {
    const parentCall = await this.firebaseService.read(
      `calls/${body.ParentCallSid}`,
    );
    const parentUser = parentCall.val() as { user_id: string } | undefined;
    const user = parentUser;
    const userId = user?.user_id;

    await this.clickhouseService.insertEventLog(
      body.CallSid,
      `${this.configService.get<string>('PUBLIC_URL')}/twilio/events-child`,
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

      await this.firebaseService.delete(`calls/${body.CallSid}`);

      this.callDebugService.insertCallDebugInfoWithDelay(body.CallSid);
    }
  }

  @Post('events-outgoing')
  @ApiExcludeEndpoint()
  async handleEventOutgoing(@Body() body: any, @Res() res: Response) {
    const { From } = body;
    const user = From.split(':')[1];

    await this.clickhouseService.insertEventLog(
      body.CallSid,
      `${this.configService.get<string>('PUBLIC_URL')}/twilio/events-outgoing`,
      JSON.stringify(body),
      '',
    );

    let responseTwiML;
    if (body.DialCallStatus === 'completed') {
      responseTwiML = '<Response><Say>Call ended</Say></Response>';
    } else {
      responseTwiML =
        '<Response><Say>Call failed. Please try again later.</Say></Response>';
    }
    if (Object.values(CallStatus).includes(body.DialCallStatus as CallStatus)) {
      setTimeout(() => {
        void (async () => {
          const maxRetries = 5;
          const delay = 5000;
          const callSid = body.CallSid;

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const fullCall =
                await this.twilioService.fetchFullCallLog(callSid);
              if (
                fullCall &&
                fullCall.status &&
                Object.values(CallStatus).includes(
                  fullCall.status as CallStatus,
                )
              ) {
                await this.clickhouseService.insertCallLog({
                  call_sid: fullCall.sid,
                  from_number: fullCall.from,
                  to_number: fullCall.to,
                  status: fullCall.status,
                  duration: Number(fullCall.duration) || 0,
                  start_time: formatDateForClickHouse(fullCall.startTime),
                  end_time: formatDateForClickHouse(fullCall.endTime),
                  user_id: user,
                });

                this.callDebugService.insertCallDebugInfoWithDelay(callSid);
                await this.firebaseService.delete(`calls/${body.CallSid}`);

                this.logger.info(
                  `Call log successfully inserted for ${callSid} (attempt ${attempt})`,
                );
                return;
              }

              this.logger.warn(
                ` Call status '${fullCall?.status}' not yet valid for ${callSid}. Attempt ${attempt}/${maxRetries}`,
              );
            } catch (error) {
              this.logger.error(
                ` Error fetching fullCall for ${callSid} (attempt ${attempt}):`,
                error,
              );
              await this.firebaseService.delete(`calls/${body.CallSid}`);
            }

            await new Promise((res) => setTimeout(res, delay));
          }

          this.logger.warn(
            `Gave up after ${maxRetries} attempts for CallSid ${callSid}`,
          );
        })();
      }, 2000);
    }
    res.type('text/xml').send(responseTwiML);
  }

  @Post('voice-outgoing')
  @ApiExcludeEndpoint()
  async voiceResponse(@Req() req: Request, @Res() res: Response) {
    const callSid = (req.body as unknown as TwilioCallEvent)?.CallSid ?? 'test';
    const to = (req.body as unknown as TwilioCallEvent)?.To ?? 'test';
    const userData = (req.body as unknown as TwilioCallEvent)?.From ?? 'test';
    const userId = userData.split(':')[1];
    await this.firebaseService.write(`calls/${callSid}`, {
      user_id: userId,
    });
    const twiml = new Twilio.twiml.VoiceResponse();

    const dial = twiml.dial({
      callerId: this.configService.get<string>('TWILIO_PHONE_NUMBER'),
      action: `${this.configService.get<string>('PUBLIC_URL')}/twilio/events-outgoing`,
      record: 'record-from-answer',
      recordingStatusCallback: `${this.configService.get<string>('PUBLIC_URL')}/twilio/recording-events`,
      recordingStatusCallbackEvent: ['completed'],
    });

    dial.number(
      {
        statusCallback: `${this.configService.get<string>('PUBLIC_URL')}/twilio/events-child`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
      },
      to,
    );

    const twimlString = twiml.toString();

    await this.clickhouseService.insertEventLog(
      callSid,
      `${this.configService.get<string>('PUBLIC_URL')}/twilio/voice-outgoing`,
      JSON.stringify(req.body),
      JSON.stringify(twimlString),
    );

    res.type('text/xml').send(twimlString);
  }

  @Post('incoming')
  async handleIncoming(@Res() res: Response, @Body() body: any) {
    const twiml = new VoiceResponse();
    twiml
      .dial({
        action: `${this.configService.get<string>('PUBLIC_URL')}/twilio/events-incoming-parent`,
      })
      .client(
        {
          statusCallback: `${this.configService.get<string>('PUBLIC_URL')}/twilio/events-incoming`,
          statusCallbackEvent: [
            'initiated',
            'ringing',
            'answered',
            'completed',
          ],
          statusCallbackMethod: 'POST',
        },
        `${this.configService.get<string>('TEST_USER')}`,
      );

    await this.clickhouseService.insertEventLog(
      body.CallSid,
      `${this.configService.get<string>('PUBLIC_URL')}/twilio/incoming`,
      JSON.stringify(body),
      JSON.stringify(twiml.toString()),
    );

    res.type('text/xml');
    res.send(twiml.toString());
  }

  @Post('events-incoming')
  @ApiExcludeEndpoint()
  async handleEventIncoming(@Body() body: TwilioCallEvent) {
    await this.clickhouseService.insertEventLog(
      body.CallSid,
      `${this.configService.get<string>('PUBLIC_URL')}/twilio/events-incoming`,
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
        user_id: this.configService.get<string>('TEST_USER'),
      });

      await this.firebaseService.delete(`calls/${body.CallSid}`);

      this.callDebugService.insertCallDebugInfoWithDelay(body.CallSid);
    }

    return 'Ok';
  }

  @Post('events-incoming-parent')
  @ApiExcludeEndpoint()
  async handleIncomingActionUrl(@Body() body: any, @Res() res: Response) {
    await this.clickhouseService.insertEventLog(
      body.CallSid,
      `${this.configService.get<string>('PUBLIC_URL')}/twilio/events-incoming-parent`,
      JSON.stringify(body),
      '<Response><Say>Call ended</Say></Response>',
    );


    return res
      .type('text/xml')
      .send('<Response><Say>Call ended</Say></Response>');
  }

  @Post('events-incoming-parent-end')
  @ApiExcludeEndpoint()
  async handleEventIncomingParentEnd(@Body() body: any) {
    await this.clickhouseService.insertEventLog(
      body.CallSid,
      `${this.configService.get<string>('PUBLIC_URL')}/twilio/events-incoming-parent-end`,
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
        user_id: this.configService.get<string>('TEST_USER'),
      });

      this.callDebugService.insertCallDebugInfoWithDelay(body.CallSid);
    }

    return 'Ok';
  }
}
