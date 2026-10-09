// firebase-admin.provider.ts
import * as admin from 'firebase-admin';
import { join } from 'path';
import { Logger, Provider } from '@nestjs/common';
import * as fs from 'fs';

export const FirebaseAdminProvider: Provider = {
  provide: 'FIREBASE_ADMIN',
  useFactory: () => {
    try {
      // First, try to use the service account if it exists
      const serviceAccountPath = join(
        __dirname,
        '..',
        '..',
        'serviceAccountKey.json',
      );

      if (fs.existsSync(serviceAccountPath)) {
        // We have a service account file - use it
        return admin.initializeApp({
          credential: admin.credential.cert(serviceAccountPath),
        });
      } else {
        // No service account file - try to use environment variables
        const projectId = process.env.FIREBASE_PROJECT_ID || 'ultimabotai';

        if (process.env.FIREBASE_PRIVATE_KEY) {
          return admin.initializeApp({
            credential: admin.credential.cert({
              projectId: projectId,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(
                /\\n/g,
                '\n',
              ),
            }),
          });
        } else {
          // Last resort - initialize with default app
          Logger.warn(
            'No Firebase service account credentials found. Using application default credentials.',
            'FirebaseAdmin',
          );
          return admin.initializeApp({
            projectId: projectId,
          });
        }
      }
    } catch (error) {
      Logger.error(
        'Error initializing Firebase Admin SDK:',
        error?.stack,
        'FirebaseAdmin',
      );
      throw error;
    }
  },
};
