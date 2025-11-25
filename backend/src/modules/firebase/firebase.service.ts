import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import { cert, getApp, getApps } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

@Injectable()
export class FirebaseService {
  private db: admin.database.Database;

  constructor(private configService: ConfigService) {
    const databaseURL = this.configService.get<string>('FIREBASE_DB_URL');

    let serviceAccount: admin.ServiceAccount;

    const firebasePrivateKey = this.configService.get<string>(
      'FIREBASE_PRIVATE_KEY',
    ) || '';
    const firebaseClientEmail = this.configService.get<string>(
      'FIREBASE_CLIENT_EMAIL',
    );
    const firebaseProjectId = this.configService.get<string>(
      'FIREBASE_PROJECT_ID',
    );

      serviceAccount = {
        projectId: firebaseProjectId,
        clientEmail: firebaseClientEmail,
        privateKey: firebasePrivateKey.replace(/\\n/g, '\n'),
      };
   

    let app;
    if (getApps().length === 0) {
      app = admin.initializeApp({
        credential: cert(serviceAccount),
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
    callback: (
      snapshot: admin.database.DataSnapshot,
      eventType: string,
    ) => void,
  ) {
    const ref = this.db.ref(path);

    const handlers = {
      child_added: (snap: admin.database.DataSnapshot) =>
        callback(snap, 'child_added'),
      child_changed: (snap: admin.database.DataSnapshot) =>
        callback(snap, 'child_changed'),
      child_removed: (snap: admin.database.DataSnapshot) =>
        callback(snap, 'child_removed'),
    };

    ref.on('child_added', handlers.child_added);
    ref.on('child_changed', handlers.child_changed);
    ref.on('child_removed', handlers.child_removed);

    return () => {
      ref.off('child_added', handlers.child_added);
      ref.off('child_changed', handlers.child_changed);
      ref.off('child_removed', handlers.child_removed);
    };
  }
}
