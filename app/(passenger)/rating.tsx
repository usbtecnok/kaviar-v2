import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { apiClient } from '../../src/api/client';
import { authStore } from '../../src/auth/auth.store';
import { friendlyError } from '../../src/utils/errorMessage';
import { COLORS } from '../../src/config/colors';

export default function Rating() {
  const router = useRouter();
  const { rideId, driverName, driverId } = useLocalSearchParams<{ rideId: string; driverName?: string; driverId?: string }>();
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Avaliação', 'Selecione uma nota.');
      return;
    }
    if (!rideId || !driverId) {
      Alert.alert('Erro', 'Dados da corrida incompletos. Voltando ao mapa.');
      router.replace('/(passenger)/map');
      return;
    }

    const user = authStore.getUser();
    if (!user?.id) {
      router.replace('/(auth)/login');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/api/ratings', {
        rideId,
        raterId: user.id,
        ratedId: driverId,
        raterType: 'PASSENGER',
        score: rating,
      });
      setSubmitted(true);
      setTimeout(() => router.replace('/(passenger)/map'), 1500);
    } catch (e: any) {
      if (e.response?.status === 409) {
        // Já avaliou — tratar como sucesso
        setSubmitted(true);
        setTimeout(() => router.replace('/(passenger)/map'), 1500);
      } else {
        Alert.alert('Erro', friendlyError(e, 'Não foi possível enviar a avaliação.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.thankYou}>Obrigado! 🎉</Text>
          <Text style={styles.subText}>Sua avaliação foi registrada.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>Avaliar Corrida</Text>
        {driverName ? <Text style={styles.driverName}>Motorista: {driverName}</Text> : null}

        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((s) => (
            <TouchableOpacity key={s} onPress={() => setRating(s)} accessibilityRole="button" accessibilityLabel={`${s} estrela${s > 1 ? 's' : ''}`}>
              <Text style={styles.star}>{s <= rating ? '⭐' : '☆'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.ratingLabel}>
          {rating === 0 ? 'Toque para avaliar' : `${rating} estrela${rating > 1 ? 's' : ''}`}
        </Text>

        <Button title="Enviar Avaliação" variant="primary" onPress={handleSubmit} loading={submitting} disabled={submitting} />
        <Button title="Pular" variant="secondary" onPress={() => router.replace('/(passenger)/map')} style={{ marginTop: 8 }} disabled={submitting} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  driverName: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 24 },
  stars: { flexDirection: 'row', marginBottom: 16 },
  star: { fontSize: 48, marginHorizontal: 8 },
  ratingLabel: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 32 },
  thankYou: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subText: { fontSize: 16, color: COLORS.textSecondary },
});
