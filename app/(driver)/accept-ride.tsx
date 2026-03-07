import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/Button';
import { driverApi } from '../../src/api/driver.api';

// Tela de aceitar corrida
export default function AcceptRide() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rideId = params.rideId as string || 'ride_test_123'; // Mock para teste
  
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await driverApi.acceptRide(rideId);
      Alert.alert('Sucesso', 'Corrida aceita!', [
        { text: 'OK', onPress: () => router.push('/(driver)/complete-ride?rideId=' + rideId) }
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao aceitar corrida');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nova Corrida</Text>
      
      <View style={styles.rideInfo}>
        <Text style={styles.label}>ID da Corrida:</Text>
        <Text style={styles.value}>{rideId}</Text>
        
        <Text style={styles.label}>Origem:</Text>
        <Text style={styles.value}>Rua A, 123</Text>
        
        <Text style={styles.label}>Destino:</Text>
        <Text style={styles.value}>Rua B, 456</Text>
      </View>
      
      <Button
        title={loading ? 'Aceitando...' : 'Aceitar Corrida'}
        onPress={handleAccept}
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
  rideInfo: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
});
