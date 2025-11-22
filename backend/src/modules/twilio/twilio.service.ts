import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { FirebaseService } from '../firebase/firebase.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CallDebugInfo } from 'src/common/interfaces/call-debug-info.interface';
import { formatDateForClickHouse } from 'src/utils/formatDatefoClickhouse';

@Injectable()
export class TwilioService {
  private client: Twilio;
  private readonly logger: Logger;

  constructor(
    private configService: ConfigService,
    private firebaseService: FirebaseService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly parentLogger: Logger,
  ) {
    this.logger = this.parentLogger.child({ context: 'Twilio' });
    this.client = new Twilio(
      this.configService.get<string>('TWILIO_ACCOUNT_SID'),
      this.configService.get<string>('TWILIO_AUTH_TOKEN'),
    );
  }

  async fetchFullCallLog(callSid: string) {
    const call = await this.client.calls(callSid).fetch();
    this.logger.info(`Full call log fetched for callSid: ${callSid}`);
    return call;
  }

  async makeCall(to: string, userId: string) {
    this.logger.info(`Making call to: ${to} for user: ${userId}`);
    const from = this.configService.get<string>(
      'TWILIO_PHONE_NUMBER',
    ) as string;
    const call = await this.client.calls.create({
      from,
      to,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      applicationSid: this.configService.get<string>('TWIML_APP_SID'),
    });

    await this.firebaseService.write(`calls/${call.sid}`, {
      user_id: userId,
    });

    return call;
  }

  async startRecording(callSid: string) {
    try {
      const recordings = await this.client
        .calls(callSid)
        .recordings.list({ limit: 1 });

      if (recordings.length > 0) {
        const recordingSid = recordings[0].sid;
        await this.client
          .calls(callSid)
          .recordings(recordingSid)
          .update({ status: 'in-progress' });
        this.logger.info(`Recording started for callSid: ${callSid}`);
      } else {
        const recording = await this.client.calls(callSid).recordings.create();
        this.logger.info(`Recording started for callSid: ${callSid}`);
        return recording.sid;
      }
    } catch (error) {
      this.logger.error(`Failed to start recording for ${callSid}`, error);
      throw error;
    }
  }

  async stopRecording(callSid: string) {
    try {
      const recordings = await this.client
        .calls(callSid)
        .recordings.list({ limit: 1 });
      if (recordings.length === 0) {
        this.logger.warn(`No active recording found for ${callSid}`);
        return null;
      }

      const recordingSid = recordings[0].sid;
      await this.client
        .calls(callSid)
        .recordings(recordingSid)
        .update({ status: 'paused' });
      this.logger.info(`Recording paused for callSid: ${callSid}`);
      return recordingSid;
    } catch (error) {
      this.logger.error(`Failed to pause recording for ${callSid}`, error);
      throw error;
    }
  }

  async fetchSummary(callSid: string) {
    this.logger.info(`Fetching summary for callSid: ${callSid}`);
    const fullCall = await this.fetchFullCallLog(callSid);
    const childCalls = await this.client.calls.list({ parentCallSid: callSid });
    const events = await this.client.api.v2010
      .accounts(this.client.accountSid)
      .calls(callSid)
      .events.list();
    const recordings = await this.client.api.v2010
      .accounts(this.client.accountSid)
      .calls(callSid)
      .recordings.list();

    return {
      callSid: fullCall.sid,
      from: fullCall.from,
      to: fullCall.to,
      date_created: formatDateForClickHouse(fullCall.dateCreated),
      start_time: formatDateForClickHouse(fullCall.startTime),
      end_time: formatDateForClickHouse(fullCall.endTime),
      direction: fullCall.direction,
      duration: Number(fullCall.duration),
      status: fullCall.status,
      price: fullCall.price
        ? parseFloat(fullCall.price)
        : fullCall.status === 'completed'
          ? null
          : 0.0,
      price_unit: fullCall.priceUnit,
      child_calls: JSON.stringify(childCalls),
      recordings: JSON.stringify(recordings),
      events: JSON.stringify(events),
    } as CallDebugInfo;
  }

  async checkHealth() {
    try {
      const account = await this.client.api
        .accounts(this.client.accountSid)
        .fetch();
      return account && account.sid ? 'ok' : 'error';
    } catch (error) {
      const err = error as Error;
      console.error('Twilio health check failed:', err.message);
      return 'error';
    }
  }
}
