import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../config/colors';
import { Ride } from '../../types/ride';

interface Props {
  visible: boolean;
  ride: Ride | null;
  onRate: () => void;
  onClose: () => void;
}

export function RideCompletedModal({ visible, ride, onRate, onClose }: Props) {
  const handleLostItem = () => {
    onClose();
    const driverName = ride?.driver?.name || 'não informado';
    const rideTime = ride?.requested_at ? new Date(ride.requested_at).toLocaleString('pt-BR') : 'não informado';
    const msg = `📦 Esqueci um objeto no carro\n\nMotorista: ${driverName}\nHorário: ${rideTime}\nCorrida: ${ride?.id || 'N/A'}`;
    Linking.openURL(`https://wa.me/5521968648777?text=${encodeURIComponent(msg)}`);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 8 }}>✅</Text>
          <Text style={s.title}>Corrida finalizada!</Text>
          {ride?.driver?.name && <Text style={s.body}>Motorista: {ride.driver.name}</Text>}
          {(ride as any)?.final_price != null && (
            <Text style={s.price}>R$ {Number((ride as any).final_price).toFixed(2)}</Text>
          )}
          <Text style={s.communityMsg}>Sua corrida fortalece a mobilidade da sua comunidade 🏘️</Text>
          <TouchableOpacity style={s.ctaPrimary} onPress={onRate}>
            <Text style={s.ctaPrimaryText}>Avaliar motorista</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.ctaLink, { marginTop: 12 }]} onPress={handleLostItem}>
            <Ionicons name="bag-outline" size={14} color={COLORS.textSecondary} />
            <Text style={[s.ctaLinkText, { marginLeft: 4 }]}>Esqueci um objeto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.ctaLink, { marginTop: 8 }]} onPress={onClose}>
            <Text style={s.ctaLinkText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 28, width: '100%', maxWidth: 360, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', lineHeight: 24, marginBottom: 12 },
  body: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  price: { fontSize: 24, fontWeight: '800', color: COLORS.primary, textAlign: 'center', marginBottom: 8 },
  communityMsg: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  ctaPrimary: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, width: '100%', alignItems: 'center' },
  ctaPrimaryText: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
  ctaLink: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center' },
  ctaLinkText: { fontSize: 14, color: COLORS.textSecondary },
});
