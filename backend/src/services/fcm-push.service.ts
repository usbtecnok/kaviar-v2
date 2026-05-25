import { prisma } from '../lib/prisma';
import * as admin from 'firebase-admin';

let firebaseApp: admin.app.App | null = null;

function getFirebaseApp(): admin.app.App {
  if (firebaseApp) return firebaseApp;

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT not configured');
  }

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccount)),
  });

  return firebaseApp;
}

export async function sendFcmPushToDriver(driverId: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
  const driver = await prisma.drivers.findUnique({
    where: { id: driverId },
    select: { fcm_push_token: true }
  });

  if (!driver?.fcm_push_token) {
    console.warn(`[FCM] No FCM token for driver ${driverId}, skipping`);
    return;
  }

  const app = getFirebaseApp();
  const messaging = app.messaging();

  try {
    await messaging.send({
      token: driver.fcm_push_token,
      notification: { title, body },
      android: {
        priority: 'high',
        notification: {
          channelId: 'rides_kaviar_native_v1',
          sound: 'kaviar_ride.wav',
          defaultSound: false,
        },
      },
      data: data || {},
    });
    console.log(`[FCM] Sent to driver ${driverId}`);
  } catch (err: any) {
    const code = err?.code || err?.errorInfo?.code || '';
    if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(code)) {
      try {
        await prisma.drivers.update({ where: { id: driverId }, data: { fcm_push_token: null } });
      } catch (_) { /* best-effort cleanup */ }
      console.warn(`[FCM] Invalidated fcm token for driver ${driverId}: ${code}`);
    } else {
      console.warn(`[FCM] Error for driver ${driverId}: ${code || err?.message}`);
    }
    throw err;
  }
}
