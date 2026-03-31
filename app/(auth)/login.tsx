import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { authApi } from '../../src/api/auth.api';
import { authStore } from '../../src/auth/auth.store';
import { friendlyError } from '../../src/utils/errorMessage';
import { COLORS } from '../../src/config/colors';

const APP_VARIANT = Constants.expoConfig?.extra?.APP_VARIANT || 'driver';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const isDriver = APP_VARIANT === 'driver';
  const userType = isDriver ? 'DRIVER' : 'PASSENGER';

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
        router.replace(user.status === 'pending' ? '/(driver)/pending-approval' : '/(driver)/online');
      }
    } catch (error: any) {
      Alert.alert('Erro', friendlyError(error, 'Erro ao fazer login'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Brand */}
        <View style={styles.brandArea}>
          <Text style={styles.brand}>KAVIAR</Text>
          <View style={styles.line} />
          <Text style={styles.subtitle}>
            {isDriver ? 'Motorista' : 'Passageiro'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            icon="mail-outline"
            keyboardType="email-address"
          />
          <Input
            placeholder="Senha"
            value={password}
            onChangeText={setPassword}
            icon="lock-closed-outline"
            secureTextEntry
          />

          <Button
            title={loading ? 'Entrando...' : 'Entrar'}
            onPress={handleLogin}
            loading={loading}
          />

          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.linkBtn}>
            <Text style={styles.linkText}>Esqueci minha senha</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <TouchableOpacity
          onPress={() => router.push(userType === 'PASSENGER' ? '/(auth)/register-passenger' : '/(auth)/register')}
          style={styles.registerBtn}
        >
          <Text style={styles.registerText}>
            Não tem conta?{' '}
            <Text style={styles.registerBold}>
              {isDriver ? 'Cadastre-se como motorista' : 'Cadastre-se'}
            </Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brandArea: {
    alignItems: 'center',
    marginBottom: 48,
  },
  brand: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 6,
  },
  line: {
    width: 32,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    marginVertical: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  form: {
    marginBottom: 24,
  },
  linkBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  registerBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  registerText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  registerBold: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
