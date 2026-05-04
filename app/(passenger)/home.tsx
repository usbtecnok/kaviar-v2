import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Platform, SafeAreaView, Dimensions, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { authStore } from '../../src/auth/auth.store';
import { COLORS } from '../../src/config/colors';
import { DrawerMenu, DrawerItem } from '../../src/components/DrawerMenu';
import { HomeBottomBar } from '../../src/components/passenger/HomeBottomBar';
import { HomeOpportunityCarousel } from '../../src/components/passenger/HomeOpportunityCarousel';

const { width: W } = Dimensions.get('window');
const ACTION_W = (W - 56) / 4; // 4 cards side-by-side with gaps

const QUICK_ACTIONS = [
  { key: 'schedule',  icon: 'calendar'     as const, title: 'Agendar',  sub: 'Programar',       route: '/(passenger)/map'       },
  { key: 'favorites', icon: 'location'     as const, title: 'Destinos', sub: 'Salvos',          route: '/(passenger)/favorites' },
  { key: 'tourism',   icon: 'diamond'      as const, title: 'Turismo',  sub: 'Passeios',        route: '/(passenger)/tourism'   },
  { key: 'help',      icon: 'chatbubble-ellipses' as const, title: 'Suporte',  sub: 'Ajuda',    route: '/(passenger)/help'      },
] as const;

