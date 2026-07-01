import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateDriver, authenticatePassenger } from '../middlewares/auth';
import { cleanString } from '../services/fixed-route.service';
import { sendPushToDriver, sendPushToPassenger } from '../services/push.service';
import { createAppNotification, createAppNotificationBroadcast } from '../services/app-notifications.service';

const db = prisma as any;

const DRIVER_ROUTE_QUICK_CODES = new Set([
  'LEAVING_SOON',
  'AT_MEETING_POINT',
  'ROUTE_CONFIRMED_TODAY',
  'RETURN_TIME_UPDATED',
  'WAITING_PASSENGERS',
]);

const DRIVER_TO_PASSENGER_QUICK_CODES = new Set([
  'I_AM_WAITING',
  'PLEASE_CONFIRM',
  'RUNNING_LATE_DRIVER',
]);

const PASSENGER_TO_DRIVER_QUICK_CODES = new Set([
  'PASSENGER_CONFIRMED',
  'ONLY_RETURN_TODAY',
  'ARRIVING_POINT',
  'RUNNING_LATE_PASSENGER',
  'NEED_HELP',
]);

const QUICK_CODE_TEXT: Record<string, string> = {
  LEAVING_SOON: 'Vou sair em 10 minutos.',
  AT_MEETING_POINT: 'Estou no ponto combinado.',
  ROUTE_CONFIRMED_TODAY: 'A rota de hoje está mantida.',
  RETURN_TIME_UPDATED: 'O horário da volta foi atualizado.',
  WAITING_PASSENGERS: 'Estou aguardando os passageiros confirmados.',
  I_AM_WAITING: 'Estou aguardando no ponto combinado.',
  PLEASE_CONFIRM: 'Pode confirmar se você vai hoje?',
  RUNNING_LATE_DRIVER: 'Estou com alguns minutos de atraso.',
  PASSENGER_CONFIRMED: 'Confirmo minha ida.',
  ONLY_RETURN_TODAY: 'Hoje vou apenas na volta.',
  ARRIVING_POINT: 'Estou chegando ao ponto combinado.',
  RUNNING_LATE_PASSENGER: 'Estou com alguns minutos de atraso.',
  NEED_HELP: 'Preciso de ajuda com essa reserva.',
};

const NOTIFICATION_PREVIEW_MAX = 160;
const CLOSED_ROUTE_STATUSES = new Set(['archived', 'cancelled', 'inactive', 'deleted']);

function driverId(req: Request) {
  return (req as any).driver?.id || (req as any).driverId || (req as any).userId;
}

function passengerId(req: Request) {
  return (req as any).passenger?.id || (req as any).passengerId || (req as any).userId;
}

function buildMessage(messageCodeInput: any, messageTextInput: any, allowedCodes: Set<string>) {
  const messageCode = cleanString(messageCodeInput, 60);
  const rawText = typeof messageTextInput === 'string' ? messageTextInput.trim() : '';

  if (rawText.length > 500) {
    return { error: 'message_text deve ter no máximo 500 caracteres' };
  }

  const customText = cleanString(rawText, 500);

  if (messageCode && !allowedCodes.has(messageCode)) {
    return { error: 'message_code inválido para este tipo de envio' };
  }

  const baseFromCode = messageCode ? QUICK_CODE_TEXT[messageCode] || '' : '';
  const combined = customText ? (baseFromCode ? `${baseFromCode} ${customText}` : customText) : baseFromCode;
  const messageText = cleanString(combined, 500);

  if (!messageText) {
    return { error: 'Informe message_code válido ou message_text' };
  }

  if (messageText.length > 500) {
    return { error: 'message_text deve ter no máximo 500 caracteres' };
  }

  return { data: { messageCode: messageCode || null, messageText } };
}

function buildNotificationPreview(messageText: string, fallback: string): string {
  const normalized = messageText
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\b\d{8,}\b/g, '[oculto]')
    .trim();

  const safe = cleanString(normalized, NOTIFICATION_PREVIEW_MAX + 20) || fallback;
  if (safe.length <= NOTIFICATION_PREVIEW_MAX) return safe;
  return `${safe.slice(0, NOTIFICATION_PREVIEW_MAX - 3).trimEnd()}...`;
}

