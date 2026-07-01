import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image,
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
    useArtwork: false,
    mediaTone: 'dark',
    fallbackIcon: 'female-outline' as const,
    badge: 'Preferencia',
    title: 'Preferência por motorista mulher',
    subtitle: 'Mais conforto para passageiras que preferem viajar com mulheres.',
    cta: 'Ajustar preferência',
    route: '/(passenger)/profile',
  },
  {
    key: 'moto',
    image: KAVIAR_SOLUTION_IMAGES.moto,
    useArtwork: true,
    mediaTone: 'light',
    fallbackIcon: 'bicycle-outline' as const,
    badge: 'Mobilidade',
    title: 'Moto em regiões habilitadas',
    subtitle: 'Mais agilidade para trajetos curtos, quando disponível na sua região.',
    cta: 'Ver disponibilidade',
    route: '/(passenger)/map',
  },
  {
    key: 'pet',
    image: KAVIAR_SOLUTION_IMAGES.pet,
    useArtwork: false,
    mediaTone: 'light',
    fallbackIcon: 'paw-outline' as const,
    badge: 'Conforto',
    title: 'KAVIAR Pet',
    subtitle: 'Seu pet também viaja com cuidado.',
    cta: 'Conhecer',
    externalUrl: 'https://kaviar.com.br/pet',
  },
  {
    key: 'rotas',
    image: KAVIAR_SOLUTION_IMAGES.rotas,
    useArtwork: false,
    mediaTone: 'light',
    fallbackIcon: 'repeat-outline' as const,
    badge: 'Rotina',
    title: 'Rotas Fixas',
    subtitle: 'Sua rotina com mais organização.',
    cta: 'Ver',
    route: '/(passenger)/fixed-routes',
  },
  {
    key: 'comercial',
    image: KAVIAR_SOLUTION_IMAGES.comercial,
    useArtwork: true,
    mediaTone: 'light',
    fallbackIcon: 'business-outline' as const,
    badge: 'Empresas',
    title: 'KAVIAR Comercial',
    subtitle: 'Soluções para empresas, hotéis e comércio local.',
    cta: 'Abrir',
    route: '/(passenger)/local',
  },
  {
    key: 'grupos',
    image: KAVIAR_SOLUTION_IMAGES.grupos,
    useArtwork: false,
    mediaTone: 'light',
    fallbackIcon: 'people-outline' as const,
    badge: 'Comunidade',
    title: 'Grupos KAVIAR',
    subtitle: 'Comunidades, rotas e mobilidade local em um só lugar.',
    cta: 'Ver',
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.servicesScroll}>
              {SERVICE_ITEMS.map((item, index) => (
                <TouchableOpacity
                  key={item.key}
                  style={[s.serviceItem, index === 0 && s.serviceItemActive]}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.85}
                >
                  <Ionicons name={item.icon} size={18} color={index === 0 ? '#8A6D1A' : '#5E6470'} />
                  <Text style={[s.serviceLabel, index === 0 && s.serviceLabelActive]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={s.showcaseWrap}>
            <Text style={s.showcaseTitle}>Um KAVIAR para cada momento</Text>
            <Text style={s.showcaseSubtitle}>Experiências premium para mobilidade, rotina e conveniência.</Text>
            <View style={s.showcaseStack}>
              {PASSENGER_SHOWCASE_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={s.showcaseCard}
                  activeOpacity={0.92}
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
                >
                  <View style={[s.showcaseMedia, item.mediaTone === 'dark' ? s.showcaseMediaDark : s.showcaseMediaLight]}>
                    {item.useArtwork ? (
                      <Image
                        source={item.image}
                        style={s.showcaseImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={s.showcaseFallbackWrap}>
                        <View style={s.showcaseFallbackIconWrap}>
                          <Ionicons name={item.fallbackIcon} size={28} color="#D6B15A" />
                        </View>
                        <Text style={s.showcaseFallbackBadge}>{item.badge}</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.showcaseBody}>
                    <Text style={s.showcaseCardTitle}>{item.title}</Text>
                    <Text style={s.showcaseCardSubtitle}>{item.subtitle}</Text>
                    <View style={s.showcaseCtaWrap}>
                      <Text style={s.showcaseCta}>{item.cta}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
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
  scrollContent: { paddingBottom: 104 },

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
    paddingVertical: 12,
    marginBottom: 12,
  },
  servicesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5E6470',
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  servicesScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  serviceItem: {
    minWidth: 88,
    height: 58,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEDF2',
    backgroundColor: '#FCFCFD',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
  },
  serviceItemActive: {
    borderColor: '#E8D9AA',
    backgroundColor: '#FFFBF0',
  },
  serviceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5E6470',
  },
  serviceLabelActive: {
    color: '#121316',
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
  showcaseCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E6ED',
    overflow: 'hidden',
    backgroundColor: '#FCFDFE',
    shadowColor: '#121316',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  showcaseMedia: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF2',
  },
  showcaseMediaDark: {
    backgroundColor: '#131821',
  },
  showcaseMediaLight: {
    backgroundColor: '#F2F4F8',
  },
  showcaseBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  showcaseCardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    color: '#121316',
    marginBottom: 6,
  },
  showcaseCardSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#4F5664',
    marginBottom: 12,
  },
  showcaseImage: {
    width: '88%',
    height: 124,
    opacity: 0.96,
  },
  showcaseFallbackWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  showcaseFallbackIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3B4454',
    backgroundColor: '#1A2230',
  },
  showcaseFallbackBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CFB06A',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  showcaseCtaWrap: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2C47A',
    backgroundColor: '#FFFCF4',
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  showcaseCta: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A6D1A',
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
