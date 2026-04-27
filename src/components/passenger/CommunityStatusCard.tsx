import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../config/colors';

interface Props {
  communityName: string;
  driversOnline: number;
}

export function CommunityStatusCard({ communityName, driversOnline }: Props) {
  return (
    <View style={s.card}>
      <Text style={s.title}>Base KAVIAR — {communityName}</Text>
      <Text style={s.subtitle}>
        {driversOnline > 0
          ? `${driversOnline} motorista${driversOnline > 1 ? 's' : ''} na sua região`
          : 'Operação em expansão na sua região'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    position: 'absolute', top: 110, left: 16, right: 16, zIndex: 10,
    backgroundColor: 'rgba(15,15,15,0.88)', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  title: { fontSize: 13, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 3 },
});
