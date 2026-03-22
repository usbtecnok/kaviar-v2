import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { authApi } from '../../src/api/auth.api';
import { authStore } from '../../src/auth/auth.store';
import { friendlyError } from '../../src/utils/errorMessage';
import { COLORS } from '../../src/config/colors';

export default function RegisterPassenger() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCaptureLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Localização necessária', 'Precisamos da sua localização para encontrar motoristas na sua região.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch {
      Alert.alert('Erro', 'Não foi possível obter sua localização. Tente novamente.');
    } finally {
      setLocating(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !phone || !password) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Erro', 'Senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (!location) {
      Alert.alert('Localização obrigatória', 'Capture sua localização antes de continuar.');
      return;
    }

    setLoading(true);
    try {
      const { token, user } = await authApi.register({
        name, email, phone, password,
        lat: location.lat,
        lng: location.lng,
        lgpdAccepted: true,
      });
      await authStore.setAuth(token, user);
      Alert.alert(
        'Cadastro realizado!',
        'Quer configurar seus locais frequentes (casa, trabalho)? Isso ajuda a encontrar motoristas mais próximos.',
        [
          { text: 'Configurar agora', onPress: () => router.replace('/(passenger)/favorites') },
          { text: 'Depois', style: 'cancel', onPress: () => router.replace('/(passenger)/map') },
        ]
      );
    } catch (e: any) {
      Alert.alert('Erro', friendlyError(e, 'Não foi possível completar o cadastro'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Cadastro de Passageiro</Text>

      <View style={styles.locationBox}>
        <Ionicons name="location" size={24} color={location ? COLORS.success : COLORS.textMuted} />
        <View style={styles.locationInfo}>
          <Text style={styles.locationLabel}>
            {location ? 'Localização capturada ✓' : 'Localização obrigatória'}
          </Text>
          <Text style={styles.locationHint}>
            {location
              ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
              : 'Usamos sua localização para encontrar motoristas próximos'}
          </Text>
        </View>
      </View>

      {!location && (
        <Button
          title={locating ? 'Capturando...' : 'Capturar localização'}
          onPress={handleCaptureLocation}
          loading={locating}
          style={styles.locationBtn}
        />
      )}

      <Input placeholder="Nome completo" value={name} onChangeText={setName} />
      <Input placeholder="Email" value={email} onChangeText={setEmail} />
      <Input placeholder="Telefone (com DDD)" value={phone} onChangeText={setPhone} />
      <Input placeholder="Senha (mín. 6 caracteres)" value={password} onChangeText={setPassword} secureTextEntry />

      <Button
        title="Cadastrar"
        onPress={handleRegister}
        loading={loading}
        disabled={!location}
        style={styles.registerBtn}
      />

      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>Já tem conta? Fazer login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, justifyContent: 'center', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 24, color: COLORS.textPrimary },
  locationBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  locationInfo: { flex: 1, marginLeft: 12 },
  locationLabel: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  locationHint: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  locationBtn: { marginBottom: 16 },
  registerBtn: { marginTop: 16 },
  backBtn: { marginTop: 20, alignItems: 'center', padding: 12 },
  backText: { color: COLORS.primary, fontSize: 14 },
});
