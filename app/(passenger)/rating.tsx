import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/Button';
import { ridesApi } from '../../src/api/rides.api';

// Tela de avaliação
export default function Rating() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rideId = params.rideId as string;
  
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Erro', 'Selecione uma avaliação');
      return;
    }

    setLoading(true);
    try {
      await ridesApi.rateDriver(rideId, rating, comment);
      Alert.alert('Sucesso', 'Avaliação enviada!', [
        { text: 'OK', onPress: () => router.replace('/(passenger)/map') }
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao enviar avaliação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Avaliar Motorista</Text>
      
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
          >
            <Text style={styles.star}>
              {star <= rating ? '⭐' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <Text style={styles.ratingText}>
        {rating === 0 ? 'Toque para avaliar' : `${rating} estrela${rating > 1 ? 's' : ''}`}
      </Text>
      
      <Button
        title={loading ? 'Enviando...' : 'Enviar Avaliação'}
        onPress={handleSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  star: {
    fontSize: 48,
    marginHorizontal: 8,
  },
  ratingText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
});
