import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { authStore } from '../../src/auth/auth.store';
import { ENV } from '../../src/config/env';
import { COLORS } from '../../src/config/colors';

const API_URL = ENV.API_URL;

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Dados do formulário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [documentCpf, setDocumentCpf] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  // Dados do veículo
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  
  // Bônus familiar
  const [familyBonusAccepted, setFamilyBonusAccepted] = useState(false);
  
  // Território
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<any>(null);
  const [detectedNeighborhood, setDetectedNeighborhood] = useState<any>(null);
  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<any>(null);

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
    
    // Validar CPF
    const cpfClean = documentCpf.replace(/\D/g, '');
    if (!cpfClean || cpfClean.length !== 11) {
      Alert.alert('Erro', 'CPF deve ter 11 dígitos');
      return;
    }
    
    // Validar termos
    if (!acceptedTerms) {
      Alert.alert('Erro', 'Você deve aceitar os termos de uso e política de privacidade');
      return;
    }
    
    setStep(2);
  };

  // Passo 2: Dados do veículo
  const handleStep2 = () => {
    if (!vehicleColor) {
      Alert.alert('Erro', 'Informe a cor do veículo');
      return;
    }
    setStep(3);
  };

  // Passo 2: Solicitar localização
  useEffect(() => {
    if (step === 3) {
      requestLocation();
    }
  }, [step]);

  const requestLocation = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Localização Obrigatória',
          'O KAVIAR usa sua localização para definir seu território de atuação. Sem ela, não é possível concluir o cadastro.\n\nVá em Configurações > Kaviar > Localização e permita o acesso.',
          [
            { text: 'Tentar Novamente', onPress: requestLocation },
            { text: 'Voltar', onPress: () => setStep(2), style: 'cancel' }
          ]
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
      const url = `${API_URL}/api/neighborhoods/smart-list?lat=${coords.lat}&lng=${coords.lng}`;
      console.log('[loadSmartNeighborhoods] URL:', url);
      console.log('[loadSmartNeighborhoods] Coords:', coords);
      
      const response = await fetch(url);
      console.log('[loadSmartNeighborhoods] Status:', response.status);
      
      const data = await response.json();
      console.log('[loadSmartNeighborhoods] Response:', JSON.stringify(data).substring(0, 200));
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      if (data.success) {
        // Detectado via GPS
        if (data.detected) {
          console.log('[loadSmartNeighborhoods] Detected:', data.detected.name);
          setDetectedNeighborhood(data.detected);
          setSelectedNeighborhood(data.detected);
          
          // Carregar comunidades do bairro detectado
          await loadCommunitiesForNeighborhood(data.detected.id);
        }
        
        // Usar nearby se existir, senão usar data
        const neighborhoodList = (data.nearby && data.nearby.length > 0) ? data.nearby : (data.data || []);
        console.log('[loadSmartNeighborhoods] Neighborhoods count:', neighborhoodList.length);
        setNeighborhoods(neighborhoodList);
      } else {
        throw new Error(data.error || 'Resposta sem success');
      }
    } catch (error) {
      console.error('[loadSmartNeighborhoods] Erro:', error);
      // Fallback: tentar carregar lista completa
      await loadNeighborhoods();
    }
  };

  const loadCommunitiesForNeighborhood = async (neighborhoodId: string) => {
    try {
      const url = `${API_URL}/api/communities?neighborhoodId=${neighborhoodId}`;
      console.log('[loadCommunities] URL:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success && data.data) {
        console.log('[loadCommunities] Communities count:', data.data.length);
        setCommunities(data.data);
      } else {
        setCommunities([]);
      }
    } catch (error) {
      console.error('[loadCommunities] Erro:', error);
      setCommunities([]);
    }
  };

  const loadNeighborhoods = async () => {
    try {
      const url = `${API_URL}/api/neighborhoods/smart-list`;
      console.log('[loadNeighborhoods] URL:', url);
      
      const response = await fetch(url);
      console.log('[loadNeighborhoods] Status:', response.status);
      
      const data = await response.json();
      console.log('[loadNeighborhoods] Response:', JSON.stringify(data).substring(0, 200));
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      if (data.success && data.data) {
        console.log('[loadNeighborhoods] Neighborhoods count:', data.data.length);
        setNeighborhoods(data.data);
      } else {
        throw new Error(data.error || 'Resposta sem data');
      }
    } catch (error) {
      console.error('[loadNeighborhoods] Erro:', error);
      // Sem bairros carregados, mas GPS já garante território via geo-resolve
      setNeighborhoods([]);
    }
  };

  const handleRegister = async () => {
    // GPS obrigatório
    if (!location) {
      Alert.alert(
        'Localização Obrigatória',
        'Precisamos da sua localização para definir seu território. Toque em "Tentar Novamente" para ativar o GPS.',
        [
          { text: 'Tentar Novamente', onPress: requestLocation },
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
        password,
        document_cpf: documentCpf.replace(/\D/g, ''), // Remove formatação
        accepted_terms: true,
        vehicle_color: vehicleColor,
        vehicle_model: vehicleModel || null,
        vehicle_plate: vehiclePlate || null,
        familyBonusAccepted: familyBonusAccepted,
        familyProfile: familyBonusAccepted ? 'familiar' : 'individual',
      };

      // ✅ KAVIAR: Só envia neighborhoodId se existir (backend resolve via geo-resolve)
      if (selectedNeighborhood) {
        registerPayload.neighborhoodId = selectedNeighborhood.id;
      }

      // ✅ KAVIAR: Só envia communityId se existir
      if (selectedCommunity) {
        registerPayload.communityId = selectedCommunity.id;
      }

      // GPS é obrigatório neste ponto (validado em handleRegister)
      registerPayload.lat = location!.lat;
      registerPayload.lng = location!.lng;
      registerPayload.verificationMethod = 'GPS_AUTO';

      console.log('[performRegister] Payload:', JSON.stringify(registerPayload, null, 2));

      // ✅ Endpoint público (sem token)
      const registerResponse = await fetch(`${API_URL}/api/auth/driver/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerPayload),
      });

      const registerJson = await registerResponse.json();
      console.log('[performRegister] Response:', registerJson);

      if (!registerResponse.ok || !registerJson?.success) {
        Alert.alert('Erro', registerJson?.error || 'Falha no cadastro');
        return;
      }

      // ✅ Auto-login com token retornado
      await authStore.setAuth(registerJson.token, registerJson.user);

      // Mensagem de sucesso
      const territoryMsg = selectedNeighborhood
        ? `Seu território: ${selectedNeighborhood.name}\nTipo: ${selectedNeighborhood.hasGeofence ? 'Oficial (taxa mín. 7%)' : 'Virtual 800m (taxa mín. 12%)'}`
        : 'Território pode ser definido depois';

      Alert.alert(
        'Cadastro Realizado!',
        `${territoryMsg}\n\nAgora envie seus documentos para aprovação.`,
        [
          {
            text: 'Enviar Documentos',
            onPress: () => router.replace('/(driver)/documents')
          }
        ]
      );
    } catch (error) {
      console.error('[performRegister] Erro:', error);
      Alert.alert('Erro', 'Não foi possível completar o cadastro');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.accent} />
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
          <Text style={styles.subtitle}>Passo {step} de 3</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
          </View>
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

            <Text style={styles.label}>CPF</Text>
            <TextInput
              style={styles.input}
              value={documentCpf}
              onChangeText={setDocumentCpf}
              placeholder="000.000.000-00"
              keyboardType="number-pad"
              maxLength={14}
            />

            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
            />

            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}
                onPress={() => setAcceptedTerms(!acceptedTerms)}
              >
                {acceptedTerms && <Ionicons name="checkmark" size={18} color="#FFF" />}
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>
                Aceito os termos de uso e política de privacidade
              </Text>
            </View>

            <TouchableOpacity style={styles.button} onPress={handleStep1}>
              <Text style={styles.buttonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Passo 2: Dados do Veículo */}
        {step === 2 && (
          <View style={styles.form}>
            <Text style={styles.label}>Cor do Veículo *</Text>
            <TextInput
              style={styles.input}
              value={vehicleColor}
              onChangeText={setVehicleColor}
              placeholder="Ex: Branco, Preto, Prata"
              autoCapitalize="words"
            />

            <Text style={styles.label}>Modelo do Veículo (opcional)</Text>
            <TextInput
              style={styles.input}
              value={vehicleModel}
              onChangeText={setVehicleModel}
              placeholder="Ex: Gol, Uno, HB20"
              autoCapitalize="words"
            />

            <Text style={styles.label}>Placa do Veículo (opcional)</Text>
            <TextInput
              style={styles.input}
              value={vehiclePlate}
              onChangeText={setVehiclePlate}
              placeholder="Ex: ABC-1234"
              autoCapitalize="characters"
              maxLength={8}
            />

            <View style={styles.bonusSection}>
              <Text style={styles.bonusTitle}>Bônus Familiar</Text>
              <Text style={styles.bonusDescription}>
                Compartilhe ganhos com sua família (50% para você, 50% para indicado)
              </Text>
              
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setFamilyBonusAccepted(!familyBonusAccepted)}
              >
                <View style={[styles.checkbox, familyBonusAccepted && styles.checkboxChecked]}>
                  {familyBonusAccepted && <Ionicons name="checkmark" size={18} color="#FFF" />}
                </View>
                <Text style={styles.checkboxLabel}>
                  Quero participar do programa de bônus familiar
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setStep(1)}
              >
                <Text style={styles.buttonSecondaryText}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleStep2}
              >
                <Text style={styles.buttonText}>Continuar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Passo 3: Território */}
        {step === 3 && (
          <View style={styles.form}>
            {detectedNeighborhood && (
              <View style={styles.detectedBox}>
                <Ionicons name="location" size={24} color={COLORS.accent} />
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
                  onPress={() => {
                    setSelectedNeighborhood(n);
                    loadCommunitiesForNeighborhood(n.id);
                  }}
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

            {/* Comunidade (opcional) */}
            {communities.length > 0 && (
              <>
                <Text style={styles.label}>Comunidade (opcional):</Text>
                <ScrollView style={styles.communityList}>
                  <TouchableOpacity
                    style={[
                      styles.communityItem,
                      !selectedCommunity && styles.communityItemSelected,
                    ]}
                    onPress={() => setSelectedCommunity(null)}
                  >
                    <Text style={styles.communityName}>Nenhuma</Text>
                  </TouchableOpacity>
                  {communities.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.communityItem,
                        selectedCommunity?.id === c.id && styles.communityItemSelected,
                      ]}
                      onPress={() => setSelectedCommunity(c)}
                    >
                      <Text style={styles.communityName}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => setStep(2)}
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
    color: COLORS.textSecondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
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
    backgroundColor: COLORS.accent,
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
    borderColor: COLORS.accent,
  },
  buttonPrimary: {
    flex: 1,
  },
  buttonSecondaryText: {
    color: COLORS.accent,
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
    borderColor: COLORS.accent,
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
    color: COLORS.accent,
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
    borderColor: COLORS.accent,
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
    color: COLORS.accent,
  },
  neighborhoodType: {
    fontSize: 11,
    color: '#666',
  },
  bonusSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFF5F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0D6',
  },
  bonusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  bonusDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: COLORS.accent,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  communityList: {
    maxHeight: 200,
    marginTop: 12,
    marginBottom: 16,
  },
  communityItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    marginBottom: 8,
    backgroundColor: '#FFF',
  },
  communityItemSelected: {
    borderColor: COLORS.accent,
    borderWidth: 2,
    backgroundColor: '#FFF5F0',
  },
  communityName: {
    fontSize: 14,
    color: '#333',
  },
});
