import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { authStore } from '../src/auth/auth.store';
import { COLORS } from '../src/config/colors';

export default function Index() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(checkAuth, 1200);
    const unsub = authStore.onLogout(() => router.replace('/(auth)/login'));
    return () => { clearTimeout(timer); unsub(); };
  }, []);

  const checkAuth = async () => {
    await authStore.init();
    if (authStore.isAuthenticated()) {
      const userType = authStore.getUserType();
      if (userType === 'PASSENGER') {
        router.replace('/(passenger)/home');
      } else if (userType === 'DRIVER') {
        const user = authStore.getUser();
        router.replace(user?.status === 'pending' ? '/(driver)/documents' : '/(driver)/online');
      }
    } else {
      router.replace('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        <Text style={styles.brand}>KAVIAR</Text>
        <View style={styles.line} />
        <Text style={styles.tagline}>Mobilidade com identidade</Text>
      </Animated.View>
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
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 8,
  },
  line: {
    width: 40,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    marginVertical: 12,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
