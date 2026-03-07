import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Button } from '../../src/components/Button';
import { driverApi } from '../../src/api/driver.api';
import { authStore } from '../../src/auth/auth.store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const LOCATION_INTERVAL = 15000; // 15 segundos

// Tela de motorista online/offline
export default function DriverOnline() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadUser();
    return () => {
      // Cleanup: parar envio de localização ao desmontar
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, []);

  const loadUser = async () => {
    const user = await authStore.getUser();
    if (user?.name) {
      setUserName(user.name);
    }
  };

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Erro', 'Permissão de localização negada');
        return;
      }

      // Enviar localização imediatamente
      await sendLocation();

      // Enviar a cada 15s
      locationIntervalRef.current = setInterval(async () => {
        await sendLocation();
      }, LOCATION_INTERVAL);
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  const stopLocationTracking = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  };

  const sendLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      const token = await authStore.getToken();

      await fetch(`${API_URL}/api/auth/driver/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lat: location.coords.latitude,
          lng: location.coords.longitude
        })
      });
    } catch (error) {
      console.error('Error sending location:', error);
    }
  };

  const handleToggleOnline = async () => {
    setLoading(true);
    try {
      await driverApi.setOnline();
      setIsOnline(true);
      await startLocationTracking();
      Alert.alert('Sucesso', 'Você está online!');
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao ficar online');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOffline = async () => {
    setLoading(true);
    try {
      stopLocationTracking();
      setIsOnline(false);
      Alert.alert('Sucesso', 'Você está offline');
    } catch (error: any) {
      Alert.alert('Erro', 'Erro ao ficar offline');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRide = () => {
    router.push('/(driver)/accept-ride');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sair',
      'Deseja realmente sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            stopLocationTracking();
            await authStore.clearAuth();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bem-vindo!</Text>
      {userName && <Text style={styles.userName}>{userName}</Text>}
      
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
        <>
          <Button
            title="Ver Corridas"
            onPress={handleAcceptRide}
          />
          <Button
            title="Ficar Offline"
            onPress={handleToggleOffline}
            style={styles.offlineButton}
          />
        </>
      )}

      <Button
        title="Sair"
        onPress={handleLogout}
        style={styles.logoutButton}
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
    marginBottom: 8,
    textAlign: 'center',
  },
  userName: {
    fontSize: 18,
    color: '#666',
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
  offlineButton: {
    marginTop: 12,
    backgroundColor: '#FF9800',
  },
  logoutButton: {
    marginTop: 20,
    backgroundColor: '#FF3B30',
  },
});
