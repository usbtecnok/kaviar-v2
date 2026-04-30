import React, { useState, useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import { PremiumCard } from './PremiumCard';
import { COLORS } from '../../config/colors';

interface Props {
  waitStartedAt: string;
  destinationText?: string | null;
}

export function WaitCard({ waitStartedAt, destinationText }: Props) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const calc = () => {
      const min = Math.max(0, Math.floor((Date.now() - new Date(waitStartedAt).getTime()) / 60000));
      setElapsed(`${min} min`);
    };
    calc();
    const t = setInterval(calc, 30000);
    return () => clearInterval(t);
  }, [waitStartedAt]);

  return (
    <PremiumCard icon="⏳" title="Motorista em espera">
      <Text style={s.text}>Seu motorista já está aguardando. Use esse tempo para se organizar com tranquilidade.</Text>
      {elapsed ? <Text style={s.detail}>⏱ Tempo de espera: {elapsed}</Text> : null}
      {destinationText ? <Text style={s.detail}>📍 Próximo destino: {destinationText}</Text> : null}
    </PremiumCard>
  );
}

const s = StyleSheet.create({
  text: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginBottom: 6 },
  detail: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
});
