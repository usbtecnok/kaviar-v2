/**
 * RetornoFamiliarCard — Card mobile para o Retorno Familiar KAVIAR
 *
 * Usa endpoints existentes:
 *   GET  /api/v2/drivers/me/retorno-familiar
 *   POST /api/v2/drivers/me/retorno-familiar/request
 *
 * Não altera: credit_balance, driver_credit_ledger, driver_credit_purchases,
 *             mapa, dispatch, push, localização, áudio ou pagamentos.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { driverApi } from '../api/driver.api';

const GOLD = '#B8942E';
const DISCLAIMER = 'O Retorno Familiar KAVIAR é um programa em planejamento. As regras de bônus serão divulgadas conforme política vigente da KAVIAR. Não constitui salário, comissão, obrigação automática ou direito adquirido.';

interface RetornoFamiliarData {
  available: boolean;
  message?: string;
  within_window?: boolean;
  policy?: { percent_rate: number; request_start: string; request_end: string };
  summary?: { total_paid_cents: number; total_purchases: number; estimated_return_cents: number };
  existing_request?: { status: string; approved_amount_cents?: number; calculated_return_cents?: number; review_reason?: string; created_at?: string };
  disclaimer?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  requested: { label: 'Solicitação enviada', color: '#F59E0B', icon: 'time-outline' },
  in_review: { label: 'Em análise', color: '#8B5CF6', icon: 'hourglass-outline' },
  approved: { label: 'Aprovado', color: '#10B981', icon: 'checkmark-circle-outline' },
  rejected: { label: 'Rejeitado', color: '#EF4444', icon: 'close-circle-outline' },
  paid: { label: 'Pagamento registrado', color: GOLD, icon: 'cash-outline' },
  canceled: { label: 'Cancelado', color: '#6B7280', icon: 'close-outline' },
};

export default function RetornoFamiliarCard() {
  const [data, setData] = useState<RetornoFamiliarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const result = await driverApi.getRetornoFamiliar();
      setData(result);
    } catch {
      // Silencioso: card não renderiza se falhar
    }
    setLoading(false);
  }, []);

  // Carrega no mount e recarrega ao ganhar foco (volta para a tela)
  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleRequest = () => {
    Alert.alert(
      'Solicitar Retorno Familiar',
      DISCLAIMER + '\n\nDeseja enviar sua solicitação para análise?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Solicitar',
          onPress: async () => {
            if (submitting) return;
            setSubmitting(true);
            try {
              const result = await driverApi.requestRetornoFamiliar();
              if (result.success) {
                Alert.alert('Solicitação enviada', 'Sua solicitação está aguardando análise do administrador.');
                fetchData();
              } else {
                Alert.alert('Erro', result.error || 'Não foi possível enviar a solicitação.');
              }
            } catch (err: any) {
              const msg = err?.response?.status === 409
                ? 'Solicitação já enviada para este ano.'
                : err?.response?.data?.error || 'Erro ao enviar solicitação. Tente novamente.';
              Alert.alert('Erro', msg);
            }
            setSubmitting(false);
          },
        },
      ]
    );
  };

  const fmt = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;

  if (loading) return (
    <View style={s.container}>
      <ActivityIndicator size="small" color={GOLD} />
    </View>
  );

  if (!data) return null;

  // No policy active
  if (!data.available) {
    return (
      <View style={[s.container, s.containerInactive]}>
        <View style={s.headerRow}>
          <Ionicons name="information-circle-outline" size={18} color="#9CA3AF" />
          <Text style={s.titleInactive}>Retorno Familiar KAVIAR</Text>
        </View>
        <Text style={s.msgInactive}>{data.message || 'Nenhum programa ativo no momento.'}</Text>
      </View>
    );
  }

  const { summary, policy, existing_request: req, within_window } = data;

  // Has existing request — show status
  if (req) {
    const config = STATUS_CONFIG[req.status] || STATUS_CONFIG.requested;
    const amount = (() => {
      if (req.status === 'approved' || req.status === 'paid') {
        return req.approved_amount_cents ?? req.calculated_return_cents ?? 0;
      }
      // requested, in_review, rejected, canceled: use request snapshot
      return req.calculated_return_cents ?? 0;
    })();

    return (
      <View style={[s.container, { borderTopColor: config.color, borderTopWidth: 3 }]}>
        <View style={s.headerRow}>
          <Text style={s.title}>Retorno Familiar KAVIAR</Text>
          <View style={[s.badge, { backgroundColor: config.color + '20' }]}>
            <Ionicons name={config.icon as any} size={12} color={config.color} />
            <Text style={[s.badgeText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>

        {(req.status === 'approved' || req.status === 'paid') && amount > 0 && (
          <View style={s.valueBox}>
            <Text style={s.valueLabel}>Valor</Text>
            <Text style={s.valueAmount}>{fmt(amount)}</Text>
          </View>
        )}

        {req.status === 'paid' && (
          <Text style={s.paidNote}>Este status representa o registro administrativo do pagamento pelo KAVIAR.</Text>
        )}

        {req.status === 'rejected' && req.review_reason && (
          <View style={s.reasonBox}>
            <Text style={s.reasonText}>Motivo: {req.review_reason}</Text>
          </View>
        )}

        <Text style={s.disclaimer}>{DISCLAIMER}</Text>
      </View>
    );
  }

  // Eligible, no request
  return (
    <View style={[s.container, { borderTopColor: GOLD, borderTopWidth: 3 }]}>
      <Text style={s.title}>Retorno Familiar KAVIAR</Text>

      {summary && policy && (
        <View style={s.summaryBox}>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Uso da plataforma no ano</Text>
            <Text style={s.summaryValue}>{fmt(summary.total_paid_cents)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Percentual vigente</Text>
            <Text style={s.summaryValue}>{policy.percent_rate}%</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Retorno estimado</Text>
            <Text style={[s.summaryValue, { color: GOLD, fontSize: 16, fontWeight: '800' }]}>{fmt(summary.estimated_return_cents)}</Text>
          </View>
        </View>
      )}

      {policy && (
        <Text style={s.periodText}>Período: {policy.request_start} a {policy.request_end}</Text>
      )}

      {within_window ? (
        <TouchableOpacity
          style={[s.button, submitting && s.buttonDisabled]}
          onPress={handleRequest}
          disabled={submitting}
          activeOpacity={0.7}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={s.buttonText}>Solicitar Análise</Text>
          )}
        </TouchableOpacity>
      ) : (
        <View style={s.windowClosed}>
          <Ionicons name="calendar-outline" size={14} color="#6B7280" />
          <Text style={s.windowClosedText}>Fora do período de solicitação. Aguarde a abertura.</Text>
        </View>
      )}

      <Text style={s.disclaimer}>{DISCLAIMER}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E8E5DE' },
  containerInactive: { backgroundColor: '#FAFAF8' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 14, fontWeight: '800', color: '#1A1A1A' },
  titleInactive: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginLeft: 6 },
  msgInactive: { fontSize: 12, color: '#9CA3AF' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '700', marginLeft: 4 },
  valueBox: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, marginVertical: 8 },
  valueLabel: { fontSize: 11, color: '#6B7280' },
  valueAmount: { fontSize: 22, fontWeight: '800', color: GOLD, marginTop: 2 },
  paidNote: { fontSize: 10, color: '#6B7280', fontStyle: 'italic', marginTop: 4, marginBottom: 8 },
  reasonBox: { backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginVertical: 6 },
  reasonText: { fontSize: 11, color: '#DC2626' },
  summaryBox: { backgroundColor: '#FFFDF7', borderRadius: 10, padding: 12, marginVertical: 8, borderWidth: 1, borderColor: '#FDE68A' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  summaryLabel: { fontSize: 11, color: '#6B7280' },
  summaryValue: { fontSize: 12, fontWeight: '700', color: '#1F2937' },
  periodText: { fontSize: 10, color: '#9CA3AF', marginBottom: 10 },
  button: { backgroundColor: GOLD, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  windowClosed: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 10, marginTop: 4 },
  windowClosedText: { fontSize: 11, color: '#6B7280', marginLeft: 6, flex: 1 },
  disclaimer: { fontSize: 9, color: '#9CA3AF', marginTop: 10, lineHeight: 13 },
});
