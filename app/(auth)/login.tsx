import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { authApi } from '../../src/api/auth.api';
import { authStore } from '../../src/auth/auth.store';
import { friendlyError } from '../../src/utils/errorMessage';
import { COLORS } from '../../src/config/colors';

const APP_VARIANT = Constants.expoConfig?.extra?.APP_VARIANT || 'driver';

// Tela de login
export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<'PASSENGER' | 'DRIVER'>(
    APP_VARIANT === 'passenger' ? 'PASSENGER' : 'DRIVER'
  );

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
        // Verificar status do motorista
        if (user.status === 'pending') {
          router.replace('/(driver)/pending-approval');
        } else if (user.status === 'approved') {
          router.replace('/(driver)/online');
        } else {
          router.replace('/(driver)/online');
        }
      }
    } catch (error: any) {
      Alert.alert('Erro', friendlyError(error, 'Erro ao fazer login'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/(auth)/forgot-password');
  };

  const handleRegister = () => {
    router.push('/(auth)/register');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      
      {APP_VARIANT === 'passenger' && (
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
      )}
      
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
        loading={loading}
      />

      <TouchableOpacity onPress={handleForgotPassword} style={styles.linkButton}>
        <Text style={styles.linkText}>Esqueci minha senha</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleRegister} style={styles.registerButton}>
        <Text style={styles.registerText}>
          Não tem conta? <Text style={styles.registerTextBold}>Cadastre-se</Text>
        </Text>
      </TouchableOpacity>
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
    backgroundColor: COLORS.border,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  typeText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  typeTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  registerButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  registerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  registerTextBold: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
