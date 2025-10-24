import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { ClickhouseService } from '../clickhouse/clickhouse.service';
import { formatDateForClickHouse } from 'src/utils/formatDatefoClickhouse';

@Injectable()
export class TwilioService {
  private client: Twilio;

  constructor(
    private configService: ConfigService,
    private clickhouse: ClickhouseService,
  ) {
    this.client = new Twilio(
      this.configService.get<string>('TWILIO_ACCOUNT_SID'),
      this.configService.get<string>('TWILIO_AUTH_TOKEN'),
    );
  }

  async fetchFullCallLog(callSid: string) {
    return this.client.calls(callSid).fetch();
  }

  async makeCall(to: string, userId: string) {
    const from = this.configService.get<string>(
      'TWILIO_PHONE_NUMBER',
    ) as string;
    const call = await this.client.calls.create({
      from,
      to,
      statusCallback: `https://unuxorious-unslacking-charlene.ngrok-free.dev/twilio/events?userId=${userId}`,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: [
        'initiated',
        'ringing',
        'answered',
        'completed',
        'failed',
        'busy',
        'no-answer',
        'canceled',
      ],
      url: `https://unuxorious-unslacking-charlene.ngrok-free.dev/twilio/voice`,
    });

    await this.clickhouse.insertCallLog({
      call_sid: call.sid,
      from_number: from,
      to_number: to,
      status: call.status,
      duration: 0,
      start_time: formatDateForClickHouse(new Date()),
      end_time: null,
      user_id: userId,
      created_at: formatDateForClickHouse(new Date()),
    });

    return call;
  }
}
