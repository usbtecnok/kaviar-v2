/**
 * WomenPreferenceSection — Seção de perfil para Preferência por Motorista Mulher
 *
 * Usa endpoints existentes da Fase 3A. Não altera dispatch, rides, mapa, push ou créditos.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { apiClient } from '../api/client';
import { COLORS } from '../config/colors';

const GOLD = '#B8942E';
const CONSENT_VERSION = 'v1.0-eligibility-mobile';

interface Props {
  role: 'passenger' | 'driver';
}

interface Status {
  eligible: boolean;
  eligibility_source: string | null;
  opt_in: boolean;
  participating: boolean;
  prefer_woman_driver_default?: boolean;
  feature_enabled: boolean;
}

const TEXTS = {
  passenger: {
    title: 'Preferência por Motorista Mulher',
    explain: 'Esta preferência é destinada a passageiras que se autodeclaram elegíveis e desejam priorizar motoristas mulheres participantes, quando o programa for ativado.',
    declare: 'Ao continuar, declaro voluntariamente que sou elegível para usar a preferência por motorista mulher. Esta declaração é pessoal, baseada na minha autodeclaração, e pode ser revogada a qualquer momento. Declarações indevidas poderão ser auditadas e tratadas administrativamente.',
    revokeWarn: 'Ao revogar sua declaração, sua participação será encerrada e a preferência padrão será desativada.',
    noGuarantee: 'A preferência não garante atendimento por motorista mulher. Depende da disponibilidade na região e horário.',
  },
  driver: {
    title: 'Programa Motorista Mulher',
    explain: 'Este programa está em preparação. Ao participar, você poderá receber, quando o programa for ativado, corridas de passageiras que preferem motorista mulher.',
    declare: 'Ao continuar, declaro voluntariamente que sou elegível para participar do Programa Motorista Mulher. Esta declaração é pessoal, baseada na minha autodeclaração, e pode ser revogada a qualquer momento. Declarações indevidas poderão ser auditadas e tratadas administrativamente.',
    revokeWarn: 'Ao revogar sua declaração, você deixará de participar do Programa Motorista Mulher, mas continuará recebendo corridas normais.',
    noGuarantee: 'Participar do programa não altera suas corridas normais. Você continuará recebendo solicitações de todos os passageiros.',
  },
};

export default function WomenPreferenceSection({ role }: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const basePath = role === 'passenger'
    ? '/api/v2/passengers/me/women-preference'
    : '/api/v2/drivers/me/women-preference';

  const texts = TEXTS[role];

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await apiClient.get(basePath);
      setStatus(data.data);
    } catch { /* silencioso */ }
    setLoading(false);
  }, [basePath]);

  useFocusEffect(useCallback(() => { fetchStatus(); }, [fetchStatus]));

  const act = async (action: () => Promise<void>) => {
    setActing(true);
    try { await action(); await fetchStatus(); }
    catch (e: any) { Alert.alert('Erro', e?.response?.data?.error || 'Tente novamente.'); }
    setActing(false);
  };

  const declare = () => {
    Alert.alert('Autodeclaração', texts.declare, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Declaro', onPress: () => act(async () => { await apiClient.post(`${basePath}/declare`, { consent_version: CONSENT_VERSION }); }) },
    ]);
  };

  const revoke = () => {
    Alert.alert('Revogar declaração', texts.revokeWarn, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Revogar', style: 'destructive', onPress: () => act(async () => { await apiClient.post(`${basePath}/revoke-declaration`); }) },
    ]);
  };

  const optIn = () => act(async () => { await apiClient.post(`${basePath}/opt-in`, { consent_version: CONSENT_VERSION }); });
  const optOut = () => act(async () => { await apiClient.post(`${basePath}/opt-out`); });

  const toggleDefault = (val: boolean) => act(async () => {
    await apiClient.put(`${basePath}/default`, { prefer_woman_driver_default: val });
  });

  if (loading) return <View style={s.container}><ActivityIndicator color={GOLD} /></View>;
  if (!status) return null;

  const { eligible, opt_in, participating } = status;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Ionicons name="shield-checkmark" size={20} color={GOLD} />
        <Text style={s.title}>{texts.title}</Text>
      </View>

      {/* Banner de preparação */}
      <View style={s.banner}>
        <Ionicons name="information-circle" size={16} color={COLORS.textSecondary} />
        <Text style={s.bannerText}>Programa em preparação. Sua participação será registrada, mas ainda não altera as corridas.</Text>
      </View>

      {/* Estado */}
      <View style={s.statusRow}>
        <Text style={s.statusLabel}>Estado:</Text>
        <Text style={[s.statusValue, { color: participating ? COLORS.success : eligible ? COLORS.warning : COLORS.textMuted }]}>
          {participating ? '✓ Participando' : eligible ? 'Elegível (não ativa)' : 'Não elegível'}
        </Text>
      </View>

      {/* Ações baseadas no estado */}
      {!eligible && (
        <View>
          <Text style={s.explain}>{texts.explain}</Text>
          <TouchableOpacity style={s.btn} onPress={declare} disabled={acting}>
            {acting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.btnText}>Declarar elegibilidade</Text>}
          </TouchableOpacity>
        </View>
      )}

      {eligible && !opt_in && (
        <View>
          <Text style={s.explain}>{texts.noGuarantee}</Text>
          <TouchableOpacity style={s.btn} onPress={optIn} disabled={acting}>
            <Text style={s.btnText}>Ativar participação</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.linkBtn} onPress={revoke} disabled={acting}>
            <Text style={s.linkText}>Revogar declaração</Text>
          </TouchableOpacity>
        </View>
      )}

      {participating && (
        <View>
          <Text style={s.explain}>{texts.noGuarantee}</Text>

          {/* Toggle prefer_default — apenas passageira */}
          {role === 'passenger' && (
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>Preferir motorista mulher por padrão</Text>
              <Switch
                value={status.prefer_woman_driver_default ?? false}
                onValueChange={toggleDefault}
                trackColor={{ false: COLORS.border, true: GOLD }}
                thumbColor="#fff"
                disabled={acting}
              />
            </View>
          )}

          <TouchableOpacity style={s.outlineBtn} onPress={optOut} disabled={acting}>
            <Text style={s.outlineText}>Desativar participação</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.linkBtn} onPress={revoke} disabled={acting}>
            <Text style={s.linkText}>Revogar declaração</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { backgroundColor: COLORS.surface, borderRadius: 16, marginHorizontal: 20, marginTop: 16, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '700', color: GOLD },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: COLORS.surfaceLight, borderRadius: 8, padding: 10, marginBottom: 12 },
  bannerText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statusLabel: { fontSize: 13, color: COLORS.textMuted, marginRight: 6 },
  statusValue: { fontSize: 13, fontWeight: '600' },
  explain: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginBottom: 12 },
  btn: { backgroundColor: GOLD, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
  btnText: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  outlineBtn: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginBottom: 8 },
  outlineText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  linkBtn: { alignItems: 'center', paddingVertical: 8 },
  linkText: { fontSize: 12, color: COLORS.danger, fontWeight: '500' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border, marginBottom: 8 },
  toggleLabel: { fontSize: 13, color: COLORS.textPrimary, flex: 1, marginRight: 12 },
});