function mapMessageOutput(row: any) {
  return {
    id: row.id,
    route_id: row.route_id,
    reservation_id: row.reservation_id,
    sender_type: row.sender_type,
    recipient_type: row.recipient_type,
    message_code: row.message_code,
    message_text: row.message_text,
    created_at: row.created_at,
    read_at: row.read_at,
    metadata: row.metadata || null,
  };
}

function buildPushPayload(routeId: string, messageId: string, reservationId?: string | null) {
  const payload: Record<string, string> = {
    type: 'fixed_route_message',
    routeId,
    messageId,
  };

  if (reservationId) {
    payload.reservationId = reservationId;
  }

  return payload;
}

type FixedRoutePushDirection = 'driver_to_passenger_broadcast' | 'driver_to_passenger_direct' | 'passenger_to_driver';
type FixedRoutePushResult = 'success' | 'failure' | 'skip';

function logFixedRoutePushAttempt(details: {
  direction: FixedRoutePushDirection;
  routeId: string;
  reservationId?: string | null;
  messageId: string;
  recipientCount: number;
  hasPassengerId: boolean;
  pushResult: FixedRoutePushResult;
}) {
  console.info('[fixed_route_message_push_attempt]', {
    direction: details.direction,
    routeId: details.routeId,
    reservationId: details.reservationId || null,
    messageId: details.messageId,
    recipientCount: details.recipientCount,
    hasPassengerId: details.hasPassengerId,
    pushResult: details.pushResult,
  });
}

function normalizeId(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }
  return null;
}

