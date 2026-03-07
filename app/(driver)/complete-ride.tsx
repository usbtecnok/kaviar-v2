import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '../../src/components/Button';
import { driverApi } from '../../src/api/driver.api';

// Tela de finalizar corrida
export default function CompleteRide() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rideId = params.rideId as string;
  
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    setLoading(true);
    try {
      await driverApi.completeRide(rideId);
      Alert.alert('Sucesso', 'Corrida finalizada!', [
        { text: 'OK', onPress: () => router.replace('/(driver)/online') }
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao finalizar corrida');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Corrida em Andamento</Text>
      
      <View style={styles.rideInfo}>
        <Text style={styles.label}>ID da Corrida:</Text>
        <Text style={styles.value}>{rideId}</Text>
        
        <Text style={styles.label}>Status:</Text>
        <Text style={[styles.value, styles.statusAccepted]}>ACEITA</Text>
      </View>
      
      <Button
        title={loading ? 'Finalizando...' : 'Finalizar Corrida'}
        onPress={handleComplete}
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
  statusAccepted: {
    color: '#4CAF50',
  },
});
