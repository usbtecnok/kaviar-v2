import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { authStore } from '../../src/auth/auth.store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Dados do formulário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // Território
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<any>(null);
  const [detectedNeighborhood, setDetectedNeighborhood] = useState<any>(null);

  // Passo 1: Dados básicos
  const handleStep1 = () => {
    if (!name || !email || !phone || !password) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Erro', 'Senha deve ter pelo menos 6 caracteres');
      return;
    }
    setStep(2);
  };

  // Passo 2: Solicitar localização
  useEffect(() => {
    if (step === 2) {
      requestLocation();
    }
  }, [step]);

  const requestLocation = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Localização Negada',
          'Você pode escolher seu bairro manualmente',
          [{ text: 'OK', onPress: loadNeighborhoods }]
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const coords = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      };
      setLocation(coords);
      
      // Buscar bairros com detecção automática
      await loadSmartNeighborhoods(coords);
    } catch (error) {
      console.error('Erro ao obter localização:', error);
      Alert.alert('Erro', 'Não foi possível obter sua localização');
      loadNeighborhoods();
    } finally {
      setLoading(false);
    }
  };

  const loadSmartNeighborhoods = async (coords: { lat: number; lng: number }) => {
    try {
      const response = await fetch(
        `${API_URL}/api/neighborhoods/smart-list?lat=${coords.lat}&lng=${coords.lng}`
      );
      const data = await response.json();
      
      if (data.success) {
        if (data.detected) {
          setDetectedNeighborhood(data.detected);
          setSelectedNeighborhood(data.detected);
        }
        setNeighborhoods(data.nearby.length > 0 ? data.nearby : data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar bairros:', error);
      // Fallback: tentar carregar lista completa
      await loadNeighborhoods();
    }
  };

  const loadNeighborhoods = async () => {
    try {
      const response = await fetch(`${API_URL}/api/neighborhoods/smart-list`);
      const data = await response.json();
      if (data.success) {
        setNeighborhoods(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar bairros:', error);
      // Fallback final: permitir continuar sem bairros
      Alert.alert(
        'Aviso',
        'Não consegui carregar bairros agora. Você pode continuar sem escolher bairro e definir depois.',
        [{ text: 'OK' }]
      );
      setNeighborhoods([]);
    }
  };

  const handleRegister = async () => {
    // ✅ KAVIAR: Território é opcional, não bloqueia cadastro
    if (!selectedNeighborhood && neighborhoods.length > 0) {
      Alert.alert(
        'Aviso',
        'Você não selecionou um bairro. Deseja continuar mesmo assim? O território pode ser definido depois.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => performRegister() }
        ]
      );
      return;
    }

    await performRegister();
  };

  const performRegister = async () => {
    try {
      setLoading(true);

      // ✅ KAVIAR: Usar endpoint público /api/auth/driver/register
      const registerPayload: any = {
        name,
        email,
        phone,
        password, // ✅ Agora envia password no endpoint correto
      };

      // ✅ KAVIAR: Só envia neighborhoodId se existir
      if (selectedNeighborhood) {
        registerPayload.neighborhoodId = selectedNeighborhood.id;
      }

      // ✅ KAVIAR: Só envia localização se existir
      if (location) {
        registerPayload.lat = location.lat;
        registerPayload.lng = location.lng;
        registerPayload.verificationMethod = 'GPS_AUTO';
      } else if (selectedNeighborhood) {
        registerPayload.verificationMethod = 'MANUAL_SELECTION';
      }

      // ✅ Endpoint público (sem token)
      const registerResponse = await fetch(`${API_URL}/api/auth/driver/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerPayload),
      });

      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        Alert.alert('Erro', registerData.error || 'Erro ao cadastrar');
        setLoading(false);
        return;
      }

      // ✅ Endpoint já retorna token (auto-login)
      await authStore.setAuth(registerData.token, registerData.user);

      // Mensagem de sucesso
      const territoryMsg = selectedNeighborhood
        ? `Seu território: ${selectedNeighborhood.name}\nTipo: ${selectedNeighborhood.hasGeofence ? 'Oficial (taxa mín. 7%)' : 'Virtual 800m (taxa mín. 12%)'}`
        : 'Território pode ser definido depois';

      Alert.alert(
        'Cadastro Realizado!',
        `${territoryMsg}\n\nAguarde aprovação do admin.`,
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(driver)/online')
          }
        ]
      );
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      Alert.alert('Erro', 'Não foi possível completar o cadastro');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Cadastro de Motorista</Text>
          <Text style={styles.subtitle}>Passo {step} de 2</Text>
        </View>

        {/* Passo 1: Dados Básicos */}
        {step === 1 && (
          <View style={styles.form}>
            <Text style={styles.label}>Nome Completo</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="João Silva"
              autoCapitalize="words"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="joao@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Telefone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+5521999999999"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
            />

            <TouchableOpacity style={styles.button} onPress={handleStep1}>
              <Text style={styles.buttonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Passo 2: Território */}
        {step === 2 && (
          <View style={styles.form}>
            {detectedNeighborhood && (
              <View style={styles.detectedBox}>
                <Ionicons name="location" size={24} color="#FF6B35" />
                <View style={styles.detectedInfo}>
                  <Text style={styles.detectedTitle}>Bairro Detectado</Text>
                  <Text style={styles.detectedName}>{detectedNeighborhood.name}</Text>
                  <Text style={styles.detectedType}>
                    {detectedNeighborhood.hasGeofence 
                      ? '✅ Mapa Oficial - Taxa mín. 7%' 
                      : '⚠️ Virtual 800m - Taxa mín. 12%'}
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.label}>
              {detectedNeighborhood ? 'Ou escolha outro bairro:' : 'Escolha seu bairro:'}
            </Text>

            <ScrollView style={styles.neighborhoodList}>
              {neighborhoods.map((n) => (
                <TouchableOpacity
                  key={n.id}
                  style={[
                    styles.neighborhoodItem,
                    selectedNeighborhood?.id === n.id && styles.neighborhoodItemSelected,
                  ]}
                  onPress={() => setSelectedNeighborhood(n)}
                >
                  <View style={styles.neighborhoodInfo}>
                    <Text style={styles.neighborhoodName}>{n.name}</Text>
                    {n.zone && <Text style={styles.neighborhoodZone}>{n.zone}</Text>}
                    {n.distance && (
                      <Text style={styles.neighborhoodDistance}>
                        📍 {(n.distance / 1000).toFixed(1)}km
                      </Text>
                    )}
                  </View>
                  <View style={styles.neighborhoodBadge}>
                    <Text style={styles.neighborhoodFee}>
                      {n.hasGeofence ? '7%' : '12%'}
                    </Text>
                    <Text style={styles.neighborhoodType}>
                      {n.hasGeofence ? 'Oficial' : 'Virtual'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setStep(1)}
              >
                <Text style={styles.buttonSecondaryText}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleRegister}
              >
                <Text style={styles.buttonText}>Cadastrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  button: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  buttonPrimary: {
    flex: 1,
  },
  buttonSecondaryText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detectedBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  detectedInfo: {
    marginLeft: 12,
    flex: 1,
  },
  detectedTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detectedName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  detectedType: {
    fontSize: 14,
    color: '#FF6B35',
  },
  neighborhoodList: {
    maxHeight: 300,
    marginTop: 12,
  },
  neighborhoodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    marginBottom: 8,
    backgroundColor: '#FFF',
  },
  neighborhoodItemSelected: {
    borderColor: '#FF6B35',
    borderWidth: 2,
    backgroundColor: '#FFF5F0',
  },
  neighborhoodInfo: {
    flex: 1,
  },
  neighborhoodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  neighborhoodZone: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  neighborhoodDistance: {
    fontSize: 12,
    color: '#999',
  },
  neighborhoodBadge: {
    alignItems: 'flex-end',
  },
  neighborhoodFee: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  neighborhoodType: {
    fontSize: 11,
    color: '#666',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});
