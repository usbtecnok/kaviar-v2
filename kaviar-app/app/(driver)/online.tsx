import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/Button';
import { driverApi } from '../../src/api/driver.api';
import { authStore } from '../../src/auth/auth.store';

// Tela de motorista online/offline
export default function DriverOnline() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const user = await authStore.getUser();
    if (user?.name) {
      setUserName(user.name);
    }
  };

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
        <Button
          title="Ver Corridas"
          onPress={handleAcceptRide}
        />
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
  logoutButton: {
    marginTop: 20,
    backgroundColor: '#FF3B30',
  },
});
