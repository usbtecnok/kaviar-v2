import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal, SafeAreaView } from 'react-native';
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
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  // Dados do veículo
  const [vehicleColor, setVehicleColor] = useState('');
  const [referralCode, setReferralCode] = useState('');
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
  const [neighborhoodSearch, setNeighborhoodSearch] = useState('');
  const [manualNeighborhood, setManualNeighborhood] = useState('');
  const [neighborhoodsLoadFailed, setNeighborhoodsLoadFailed] = useState(false);

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
        
        // Usar nearby se existir, senão usar data (lista completa)
        const neighborhoodList = (data.nearby && data.nearby.length > 0) ? data.nearby : (data.data || []);
        console.log('[loadSmartNeighborhoods] Neighborhoods count:', neighborhoodList.length);
        setNeighborhoods(neighborhoodList);
        setNeighborhoodsLoadFailed(neighborhoodList.length === 0 && !data.detected);
      } else {
        throw new Error(data.error || 'Resposta sem success');
      }
    } catch (error) {
      console.error('[loadSmartNeighborhoods] Erro:', error);
      setNeighborhoodsLoadFailed(true);
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
        if (data.data.length === 0) setNeighborhoodsLoadFailed(true);
      } else {
        throw new Error(data.error || 'Resposta sem data');
      }
    } catch (error) {
      console.error('[loadNeighborhoods] Erro:', error);
      setNeighborhoodsLoadFailed(true);
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

    // Bairro: precisa ter selecionado da lista OU digitado manualmente
    if (!selectedNeighborhood && !manualNeighborhood.trim() && !detectedNeighborhood) {
      Alert.alert('Bairro Obrigatório', 'Selecione ou digite o nome do seu bairro para continuar.');
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

      // Código de indicação
      if (referralCode.trim()) {
        registerPayload.referral_code = referralCode.trim().toUpperCase();
        registerPayload.referral_source = 'manual_code';
      }

      // Fallback manual: enviar nome digitado para o backend resolver
      if (!selectedNeighborhood && manualNeighborhood.trim()) {
        registerPayload.neighborhoodName = manualNeighborhood.trim();
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
        'Dados Salvos!',
        'Agora envie seus documentos obrigatórios para completar o cadastro.',
        [
          {
            text: 'Enviar Documentos',
            onPress: () => router.replace('/(driver)/documents')
          }
        ],
        { cancelable: false }
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
                Aceito os{' '}
                <Text
                  style={{ color: COLORS.primary, textDecorationLine: 'underline' }}
                  onPress={() => setShowTermsModal(true)}
                >
                  termos de uso e política de privacidade
                </Text>
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
              <Text style={styles.bonusTitle}>Código de Indicação</Text>
              <Text style={styles.bonusDescription}>
                Se alguém te indicou, informe o código aqui (opcional)
              </Text>
              <TextInput
                style={styles.input}
                value={referralCode}
                onChangeText={setReferralCode}
                placeholder="Ex: MARI7K2P"
                autoCapitalize="characters"
                maxLength={8}
              />
            </View>

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

            {/* Campo de busca/filtro */}
            <TextInput
              style={styles.input}
              value={neighborhoodSearch}
              onChangeText={setNeighborhoodSearch}
              placeholder="Buscar bairro pelo nome..."
              autoCapitalize="none"
            />

            {neighborhoods.length > 0 ? (
              <ScrollView style={styles.neighborhoodList}>
                {neighborhoods
                  .filter((n) =>
                    !neighborhoodSearch ||
                    n.name.toLowerCase().includes(neighborhoodSearch.toLowerCase())
                  )
                  .map((n) => (
                  <TouchableOpacity
                    key={n.id}
                    style={[
                      styles.neighborhoodItem,
                      selectedNeighborhood?.id === n.id && styles.neighborhoodItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedNeighborhood(n);
                      setManualNeighborhood('');
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
            ) : (
              <View style={styles.manualFallback}>
                <Text style={styles.manualFallbackText}>
                  Não foi possível carregar a lista de bairros.
                </Text>
                <Text style={styles.label}>Digite o nome do seu bairro:</Text>
                <TextInput
                  style={styles.input}
                  value={manualNeighborhood}
                  onChangeText={(text) => {
                    setManualNeighborhood(text);
                    setSelectedNeighborhood(null);
                  }}
                  placeholder="Ex: Copacabana, Botafogo, Tijuca..."
                  autoCapitalize="words"
                />
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => location ? loadSmartNeighborhoods(location) : loadNeighborhoods()}
                >
                  <Text style={styles.retryButtonText}>Tentar carregar lista novamente</Text>
                </TouchableOpacity>
              </View>
            )}

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

      {/* Modal de Termos de Uso */}
      <Modal visible={showTermsModal} animationType="slide" onRequestClose={() => setShowTermsModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#FFF' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#DDD' }}>
            <TouchableOpacity onPress={() => setShowTermsModal(false)} style={{ padding: 4, marginRight: 12 }}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333', flex: 1 }}>Termos de Uso</Text>
          </View>
          <ScrollView style={{ flex: 1, padding: 20 }}>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>
              Versão: 2026-01 | Última atualização: Janeiro de 2026
            </Text>
            <Text style={{ fontSize: 11, color: '#999', marginBottom: 20 }}>
              KAVIAR é uma plataforma operada por USB Tecnok Manutenção e Instalação de Computadores Ltda.
            </Text>
            <Text style={styles.termsText}>
              Ao prosseguir com o cadastro e utilizar a plataforma KAVIAR, o motorista declara que leu, compreendeu e concorda integralmente com os termos abaixo.
            </Text>
            <Text style={styles.termsText}>
              <Text style={styles.termsBold}>1. OBJETO DA PLATAFORMA</Text>{'\n'}
              A KAVIAR é uma plataforma tecnológica que conecta passageiros a motoristas independentes para prestação de serviços de transporte privado, não estabelecendo vínculo empregatício entre as partes.
            </Text>
            <Text style={styles.termsText}>
              <Text style={styles.termsBold}>2. REQUISITOS PARA MOTORISTAS</Text>{'\n'}
              Para utilizar a plataforma como motorista, o usuário declara que possui capacidade civil plena, é legalmente habilitado para dirigir, possui documentação válida exigida por lei e fornece informações verdadeiras, completas e atualizadas.
            </Text>
            <Text style={styles.termsText}>
              <Text style={styles.termsBold}>3. OBRIGAÇÕES DO MOTORISTA</Text>{'\n'}
              O motorista se compromete a manter comportamento respeitoso com passageiros, cumprir as leis de trânsito e normas locais, não realizar atividades ilícitas, utilizar a plataforma de boa-fé, manter seus dados atualizados, não ceder sua conta a terceiros e responder civil e criminalmente por seus atos.
            </Text>
            <Text style={styles.termsText}>
              <Text style={styles.termsBold}>4. GEOLOCALIZAÇÃO</Text>{'\n'}
              Ao utilizar a KAVIAR, o motorista autoriza expressamente a coleta de sua localização geográfica em tempo real para correspondência de corridas, segurança operacional, auditoria e prevenção de fraudes. Sem a localização ativa, o serviço poderá ser limitado ou indisponível.
            </Text>
            <Text style={styles.termsText}>
              <Text style={styles.termsBold}>5. PAGAMENTOS E CHAVE PIX</Text>{'\n'}
              A KAVIAR poderá utilizar chave PIX informada para repasses financeiros. O motorista é responsável pela veracidade da chave informada. A KAVIAR não se responsabiliza por erros decorrentes de dados incorretos.
            </Text>
            <Text style={styles.termsText}>
              <Text style={styles.termsBold}>6. CERTIDÃO "NADA CONSTA"</Text>{'\n'}
              A KAVIAR poderá solicitar, a qualquer momento, certidões negativas criminais ("Nada Consta") e outros documentos de idoneidade. O envio poderá ser obrigatório para continuidade na plataforma.
            </Text>
            <Text style={styles.termsText}>
              <Text style={styles.termsBold}>7. SUSPENSÃO E CANCELAMENTO</Text>{'\n'}
              A KAVIAR poderá suspender ou encerrar o acesso do motorista, a qualquer tempo, em caso de violação destes termos, reclamações recorrentes, suspeita de fraude, atividades ilegais ou descumprimento de políticas internas.
            </Text>
            <Text style={styles.termsText}>
              <Text style={styles.termsBold}>8. LIMITAÇÃO DE RESPONSABILIDADE</Text>{'\n'}
              A KAVIAR não garante volume mínimo de corridas, não se responsabiliza por conflitos entre motorista e passageiro e atua como intermediadora tecnológica.
            </Text>
            <Text style={styles.termsText}>
              <Text style={styles.termsBold}>9. ALTERAÇÕES DOS TERMOS</Text>{'\n'}
              Estes termos podem ser atualizados a qualquer momento. O motorista será notificado e deverá aceitar a nova versão para continuar utilizando a plataforma.
            </Text>
            <Text style={styles.termsText}>
              <Text style={styles.termsBold}>10. FORO</Text>{'\n'}
              Fica eleito o foro da comarca de domicílio da KAVIAR, para dirimir quaisquer controvérsias decorrentes destes termos.
            </Text>
            <View style={{ height: 1, backgroundColor: '#DDD', marginVertical: 16 }} />
            <Text style={styles.termsText}>
              <Text style={styles.termsBold}>POLÍTICA DE PRIVACIDADE (LGPD)</Text>{'\n'}
              A KAVIAR coleta e trata dados pessoais conforme a Lei Geral de Proteção de Dados (LGPD). Os dados coletados incluem: nome, CPF, RG, CNH, endereço, telefone, e-mail, localização em tempo real, histórico de corridas e informações de pagamento. Estes dados são utilizados exclusivamente para operação da plataforma, segurança, auditoria e cumprimento de obrigações legais. O motorista pode solicitar acesso, correção ou exclusão de seus dados a qualquer momento através dos canais oficiais da KAVIAR.
            </Text>
            <View style={{ height: 20 }} />
          </ScrollView>
          <TouchableOpacity
            style={{ padding: 16, backgroundColor: COLORS.accent, alignItems: 'center', marginBottom: 20 }}
            onPress={() => setShowTermsModal(false)}
          >
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>Fechar e Voltar ao Cadastro</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
  manualFallback: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#FFF8F0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0C0',
  },
  manualFallbackText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  retryButton: {
    marginTop: 12,
    padding: 10,
    alignItems: 'center',
  },
  retryButtonText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
    marginBottom: 12,
  },
  termsBold: {
    fontWeight: 'bold',
  },
});
