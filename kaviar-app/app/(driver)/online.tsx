import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/Button';
import { driverApi } from '../../src/api/driver.api';

// Tela de motorista online/offline
export default function DriverOnline() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggleOnline = async () => {
    setLoading(true);
    try {
      await driverApi.setOnline();
      setIsOnline(true);
      Alert.alert('Sucesso', 'Você está online!');
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao ficar online');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRide = () => {
    router.push('/(driver)/accept-ride');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Motorista</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Status:</Text>
        <Text style={[styles.statusText, isOnline && styles.statusOnline]}>
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </Text>
      </View>

      {!isOnline ? (
        <Button
          title={loading ? 'Conectando...' : 'Ficar Online'}
          onPress={handleToggleOnline}
        />
      ) : (
        <Button
          title="Ver Corridas"
          onPress={handleAcceptRide}
        />
      )}
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
  statusContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  statusLabel: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#999',
  },
  statusOnline: {
    color: '#4CAF50',
  },
});
