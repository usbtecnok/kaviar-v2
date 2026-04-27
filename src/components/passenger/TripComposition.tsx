import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/colors';

interface PostWaitDest { lat: number; lng: number; text: string }

interface Props {
  passengerCount: number;
  onPassengerChange: (n: number) => void;
  hasLuggage: boolean;
  onLuggageToggle: () => void;
  waitEstimatedMin: number | null;
  onWaitChange: (min: number | null) => void;
  postWaitDest: PostWaitDest | null;
  onPostWaitClear: () => void;
  onPostWaitSearch: () => void;
}

export function TripComposition({
  passengerCount, onPassengerChange, hasLuggage, onLuggageToggle,
  waitEstimatedMin, onWaitChange, postWaitDest, onPostWaitClear, onPostWaitSearch,
}: Props) {
  return (
    <View style={s.tripComp}>
      <View style={s.tripRow}>
        <Text style={s.tripLabel}>👥 Passageiros</Text>
        <View style={s.tripCounter}>
          <TouchableOpacity onPress={() => onPassengerChange(Math.max(1, passengerCount - 1))} style={s.tripBtn}><Text style={s.tripBtnText}>−</Text></TouchableOpacity>
          <Text style={s.tripCount}>{passengerCount}</Text>
          <TouchableOpacity onPress={() => onPassengerChange(Math.min(4, passengerCount + 1))} style={s.tripBtn}><Text style={s.tripBtnText}>+</Text></TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={s.tripRow} onPress={onLuggageToggle} activeOpacity={0.7}>
        <Text style={s.tripLabel}>🧳 Bagagem</Text>
        <View style={[s.tripToggle, hasLuggage && s.tripToggleOn]}>
          <Text style={s.tripToggleText}>{hasLuggage ? 'Sim' : 'Não'}</Text>
        </View>
      </TouchableOpacity>
      <View style={{ marginTop: 10 }}>
        <Text style={s.tripLabel}>⏳ Preciso de uma parada com espera no destino?</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {[null, 10, 20, 30, 45, 60].map(min => {
            const active = waitEstimatedMin === min;
            return (
              <TouchableOpacity
                key={String(min)}
                onPress={() => onWaitChange(min)}
                activeOpacity={0.7}
                style={[s.tripToggle, active && s.tripToggleOn, { paddingHorizontal: 12 }]}
              >
                <Text style={s.tripToggleText}>{min === null ? 'Não' : `${min} min`}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {waitEstimatedMin !== null && (
          <View style={{ marginTop: 12 }}>
            <Text style={s.addressLabel}>DESTINO APÓS A ESPERA</Text>
            <TouchableOpacity
              style={[s.addressRow, { marginTop: 4, borderBottomWidth: 0 }]}
              onPress={onPostWaitSearch}
              activeOpacity={0.7}
            >
              <View style={[s.dot, { backgroundColor: postWaitDest ? '#1565c0' : COLORS.textMuted }]} />
              <View style={{ flex: 1 }}>
                <Text style={[s.addressText, !postWaitDest && s.addressPlaceholder]} numberOfLines={1}>
                  {postWaitDest?.text || 'Para onde depois da espera?'}
                </Text>
                <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                  Opcional — preencha se o motorista deve continuar ou retornar com você
                </Text>
              </View>
              {postWaitDest ? (
                <TouchableOpacity onPress={onPostWaitClear} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : (
                <Ionicons name="search" size={18} color={COLORS.textMuted} />
              )}
            </TouchableOpacity>
            {postWaitDest && (
              <Text style={{ fontSize: 12, color: '#2e7d32', marginTop: 6, fontWeight: '600' }}>
                ✓ O valor incluirá a ida, o trecho após a espera e o tempo de espera.
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  tripComp: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  tripRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  tripLabel: { fontSize: 15, color: COLORS.textPrimary },
  tripCounter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tripBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  tripBtnText: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  tripCount: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, minWidth: 20, textAlign: 'center' },
  tripToggle: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 14, backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.border },
  tripToggleOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tripToggleText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  addressLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, marginBottom: 2 },
  addressRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  addressText: { fontSize: 15, color: COLORS.textPrimary },
  addressPlaceholder: { color: COLORS.textMuted },
});
