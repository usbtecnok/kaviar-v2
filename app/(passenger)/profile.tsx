import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authStore } from '../../src/auth/auth.store';
import { PhoneVerifyBadge } from '../../src/components/PhoneVerifyBadge';
import { COLORS } from '../../src/config/colors';
import { User } from '../../src/types/user';

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  const refresh = useCallback(() => { setUser(authStore.getUser()); }, []);
  useEffect(refresh, []);

  const field = (label: string, value?: string, extra?: React.ReactNode) => (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value || '—'}</Text>
      {extra}
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Perfil</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={s.avatarWrap}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {user?.name ? user.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() : '?'}
          </Text>
        </View>
        <Text style={s.name}>{user?.name || 'Passageiro'}</Text>
      </View>

      <View style={s.card}>
        {field('Nome', user?.name)}
        {field('Telefone', user?.phone, user ? <PhoneVerifyBadge user={user} onVerified={refresh} /> : null)}
        {field('E-mail', user?.email)}
        {field('Tipo', user?.user_type === 'PASSENGER' ? 'Passageiro' : 'Motorista')}
        
        {/* DEBUG: Mostrar dados brutos */}
        <View style={[s.field, { backgroundColor: '#fff3cd', padding: 8, borderRadius: 4, marginTop: 8 }]}>
          <Text style={[s.label, { color: '#856404' }]}>DEBUG user_type</Text>
          <Text style={[s.value, { color: '#856404', fontSize: 14 }]}>
            "{user?.user_type}" (raw)
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  avatarWrap: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.surfaceLight, borderWidth: 2, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 26, fontWeight: '800', color: COLORS.primary },
  name: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, marginHorizontal: 20, padding: 20 },
  field: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  value: { fontSize: 16, color: COLORS.textPrimary },
});
