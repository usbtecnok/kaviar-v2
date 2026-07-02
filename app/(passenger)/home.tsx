import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking,
  StatusBar, Platform, SafeAreaView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authStore } from '../../src/auth/auth.store';
import { apiClient } from '../../src/api/client';
import { passengerApi } from '../../src/api/passenger.api';
import { COLORS } from '../../src/config/colors';
import { DrawerMenu, DrawerItem } from '../../src/components/DrawerMenu';
import { HomeBottomBar } from '../../src/components/passenger/HomeBottomBar';
import { WomenPreferenceInvite } from '../../src/components/passenger/WomenPreferenceInvite';
import { KaviarPremiumRailCard } from '../../src/components/KaviarPremiumRailCard';
import { ServiceCarousel3D } from '../../src/components/ServiceCarousel3D';
import {
  computeRecentFixedRouteMessages,
  getFixedRouteLastSeenMap,
  getFixedRouteNotificationState,
  syncFixedRouteNotificationState,
} from '../../src/services/fixed-route-recent.service';
import { ensurePassengerPushTokenRegistration } from '../../src/services/passenger-push-token.service';
import { fetchUnreadCount } from '../../src/services/notifications.service';
import { KAVIAR_SOLUTION_IMAGES } from '../../src/components/kaviarSolutionAssets';

const SERVICE_ITEMS = [
  { key: 'ride', icon: 'car-sport-outline' as const, label: 'Corrida', route: '/(passenger)/map' },
  { key: 'routes', icon: 'repeat-outline' as const, label: 'Rotas', route: '/(passenger)/fixed-routes' },
  { key: 'groups', icon: 'people-outline' as const, label: 'Grupos', route: '/(passenger)/groups' },
  { key: 'help', icon: 'help-circle-outline' as const, label: 'Ajuda', route: '/(passenger)/help' },
] as const;

const PASSENGER_SHOWCASE_ITEMS = [
  {
    key: 'women-preference',
    image: KAVIAR_SOLUTION_IMAGES.mulheres,
    title: 'Preferência por motorista mulher',
    description: 'Mais conforto para passageiras que preferem viajar com mulheres.',
    cta: 'Ajustar preferência',
    artworkReady: true,
    tint: '#F4F6F9',
    accent: '#8A6D1A',
    route: '/(passenger)/profile',
  },
  {
    key: 'moto',
    image: KAVIAR_SOLUTION_IMAGES.moto,
    title: 'Moto em regiões habilitadas',
    description: 'Mais agilidade para trajetos curtos, quando disponível na sua região.',
    cta: 'Ver disponibilidade',
    artworkReady: true,
    tint: '#F4F6F9',
    accent: '#8A6D1A',
    route: '/(passenger)/map',
  },
  {
    key: 'pet',
    image: KAVIAR_SOLUTION_IMAGES.pet,
    title: 'KAVIAR Pet',
    description: 'Seu pet também viaja com cuidado.',
    cta: 'Conhecer',
    artworkReady: true,
    tint: '#F4F6F9',
    accent: '#8A6D1A',
    externalUrl: 'https://kaviar.com.br/pet',
  },
  {
    key: 'rotas',
    image: KAVIAR_SOLUTION_IMAGES.rotas,
    title: 'Rotas Fixas',
    description: 'Sua rotina com mais organização.',
    cta: 'Ver',
    artworkReady: true,
    tint: '#F4F6F9',
    accent: '#8A6D1A',
    route: '/(passenger)/fixed-routes',
  },
  {
    key: 'comercial',
    image: KAVIAR_SOLUTION_IMAGES.comercial,
    title: 'KAVIAR Comercial',
    description: 'Soluções para empresas, hotéis e comércio local.',
    cta: 'Abrir',
    artworkReady: true,
    tint: '#F4F6F9',
    accent: '#8A6D1A',
    route: '/(passenger)/local',
  },
  {
    key: 'grupos',
    image: KAVIAR_SOLUTION_IMAGES.grupos,
    title: 'Grupos KAVIAR',
    description: 'Comunidades, rotas e mobilidade local em um só lugar.',
    cta: 'Ver',
    artworkReady: true,
    tint: '#F4F6F9',
    accent: '#8A6D1A',
    route: '/(passenger)/groups',
  },
] as const;

