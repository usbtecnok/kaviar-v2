import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { authStore } from '../src/auth/auth.store';

// Tela inicial - Redireciona baseado em autenticação
export default function Index() {
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    await authStore.init();
    
    if (authStore.isAuthenticated()) {
      const userType = authStore.getUserType();
      if (userType === 'PASSENGER') {
        router.replace('/(passenger)/map');
      } else if (userType === 'DRIVER') {
        router.replace('/(driver)/online');
      }
    } else {
      router.replace('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.text}>Carregando...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
