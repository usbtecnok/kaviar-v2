import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/colors';

const GOLD = '#B8942E';

interface Props {
  onActivate: () => void;
  onDismiss: () => void;
}

export function WomenPreferenceInvite({ onActivate, onDismiss }: Props) {
  return (
    <View style={s.card}>
      <View style={s.header}>
        <Ionicons name="shield-checkmark" size={20} color={GOLD} />
        <Text style={s.title}>Prefere ser atendida por motorista mulher?</Text>
      </View>
      <Text style={s.body}>
        Você pode participar voluntariamente do programa e ativar essa preferência. Quando disponível, o KAVIAR priorizará uma motorista mulher. Se não houver ou se ela não aceitar, outro motorista disponível poderá atender você.
      </Text>
      <Text style={s.body}>
        Você poderá desativar a preferência ou revogar sua participação a qualquer momento pelo seu Perfil.
      </Text>
      <View style={s.buttons}>
        <TouchableOpacity style={s.btnPrimary} onPress={onActivate} activeOpacity={0.7}>
          <Text style={s.btnPrimaryText}>Conhecer e ativar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnSecondary} onPress={onDismiss} activeOpacity={0.7}>
          <Text style={s.btnSecondaryText}>Agora não</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#FFFDF5', borderRadius: 14, padding: 16, marginHorizontal: 20, marginTop: 16, borderWidth: 1, borderColor: '#B8942E30' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title: { fontSize: 14, fontWeight: '700', color: GOLD, flex: 1 },
  body: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginBottom: 8 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnPrimary: { flex: 1, backgroundColor: GOLD, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  btnPrimaryText: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  btnSecondary: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  btnSecondaryText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
});
