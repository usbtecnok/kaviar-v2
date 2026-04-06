import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../src/api/client';
import { authStore } from '../../src/auth/auth.store';
import { friendlyError } from '../../src/utils/errorMessage';
import { COLORS } from '../../src/config/colors';

export default function ReferDriver() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) { setError('Preencha nome e telefone'); return; }
    setError('');
    setLoading(true);
    try {
      const user = authStore.getUser();
      const notes = `Indicado por: ${user?.name || 'N/A'} (${user?.phone || user?.id || 'N/A'})${neighborhood ? ` | Bairro: ${neighborhood}` : ''}`;
      await apiClient.post('/api/public/consultant-lead', {
        name: name.trim(),
        phone: phone.trim(),
        source: 'app-driver-referral',
        notes,
      });
      setSent(true);
    } catch (e: any) {
      if (e.response?.status === 409) { setError('Este contato já foi indicado.'); }
      else { setError(friendlyError(e, 'Não foi possível enviar a indicação.')); }
    } finally { setLoading(false); }
  };

  if (sent) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
          <Text style={s.successTitle}>Indicação enviada!</Text>
          <Text style={s.successText}>A equipe KAVIAR entrará em contato com a pessoa indicada.</Text>
          <Text style={s.successHint}>O valor de R$ 20,00 será liberado quando o motorista for aprovado, adquirir créditos e concluir a primeira corrida.</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={s.title}>Indique um motorista</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={s.heroArea}>
            <Ionicons name="people-outline" size={40} color={COLORS.primary} />
            <Text style={s.heroTitle}>Indique um motorista para a KAVIAR</Text>
            <Text style={s.heroText}>Conhece alguém com perfil para dirigir na KAVIAR? Envie o contato e nossa equipe fará o atendimento e a avaliação.</Text>
            <View style={s.rewardBadge}>
              <Ionicons name="gift-outline" size={16} color={COLORS.primary} />
              <Text style={s.rewardText}>Se aprovado e ativo, você recebe R$ 20,00</Text>
            </View>
          </View>

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
  heroArea: { alignItems: 'center', marginBottom: 28 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', marginTop: 12, marginBottom: 8 },
  heroText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21 },
  rewardBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surfaceLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginTop: 14, borderWidth: 1, borderColor: COLORS.border },
  rewardText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  form: { gap: 4 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, fontSize: 16, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  error: { color: COLORS.danger, fontSize: 13, marginTop: 8 },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  submitText: { fontSize: 16, fontWeight: '800', color: COLORS.textDark },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginTop: 16 },
  successText: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  successHint: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 12, lineHeight: 20 },
  backBtn: { backgroundColor: COLORS.surface, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, marginTop: 24, borderWidth: 1, borderColor: COLORS.border },
  backBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
});
