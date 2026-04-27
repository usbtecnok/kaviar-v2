import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../config/colors';

interface Place { text: string; lat: number; lng: number; placeId: string }

interface Props {
  homePlace: Place;
  onAccept: () => void;
  onDismiss: () => void;
}

export function ReturnHomeCard({ homePlace, onAccept, onDismiss }: Props) {
  return (
    <View style={s.card}>
      <Text style={s.title}>Voltar para casa?</Text>
      <Text style={s.subtitle}>Sua região está ativa no momento.</Text>
      <View style={s.buttons}>
        <TouchableOpacity style={s.btnPrimary} onPress={onAccept}>
          <Text style={s.btnPrimaryText}>Pedir retorno</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnSecondary} onPress={onDismiss}>
          <Text style={s.btnSecondaryText}>Agora não</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    position: 'absolute', bottom: 280, left: 16, right: 16, zIndex: 11,
    backgroundColor: 'rgba(15,15,15,0.92)', borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btnPrimary: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  btnSecondary: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  btnSecondaryText: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
});
