import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../src/api/client';
import { authStore } from '../../src/auth/auth.store';
import { friendlyError } from '../../src/utils/errorMessage';
import { COLORS } from '../../src/config/colors';

type Step = 'choose' | 'consultant' | 'free' | 'signup' | 'signup_sent' | 'sent';

const WA_CONSULTOR = 'https://wa.me/5521968648777?text=Quero%20ser%20Consultor%20KAVIAR%20para%20indicar%20motoristas';

export default function ReferDriver() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('choose');

  // Consultant flow
  const [code, setCode] = useState('');
  const [agent, setAgent] = useState<{ id: string; name: string; referral_code: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Referral form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const verifyCode = async () => {
    if (!code.trim()) { setVerifyError('Digite seu código de consultor'); return; }
    setVerifyError('');
    setVerifying(true);
    try {
      const { data } = await apiClient.get(`/api/public/referral-agent/${code.trim().toUpperCase()}`);
      if (data.success && data.data) {
        setAgent(data.data);
      } else {
        setVerifyError('Código não encontrado. Verifique e tente novamente.');
      }
    } catch {
      setVerifyError('Código não encontrado. Verifique e tente novamente.');
    } finally { setVerifying(false); }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) { setError('Preencha nome e telefone'); return; }
    setError('');
    setLoading(true);
    try {
      const user = authStore.getUser();
      const isConsultant = step === 'consultant' && agent;
      const notes = isConsultant
        ? `Indicado via Consultor: ${agent!.name} (código: ${agent!.referral_code}) | Passageiro: ${user?.name || 'N/A'} (${user?.phone || user?.id || 'N/A'})${neighborhood ? ` | Bairro: ${neighborhood}` : ''}`
        : `Indicação voluntária por: ${user?.name || 'N/A'} (${user?.phone || user?.id || 'N/A'})${neighborhood ? ` | Bairro: ${neighborhood}` : ''}`;
      await apiClient.post('/api/public/consultant-lead', {
        name: name.trim(),
        phone: phone.trim(),
        source: isConsultant ? 'app-consultant-referral' : 'app-voluntary-referral',
        notes,
      });
      setStep('sent');
    } catch (e: any) {
      if (e.response?.status === 409) setError('Este contato já foi indicado.');
      else setError(friendlyError(e, 'Não foi possível enviar a indicação.'));
    } finally { setLoading(false); }
  };

  const handleSignup = async () => {
    if (!name.trim() || !phone.trim()) { setError('Preencha nome e telefone'); return; }
    setError('');
    setLoading(true);
    try {
      const notes = neighborhood ? `Bairro: ${neighborhood}` : undefined;
      await apiClient.post('/api/public/consultant-lead', {
        name: name.trim(),
        phone: phone.trim(),
        source: 'app-consultant-signup',
        notes,
      });
      setStep('signup_sent');
    } catch (e: any) {
      if (e.response?.status === 409) setError('Você já está cadastrado como interessado.');
      else setError(friendlyError(e, 'Não foi possível enviar.'));
    } finally { setLoading(false); }
  };

  const header = (
    <View style={s.header}>
      <TouchableOpacity onPress={() => step === 'choose' ? router.back() : setStep('choose')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>
      <Text style={s.title}>Indique um motorista</Text>
      <View style={{ width: 24 }} />
    </View>
  );

  // ── SENT ──
  if (step === 'sent') {
    const isConsultant = !!agent;
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
          <Text style={s.successTitle}>Indicação enviada!</Text>
          <Text style={s.successText}>A equipe KAVIAR entrará em contato com a pessoa indicada.</Text>
          {isConsultant ? (
            <Text style={s.successHint}>Quando o motorista for aprovado, adquirir créditos e concluir a primeira corrida, a recompensa será processada conforme as regras do programa de consultores.</Text>
          ) : (
            <Text style={s.successHint}>Obrigado por ajudar o KAVIAR a crescer na sua região!</Text>
          )}
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── SIGNUP SENT ──
  if (step === 'signup_sent') {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
          <Text style={s.successTitle}>Interesse registrado!</Text>
          <Text style={s.successText}>Recebemos seu interesse. Nossa equipe KAVIAR vai entrar em contato.</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>Voltar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.waBtn} onPress={() => Linking.openURL(WA_CONSULTOR)}>
            <Text style={s.waBtnText}>Falar agora no WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── CHOOSE ──
  if (step === 'choose') {
    return (
      <SafeAreaView style={s.container}>
        <ScrollView contentContainerStyle={s.scroll}>
          {header}
          <View style={s.heroArea}>
            <Ionicons name="people-outline" size={40} color={COLORS.primary} />
            <Text style={s.heroTitle}>Indique um motorista para a KAVIAR</Text>
            <Text style={s.heroText}>Consultores KAVIAR cadastrados podem receber recompensa por indicações aprovadas. Escolha como deseja indicar:</Text>
          </View>

          <TouchableOpacity style={s.optionCard} onPress={() => setStep('consultant')} activeOpacity={0.7}>
            <View style={s.optionIcon}><Ionicons name="shield-checkmark" size={24} color={COLORS.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.optionTitle}>Já sou consultor</Text>
              <Text style={s.optionSub}>Tenho código de consultor e quero indicar com recompensa.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={s.optionCard} onPress={() => setStep('signup')} activeOpacity={0.7}>
            <View style={s.optionIcon}><Ionicons name="star-outline" size={24} color={COLORS.accent} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.optionTitle}>Quero ser consultor</Text>
              <Text style={s.optionSub}>Cadastre-se como Consultor KAVIAR e ganhe com indicações.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={s.optionCard} onPress={() => setStep('free')} activeOpacity={0.7}>
            <View style={s.optionIcon}><Ionicons name="heart-outline" size={24} color={COLORS.success} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.optionTitle}>Indicar sem recompensa</Text>
              <Text style={s.optionSub}>Ajude o KAVIAR a crescer na sua região de forma voluntária.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── SIGNUP: formulário para quem quer ser consultor ──
  if (step === 'signup') {
    return (
      <SafeAreaView style={s.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            {header}
            <View style={s.heroArea}>
              <Ionicons name="star-outline" size={36} color={COLORS.accent} />
              <Text style={s.heroTitle}>Quero ser Consultor KAVIAR</Text>
              <Text style={s.heroText}>Preencha seus dados e nossa equipe entrará em contato para cadastrar você como consultor.</Text>
            </View>
            <View style={s.form}>
              <Text style={s.label}>Seu nome *</Text>
              <TextInput style={s.input} placeholder="Nome completo" placeholderTextColor={COLORS.textMuted} value={name} onChangeText={setName} />
              <Text style={s.label}>Seu telefone / WhatsApp *</Text>
              <TextInput style={s.input} placeholder="(00) 00000-0000" placeholderTextColor={COLORS.textMuted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <Text style={s.label}>Bairro / Região</Text>
              <TextInput style={s.input} placeholder="Opcional" placeholderTextColor={COLORS.textMuted} value={neighborhood} onChangeText={setNeighborhood} />
              {error ? <Text style={s.error}>{error}</Text> : null}
              <TouchableOpacity style={s.submitBtn} onPress={handleSignup} disabled={loading}>
                {loading ? <ActivityIndicator color={COLORS.textDark} /> : <Text style={s.submitText}>Enviar interesse</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── CONSULTANT: verify code first ──
  const showForm = step === 'free' || (step === 'consultant' && agent);

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {header}

          {step === 'consultant' && !agent && (
            <>
              <View style={s.heroArea}>
                <Ionicons name="shield-checkmark" size={36} color={COLORS.primary} />
                <Text style={s.heroTitle}>Validar código de consultor</Text>
                <Text style={s.heroText}>Digite o código que você recebeu ao se cadastrar como Consultor KAVIAR.</Text>
              </View>
              <Text style={s.label}>Código do consultor *</Text>
              <TextInput style={s.input} placeholder="Ex: KAVIAR-ABC123" placeholderTextColor={COLORS.textMuted} value={code} onChangeText={setCode} autoCapitalize="characters" />
              {verifyError ? <Text style={s.error}>{verifyError}</Text> : null}
              <TouchableOpacity style={s.submitBtn} onPress={verifyCode} disabled={verifying}>
                {verifying ? <ActivityIndicator color={COLORS.textDark} /> : <Text style={s.submitText}>Validar código</Text>}
              </TouchableOpacity>
            </>
          )}

          {step === 'consultant' && agent && (
            <View style={s.agentBadge}>
              <Ionicons name="shield-checkmark" size={18} color={COLORS.success} />
              <Text style={s.agentText}>Consultor: {agent.name} ({agent.referral_code})</Text>
            </View>
          )}

          {showForm && (
            <>
              {step === 'free' && (
                <View style={s.infoBanner}>
                  <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
                  <Text style={s.infoText}>Esta indicação é voluntária e não gera recompensa automática.</Text>
                </View>
              )}

              <View style={s.form}>
                <Text style={s.label}>Nome do indicado *</Text>
                <TextInput style={s.input} placeholder="Nome completo" placeholderTextColor={COLORS.textMuted} value={name} onChangeText={setName} />

                <Text style={s.label}>Telefone / WhatsApp *</Text>
                <TextInput style={s.input} placeholder="(00) 00000-0000" placeholderTextColor={COLORS.textMuted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

                <Text style={s.label}>Bairro / Região</Text>
                <TextInput style={s.input} placeholder="Opcional" placeholderTextColor={COLORS.textMuted} value={neighborhood} onChangeText={setNeighborhood} />

                {error ? <Text style={s.error}>{error}</Text> : null}

                <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={loading}>
                  {loading ? <ActivityIndicator color={COLORS.textDark} /> : <Text style={s.submitText}>Indicar motorista</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  heroArea: { alignItems: 'center', marginBottom: 24 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', marginTop: 12, marginBottom: 8 },
  heroText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21 },
  // Option cards
  optionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  optionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  optionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  optionSub: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  // Agent badge
  agentBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0a2a0a', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#1a3a1a' },
  agentText: { fontSize: 13, fontWeight: '600', color: COLORS.success },
  // Info banner
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceLight, borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  infoText: { fontSize: 12, color: COLORS.textMuted, flex: 1, lineHeight: 17 },
  // Form
  form: { gap: 4 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, fontSize: 16, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  error: { color: COLORS.danger, fontSize: 13, marginTop: 8 },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  submitText: { fontSize: 16, fontWeight: '800', color: COLORS.textDark },
  // Success
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginTop: 16 },
  successText: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  successHint: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 20 },
  backBtn: { backgroundColor: COLORS.surface, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, marginTop: 24, borderWidth: 1, borderColor: COLORS.border },
  backBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  waBtn: { marginTop: 12 },
  waBtnText: { fontSize: 14, fontWeight: '600', color: '#25D366' },
});
