import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class TwilioService {
  private client: Twilio;

  constructor(
    private configService: ConfigService,
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
      ],
     url: `https://unuxorious-unslacking-charlene.ngrok-free.dev/twilio/voice?to=${encodeURIComponent(to)}`,
    
    });


    return call;
  }
}