export default function PassengerHome() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [showWomenInvite, setShowWomenInvite] = useState(false);
  const [hasRecentFixedRouteMessages, setHasRecentFixedRouteMessages] = useState(false);
  const [notifUnread, setNotifUnread] = useState(0);
  const fixedRouteNotificationState = getFixedRouteNotificationState();

  const hasFixedRouteHighlight =
    hasRecentFixedRouteMessages
    || fixedRouteNotificationState.recentRouteIds.size > 0
    || fixedRouteNotificationState.recentReservationIds.size > 0;

  const highlight = hasFixedRouteHighlight
    ? {
      icon: 'repeat-outline' as const,
      title: 'Você tem novidade em Rotas Fixas',
      text: 'Abra suas rotas para acompanhar mensagens e próximos embarques.',
      cta: 'Ver rotas',
      onPress: () => router.push('/(passenger)/fixed-routes'),
    }
    : notifUnread > 0
      ? {
        icon: 'people-outline' as const,
        title: 'Novo aviso no seu grupo',
        text: 'Acompanhe atualizações da sua comunidade no KAVIAR.',
        cta: 'Ver grupos',
        onPress: () => router.push('/(passenger)/groups'),
      }
      : {
        icon: 'sparkles-outline' as const,
        title: 'Conheça Rotas Fixas',
        text: 'Crie viagens frequentes para agilizar sua rotina.',
        cta: 'Explorar',
        onPress: () => router.push('/(passenger)/fixed-routes'),
      };

  const refreshFixedRouteBadge = async () => {
    try {
      const summary = await passengerApi.getFixedRouteMessagesSummary();
      const lastSeenMap = await getFixedRouteLastSeenMap(summary.map((item) => item.reservation_id));
      const { recentReservationIds, recentRouteIds } = computeRecentFixedRouteMessages(summary, lastSeenMap);
      syncFixedRouteNotificationState(summary, recentReservationIds, recentRouteIds);
      setHasRecentFixedRouteMessages(recentReservationIds.size > 0);
    } catch (error) {
      console.warn('[Passenger Home] Fixed route badge refresh failed:', error);
    }
  };

  useEffect(() => {
    const user = authStore.getUser();
    if (user?.name) {
      const first = user.name.split(' ')[0];
      setUserName(first.charAt(0).toUpperCase() + first.slice(1).toLowerCase());
    }
    checkWomenInvite();
    refreshFixedRouteBadge();
    fetchUnreadCount('passenger')
      .then((count) => {
        console.info('[PassengerHome] notifications unread-count', { count });
        setNotifUnread(count);
      })
      .catch((error) => {
        console.warn('[PassengerHome] notifications unread-count failed', {
          error: error instanceof Error ? error.message : 'unknown_error',
        });
      });
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      refreshFixedRouteBadge();
      fetchUnreadCount('passenger')
        .then((count) => {
          console.info('[PassengerHome] notifications unread-count (focus)', { count });
          setNotifUnread(count);
        })
        .catch((error) => {
          console.warn('[PassengerHome] notifications unread-count failed (focus)', {
            error: error instanceof Error ? error.message : 'unknown_error',
          });
        });
    }, [])
  );

  useFocusEffect(
    React.useCallback(() => {
      void ensurePassengerPushTokenRegistration('passenger-home');
    }, [])
  );

  const checkWomenInvite = async () => {
    try {
      const dismissed = await AsyncStorage.getItem('women_pref_invite_dismissed');
      if (dismissed) return;
      const { data } = await apiClient.get('/api/v2/passengers/me/women-preference');
      if (data.success && !data.data?.participating) setShowWomenInvite(true);
    } catch { /* silent */ }
  };

  const dismissWomenInvite = async () => {
    setShowWomenInvite(false);
    await AsyncStorage.setItem('women_pref_invite_dismissed', 'true').catch(() => {});
  };

  const handleLogout = async () => {
    try {
      await authStore.clearAuth();
    } finally {
      router.replace('/(auth)/login');
    }
  };

  const drawerItems: DrawerItem[] = [
    { key: 'profile',   label: 'Meu perfil',        icon: 'person-outline',       onPress: () => router.push('/(passenger)/profile')      },
    { key: 'history',   label: 'Minhas corridas',    icon: 'time-outline',         onPress: () => router.push('/(passenger)/history')      },
    { key: 'groups',    label: 'Meus Grupos KAVIAR', icon: 'people-outline',       onPress: () => router.push('/(passenger)/groups')       },
    {
      key: 'fixed-routes',
      label: 'Minhas Rotas Fixas',
      icon: 'repeat-outline',
      badge: (hasRecentFixedRouteMessages || fixedRouteNotificationState.recentRouteIds.size > 0 || fixedRouteNotificationState.recentReservationIds.size > 0) ? '•' : undefined,
      onPress: () => router.push('/(passenger)/fixed-routes')
    },
    { key: 'favorites', label: 'Meus destinos',      icon: 'heart-outline',        onPress: () => router.push('/(passenger)/favorites')    },
    { key: 'tourism',   label: 'Turismo Premium',    icon: 'diamond-outline',      badge: '✦', onPress: () => router.push('/(passenger)/tourism') },
    { key: 'refer',     label: 'Convide e ganhe',    icon: 'people-outline',       onPress: () => router.push('/(passenger)/refer-driver') },
    { key: 'help',      label: 'Ajuda',              icon: 'help-circle-outline',  onPress: () => router.push('/(passenger)/help')         },
    { key: 'logout',    label: 'Sair',               icon: 'log-out-outline',      danger: true, onPress: () => handleLogout()       },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F7F8" />

      <ScrollView ref={scrollRef} style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        <SafeAreaView>
          <View style={s.header}>
            <View style={s.headerRow}>
              <View>
                <Text style={s.greeting}>Olá{userName ? `, ${userName}` : ''}</Text>
                <Text style={s.subGreeting}>Sua jornada começa aqui</Text>
              </View>

              <View style={s.headerRight}>
                <TouchableOpacity
                  onPress={() => router.push('/(passenger)/notifications' as any)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel="Central de Notificações KAVIAR"
                  style={s.bellWrap}
                >
                  <Ionicons name="notifications-outline" size={22} color={COLORS.textSecondary} />
                  {notifUnread > 0 && (
                    <View style={s.bellBadge}>
                      <Text style={s.bellBadgeText}>{notifUnread > 9 ? '9+' : notifUnread}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDrawerOpen(true)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={s.menuButton}>
                  <Ionicons name="menu-outline" size={20} color="#121316" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.regionPill}>
              <Ionicons name="location-outline" size={14} color="#8A6D1A" />
              <Text style={s.regionText}>Sua região está ativa no KAVIAR</Text>
            </View>
          </View>
        </SafeAreaView>

        <View style={s.whitePanel}>
          <Text style={s.panelTitle}>Para onde vamos?</Text>

          {showWomenInvite && (
            <WomenPreferenceInvite
              onActivate={() => { setShowWomenInvite(false); router.push('/(passenger)/profile'); }}
              onDismiss={dismissWomenInvite}
            />
          )}

          <TouchableOpacity style={s.mainActionCard} onPress={() => router.push('/(passenger)/map')} activeOpacity={0.88}>
            <View style={s.mainActionIcon}>
              <Ionicons name="navigate" size={20} color="#8A6D1A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.mainActionTitle}>Chamar corrida agora</Text>
              <Text style={s.mainActionSub}>Carro ou moto para sua viagem local</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#8A6D1A" />
          </TouchableOpacity>

          <View style={s.servicesWrap}>
            <Text style={s.servicesTitle}>Serviços</Text>
            <ServiceCarousel3D
              items={SERVICE_ITEMS.filter((i) => i.key !== 'help')}
              onNavigate={(route) => router.push(route as any)}
            />
            <TouchableOpacity
              style={s.helpRow}
              onPress={() => router.push('/(passenger)/help' as any)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Ajuda"
            >
              <Ionicons name="help-circle-outline" size={14} color="#8A9BB0" />
              <Text style={s.helpLabel}>Ajuda</Text>
            </TouchableOpacity>
          </View>

          <View style={s.showcaseWrap}>
            <Text style={s.showcaseTitle}>Um KAVIAR para cada momento</Text>
            <Text style={s.showcaseSubtitle}>Experiências premium para mobilidade, rotina e conveniência.</Text>
            <View style={s.showcaseStack}>
              {PASSENGER_SHOWCASE_ITEMS.map((item) => (
                <KaviarPremiumRailCard
                  key={item.key}
                  onPress={() => {
                    if (item.route) {
                      router.push(item.route as any);
                      return;
                    }
                    if (item.externalUrl) {
                      Linking.openURL(item.externalUrl).catch((error) => {
                        console.warn('[PassengerHome] failed to open external solution link', { key: item.key, error });
                      });
                    }
                  }}
                  item={item}
                />
              ))}
            </View>
          </View>

          <TouchableOpacity style={s.contextCard} onPress={highlight.onPress} activeOpacity={0.9}>
            <View style={s.contextIcon}>
              <Ionicons name={highlight.icon} size={18} color="#8A6D1A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.contextTitle}>{highlight.title}</Text>
              <Text style={s.contextText}>{highlight.text}</Text>
            </View>
            <View style={s.contextCtaWrap}>
              <Text style={s.contextCta}>{highlight.cta}</Text>
            </View>
          </TouchableOpacity>

          <View style={{ height: 16 }} />
        </View>
      </ScrollView>

      <HomeBottomBar
        onCall={() => router.push('/(passenger)/map')}
        onHome={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
        onAccount={() => router.push('/(passenger)/profile')}
      />

      <DrawerMenu
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        userName={userName}
        items={drawerItems}
      />
    </View>
  );
}

const STATUSBAR_H = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F7F8' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 136 },

  header: {
    paddingTop: STATUSBAR_H + 10,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greeting: { fontSize: 23, fontWeight: '700', color: '#121316' },
  subGreeting: { fontSize: 12, color: '#5E6470', marginTop: 2 },
  bellWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E9EE',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#E53935',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  menuButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7E9EE',
  },
  regionPill: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E8D9AA',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  regionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5E6470',
  },

  whitePanel: {
    backgroundColor: '#F6F7F8',
    paddingTop: 6,
    paddingHorizontal: 20,
  },
  panelTitle: { fontSize: 22, fontWeight: '800', color: '#121316', marginBottom: 12 },

  mainActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8D9AA',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#121316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  mainActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFF8E6',
    borderWidth: 1,
    borderColor: '#E8D9AA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainActionTitle: { fontSize: 16, fontWeight: '800', color: '#121316', marginBottom: 2 },
  mainActionSub: { fontSize: 12, color: '#5E6470' },

  servicesWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAEDF2',
    paddingTop: 12,
    paddingBottom: 10,
    marginBottom: 12,
  },
  servicesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5E6470',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  helpLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8A9BB0',
  },

  showcaseWrap: {
    backgroundColor: '#F8F9FB',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAEDF2',
    padding: 12,
    marginBottom: 14,
  },
  showcaseTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#121316',
  },
  showcaseSubtitle: {
    fontSize: 12,
    color: '#5E6470',
    marginTop: 2,
    marginBottom: 12,
  },
  showcaseStack: {
    gap: 12,
  },
  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9DBAE',
    padding: 14,
    marginBottom: 4,
  },
  contextIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8E6',
  },
  contextTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#121316',
    marginBottom: 2,
  },
  contextText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#5E6470',
  },
  contextCtaWrap: {
    marginLeft: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E8D9AA',
    backgroundColor: '#FFFBF0',
  },
  contextCta: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A6D1A',
  },
});