export default function PassengerHome() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const user = authStore.getUser();
    if (user?.name) {
      const first = user.name.split(' ')[0];
      setUserName(first.charAt(0).toUpperCase() + first.slice(1).toLowerCase());
    }
  }, []);

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
    { key: 'favorites', label: 'Meus destinos',      icon: 'heart-outline',        onPress: () => router.push('/(passenger)/favorites')    },
    { key: 'tourism',   label: 'Turismo Premium',    icon: 'diamond-outline',      badge: '✦', onPress: () => router.push('/(passenger)/tourism') },
    { key: 'refer',     label: 'Convide e ganhe',    icon: 'people-outline',       onPress: () => router.push('/(passenger)/refer-driver') },
    { key: 'help',      label: 'Ajuda',              icon: 'help-circle-outline',  onPress: () => router.push('/(passenger)/help')         },
    { key: 'logout',    label: 'Sair',               icon: 'log-out-outline',      danger: true, onPress: () => handleLogout()       },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <ScrollView ref={scrollRef} style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── TOPO PRETO ── */}
        <SafeAreaView>
          <View style={s.header}>
            <View style={s.headerRow}>
              {/* Logo com coroa integrada */}
              <View style={s.logoWrap}>
                <View style={s.brandRow}>
                  <Text style={s.brand}>KAVIAR</Text>
                  <MaterialCommunityIcons name="crown" size={14} color={COLORS.primary} style={s.crown} />
                </View>
                <Text style={s.brandSub}>TRANSPORTE LOCAL</Text>
              </View>

              {/* Sino + Menu à direita */}
              <View style={s.headerRight}>
                <TouchableOpacity hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="notifications-outline" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDrawerOpen(true)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="menu-outline" size={26} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={s.greeting}>Olá{userName ? `, ${userName}` : ''} 👋</Text>
            <Text style={s.subGreeting}>Bem-vindo ao KAVIAR</Text>
          </View>

          {/* ── CARD COMUNIDADE ── */}
          <View style={s.communityCard}>
            <LinearGradient colors={['#1E1E10', '#1A1A2E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.communityGradient}>
              <View style={s.communityRow}>
                <View style={s.communityPin}>
                  <Ionicons name="location" size={20} color={COLORS.primary} />
                </View>
                <View style={s.communityInfo}>
                  <Text style={s.communityLabel}>SUA COMUNIDADE</Text>
                  <Text style={s.communityName}>Sua região</Text>
                  <View style={s.driversRow}>
                    <Ionicons name="people" size={12} color={COLORS.textMuted} />
                    <Text style={s.driversText}>Motoristas disponíveis</Text>
                  </View>
                </View>
                <View style={s.statusPill}>
                  <View style={s.statusDot} />
                  <Text style={s.statusText}>Ativa</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* ── BANNER PREMIUM ── */}
          <View style={s.bannerOuter}>
            <View style={s.banner}>
              {/* Imagem do carro */}
              <Image
                source={require('../../assets/images/kaviar-banner-car.jpg')}
                style={s.bannerImage}
                resizeMode="cover"
              />

              {/* Overlay gradiente escuro — legibilidade do texto */}
              <LinearGradient
                colors={['rgba(10,10,5,0.95)', 'rgba(10,10,5,0.7)', 'rgba(10,10,5,0.2)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />

              {/* Overlay gradiente vertical — escurece topo e base */}
              <LinearGradient
                colors={['rgba(10,10,5,0.6)', 'transparent', 'rgba(10,10,5,0.8)']}
                style={StyleSheet.absoluteFill}
              />

              {/* Texto */}
              <View style={s.bannerContent}>
                <View style={s.bannerBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={COLORS.primary} />
                  <Text style={s.bannerBadgeText}>KAVIAR OFICIAL</Text>
                </View>
                <Text style={s.bannerTitle}>Transporte local feito{'\n'}por quem conhece você.</Text>
                <Text style={s.bannerSub}>Confiável  •  Seguro  •  Comunidade</Text>
              </View>

              {/* Borda inferior dourada */}
              <LinearGradient
                colors={['transparent', 'rgba(255,215,0,0.2)', 'transparent']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.bannerBottomLine}
              />
            </View>
          </View>
        </SafeAreaView>

        {/* ── PAINEL BRANCO ── */}
        <View style={s.whitePanel}>
          <Text style={s.panelTitle}>O que você deseja fazer?</Text>

          {/* Ações rápidas — 4 compactos lado a lado */}
          <View style={s.actionsRow}>
            {QUICK_ACTIONS.map(a => (
              <TouchableOpacity
                key={a.key}
                style={s.actionCard}
                onPress={() => router.push(a.route as any)}
                activeOpacity={0.7}
              >
                <View style={s.actionIconWrap}>
                  <Ionicons name={a.icon} size={20} color="#D6A928" />
                </View>
                <Text style={s.actionTitle}>{a.title}</Text>
                <Text style={s.actionSub}>{a.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── CARROSSEL ── */}
          <View style={s.carouselWrap}>
            <HomeOpportunityCarousel />
          </View>

          <View style={{ height: 16 }} />
        </View>
      </ScrollView>

      {/* ── BOTTOM BAR ── */}
      <HomeBottomBar
        onCall={() => router.push('/(passenger)/map')}
        onHome={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
        onAccount={() => router.push('/(passenger)/profile')}
      />

      {/* ── DRAWER ── */}
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
  root: { flex: 1, backgroundColor: '#F2EFE5' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 0 },

  // ── Header
  header: {
    backgroundColor: COLORS.background,
    paddingTop: STATUSBAR_H + 8,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  logoWrap: { alignItems: 'flex-start' },
  brandRow: { position: 'relative' },
  crown: { position: 'absolute', top: -11, left: '42%', },
  brand: { fontSize: 18, fontWeight: '900', color: COLORS.primary, letterSpacing: 5 },
  brandSub: { fontSize: 7, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 2.5, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  greeting: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  subGreeting: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, letterSpacing: 0.5 },

  // ── Community
  communityCard: {
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  communityGradient: { padding: 14 },
  communityRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  communityPin: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  communityInfo: { flex: 1 },
  communityLabel: { fontSize: 8, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.2, marginBottom: 2 },
  communityName: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 3 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(46,204,113,0.15)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  statusText: { fontSize: 9, fontWeight: '700', color: COLORS.success },
  driversRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  driversText: { fontSize: 11, color: COLORS.textSecondary },

  // ── Banner
  bannerOuter: {
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 18, overflow: 'hidden',
    shadowColor: '#FFD700', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  banner: {
    minHeight: 140, overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.12)',
  },
  bannerImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%', height: '100%',
  },
  bannerContent: { padding: 18, paddingRight: 80, zIndex: 2 },
  bannerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginBottom: 8,
  },
  bannerBadgeText: { fontSize: 8, fontWeight: '800', color: COLORS.primary, letterSpacing: 1.5 },
  bannerTitle: { fontSize: 15, fontWeight: '800', color: '#F5F5F5', lineHeight: 21, marginBottom: 6 },
  bannerSub: { fontSize: 10, fontWeight: '600', color: 'rgba(255,215,0,0.7)', letterSpacing: 0.8 },
  bannerBottomLine: { height: 1.5 },

  // ── White panel
  whitePanel: {
    backgroundColor: '#F2EFE5',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    marginTop: -6,
    paddingTop: 22, paddingHorizontal: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 6,
  },
  panelTitle: { fontSize: 13, fontWeight: '700', color: '#444', marginBottom: 14, letterSpacing: 0.2 },

  // ── Action cards — 4 compactos
  actionsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 22,
  },
  actionCard: {
    width: ACTION_W, alignItems: 'center',
    backgroundColor: '#FBFAF5', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 4,
    shadowColor: 'rgba(255,215,0,0.3)', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 3,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.12)',
  },
  actionIconWrap: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#FFFDF5',
    borderWidth: 1.5, borderColor: 'rgba(214,169,40,0.4)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#D6A928', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 5, elevation: 3,
  },
  actionTitle: { fontSize: 11, fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  actionSub: { fontSize: 8, color: '#999', marginTop: 2, textAlign: 'center' },

  // ── Carousel
  carouselWrap: { marginHorizontal: -20, paddingLeft: 20 },
});
