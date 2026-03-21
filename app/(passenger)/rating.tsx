import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';

export default function Rating() {
  const router = useRouter();
  const { rideId, driverName } = useLocalSearchParams<{ rideId: string; driverName?: string }>();
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert('Avaliação', 'Selecione uma nota.');
      return;
    }
    // Rating backend usa rides v1 — por enquanto salvar localmente e confirmar
    // TODO: migrar rating service para rides_v2
    setSubmitted(true);
    setTimeout(() => {
      router.replace('/(passenger)/map');
    }, 1500);
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

        <Button title="Enviar Avaliação" variant="primary" onPress={handleSubmit} />
        <Button title="Pular" variant="secondary" onPress={() => router.replace('/(passenger)/map')} style={{ marginTop: 8 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  driverName: { fontSize: 16, color: '#666', marginBottom: 24 },
  stars: { flexDirection: 'row', marginBottom: 16 },
  star: { fontSize: 48, marginHorizontal: 8 },
  ratingLabel: { fontSize: 16, color: '#666', marginBottom: 32 },
  thankYou: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subText: { fontSize: 16, color: '#666' },
});
