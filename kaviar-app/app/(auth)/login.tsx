import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { authApi } from '../../src/api/auth.api';
import { authStore } from '../../src/auth/auth.store';

// Tela de login
export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<'PASSENGER' | 'DRIVER'>('PASSENGER');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const loginFn = userType === 'PASSENGER' ? authApi.loginPassenger : authApi.loginDriver;
      const { token, user } = await loginFn(email, password);
      await authStore.setAuth(token, user);
      
      if (userType === 'PASSENGER') {
        router.replace('/(passenger)/map');
      } else {
        router.replace('/(driver)/online');
      }
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[styles.typeButton, userType === 'PASSENGER' && styles.typeButtonActive]}
          onPress={() => setUserType('PASSENGER')}
        >
          <Text style={[styles.typeText, userType === 'PASSENGER' && styles.typeTextActive]}>
            Passageiro
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.typeButton, userType === 'DRIVER' && styles.typeButtonActive]}
          onPress={() => setUserType('DRIVER')}
        >
          <Text style={[styles.typeText, userType === 'DRIVER' && styles.typeTextActive]}>
            Motorista
          </Text>
        </TouchableOpacity>
      </View>
      
      <Input
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      
      <Input
        placeholder="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <Button
        title={loading ? 'Entrando...' : 'Entrar'}
        onPress={handleLogin}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    borderRadius: 8,
    overflow: 'hidden',
  },
  typeButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
  },
  typeText: {
    fontSize: 16,
    color: '#666',
  },
  typeTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
