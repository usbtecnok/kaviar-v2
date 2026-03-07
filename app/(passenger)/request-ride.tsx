import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { ridesApi } from '../../src/api/rides.api';

// Tela de solicitação de corrida
export default function RequestRide() {
  const router = useRouter();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequest = async () => {
    if (!origin || !destination) {
      Alert.alert('Erro', 'Preencha origem e destino');
      return;
    }

    setLoading(true);
    try {
      const ride = await ridesApi.requestRide(origin, destination);
      Alert.alert('Sucesso', 'Corrida solicitada!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao solicitar corrida');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Solicitar Corrida</Text>
      
      <Input
        placeholder="Origem"
        value={origin}
        onChangeText={setOrigin}
      />
      
      <Input
        placeholder="Destino"
        value={destination}
        onChangeText={setDestination}
      />
      
      <Button
        title={loading ? 'Solicitando...' : 'Solicitar'}
        onPress={handleRequest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
  },
});
