import { prisma } from '../lib/prisma';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function sendPushToDriver(driverId: string, title: string, body: string, data?: Record<string, string>): Promise<'sent' | 'skipped' | 'failed'> {
  try {
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: { expo_push_token: true }
    });

    if (!driver?.expo_push_token) return 'skipped';

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: driver.expo_push_token,
        title,
        body,
        sound: 'default',
        priority: 'high',
        channelId: 'rides',
        data: data || {},
      }),
    });

    if (!res.ok) {
      console.warn(`[PUSH] Failed for driver ${driverId}: HTTP ${res.status}`);
      return 'failed';
    }

    const json: any = await res.json();
    const ticket = json?.data?.[0];
    if (ticket?.status === 'error' && ['DeviceNotRegistered', 'InvalidCredentials'].includes(ticket?.details?.error)) {
      try { await prisma.drivers.update({ where: { id: driverId }, data: { expo_push_token: null } }); } catch (_) { /* best-effort */ }
      console.warn(`[PUSH] Invalidated expo token for driver ${driverId}: ${ticket.details.error}`);
    }

    return 'sent';
  } catch (err) {
    console.warn(`[PUSH] Error sending to driver ${driverId}:`, (err as Error).message);
    return 'failed';
  }
}

export async function sendPushToPassenger(passengerId: string, title: string, body: string, data?: Record<string, string>): Promise<'sent' | 'skipped' | 'failed'> {
  try {
    const passenger = await prisma.passengers.findUnique({
      where: { id: passengerId },
      select: { expo_push_token: true }
    });

    if (!passenger?.expo_push_token) return 'skipped';

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: passenger.expo_push_token,
        title,
        body,
        sound: 'default',
        priority: 'high',
        channelId: 'rides',
        data: data || {},
      }),
    });

    if (!res.ok) {
      console.warn(`[PUSH] Failed for passenger ${passengerId}: HTTP ${res.status}`);
      return 'failed';
    }

    const json: any = await res.json();
    const ticket = json?.data?.[0];
    if (ticket?.status === 'error' && ['DeviceNotRegistered', 'InvalidCredentials'].includes(ticket?.details?.error)) {
      try { await prisma.passengers.update({ where: { id: passengerId }, data: { expo_push_token: null } }); } catch (_) { /* best-effort */ }
      console.warn(`[PUSH] Invalidated expo token for passenger ${passengerId}: ${ticket.details.error}`);
    }

    return 'sent';
  } catch (err) {
    console.warn(`[PUSH] Error sending to passenger ${passengerId}:`, (err as Error).message);
    return 'failed';
  }
}
