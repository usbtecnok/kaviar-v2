import AsyncStorage from '@react-native-async-storage/async-storage';

export type FixedRouteMessageSummaryItem = {
  reservation_id: string;
  route_id: string;
  last_message_at?: string | null;
  last_sender_type?: string | null;
  last_message_id?: string | null;
  has_driver_message: boolean;
};

const LAST_SEEN_PREFIX = 'fixedRouteMessages:lastSeen:';

export function getFixedRouteNotificationState() {
  return (globalThis as any).__kaviarFixedRouteNotificationState || ((globalThis as any).__kaviarFixedRouteNotificationState = {
    recentRouteIds: new Set<string>(),
    recentReservationIds: new Set<string>(),
    seenMessageIds: new Set<string>(),
  });
}

export async function getFixedRouteLastSeenMap(reservationIds: string[]): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  if (!reservationIds.length) return map;

  const entries = await AsyncStorage.multiGet(reservationIds.map((id) => LAST_SEEN_PREFIX + id));
  for (const [key, value] of entries) {
    if (!value) continue;
    const reservationId = key.replace(LAST_SEEN_PREFIX, '');
    map[reservationId] = value;
  }

  return map;
}

export async function markFixedRouteMessagesSeen(reservationId: string, seenAt?: string): Promise<void> {
  const value = seenAt || new Date().toISOString();
  await AsyncStorage.setItem(LAST_SEEN_PREFIX + reservationId, value);
}

export function computeRecentFixedRouteMessages(
  summary: FixedRouteMessageSummaryItem[],
  lastSeenMap: Record<string, string>,
): { recentReservationIds: Set<string>; recentRouteIds: Set<string> } {
  const recentReservationIds = new Set<string>();
  const recentRouteIds = new Set<string>();

  for (const item of summary) {
    if (!item.has_driver_message || !item.last_message_at) continue;
    const lastSeen = lastSeenMap[item.reservation_id];
    if (!lastSeen || new Date(item.last_message_at).getTime() > new Date(lastSeen).getTime()) {
      recentReservationIds.add(item.reservation_id);
      recentRouteIds.add(item.route_id);
    }
  }

  return { recentReservationIds, recentRouteIds };
}

export function syncFixedRouteNotificationState(
  summary: FixedRouteMessageSummaryItem[],
  recentReservationIds: Set<string>,
  recentRouteIds: Set<string>,
) {
  const state = getFixedRouteNotificationState();
  state.recentReservationIds = new Set(recentReservationIds);

  const recomputedRouteIds = new Set<string>(recentRouteIds);
  if (!recomputedRouteIds.size) {
    for (const item of summary) {
      if (recentReservationIds.has(item.reservation_id)) {
        recomputedRouteIds.add(item.route_id);
      }
    }
  }
  state.recentRouteIds = recomputedRouteIds;
}
