import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/colors';
import { MOTO_TEXTS } from '../../config/moto.config';
import { ImageWithFallback } from './ImageWithFallback';

interface Props {
  driverPhoto?: string | null;
  motoPhoto?: string | null;
  plate?: string | null;
  model?: string | null;
  color?: string | null;
  onAck?: () => void;
}

/** Card de verificação visual do motociclista — isolado, sem endpoint. */
export function MotoDriverVerify({ driverPhoto, motoPhoto, plate, model, color, onAck }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{MOTO_TEXTS.verifyTitle}</Text>
      <Text style={styles.subtitle}>{MOTO_TEXTS.verifySubtitle}</Text>

      {/* Fotos */}
      <View style={styles.photosRow}>
        <View style={styles.photoBlock}>
          <ImageWithFallback uri={driverPhoto} style={styles.photo} />
          <Text style={styles.photoLabel}>Motociclista</Text>
        </View>
        <View style={styles.photoBlock}>
          <ImageWithFallback uri={motoPhoto} style={styles.photo} />
          <Text style={styles.photoLabel}>Moto</Text>
        </View>
      </View>

      {/* Dados */}
      <View style={styles.infoBox}>
        <InfoRow icon="document-text" label="Placa" value={plate} />
        <InfoRow icon="bicycle" label="Modelo" value={model} />
        <InfoRow icon="color-palette" label="Cor" value={color} />
      </View>

      {/* Aviso */}
      <View style={styles.warningBox}>
        <Ionicons name="shield-checkmark" size={16} color={COLORS.warning} />
        <Text style={styles.warningText}>{MOTO_TEXTS.verifyWarning}</Text>
      </View>

      {/* Botão */}
      {onAck && (
        <View style={styles.btnWrap}>
          <Text style={styles.btnText} onPress={onAck}>{MOTO_TEXTS.verifyAck}</Text>
        </View>
      )}
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={16} color={COLORS.primary} />
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue}>{value || 'Não disponível'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 18,
  },
  photosRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 18,
  },
  photoBlock: { alignItems: 'center' },
  photo: { width: 72, height: 72, borderRadius: 36 },
  photoLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 6 },
  infoBox: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 14,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 12, color: COLORS.textSecondary, width: 50 },
  infoValue: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(243,156,18,0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  warningText: { flex: 1, fontSize: 12, color: COLORS.textPrimary, lineHeight: 17 },
  btnWrap: { alignItems: 'center', paddingTop: 4 },
  btnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary, letterSpacing: 1 },
});