function normalizeRouteStatus(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function isRouteClosedStatus(value: unknown): boolean {
  return CLOSED_ROUTE_STATUSES.has(normalizeRouteStatus(value));
}

function closedRouteMessage(): string {
  return 'Esta rota foi encerrada pelo motorista.';
}

async function notifyConfirmedPassengersFromRoute(routeId: string, messageId: string, messageText: string, routeStatus: string) {
  const confirmedReservations: Array<{ passenger_id?: unknown }> = await db.driver_fixed_route_reservations.findMany({
    where: { route_id: routeId, status: 'confirmed' },
    select: { passenger_id: true },
  });

  const uniquePassengerIds: string[] = Array.from(new Set(
    confirmedReservations
      .map((reservation) => normalizeId(reservation?.passenger_id))
      .filter((passengerId): passengerId is string => passengerId !== null),
  ));

  const payload = buildPushPayload(routeId, messageId);

  // Notificação persistente (broadcast): falha não interrompe push
  void createAppNotificationBroadcast(
    uniquePassengerIds,
    'PASSENGER',
    {
      title: 'Nova mensagem da Rota Fixa',
      body: buildNotificationPreview(messageText, 'Você recebeu uma nova mensagem sobre sua rota.'),
      type: 'fixed_route_broadcast',
      source_type: 'fixed_route_message',
      source_id: messageId,
      route_id: routeId,
      data: {
        routeId,
        messageId,
        routeStatus,
        canReply: String(canPassengerWrite(routeStatus)),
        direction: 'driver_to_passenger_broadcast',
        notificationType: 'fixed_route_broadcast',
      },
    },
  ).catch((err) => {
    console.warn('[FIXED_ROUTE_MESSAGES_NOTIFICATION_BROADCAST_ERROR]', {
      routeId,
      messageId,
      error: err instanceof Error ? err.message : 'unknown_error',
    });
  });

  await Promise.allSettled(uniquePassengerIds.map(async (passengerId) => {
    const pushResult = await sendPushToPassenger(
      passengerId,
      'Aviso da sua Rota Fixa',
      'O motorista enviou uma atualização da rota.',
      payload,
    );

    logFixedRoutePushAttempt({
      direction: 'driver_to_passenger_broadcast',
      routeId,
      messageId,
      recipientCount: uniquePassengerIds.length,
      hasPassengerId: true,
      pushResult: pushResult === 'sent' ? 'success' : pushResult === 'skipped' ? 'skip' : 'failure',
    });
  }));
}

async function notifyPassengerFromReservation(routeId: string, reservationId: string, messageId: string, targetPassengerId: string, messageText: string, routeStatus: string) {
  // Notificação persistente: falha não interrompe push
  void createAppNotification({
    recipient_type: 'PASSENGER',
    recipient_id: targetPassengerId,
    title: 'Nova mensagem da Rota Fixa',
    body: buildNotificationPreview(messageText, 'Você recebeu uma nova mensagem sobre sua rota.'),
    type: 'fixed_route_direct',
    source_type: 'fixed_route_message',
    source_id: messageId,
    route_id: routeId,
    reservation_id: reservationId,
    data: {
      routeId,
      reservationId,
      messageId,
      routeStatus,
      canReply: String(canPassengerWrite(routeStatus)),
      direction: 'driver_to_passenger_direct',
      notificationType: 'fixed_route_direct',
    },
  }).catch((err) => {
    console.warn('[FIXED_ROUTE_MESSAGES_NOTIFICATION_DIRECT_ERROR]', {
      routeId,
      reservationId,
      messageId,
      error: err instanceof Error ? err.message : 'unknown_error',
    });
  });

  const pushResult = await sendPushToPassenger(
    targetPassengerId,
    'Mensagem do motorista',
    'Você recebeu uma mensagem sobre sua Rota Fixa.',
    buildPushPayload(routeId, messageId, reservationId),
  );

  logFixedRoutePushAttempt({
    direction: 'driver_to_passenger_direct',
    routeId,
    reservationId,
    messageId,
    recipientCount: 1,
    hasPassengerId: Boolean(targetPassengerId),
    pushResult: pushResult === 'sent' ? 'success' : pushResult === 'skipped' ? 'skip' : 'failure',
  });
}

async function notifyRouteDriver(routeId: string, reservationId: string, messageId: string, targetDriverId: string, messageText: string, routeStatus: string) {
  // Notificação persistente: falha não interrompe push
  void createAppNotification({
    recipient_type: 'DRIVER',
    recipient_id: targetDriverId,
    title: 'Nova mensagem da Rota Fixa',
    body: buildNotificationPreview(messageText, 'Você recebeu uma nova mensagem sobre sua rota.'),
    type: 'fixed_route_message',
    source_type: 'fixed_route_message',
    source_id: messageId,
    route_id: routeId,
    reservation_id: reservationId,
    data: {
      routeId,
      reservationId,
      messageId,
      routeStatus,
      canReply: String(canDriverWrite(routeStatus)),
      direction: 'passenger_to_driver',
      notificationType: 'fixed_route_message',
    },
  }).catch((err) => {
    console.warn('[FIXED_ROUTE_MESSAGES_NOTIFICATION_DRIVER_ERROR]', {
      routeId,
      reservationId,
      messageId,
      error: err instanceof Error ? err.message : 'unknown_error',
    });
  });

  const pushResult = await sendPushToDriver(
    targetDriverId,
    'Mensagem de passageiro',
    'Um passageiro enviou uma mensagem sobre a Rota Fixa.',
    buildPushPayload(routeId, messageId, reservationId),
  );

  logFixedRoutePushAttempt({
    direction: 'passenger_to_driver',
    routeId,
    reservationId,
    messageId,
    recipientCount: 1,
    hasPassengerId: true,
    pushResult: pushResult === 'sent' ? 'success' : pushResult === 'skipped' ? 'skip' : 'failure',
  });
}

async function getOwnDriverRoute(req: Request, res: Response) {
  const route = await db.driver_fixed_routes.findFirst({ where: { id: req.params.routeId, driver_id: driverId(req) } });
  if (!route) {
    res.status(404).json({ success: false, error: 'Rota fixa não encontrada' });
    return null;
  }
  return route;
}

async function getOwnPassengerReservation(req: Request, res: Response) {
  const reservation = await db.driver_fixed_route_reservations.findFirst({
    where: { id: req.params.reservationId, passenger_id: passengerId(req) },
    include: { route: true },
  });
  if (!reservation) {
    res.status(404).json({ success: false, error: 'Reserva não encontrada' });
    return null;
  }
  return reservation;
}

function canDriverWrite(routeStatus: string): boolean {
  if (routeStatus === 'archived') return false;
  if (routeStatus === 'cancelled') return false;
  return routeStatus === 'active' || routeStatus === 'paused';
}

function canPassengerWrite(routeStatus: string): boolean {
  return routeStatus === 'active';
}

export const driverFixedRouteMessagesRoutes = Router();
export const passengerFixedRouteMessagesRoutes = Router();

driverFixedRouteMessagesRoutes.use(authenticateDriver);
passengerFixedRouteMessagesRoutes.use(authenticatePassenger);

driverFixedRouteMessagesRoutes.get('/:routeId/messages', async (req: Request, res: Response) => {
  try {
    const route = await getOwnDriverRoute(req, res);
    if (!route) return;

    const messages = await db.fixed_route_messages.findMany({
      where: {
        route_id: route.id,
        reservation_id: null,
      },
      orderBy: { created_at: 'asc' },
      take: Math.min(Number(req.query.limit) || 200, 500),
    });

    return res.json({ success: true, data: messages.map(mapMessageOutput) });
  } catch (error) {
    console.error('[FIXED_ROUTE_DRIVER_MESSAGES_LIST_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao listar mensagens da rota' });
  }
});

