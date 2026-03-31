import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView, Modal } from 'react-native';
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

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
    if (!acceptedTerms) {
      Alert.alert('Termos obrigatórios', 'Leia e aceite os termos de uso e política de privacidade.');
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
      Alert.alert('Cadastro realizado!', 'Bem-vindo ao Kaviar!', [
        { text: 'Continuar', onPress: () => router.replace('/(passenger)/map') },
      ]);
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

      <View style={styles.checkboxRow}>
        <TouchableOpacity
          style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}
          onPress={() => setAcceptedTerms(!acceptedTerms)}
        >
          {acceptedTerms && <Ionicons name="checkmark" size={18} color="#FFF" />}
        </TouchableOpacity>
        <Text style={styles.checkboxLabel}>
          Aceito os{' '}
          <Text style={{ color: COLORS.primary, textDecorationLine: 'underline' }} onPress={() => setShowTermsModal(true)}>
            termos de uso e política de privacidade
          </Text>
        </Text>
      </View>

      <Button
        title="Cadastrar"
        onPress={handleRegister}
        loading={loading}
        disabled={!location || !acceptedTerms}
        style={styles.registerBtn}
      />

      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>Já tem conta? Fazer login</Text>
      </TouchableOpacity>

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
            <Text style={styles.termsText}>
              Ao prosseguir com o cadastro e utilizar a plataforma KAVIAR, o passageiro declara que leu, compreendeu e concorda integralmente com os termos abaixo.
            </Text>
            <Text style={styles.termsText}>
              <Text style={styles.termsBold}>1. OBJETO DA PLATAFORMA</Text>{'\n'}
              A KAVIAR é uma plataforma tecnológica que conecta passageiros a motoristas independentes para prestação de serviços de transporte privado, não estabelecendo vínculo empregatício entre as partes.
            </Text>
            <Text style={styles.termsText}>
              <Text style={styles.termsBold}>2. OBRIGAÇÕES DO PASSAGEIRO</Text>{'\n'}
              O passageiro se compromete a fornecer informações verdadeiras, manter comportamento respeitoso com motoristas, utilizar a plataforma de boa-fé, não ceder sua conta a terceiros e responder civil e criminalmente por seus atos.
            </Text>
            <Text style={styles.termsText}>
              <Text style={styles.termsBold}>3. GEOLOCALIZAÇÃO</Text>{'\n'}
              Ao utilizar a KAVIAR, o passageiro autoriza expressamente a coleta de sua localização geográfica para correspondência de corridas e segurança operacional. Sem a localização ativa, o serviço poderá ser limitado ou indisponível.
            </Text>
            <Text style={styles.termsText}>
              <Text style={styles.termsBold}>4. PAGAMENTOS</Text>{'\n'}
              O valor da corrida é informado antes da confirmação. O passageiro é responsável pelo pagamento conforme modalidade acordada.
            </Text>
            <Text style={styles.termsText}>
              <Text style={styles.termsBold}>5. CANCELAMENTOS</Text>{'\n'}
              O passageiro pode cancelar corridas conforme as regras da plataforma. Cancelamentos recorrentes podem resultar em restrições temporárias.
            </Text>
            <Text style={styles.termsText}>
              <Text style={styles.termsBold}>6. SUSPENSÃO E CANCELAMENTO</Text>{'\n'}
              A KAVIAR poderá suspender ou encerrar o acesso do passageiro em caso de violação destes termos, reclamações recorrentes, suspeita de fraude ou atividades ilegais.
            </Text>
            <Text style={styles.termsText}>
              <Text style={styles.termsBold}>7. LIMITAÇÃO DE RESPONSABILIDADE</Text>{'\n'}
              A KAVIAR não garante disponibilidade de motoristas, não se responsabiliza por conflitos entre motorista e passageiro e atua como intermediadora tecnológica.
            </Text>
            <Text style={styles.termsText}>
              <Text style={styles.termsBold}>8. ALTERAÇÕES DOS TERMOS</Text>{'\n'}
              Estes termos podem ser atualizados a qualquer momento. O passageiro será notificado e deverá aceitar a nova versão para continuar utilizando a plataforma.
            </Text>
            <Text style={styles.termsText}>
              <Text style={styles.termsBold}>9. FORO</Text>{'\n'}
              Fica eleito o foro da comarca de domicílio da KAVIAR para dirimir quaisquer controvérsias.
            </Text>
            <View style={{ height: 1, backgroundColor: '#DDD', marginVertical: 16 }} />
            <Text style={styles.termsText}>
              <Text style={styles.termsBold}>POLÍTICA DE PRIVACIDADE (LGPD)</Text>{'\n'}
              A KAVIAR coleta e trata dados pessoais conforme a Lei Geral de Proteção de Dados (LGPD). Os dados coletados incluem: nome, endereço, telefone, e-mail, localização em tempo real e histórico de corridas. Estes dados são utilizados exclusivamente para operação da plataforma, segurança e cumprimento de obrigações legais. O passageiro pode solicitar acesso, correção ou exclusão de seus dados a qualquer momento através dos canais oficiais da KAVIAR.
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
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 4 },
  checkbox: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkboxLabel: { flex: 1, fontSize: 14, color: COLORS.textSecondary },
  termsText: { fontSize: 14, color: '#444', lineHeight: 22, marginBottom: 12 },
  termsBold: { fontWeight: 'bold', color: '#222' },
});
