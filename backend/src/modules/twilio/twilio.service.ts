import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class TwilioService {
  private client: Twilio;

  constructor(
    private configService: ConfigService,
    private firebaseService: FirebaseService,
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
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      record: true,
      recordingStatusCallback: `${this.configService.get<string>('PUBLIC_URL')}/twilio/recording-events`,
      recordingStatusCallbackEvent: ['completed'],

      applicationSid: this.configService.get<string>('TWIML_APP_SID'),
    });

    await this.firebaseService.write(`calls/${call.sid}`, {
      user_id: userId,
    });
    console.log(call);

    return call;
  }

  async checkHealth() {
    try {
      // Lightweight ping to verify Twilio credentials & connectivity
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
