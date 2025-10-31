import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import * as serviceAccount from '../../../real-time-firebase.json';
import { cert, getApp, getApps } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

@Injectable()
export class FirebaseService {
  private db: admin.database.Database;

  constructor(private configService: ConfigService) {
    const databaseURL = this.configService.get<string>('FIREBASE_DB_URL');

    const serviceAccountClone: admin.ServiceAccount = JSON.parse(
      JSON.stringify(serviceAccount),
    ) as admin.ServiceAccount;

    let app;
    if (getApps().length === 0) {
      app = admin.initializeApp({
        credential: cert(serviceAccountClone),
        databaseURL,
      });
      this.db = getDatabase(app);
    } else {
      this.db = getDatabase(getApp());
    }
  }

  async write(path: string, data: any) {
    await this.db.ref(path).set(data);
  }

  async read(path: string) {
    return await this.db.ref(path).once('value');
  }

  async delete(path: string) {
    await this.db.ref(path).remove();
  }

  listen(
    path: string,
    callback: (snapshot: admin.database.DataSnapshot) => void,
  ) {
    this.db.ref(path).on('value', callback);
  }
}
