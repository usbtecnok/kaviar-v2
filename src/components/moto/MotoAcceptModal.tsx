import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/colors';
import { MOTO_TEXTS } from '../../config/moto.config';

interface Props {
  visible?: boolean;
  onAccept?: () => void;
  onClose?: () => void;
}

const WARNINGS = [
  MOTO_TEXTS.helmetWarning,
  MOTO_TEXTS.helmetProvided,
  MOTO_TEXTS.verifyBefore,
];

const CHECKBOXES = [
  MOTO_TEXTS.acceptTerms,
  MOTO_TEXTS.acceptRisks,
  MOTO_TEXTS.helmetCommitment,
];

/** Modal de aceite Moto Passageiro — isolado, sem estado global, sem endpoint. */
export function MotoAcceptModal({ visible, onAccept, onClose }: Props) {
  const [checked, setChecked] = useState([false, false, false]);

  const allChecked = checked.every(Boolean);

  const toggle = (i: number) => {
    setChecked(prev => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  return (
    <Modal visible={!!visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{MOTO_TEXTS.modalTitle}</Text>
            <Text style={styles.subtitle}>{MOTO_TEXTS.modalSubtitle}</Text>

            {/* Avisos */}
            <View style={styles.warningsBox}>
              {WARNINGS.map((w, i) => (
                <View key={i} style={styles.warningRow}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.warning} />
                  <Text style={styles.warningText}>{w}</Text>
                </View>
              ))}
            </View>

            {/* Checkboxes */}
            {CHECKBOXES.map((label, i) => (
              <TouchableOpacity key={i} style={styles.checkRow} onPress={() => toggle(i)} activeOpacity={0.7}>
                <View style={[styles.checkbox, checked[i] && styles.checkboxActive]}>
                  {checked[i] && <Ionicons name="checkmark" size={14} color={COLORS.textDark} />}
                </View>
                <Text style={styles.checkLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Botões */}
          <TouchableOpacity
            style={[styles.btnPrimary, !allChecked && styles.btnDisabled]}
            onPress={allChecked ? onAccept : undefined}
            activeOpacity={allChecked ? 0.8 : 1}
            disabled={!allChecked}
          >
            <Text style={[styles.btnPrimaryText, !allChecked && styles.btnDisabledText]}>
              {MOTO_TEXTS.buttonPrimary}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSecondary} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.btnSecondaryText}>{MOTO_TEXTS.buttonSecondary}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  warningsBox: {
    backgroundColor: 'rgba(243,156,18,0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  warningRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  warningText: { flex: 1, fontSize: 13, color: COLORS.textPrimary, lineHeight: 18 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkLabel: { flex: 1, fontSize: 13, color: COLORS.textPrimary, lineHeight: 18 },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  btnPrimaryText: { fontSize: 14, fontWeight: '800', color: COLORS.textDark },
  btnDisabled: { backgroundColor: COLORS.surfaceLight },
  btnDisabledText: { color: COLORS.textMuted },
  btnSecondary: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnSecondaryText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
});