driverFixedRouteMessagesRoutes.post('/:routeId/messages', async (req: Request, res: Response) => {
  try {
    const route = await getOwnDriverRoute(req, res);
    if (!route) return;

    if (!canDriverWrite(String(route.status))) {
      return res.status(409).json({ success: false, error: 'Rota não permite novas mensagens neste status' });
    }

    const built = buildMessage(req.body?.message_code, req.body?.message_text, DRIVER_ROUTE_QUICK_CODES);
    if ('error' in built) return res.status(400).json({ success: false, error: built.error });

    const created = await db.fixed_route_messages.create({
      data: {
        route_id: route.id,
        sender_type: 'DRIVER',
        sender_driver_id: driverId(req),
        recipient_type: 'ROUTE_CONFIRMED_PASSENGERS',
        message_code: built.data.messageCode,
        message_text: built.data.messageText,
      },
    });

    void notifyConfirmedPassengersFromRoute(route.id, created.id, created.message_text, String(route.status || '')).catch((error) => {
      console.warn('[FIXED_ROUTE_MESSAGES_NOTIFY_CONFIRMED_PASSENGERS_ERROR]', {
        routeId: route.id,
        messageId: created.id,
        error: error instanceof Error ? error.message : 'unknown_error',
      });
    });

    return res.status(201).json({ success: true, data: mapMessageOutput(created) });
  } catch (error) {
    console.error('[FIXED_ROUTE_DRIVER_MESSAGES_CREATE_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao enviar aviso da rota' });
  }
});

driverFixedRouteMessagesRoutes.get('/:routeId/reservations/:reservationId/messages', async (req: Request, res: Response) => {
  try {
    const route = await getOwnDriverRoute(req, res);
    if (!route) return;

    const reservation = await db.driver_fixed_route_reservations.findFirst({
      where: { id: req.params.reservationId, route_id: route.id },
      include: { passenger: { select: { id: true, name: true } } },
    });
    if (!reservation) return res.status(404).json({ success: false, error: 'Reserva não encontrada' });

    const messages = await db.fixed_route_messages.findMany({
      where: { route_id: route.id, reservation_id: reservation.id },
      orderBy: { created_at: 'asc' },
      take: Math.min(Number(req.query.limit) || 300, 500),
    });

    return res.json({
      success: true,
      data: {
        route_status: route.status,
        is_archived: isRouteClosedStatus(route.status),
        can_reply: canDriverWrite(String(route.status || '')),
        closure_message: isRouteClosedStatus(route.status) ? closedRouteMessage() : null,
        reservation: {
          id: reservation.id,
          status: reservation.status,
          passenger: { id: reservation.passenger?.id, name: reservation.passenger?.name || 'Passageiro' },
        },
        messages: messages.map(mapMessageOutput),
      },
    });
  } catch (error) {
    console.error('[FIXED_ROUTE_DRIVER_RESERVATION_MESSAGES_LIST_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao listar mensagens da reserva' });
  }
});

