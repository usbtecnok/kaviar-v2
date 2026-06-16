import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { COLORS } from '../config/colors';

interface Props {
  visible: boolean;
  mandatory: boolean;
  message: string;
  apkUrl: string;
  onDismiss: () => void;
}

export function UpdateRequiredModal({ visible, mandatory, message, apkUrl, onDismiss }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {mandatory ? 'Atualização obrigatória' : 'Nova versão disponível'}
          </Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => Linking.openURL(apkUrl)}
            accessibilityRole="button"
            accessibilityLabel="Atualizar agora"
          >
            <Text style={styles.buttonText}>Atualizar agora</Text>
          </TouchableOpacity>
          {!mandatory && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel="Depois"
            >
              <Text style={styles.secondaryButtonText}>Depois</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  secondaryButton: {
    marginTop: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
});
