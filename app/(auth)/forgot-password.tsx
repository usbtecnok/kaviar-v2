import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { ENV } from '../../src/config/env';
import { friendlyError } from '../../src/utils/errorMessage';
import { COLORS } from '../../src/config/colors';

const API_URL = ENV.API_URL;
const APP_VARIANT = Constants.expoConfig?.extra?.APP_VARIANT || 'driver';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email || !newPassword) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Erro', 'Senha deve ter no mínimo 6 caracteres');
      return;
    }

    const endpoint = APP_VARIANT === 'passenger'
      ? '/api/auth/passenger/set-password'
      : '/api/auth/driver/set-password';

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: newPassword })
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Sucesso', 'Senha redefinida! Faça login com a nova senha.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Erro', data.error || 'Erro ao redefinir senha');
      }
    } catch (error) {
      Alert.alert('Erro', friendlyError(error, 'Não foi possível redefinir a senha'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Header */}
        <View style={styles.headerArea}>
          <View style={styles.iconRing}>
            <Ionicons name="key-outline" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Recuperar Senha</Text>
          <Text style={styles.subtitle}>Digite seu email e a nova senha</Text>
        </View>

        {/* Form */}
        <Input placeholder="Email" value={email} onChangeText={setEmail} icon="mail-outline" keyboardType="email-address" />
        <Input placeholder="Nova senha (mín. 6 caracteres)" value={newPassword} onChangeText={setNewPassword} icon="lock-closed-outline" secureTextEntry />

        <Button title="Redefinir Senha" onPress={handleReset} loading={loading} />

        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={16} color={COLORS.textSecondary} />
          <Text style={styles.backText}>Voltar para Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  headerArea: { alignItems: 'center', marginBottom: 36 },
  iconRing: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, borderColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, padding: 12 },
  backText: { color: COLORS.textSecondary, fontSize: 14, marginLeft: 6 },
});
