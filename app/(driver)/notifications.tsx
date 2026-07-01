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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleClose = () => {
    const nav = router as any;
    if (typeof nav.canGoBack === 'function' && nav.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(driver)/online' as any);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchNotifications('driver', 50);
      console.info('[DriverNotifications] list loaded', { count: data.length });
      setItems(data);
    } catch (error) {
      setLoadError('Falha ao carregar notificações. Tente novamente.');
      console.warn('[DriverNotifications] load failed', {
        error: error instanceof Error ? error.message : 'unknown_error',
      });
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
    try {
      await markAllRead('driver');
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    } catch {
      // no-op UI: mantém itens atuais
    }
    setMarkingAll(false);
  };

  const handlePress = async (item: AppNotification) => {
    if (!item.read_at) {
      try {
        await markRead('driver', item.id);
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n)),
        );
      } catch {
        // mantém estado atual
      }
    }

    setExpandedId((current) => (current === item.id ? null : item.id));
  };

  const handleOpenRoute = (item: AppNotification) => {
    const routeId = item.data?.routeId || item.route_id;
    const reservationId = item.data?.reservationId || item.reservation_id;
    if (routeId) {
      router.push({
        pathname: '/(driver)/fixed-routes',
        params: reservationId ? { routeId, reservationId } : { routeId },
      } as any);
      return;
    }
    router.push('/(driver)/fixed-routes');
  };

  const unreadCount = items.filter((n) => !n.read_at).length;

  const renderItem = ({ item }: { item: AppNotification }) => {
    const isUnread = !item.read_at;
    const isExpanded = expandedId === item.id;
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
          <View style={s.itemTopRow}>
            <Text style={[s.itemTitle, isUnread && s.itemTitleBold]} numberOfLines={isExpanded ? 4 : 2}>
              {item.title}
            </Text>
            <View style={[s.statusChip, isUnread ? s.statusChipUnread : s.statusChipRead]}>
              <Text style={[s.statusChipText, isUnread ? s.statusChipTextUnread : s.statusChipTextRead]}>
                {isUnread ? 'Nova' : 'Lida'}
              </Text>
            </View>
          </View>
          <Text style={s.itemBodyText} numberOfLines={isExpanded ? 8 : 2}>
            {item.body}
          </Text>
          <Text style={s.itemDate}>{formatNotificationDate(item.created_at)}</Text>

          {isExpanded && (
            <View style={s.expandedBox}>
              <Text style={s.expandedLabel}>Conteúdo</Text>
              <Text style={s.expandedText}>{item.body}</Text>
              {(item.route_id || item.data?.routeId) ? (
                <TouchableOpacity onPress={() => handleOpenRoute(item)} style={s.secondaryBtn}>
                  <Ionicons name="open-outline" size={14} color={COLORS.primary} />
                  <Text style={s.secondaryBtnText}>Abrir mensagens da rota</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>
        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} style={s.itemChevron} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={handleClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={s.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
          <Text style={s.backBtnText}>Voltar</Text>
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
      ) : loadError ? (
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={44} color={COLORS.warning} />
          <Text style={s.emptyText}>{loadError}</Text>
          <TouchableOpacity onPress={() => void load()} style={s.retryBtn}>
            <Text style={s.retryBtnText}>Tentar novamente</Text>
          </TouchableOpacity>
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
  backBtn: {
    width: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  readAllBtn: { width: 80, alignItems: 'flex-end' },
  readAllText: { color: COLORS.primary, fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 15 },
  retryBtn: { marginTop: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.primary },
  retryBtnText: { color: '#111', fontWeight: '700' },
  list: { paddingVertical: 8 },
  separator: { height: 1, backgroundColor: '#2a2a2a', marginLeft: 56 },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  itemTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  itemTitle: { color: '#eee', fontSize: 14, lineHeight: 19 },
  itemTitleBold: { fontWeight: '600', color: '#fff' },
  statusChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 1 },
  statusChipUnread: { backgroundColor: '#7A5F00' },
  statusChipRead: { backgroundColor: '#2F2F2F' },
  statusChipText: { fontSize: 11, fontWeight: '700' },
  statusChipTextUnread: { color: '#F8D56B' },
  statusChipTextRead: { color: '#B3B3B3' },
  itemBodyText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
  itemDate: { color: '#555', fontSize: 11, marginTop: 2 },
  expandedBox: { marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: '#252515', borderWidth: 1, borderColor: '#4A4120', gap: 8 },
  expandedLabel: { color: '#B3B3B3', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  expandedText: { color: '#F2F2F2', fontSize: 13, lineHeight: 20 },
  secondaryBtn: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary, backgroundColor: '#17170B' },
  secondaryBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  itemChevron: { marginLeft: 8 },
});