driverFixedRouteMessagesRoutes.post('/:routeId/reservations/:reservationId/messages', async (req: Request, res: Response) => {
  try {
    const route = await getOwnDriverRoute(req, res);
    if (!route) return;

    if (!canDriverWrite(String(route.status))) {
      return res.status(409).json({ success: false, error: 'Rota não permite novas mensagens neste status' });
    }

    const reservation = await db.driver_fixed_route_reservations.findFirst({
      where: { id: req.params.reservationId, route_id: route.id },
    });
    if (!reservation) return res.status(404).json({ success: false, error: 'Reserva não encontrada' });
    if (reservation.status !== 'confirmed') {
      return res.status(409).json({ success: false, error: 'Somente reservas confirmadas recebem mensagens no MVP' });
    }

    const built = buildMessage(req.body?.message_code, req.body?.message_text, DRIVER_TO_PASSENGER_QUICK_CODES);
    if ('error' in built) return res.status(400).json({ success: false, error: built.error });

    const created = await db.fixed_route_messages.create({
      data: {
        route_id: route.id,
        reservation_id: reservation.id,
        sender_type: 'DRIVER',
        sender_driver_id: driverId(req),
        recipient_type: 'PASSENGER',
        recipient_passenger_id: reservation.passenger_id,
        message_code: built.data.messageCode,
        message_text: built.data.messageText,
      },
    });

    void notifyPassengerFromReservation(route.id, reservation.id, created.id, reservation.passenger_id, created.message_text, String(route.status || '')).catch((error) => {
      console.warn('[FIXED_ROUTE_MESSAGES_NOTIFY_PASSENGER_ERROR]', {
        routeId: route.id,
        reservationId: reservation.id,
        messageId: created.id,
        error: error instanceof Error ? error.message : 'unknown_error',
      });
    });

    return res.status(201).json({ success: true, data: mapMessageOutput(created) });
  } catch (error) {
    console.error('[FIXED_ROUTE_DRIVER_RESERVATION_MESSAGES_CREATE_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao enviar mensagem para reserva' });
  }
});

