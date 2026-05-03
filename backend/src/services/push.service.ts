import { prisma } from '../lib/prisma';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function sendPushToDriver(driverId: string, title: string, body: string): Promise<void> {
  try {
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: { expo_push_token: true }
    });

    if (!driver?.expo_push_token) return;

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: driver.expo_push_token,
        title,
        body,
        sound: 'default',
        priority: 'high',
      }),
    });

    if (!res.ok) {
      console.warn(`[PUSH] Failed for driver ${driverId}: HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn(`[PUSH] Error sending to driver ${driverId}:`, (err as Error).message);
  }
}
