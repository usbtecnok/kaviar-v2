import { prisma } from '../lib/prisma';
import { createHash } from 'crypto';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function tokenHash(token?: string | null): string {
  if (!token) return 'none';
  return createHash('sha256').update(token).digest('hex').slice(0, 12);
}

function logPushAttempt(details: {
  target: 'driver' | 'passenger';
  recipientId: string;
  hasToken: boolean;
  tokenHash: string;
  provider: 'expo' | 'fcm';
  result: 'sent' | 'skipped_no_token' | 'provider_error';
  providerTicketId?: string | null;
  providerError?: string | null;
}) {
  console.info('[push_send_attempt]', {
    target: details.target,
    recipientId: details.recipientId,
    hasToken: details.hasToken,
    tokenHash: details.tokenHash,
    provider: details.provider,
    result: details.result,
    providerTicketId: details.providerTicketId || null,
    providerError: details.providerError || null,
  });
}

export async function sendPushToDriver(driverId: string, title: string, body: string, data?: Record<string, string>): Promise<'sent' | 'skipped' | 'failed'> {
  try {
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: { expo_push_token: true }
    });

    const hashedToken = tokenHash(driver?.expo_push_token || null);
    if (!driver?.expo_push_token) {
      logPushAttempt({
        target: 'driver',
        recipientId: driverId,
        hasToken: false,
        tokenHash: hashedToken,
        provider: 'expo',
        result: 'skipped_no_token',
      });
      return 'skipped';
    }

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
      logPushAttempt({
        target: 'driver',
        recipientId: driverId,
        hasToken: true,
        tokenHash: hashedToken,
        provider: 'expo',
        result: 'provider_error',
        providerError: `HTTP_${res.status}`,
      });
      return 'failed';
    }

    const json: any = await res.json();
    const ticket = json?.data?.[0];
    if (ticket?.status === 'error') {
      logPushAttempt({
        target: 'driver',
        recipientId: driverId,
        hasToken: true,
        tokenHash: hashedToken,
        provider: 'expo',
        result: 'provider_error',
        providerTicketId: ticket?.id || null,
        providerError: ticket?.details?.error || ticket?.message || 'ticket_error',
      });
      if (['DeviceNotRegistered', 'InvalidCredentials'].includes(ticket?.details?.error)) {
        try { await prisma.drivers.update({ where: { id: driverId }, data: { expo_push_token: null } }); } catch (_) { /* best-effort */ }
        console.warn(`[PUSH] Invalidated expo token for driver ${driverId}: ${ticket.details.error}`);
      }
      return 'failed';
    }

    logPushAttempt({
      target: 'driver',
      recipientId: driverId,
      hasToken: true,
      tokenHash: hashedToken,
      provider: 'expo',
      result: 'sent',
      providerTicketId: ticket?.id || null,
    });

    if (ticket?.status === 'error' && ['DeviceNotRegistered', 'InvalidCredentials'].includes(ticket?.details?.error)) {
      try { await prisma.drivers.update({ where: { id: driverId }, data: { expo_push_token: null } }); } catch (_) { /* best-effort */ }
      console.warn(`[PUSH] Invalidated expo token for driver ${driverId}: ${ticket.details.error}`);
    }

    return 'sent';
  } catch (err) {
    console.warn(`[PUSH] Error sending to driver ${driverId}:`, (err as Error).message);
    logPushAttempt({
      target: 'driver',
      recipientId: driverId,
      hasToken: true,
      tokenHash: 'unknown',
      provider: 'expo',
      result: 'provider_error',
      providerError: (err as Error).message,
    });
    return 'failed';
  }
}

export async function sendPushToPassenger(passengerId: string, title: string, body: string, data?: Record<string, string>): Promise<'sent' | 'skipped' | 'failed'> {
  try {
    const passenger = await prisma.passengers.findUnique({
      where: { id: passengerId },
      select: { expo_push_token: true }
    });

    const hashedToken = tokenHash(passenger?.expo_push_token || null);
    if (!passenger?.expo_push_token) {
      logPushAttempt({
        target: 'passenger',
        recipientId: passengerId,
        hasToken: false,
        tokenHash: hashedToken,
        provider: 'expo',
        result: 'skipped_no_token',
      });
      return 'skipped';
    }

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
      logPushAttempt({
        target: 'passenger',
        recipientId: passengerId,
        hasToken: true,
        tokenHash: hashedToken,
        provider: 'expo',
        result: 'provider_error',
        providerError: `HTTP_${res.status}`,
      });
      return 'failed';
    }

    const json: any = await res.json();
    const ticket = json?.data?.[0];
    if (ticket?.status === 'error') {
      logPushAttempt({
        target: 'passenger',
        recipientId: passengerId,
        hasToken: true,
        tokenHash: hashedToken,
        provider: 'expo',
        result: 'provider_error',
        providerTicketId: ticket?.id || null,
        providerError: ticket?.details?.error || ticket?.message || 'ticket_error',
      });
      if (['DeviceNotRegistered', 'InvalidCredentials'].includes(ticket?.details?.error)) {
        try { await prisma.passengers.update({ where: { id: passengerId }, data: { expo_push_token: null } }); } catch (_) { /* best-effort */ }
        console.warn(`[PUSH] Invalidated expo token for passenger ${passengerId}: ${ticket.details.error}`);
      }
      return 'failed';
    }

    logPushAttempt({
      target: 'passenger',
      recipientId: passengerId,
      hasToken: true,
      tokenHash: hashedToken,
      provider: 'expo',
      result: 'sent',
      providerTicketId: ticket?.id || null,
    });

    if (ticket?.status === 'error' && ['DeviceNotRegistered', 'InvalidCredentials'].includes(ticket?.details?.error)) {
      try { await prisma.passengers.update({ where: { id: passengerId }, data: { expo_push_token: null } }); } catch (_) { /* best-effort */ }
      console.warn(`[PUSH] Invalidated expo token for passenger ${passengerId}: ${ticket.details.error}`);
    }

    return 'sent';
  } catch (err) {
    console.warn(`[PUSH] Error sending to passenger ${passengerId}:`, (err as Error).message);
    logPushAttempt({
      target: 'passenger',
      recipientId: passengerId,
      hasToken: true,
      tokenHash: 'unknown',
      provider: 'expo',
      result: 'provider_error',
      providerError: (err as Error).message,
    });
    return 'failed';
  }
}
