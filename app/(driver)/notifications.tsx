import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { COLORS } from '../../src/config/colors';
import { AppNotification } from '../../src/api/driver.api';
import {
  fetchNotifications,
  markAllRead,
  markRead,
  formatNotificationDate,
} from '../../src/services/notifications.service';

export default function DriverNotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications('driver', 50);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    await markAllRead('driver');
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    setMarkingAll(false);
  };

  const handlePress = async (item: AppNotification) => {
    if (!item.read_at) {
      await markRead('driver', item.id);
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n)),
      );
    }

    if (
      item.type === 'fixed_route_message' ||
      item.type === 'fixed_route_broadcast' ||
      item.type === 'fixed_route_direct'
    ) {
      const routeId = item.data?.routeId || item.route_id;
      const reservationId = item.data?.reservationId || item.reservation_id;
      if (routeId) {
        router.push({
          pathname: '/(driver)/fixed-routes',
          params: reservationId ? { routeId, reservationId } : { routeId },
        } as any);
      } else {
        router.push('/(driver)/fixed-routes');
      }
    }
  };

  const unreadCount = items.filter((n) => !n.read_at).length;

  const renderItem = ({ item }: { item: AppNotification }) => {
    const isUnread = !item.read_at;
    return (
      <TouchableOpacity
        style={[s.item, isUnread && s.itemUnread]}
        onPress={() => handlePress(item)}
        activeOpacity={0.75}
      >
        <View style={s.itemLeft}>
          <View style={[s.dot, isUnread ? s.dotUnread : s.dotRead]} />
        </View>
        <View style={s.itemBody}>
          <Text style={[s.itemTitle, isUnread && s.itemTitleBold]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={s.itemBodyText} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={s.itemDate}>{formatNotificationDate(item.created_at)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={s.itemChevron} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Notificações</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead} disabled={markingAll} style={s.readAllBtn}>
            {markingAll ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={s.readAllText}>Marcar todas</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="notifications-off-outline" size={48} color={COLORS.textMuted} />
          <Text style={s.emptyText}>Nenhuma notificação ainda</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1a1a1a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  readAllBtn: { width: 80, alignItems: 'flex-end' },
  readAllText: { color: COLORS.primary, fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 15 },
  list: { paddingVertical: 8 },
  separator: { height: 1, backgroundColor: '#2a2a2a', marginLeft: 56 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1a1a1a',
  },
  itemUnread: { backgroundColor: '#202010' },
  itemLeft: { width: 24, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotUnread: { backgroundColor: COLORS.primary },
  dotRead: { backgroundColor: 'transparent' },
  itemBody: { flex: 1, gap: 3 },
  itemTitle: { color: '#eee', fontSize: 14, lineHeight: 19 },
  itemTitleBold: { fontWeight: '600', color: '#fff' },
  itemBodyText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
  itemDate: { color: '#555', fontSize: 11, marginTop: 2 },
  itemChevron: { marginLeft: 8 },
});
