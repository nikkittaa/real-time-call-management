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
     // statusCallback: `https://unuxorious-unslacking-charlene.ngrok-free.dev/twilio/events`,
      //statusCallbackMethod: 'POST',
      statusCallbackEvent: [
        'initiated',
        'ringing',
        'answered',
        'completed',
      ],
      record: true,
      recordingStatusCallback: 'https://unuxorious-unslacking-charlene.ngrok-free.dev/twilio/recording-events',
      recordingStatusCallbackEvent: ['completed'],
    //  url: `https://unuxorious-unslacking-charlene.ngrok-free.dev/twilio/voice`,
    applicationSid: this.configService.get<string>('TWIML_APP_SID'),
    
    });

    await this.firebaseService.write(`calls/${call.sid}`, {
      user_id: userId,
    });

    return call;
  }
}
