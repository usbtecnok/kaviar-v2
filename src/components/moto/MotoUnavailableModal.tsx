import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/colors';
import { MOTO_TEXTS } from '../../config/moto.config';

interface Props {
  visible?: boolean;
  onChooseCar?: () => void;
  onRetry?: () => void;
}

/** Modal de indisponibilidade Moto — amigável, sem termos técnicos. */
export function MotoUnavailableModal({ visible, onChooseCar, onRetry }: Props) {
  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onChooseCar}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Ionicons name="bicycle" size={36} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
          <Text style={styles.title}>{MOTO_TEXTS.unavailableTitle}</Text>
          <Text style={styles.body}>{MOTO_TEXTS.unavailableBody}</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={onChooseCar} activeOpacity={0.8}>
            <Text style={styles.btnPrimaryText}>{MOTO_TEXTS.unavailableBtnCar}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={onRetry} activeOpacity={0.7}>
            <Text style={styles.btnSecondaryText}>{MOTO_TEXTS.unavailableBtnRetry}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 28, width: '100%', maxWidth: 340, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 10 },
  body: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  btnPrimary: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, width: '100%', alignItems: 'center', marginBottom: 10 },
  btnPrimaryText: { color: COLORS.textDark, fontSize: 15, fontWeight: '800' },
  btnSecondary: { paddingVertical: 12, width: '100%', alignItems: 'center' },
  btnSecondaryText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
});