passengerFixedRouteMessagesRoutes.get('/messages/summary', async (req: Request, res: Response) => {
  try {
    const currentPassengerId = passengerId(req);
    if (!currentPassengerId) {
      return res.status(401).json({ success: false, error: 'Passageiro não autenticado' });
    }

    const reservations = await db.driver_fixed_route_reservations.findMany({
      where: { passenger_id: currentPassengerId },
      select: { id: true, route_id: true, status: true, route: { select: { status: true } } },
    });

    if (!reservations.length) {
      return res.json({ success: true, data: [] });
    }

    const reservationIds = reservations.map((reservation: any) => reservation.id);
    const routeIds = Array.from(new Set(reservations.map((reservation: any) => reservation.route_id)));

    const messages = await db.fixed_route_messages.findMany({
      where: {
        route_id: { in: routeIds },
        OR: [
          { recipient_type: 'ROUTE_CONFIRMED_PASSENGERS' },
          { reservation_id: { in: reservationIds } },
        ],
      },
      select: {
        id: true,
        route_id: true,
        reservation_id: true,
        sender_type: true,
        recipient_type: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const summary = reservations.map((reservation: any) => {
      const routeStatus = String(reservation?.route?.status || '');
      const canReply = canPassengerWrite(routeStatus) && reservation.status === 'confirmed';
      const lastMessage = messages.find((message: any) => {
        if (message.route_id !== reservation.route_id) return false;
        if (message.recipient_type === 'ROUTE_CONFIRMED_PASSENGERS') return true;
        return message.reservation_id === reservation.id;
      });

      return {
        reservation_id: reservation.id,
        route_id: reservation.route_id,
        reservation_status: reservation.status,
        route_status: routeStatus,
        is_archived: isRouteClosedStatus(routeStatus),
        can_reply: canReply,
        last_message_at: lastMessage?.created_at || null,
        last_sender_type: lastMessage?.sender_type || null,
        last_message_id: lastMessage?.id || null,
        has_driver_message: canReply && lastMessage?.sender_type === 'DRIVER',
      };
    });

    return res.json({ success: true, data: summary });
  } catch (error) {
    console.error('[FIXED_ROUTE_PASSENGER_MESSAGES_SUMMARY_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao gerar resumo de mensagens da rota' });
  }
});

passengerFixedRouteMessagesRoutes.get('/:reservationId/messages', async (req: Request, res: Response) => {
  try {
    const reservation = await getOwnPassengerReservation(req, res);
    if (!reservation) return;

    const messages = await db.fixed_route_messages.findMany({
      where: {
        route_id: reservation.route_id,
        OR: [
          { recipient_type: 'ROUTE_CONFIRMED_PASSENGERS' },
          { reservation_id: reservation.id },
        ],
      },
      orderBy: { created_at: 'asc' },
      take: Math.min(Number(req.query.limit) || 300, 500),
    });

    return res.json({
      success: true,
      data: {
        route_status: reservation.route?.status,
        is_archived: isRouteClosedStatus(reservation.route?.status),
        can_reply: canPassengerWrite(String(reservation.route?.status || '')) && reservation.status === 'confirmed',
        closure_message: isRouteClosedStatus(reservation.route?.status) ? closedRouteMessage() : null,
        reservation: {
          id: reservation.id,
          route_id: reservation.route_id,
          status: reservation.status,
          route_status: reservation.route?.status,
          is_archived: isRouteClosedStatus(reservation.route?.status),
          can_reply: canPassengerWrite(String(reservation.route?.status || '')) && reservation.status === 'confirmed',
          closure_message: isRouteClosedStatus(reservation.route?.status) ? closedRouteMessage() : null,
        },
        messages: messages.map(mapMessageOutput),
      },
    });
  } catch (error) {
    console.error('[FIXED_ROUTE_PASSENGER_MESSAGES_LIST_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao listar mensagens da rota' });
  }
});

passengerFixedRouteMessagesRoutes.post('/:reservationId/messages', async (req: Request, res: Response) => {
  try {
    const reservation = await getOwnPassengerReservation(req, res);
    if (!reservation) return;

    if (reservation.status !== 'confirmed') {
      return res.status(409).json({ success: false, error: 'Somente reservas confirmadas podem enviar mensagens' });
    }

    if (!canPassengerWrite(String(reservation.route?.status || ''))) {
      return res.status(409).json({ success: false, error: 'Esta rota não permite novas mensagens neste status' });
    }

    const built = buildMessage(req.body?.message_code, req.body?.message_text, PASSENGER_TO_DRIVER_QUICK_CODES);
    if ('error' in built) return res.status(400).json({ success: false, error: built.error });

    const created = await db.fixed_route_messages.create({
      data: {
        route_id: reservation.route_id,
        reservation_id: reservation.id,
        sender_type: 'PASSENGER',
        sender_passenger_id: passengerId(req),
        recipient_type: 'DRIVER',
        recipient_driver_id: reservation.route.driver_id,
        message_code: built.data.messageCode,
        message_text: built.data.messageText,
      },
    });

    void notifyRouteDriver(reservation.route_id, reservation.id, created.id, reservation.route.driver_id, created.message_text, String(reservation.route?.status || '')).catch((error) => {
      console.warn('[FIXED_ROUTE_MESSAGES_NOTIFY_DRIVER_ERROR]', {
        routeId: reservation.route_id,
        reservationId: reservation.id,
        messageId: created.id,
        error: error instanceof Error ? error.message : 'unknown_error',
      });
    });

    return res.status(201).json({ success: true, data: mapMessageOutput(created) });
  } catch (error) {
    console.error('[FIXED_ROUTE_PASSENGER_MESSAGES_CREATE_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao enviar mensagem da reserva' });
  }
});
