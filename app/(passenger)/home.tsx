import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Platform, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authStore } from '../../src/auth/auth.store';
import { COLORS } from '../../src/config/colors';
import { DrawerMenu, DrawerItem } from '../../src/components/DrawerMenu';
import { KaviarOpportunityCard } from '../../src/components/passenger/KaviarOpportunityCard';
import { InstitutionalCard } from '../../src/components/passenger/InstitutionalCard';

const QUICK_ACTIONS = [
  { key: 'call',      icon: 'car-outline',       label: 'Chamar\nmotorista',  route: '/(passenger)/map'      },
  { key: 'schedule',  icon: 'time-outline',       label: 'Agendar\ncorrida',   route: '/(passenger)/map'      },
  { key: 'favorites', icon: 'heart-outline',      label: 'Meus\ndestinos',     route: '/(passenger)/favorites'},
  { key: 'help',      icon: 'help-circle-outline', label: 'Suporte\nKAVIAR',   route: '/(passenger)/help'     },
] as const;

export default function PassengerHome() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const user = authStore.getUser();
    if (user?.name) {
      const first = user.name.split(' ')[0];
      setUserName(first.charAt(0).toUpperCase() + first.slice(1).toLowerCase());
    }
  }, []);

  const drawerItems: DrawerItem[] = [
    { key: 'profile',   label: 'Meu perfil',             icon: 'person-outline',       onPress: () => router.push('/(passenger)/profile')     },
    { key: 'history',   label: 'Minhas corridas',         icon: 'time-outline',         onPress: () => router.push('/(passenger)/history')     },
    { key: 'favorites', label: 'Meus destinos',           icon: 'heart-outline',        onPress: () => router.push('/(passenger)/favorites')   },
    { key: 'tourism',   label: 'Turismo Premium',         icon: 'diamond-outline',      badge: '✦', onPress: () => router.push('/(passenger)/tourism') },
    { key: 'refer',     label: 'Convide e ganhe',         icon: 'people-outline',       onPress: () => router.push('/(passenger)/refer-driver') },
    { key: 'help',      label: 'Ajuda',                   icon: 'help-circle-outline',  onPress: () => router.push('/(passenger)/help')        },
    { key: 'logout',    label: 'Sair',                    icon: 'log-out-outline',      danger: true, onPress: () => authStore.clearAuth()      },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* ── TOPO ── */}
      <View style={s.header}>
        <SafeAreaView>
          <View style={s.headerRow}>
            <TouchableOpacity onPress={() => setDrawerOpen(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="menu-outline" size={28} color={COLORS.primary} />
            </TouchableOpacity>

            <Text style={s.brand}>KAVIAR</Text>

            <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="notifications-outline" size={26} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={s.greetingRow}>
            <Text style={s.greeting}>Olá{userName ? `, ${userName}` : ''}  👋</Text>
            <Text style={s.subGreeting}>Bem-vindo ao KAVIAR</Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── CARD COMUNIDADE ── */}
        <View style={s.communityCard}>
          <View style={s.communityLeft}>
            <Text style={s.communityLabel}>Sua comunidade</Text>
            <Text style={s.communityName}>Sua região</Text>
            <View style={s.statusRow}>
              <View style={s.statusDot} />
              <Text style={s.statusText}>Operação ativa</Text>
            </View>
          </View>
          <View style={s.communityRight}>
            <Ionicons name="people-outline" size={28} color={COLORS.primary} />
            <Text style={s.driversText}>Motoristas{'\n'}disponíveis</Text>
          </View>
        </View>

        {/* ── BANNER INSTITUCIONAL ── */}
        <View style={s.banner}>
          <Text style={s.bannerTitle}>Transporte local feito por quem conhece você.</Text>
          <Text style={s.bannerSub}>Confiável  •  Seguro  •  Da nossa comunidade</Text>
        </View>

        {/* ── PAINEL AÇÕES RÁPIDAS ── */}
        <View style={s.panel}>
          <Text style={s.panelTitle}>O que você deseja fazer?</Text>
          <View style={s.actionsGrid}>
            {QUICK_ACTIONS.map(a => (
              <TouchableOpacity
                key={a.key}
                style={s.actionItem}
                onPress={() => router.push(a.route as any)}
                activeOpacity={0.7}
              >
                <View style={s.actionIcon}>
                  <Ionicons name={a.icon as any} size={24} color={COLORS.primary} />
                </View>
                <Text style={s.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── CARDS CORRIDOS ── */}
        <Text style={s.sectionTitle}>✦ Oportunidades KAVIAR</Text>
        <KaviarOpportunityCard />
        <InstitutionalCard />

        {/* espaço para o botão flutuante não cobrir conteúdo */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── BOTÃO CHAMAR (flutuante) ── */}
      <View style={s.fabContainer}>
        <TouchableOpacity
          style={s.fab}
          onPress={() => router.push('/(passenger)/map')}
          activeOpacity={0.85}
        >
          <Ionicons name="car-sport-outline" size={26} color={COLORS.textDark} />
          <Text style={s.fabText}>CHAMAR</Text>
        </TouchableOpacity>
      </View>

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
  root: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    backgroundColor: COLORS.background,
    paddingTop: STATUSBAR_H,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 12,
  },
  brand: {
    fontSize: 22, fontWeight: '900', color: COLORS.primary, letterSpacing: 6,
  },
  greetingRow: { marginTop: 16 },
  greeting: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  subGreeting: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2, letterSpacing: 0.5 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  // Community card
  communityCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  communityLeft: { flex: 1 },
  communityLabel: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  communityName: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  statusText: { fontSize: 12, color: COLORS.success, fontWeight: '600' },
  communityRight: { alignItems: 'center', gap: 6, marginLeft: 12 },
  driversText: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center', lineHeight: 14 },

  // Banner
  banner: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 14, padding: 18, marginBottom: 14,
    borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  bannerTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 22, marginBottom: 6 },
  bannerSub: { fontSize: 12, color: COLORS.primary, letterSpacing: 0.5 },

  // Panel
  panel: {
    backgroundColor: COLORS.surface,
    borderRadius: 20, padding: 18, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  panelTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 16, letterSpacing: 0.3 },
  actionsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  actionItem: { alignItems: 'center', flex: 1 },
  actionIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 15 },

  // Section title
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: COLORS.primary,
    letterSpacing: 1.5, textTransform: 'uppercase',
    marginBottom: 10,
  },

  // FAB
  fabContainer: {
    position: 'absolute', bottom: 40, left: 0, right: 0,
    alignItems: 'center',
  },
  fab: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: 16, paddingHorizontal: 48,
    borderRadius: 50,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  fabText: { fontSize: 18, fontWeight: '900', color: COLORS.textDark, letterSpacing: 3 },
});
