import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../config/colors';

interface Props {
  message: string | null | undefined;
}

/** Banner de alerta visual (fundo warning). Aceita message null sem quebrar. */
export function WarningBanner({ message }: Props) {
  if (!message) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.warning,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  text: {
    color: COLORS.textDark,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
