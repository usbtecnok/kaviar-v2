import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { authStore } from '../src/auth/auth.store';
import { COLORS } from '../src/config/colors';

// Tela inicial - Redireciona baseado em autenticação
export default function Index() {
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    const unsub = authStore.onLogout(() => {
      router.replace('/(auth)/login');
    });
    return unsub;
  }, []);

  const checkAuth = async () => {
    await authStore.init();
    
    if (authStore.isAuthenticated()) {
      const userType = authStore.getUserType();
      if (userType === 'PASSENGER') {
        router.replace('/(passenger)/map');
      } else if (userType === 'DRIVER') {
        // Verificar status do motorista antes de redirecionar
        const user = authStore.getUser();
        if (user?.status === 'pending') {
          router.replace('/(driver)/pending-approval');
        } else if (user?.status === 'approved') {
          router.replace('/(driver)/online');
        } else {
          router.replace('/(driver)/online');
        }
      }
    } else {
      router.replace('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>KAVIAR</Text>
      <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  brand: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    letterSpacing: 4,
  },
});
