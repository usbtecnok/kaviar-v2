import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../../config/colors';

interface Props {
  icon?: string;
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function PremiumCard({ icon, title, children, style }: Props) {
  return (
    <View style={[s.card, style]}>
      <View style={s.border} />
      <View style={s.content}>
        <View style={s.header}>
          {icon ? <Text style={s.icon}>{icon}</Text> : null}
          <Text style={s.title}>{title}</Text>
        </View>
        {children}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#1a1a0a',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3a3a1a',
  },
  border: { width: 4, backgroundColor: COLORS.primary },
  content: { flex: 1, padding: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  icon: { fontSize: 18 },
  title: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
});
