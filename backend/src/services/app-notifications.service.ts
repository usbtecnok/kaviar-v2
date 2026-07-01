import { prisma } from '../lib/prisma';

const db = prisma as any;

export type AppNotificationRecipientType = 'PASSENGER' | 'DRIVER';
export type AppNotificationType =
  | 'fixed_route_message'
  | 'fixed_route_broadcast'
  | 'fixed_route_direct'
  | 'system';

export interface CreateAppNotificationInput {
  recipient_type: AppNotificationRecipientType;
  recipient_id: string;
  title: string;
  body: string;
  type: AppNotificationType;
  source_type?: string;
  source_id?: string;
  route_id?: string;
  reservation_id?: string;
  /** Somente campos seguros: routeId, reservationId, messageId — sem token/telefone */
  data?: Record<string, string | null | undefined>;
  expires_at?: Date;
}

export interface AppNotificationOutput {
  id: string;
  recipient_type: string;
  title: string;
  body: string;
  type: string;
  route_id: string | null;
  reservation_id: string | null;
  data: Record<string, string | null> | null;
  read_at: string | null;
  created_at: string;
}

function safeData(raw: Record<string, string | null | undefined> | undefined): Record<string, string | null> | undefined {
  if (!raw) return undefined;
  const safe: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(raw)) {
    safe[k] = v == null ? null : String(v);
  }
  return safe;
}

function mapOutput(row: any): AppNotificationOutput {
  return {
    id: row.id,
    recipient_type: row.recipient_type,
    title: row.title,
    body: row.body ?? '',
    type: row.type,
    route_id: row.route_id ?? null,
    reservation_id: row.reservation_id ?? null,
    data: row.data ?? null,
    read_at: row.read_at ? (row.read_at instanceof Date ? row.read_at.toISOString() : String(row.read_at)) : null,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export async function createAppNotification(input: CreateAppNotificationInput): Promise<AppNotificationOutput> {
  const row = await db.app_notifications.create({
    data: {
      recipient_type: input.recipient_type,
      recipient_id: input.recipient_id,
      title: input.title.slice(0, 200),
      body: (input.body ?? '').slice(0, 500),
      type: input.type,
      source_type: input.source_type ?? null,
      source_id: input.source_id ?? null,
      route_id: input.route_id ?? null,
      reservation_id: input.reservation_id ?? null,
      data: safeData(input.data) ?? null,
      expires_at: input.expires_at ?? null,
    },
  });

  console.info('[app_notification_created]', {
    id: row.id,
    recipient_type: row.recipient_type,
    recipient_id: row.recipient_id,
    type: row.type,
    route_id: row.route_id ?? null,
    reservation_id: row.reservation_id ?? null,
  });

  return mapOutput(row);
}

/** Cria notificações para múltiplos destinatários (broadcast). Falhas individuais não abortam as demais. */
export async function createAppNotificationBroadcast(
  recipientIds: string[],
  recipientType: AppNotificationRecipientType,
  base: Omit<CreateAppNotificationInput, 'recipient_type' | 'recipient_id'>,
): Promise<void> {
  const unique = Array.from(new Set(recipientIds.filter(Boolean)));
  if (!unique.length) return;

  await Promise.allSettled(
    unique.map((id) =>
      createAppNotification({ ...base, recipient_type: recipientType, recipient_id: id }).catch((err) => {
        console.warn('[app_notification_broadcast_partial_error]', {
          recipient_type: recipientType,
          recipient_id: id,
          type: base.type,
          error: err instanceof Error ? err.message : 'unknown_error',
        });
      }),
    ),
  );
}

export async function listNotifications(
  recipientType: AppNotificationRecipientType,
  recipientId: string,
  limit = 50,
): Promise<AppNotificationOutput[]> {
  const rows = await db.app_notifications.findMany({
    where: {
      recipient_type: recipientType,
      recipient_id: recipientId,
      OR: [{ expires_at: null }, { expires_at: { gte: new Date() } }],
    },
    orderBy: { created_at: 'desc' },
    take: Math.min(limit, 100),
    select: {
      id: true,
      recipient_type: true,
      title: true,
      body: true,
      type: true,
      route_id: true,
      reservation_id: true,
      data: true,
      read_at: true,
      created_at: true,
    },
  });

  return rows.map(mapOutput);
}

export async function getUnreadCount(
  recipientType: AppNotificationRecipientType,
  recipientId: string,
): Promise<number> {
  return db.app_notifications.count({
    where: {
      recipient_type: recipientType,
      recipient_id: recipientId,
      read_at: null,
      OR: [{ expires_at: null }, { expires_at: { gte: new Date() } }],
    },
  });
}

export async function markNotificationRead(
  id: string,
  recipientType: AppNotificationRecipientType,
  recipientId: string,
): Promise<boolean> {
  const existing = await db.app_notifications.findFirst({
    where: { id, recipient_type: recipientType, recipient_id: recipientId },
    select: { id: true, read_at: true },
  });
  if (!existing) return false;
  if (existing.read_at) return true; // already read

  await db.app_notifications.update({
    where: { id },
    data: { read_at: new Date() },
  });

  return true;
}

export async function markAllRead(
  recipientType: AppNotificationRecipientType,
  recipientId: string,
): Promise<number> {
  const result = await db.app_notifications.updateMany({
    where: {
      recipient_type: recipientType,
      recipient_id: recipientId,
      read_at: null,
    },
    data: { read_at: new Date() },
  });

  return result.count ?? 0;
}
