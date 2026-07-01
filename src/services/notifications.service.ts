import { passengerApi, AppNotification as PassengerNotification } from '../api/passenger.api';
import { driverApi, AppNotification as DriverNotification } from '../api/driver.api';

export type AppNotification = PassengerNotification | DriverNotification;

export type NotificationUserType = 'passenger' | 'driver';

/** Busca lista de notificações. Não lança — retorna [] em caso de erro. */
export async function fetchNotifications(userType: NotificationUserType, limit = 50): Promise<AppNotification[]> {
  try {
    if (userType === 'passenger') return await passengerApi.getNotifications(limit);
    return await driverApi.getNotifications(limit);
  } catch {
    return [];
  }
}

/** Conta notificações não lidas. Não lança — retorna 0 em caso de erro. */
export async function fetchUnreadCount(userType: NotificationUserType): Promise<number> {
  try {
    if (userType === 'passenger') return await passengerApi.getNotificationsUnreadCount();
    return await driverApi.getNotificationsUnreadCount();
  } catch {
    return 0;
  }
}

/** Marca uma notificação como lida. Não lança. */
export async function markRead(userType: NotificationUserType, id: string): Promise<void> {
  try {
    if (userType === 'passenger') await passengerApi.markNotificationRead(id);
    else await driverApi.markNotificationRead(id);
  } catch { /* silent */ }
}

/** Marca todas como lidas. Não lança. */
export async function markAllRead(userType: NotificationUserType): Promise<void> {
  try {
    if (userType === 'passenger') await passengerApi.markAllNotificationsRead();
    else await driverApi.markAllNotificationsRead();
  } catch { /* silent */ }
}

export function formatNotificationDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Agora mesmo';
  if (diffMin < 60) return `${diffMin}min atrás`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h atrás`;

  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Ontem';
  if (diffD < 7) return `${diffD} dias atrás`;

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
