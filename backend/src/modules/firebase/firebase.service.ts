import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import * as serviceAccount from '../../../real-time-firebase.json';

@Injectable()
export class FirebaseService {
  private db: admin.database.Database;

  constructor(private configService: ConfigService) {
    const databaseURL = this.configService.get<string>('FIREBASE_DB_URL');


const serviceAccountClone = JSON.parse(JSON.stringify(serviceAccount));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountClone as admin.ServiceAccount),
      databaseURL,
    });

    this.db = admin.database();
  }

  async write(path: string, data: any) {
    await this.db.ref(path).set(data);
  }

  listen(path: string, callback: (snapshot: admin.database.DataSnapshot) => void) {
    this.db.ref(path).on('value', callback);
  }
}
