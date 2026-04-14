import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, TextInput } from 'react-native';
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
const userType = APP_VARIANT === 'passenger' ? 'passenger' : 'driver';

type Channel = 'email' | 'whatsapp';
type Step = 'choose' | 'email_sent' | 'otp_input' | 'new_password' | 'done';

export default function ForgotPassword() {
  const router = useRouter();
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [step, setStep] = useState<Step>('choose');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCooldown = () => {
    setCooldown(60);
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // --- Email flow ---
  const handleEmailReset = async () => {
    if (!email) { Alert.alert('Erro', 'Preencha o email'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), userType }),
      });
      if (res.ok) setStep('email_sent');
      else { const d = await res.json(); Alert.alert('Erro', d.error || 'Erro ao solicitar redefinição'); }
    } catch (e) { Alert.alert('Erro', friendlyError(e, 'Não foi possível solicitar redefinição')); }
    finally { setLoading(false); }
  };

  // --- WhatsApp flow ---
  const normalizePhone = (p: string) => {
    const digits = p.replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`;
    if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
    return null;
  };

  const handleSendCode = async () => {
    const normalized = normalizePhone(phone);
    if (!normalized) { Alert.alert('Erro', 'Telefone inválido. Use DDD + número.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/phone/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized, userType, purpose: 'password_reset' }),
      });
      const d = await res.json();
      if (res.ok) { setStep('otp_input'); startCooldown(); }
      else Alert.alert('Erro', d.error || 'Erro ao enviar código');
    } catch (e) { Alert.alert('Erro', friendlyError(e, 'Não foi possível enviar código')); }
    finally { setLoading(false); }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) { Alert.alert('Erro', 'Digite o código de 6 dígitos'); return; }
    const normalized = normalizePhone(phone)!;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/phone/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized, code, purpose: 'password_reset' }),
      });
      const d = await res.json();
      if (res.ok && d.resetToken) { setResetToken(d.resetToken); setStep('new_password'); }
      else Alert.alert('Erro', d.error || 'Código inválido');
    } catch (e) { Alert.alert('Erro', friendlyError(e, 'Erro ao verificar código')); }
    finally { setLoading(false); }
  };

  const handleSetNewPassword = async () => {
    if (password.length < 6) { Alert.alert('Erro', 'Senha deve ter no mínimo 6 caracteres'); return; }
    if (password !== confirmPassword) { Alert.alert('Erro', 'As senhas não coincidem'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password }),
      });
      const d = await res.json();
      if (res.ok) setStep('done');
      else Alert.alert('Erro', d.error || 'Erro ao redefinir senha');
    } catch (e) { Alert.alert('Erro', friendlyError(e, 'Erro ao redefinir senha')); }
    finally { setLoading(false); }
  };

  const back = () => router.back();

  // --- Renders ---
  if (step === 'done') {
    return (
      <SafeAreaView style={s.container}><View style={s.inner}>
        <View style={s.headerArea}>
          <View style={s.iconRing}><Ionicons name="checkmark-circle-outline" size={32} color={COLORS.primary} /></View>
          <Text style={s.title}>Senha Redefinida</Text>
          <Text style={s.subtitle}>Sua senha foi alterada com sucesso. Faça login com a nova senha.</Text>
        </View>
        <Button title="Voltar para Login" onPress={back} />
      </View></SafeAreaView>
    );
  }

  if (step === 'email_sent') {
    return (
      <SafeAreaView style={s.container}><View style={s.inner}>
        <View style={s.headerArea}>
          <View style={s.iconRing}><Ionicons name="mail-outline" size={32} color={COLORS.primary} /></View>
          <Text style={s.title}>Email Enviado</Text>
          <Text style={s.subtitle}>Se a conta existir, você receberá um link para redefinir sua senha. Verifique sua caixa de entrada e spam.</Text>
        </View>
        <BackButton onPress={back} />
      </View></SafeAreaView>
    );
  }

  if (step === 'new_password') {
    return (
      <SafeAreaView style={s.container}><View style={s.inner}>
        <View style={s.headerArea}>
          <View style={s.iconRing}><Ionicons name="lock-closed-outline" size={32} color={COLORS.primary} /></View>
          <Text style={s.title}>Nova Senha</Text>
          <Text style={s.subtitle}>Defina sua nova senha</Text>
        </View>
        <Input placeholder="Nova senha (mín. 6 caracteres)" value={password} onChangeText={setPassword} icon="lock-closed-outline" secureTextEntry />
        <Input placeholder="Confirmar senha" value={confirmPassword} onChangeText={setConfirmPassword} icon="lock-closed-outline" secureTextEntry />
        <Button title="Redefinir Senha" onPress={handleSetNewPassword} loading={loading} />
        <BackButton onPress={back} />
      </View></SafeAreaView>
    );
  }

  if (step === 'otp_input') {
    return (
      <SafeAreaView style={s.container}><View style={s.inner}>
        <View style={s.headerArea}>
          <View style={s.iconRing}><Ionicons name="chatbubble-outline" size={32} color={COLORS.primary} /></View>
          <Text style={s.title}>Código de Verificação</Text>
          <Text style={s.subtitle}>Digite o código de 6 dígitos enviado por WhatsApp</Text>
        </View>
        <TextInput
          style={s.codeInput}
          value={code}
          onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="000000"
          placeholderTextColor={COLORS.textMuted}
          autoFocus
        />
        <Button title="Verificar Código" onPress={handleVerifyCode} loading={loading} />
        <TouchableOpacity onPress={handleSendCode} disabled={cooldown > 0 || loading} style={s.resendBtn}>
          <Text style={[s.resendText, cooldown > 0 && { color: COLORS.textMuted }]}>
            {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
          </Text>
        </TouchableOpacity>
        <BackButton onPress={back} />
      </View></SafeAreaView>
    );
  }

  // step === 'choose'
  return (
    <SafeAreaView style={s.container}><View style={s.inner}>
      <View style={s.headerArea}>
        <View style={s.iconRing}><Ionicons name="key-outline" size={32} color={COLORS.primary} /></View>
        <Text style={s.title}>Recuperar Senha</Text>
        <Text style={s.subtitle}>Escolha como deseja recuperar sua senha</Text>
      </View>

      {/* Channel tabs */}
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, channel === 'email' && s.tabActive]} onPress={() => setChannel('email')}>
          <Ionicons name="mail-outline" size={18} color={channel === 'email' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[s.tabText, channel === 'email' && s.tabTextActive]}>Email</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, channel === 'whatsapp' && s.tabActive]} onPress={() => setChannel('whatsapp')}>
          <Ionicons name="logo-whatsapp" size={18} color={channel === 'whatsapp' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[s.tabText, channel === 'whatsapp' && s.tabTextActive]}>WhatsApp</Text>
        </TouchableOpacity>
      </View>

      {channel === 'email' ? (
        <>
          <Input placeholder="Email" value={email} onChangeText={setEmail} icon="mail-outline" keyboardType="email-address" />
          <Button title="Enviar Link" onPress={handleEmailReset} loading={loading} />
          <Text style={s.hint}>O envio por email pode estar temporariamente indisponível. Recomendamos usar o WhatsApp.</Text>
        </>
      ) : (
        <>
          <Input placeholder="Telefone com DDD" value={phone} onChangeText={setPhone} icon="call-outline" keyboardType="phone-pad" />
          <Button title="Enviar Código por WhatsApp" onPress={handleSendCode} loading={loading} />
        </>
      )}

      <BackButton onPress={back} />
    </View></SafeAreaView>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={s.backBtn}>
      <Ionicons name="arrow-back" size={16} color={COLORS.textSecondary} />
      <Text style={s.backText}>Voltar para Login</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  headerArea: { alignItems: 'center', marginBottom: 36 },
  iconRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 16 },
  tabs: { flexDirection: 'row', marginBottom: 24, borderRadius: 12, backgroundColor: COLORS.surface, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 6 },
  tabActive: { backgroundColor: COLORS.background },
  tabText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
  tabTextActive: { color: COLORS.primary },
  codeInput: { fontSize: 32, fontWeight: '700', textAlign: 'center', letterSpacing: 12, color: COLORS.textPrimary, backgroundColor: COLORS.surface, borderRadius: 12, paddingVertical: 16, marginBottom: 20 },
  resendBtn: { alignItems: 'center', marginTop: 16, padding: 12 },
  resendText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  hint: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 12, paddingHorizontal: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, padding: 12 },
  backText: { color: COLORS.textSecondary, fontSize: 14, marginLeft: 6 },
});
