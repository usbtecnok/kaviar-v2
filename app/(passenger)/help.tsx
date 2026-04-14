import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { COLORS } from '../../src/config/colors';

const SUPPORT_WHATSAPP = 'https://wa.me/5521968648777?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20Kaviar';
const SITE_URL = 'https://kaviar.com.br';
const APP_VERSION = Constants.expoConfig?.version || '1.1.0';

export default function Help() {
  const router = useRouter();

  const option = (icon: string, label: string, sub: string, onPress: () => void) => (
    <TouchableOpacity style={s.option} onPress={onPress} activeOpacity={0.6}>
      <View style={s.optionIcon}>
        <Ionicons name={icon as any} size={22} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.optionLabel}>{label}</Text>
        <Text style={s.optionSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Ajuda</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.content}>
        {option('logo-whatsapp', 'Falar com suporte', 'Atendimento via WhatsApp', () => Linking.openURL(SUPPORT_WHATSAPP))}
        {option('globe-outline', 'Site Kaviar', 'kaviar.com.br', () => Linking.openURL(SITE_URL))}
        {option('information-circle-outline', 'Sobre o Kaviar', `Versão ${APP_VERSION}`, () => Linking.openURL(SITE_URL))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  content: { paddingHorizontal: 20, paddingTop: 12 },
  option: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  optionIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  optionLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  optionSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
});
