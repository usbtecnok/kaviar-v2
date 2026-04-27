import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../config/colors';

type ScheduleOption = 'now' | '15min' | '30min' | 'custom';

interface Props {
  scheduleOption: ScheduleOption;
  onOptionChange: (opt: ScheduleOption) => void;
  customTime: Date | null;
}

const OPTIONS: { key: ScheduleOption; label: string }[] = [
  { key: 'now', label: 'Agora' },
  { key: '15min', label: '15 min' },
  { key: '30min', label: '30 min' },
  { key: 'custom', label: 'Horário' },
];

export function ScheduleSelector({ scheduleOption, onOptionChange, customTime }: Props) {
  const fmtTime = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={s.section}>
      <Text style={s.label}>QUANDO</Text>
      <View style={s.row}>
        {OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[s.chip, scheduleOption === opt.key && s.chipActive]}
            onPress={() => onOptionChange(opt.key)}
            activeOpacity={0.7}
          >
            <Text style={[s.chipText, scheduleOption === opt.key && s.chipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {scheduleOption === 'custom' && customTime && (
        <Text style={s.preview}>Agendada para {fmtTime(customTime)}</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  section: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  label: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.surfaceLight, borderWidth: 1.5, borderColor: COLORS.border },
  chipActive: { borderColor: COLORS.primary, backgroundColor: '#1a1a0a' },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary },
  preview: { fontSize: 13, color: '#5B9BD5', fontWeight: '600', marginTop: 8, textAlign: 'center' },
});
