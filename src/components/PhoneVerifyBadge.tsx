import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ENV } from '../config/env';
import { COLORS } from '../config/colors';
import { authStore } from '../auth/auth.store';
import { User } from '../types/user';

const API_URL = ENV.API_URL;

interface Props {
  user: User;
  onVerified: () => void;
}

type Step = 'idle' | 'sending' | 'input' | 'verifying';

export function PhoneVerifyBadge({ user, onVerified }: Props) {
  const [step, setStep] = useState<Step>('idle');
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  if (user.phone_verified_at) {
    return (
      <View style={s.badge}>
        <Ionicons name="checkmark-circle" size={16} color="#4caf50" />
        <Text style={s.badgeText}>Verificado</Text>
      </View>
    );
  }

  if (!user.phone) return null;

  const userType = user.user_type === 'DRIVER' ? 'driver' : 'passenger';

  const normalizePhone = (p: string) => {
    const digits = p.replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`;
    if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
    return null;
  };

  const startCooldown = () => {
    setCooldown(60);
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const sendCode = async () => {
    const normalized = normalizePhone(user.phone!);
    if (!normalized) { Alert.alert('Erro', 'Telefone em formato inválido.'); return; }
    setStep('sending');
    try {
      const res = await fetch(`${API_URL}/api/auth/phone/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized, userType, purpose: 'phone_verification' }),
      });
      const d = await res.json();
      if (res.ok) { setStep('input'); setCode(''); startCooldown(); }
      else { Alert.alert('Erro', d.error || 'Erro ao enviar código'); setStep('idle'); }
    } catch { Alert.alert('Erro', 'Não foi possível enviar código.'); setStep('idle'); }
  };

  const verifyCode = async () => {
    if (code.length !== 6) { Alert.alert('Erro', 'Digite o código de 6 dígitos'); return; }
    const normalized = normalizePhone(user.phone!)!;
    setStep('verifying');
    try {
      const res = await fetch(`${API_URL}/api/auth/phone/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized, code, purpose: 'phone_verification' }),
      });
      const d = await res.json();
      if (res.ok) {
        // Atualizar auth store com phone_verified_at
        const updated = { ...user, phone_verified_at: new Date().toISOString() };
        const token = authStore.getToken();
        if (token) await authStore.setAuth(token, updated);
        onVerified();
      } else {
        Alert.alert('Erro', d.error || 'Código inválido');
        setStep('input');
      }
    } catch { Alert.alert('Erro', 'Erro ao verificar código.'); setStep('input'); }
  };

  if (step === 'input' || step === 'verifying') {
    return (
      <View style={s.verifyArea}>
        <Text style={s.verifyLabel}>Código enviado por WhatsApp</Text>
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
        <TouchableOpacity style={s.verifyBtn} onPress={verifyCode} disabled={step === 'verifying'}>
          <Text style={s.verifyBtnText}>{step === 'verifying' ? 'Verificando...' : 'Confirmar'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={sendCode} disabled={cooldown > 0} style={s.resendBtn}>
          <Text style={[s.resendText, cooldown > 0 && { color: COLORS.textMuted }]}>
            {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity style={s.badge} onPress={sendCode} disabled={step === 'sending'}>
      <Ionicons name="alert-circle-outline" size={16} color="#ff9800" />
      <Text style={s.badgeTextAction}>{step === 'sending' ? 'Enviando...' : 'Verificar'}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  badgeText: { fontSize: 12, color: '#4caf50', fontWeight: '600' },
  badgeTextAction: { fontSize: 12, color: '#ff9800', fontWeight: '600' },
  verifyArea: { marginTop: 8 },
  verifyLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
  codeInput: { fontSize: 24, fontWeight: '700', textAlign: 'center', letterSpacing: 8, color: COLORS.textPrimary, backgroundColor: COLORS.background, borderRadius: 8, paddingVertical: 10, marginBottom: 8 },
  verifyBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  verifyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  resendBtn: { alignItems: 'center', marginTop: 8, padding: 8 },
  resendText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
});
