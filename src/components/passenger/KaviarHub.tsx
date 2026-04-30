import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../config/colors';
import { MusicCard } from './MusicCard';
import { InstitutionalCard } from './InstitutionalCard';
import { KaviarOpportunityCard } from './KaviarOpportunityCard';
import { LocalShowcaseCard } from './LocalShowcaseCard';
import { WaitCard } from './WaitCard';

interface Props {
  rideId?: string | null;
  waitStartedAt?: string | null;
  waitEndedAt?: string | null;
  postWaitDestText?: string | null;
  neighborhoodName?: string | null;
}

export function KaviarHub({ rideId, waitStartedAt, waitEndedAt, postWaitDestText, neighborhoodName }: Props) {
  const showWait = !!waitStartedAt && !waitEndedAt;

  return (
    <View style={s.container}>
      <Text style={s.header}>✦ Experiência de Bordo KAVIAR</Text>
      {showWait && <WaitCard waitStartedAt={waitStartedAt!} destinationText={postWaitDestText} />}
      <MusicCard />
      <KaviarOpportunityCard neighborhoodName={neighborhoodName} />
      <LocalShowcaseCard rideId={rideId} />
      <InstitutionalCard />
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginTop: 8, marginBottom: 4 },
  header: { fontSize: 11, fontWeight: '700', color: COLORS.primary, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' },
});
