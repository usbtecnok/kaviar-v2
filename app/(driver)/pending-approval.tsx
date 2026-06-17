import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authStore } from '../../src/auth/auth.store';
import { driverApi } from '../../src/api/driver.api';
import { getMyDocuments } from '../services/documentApi';
import { COLORS } from '../../src/config/colors';

const MODALITY_LABELS: Record<string, string> = { CAR: '🚗 Carro', MOTO_DELIVERY: '📦 Moto Entrega', MOTO_PASSENGER: '🏍️ Moto Passageiro' };
const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  PENDING_REVIEW: { text: 'Aguardando', color: '#F59E0B' },
  APPROVED: { text: 'Aprovado', color: '#10B981' },
  REJECTED: { text: 'Reprovado', color: '#EF4444' },
  SUSPENDED: { text: 'Suspenso', color: '#6B7280' },
};

export default function PendingApproval() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverStatus, setDriverStatus] = useState<string>('pending');
  const [pendingReason, setPendingReason] = useState<string | null>(null);
  const [hasRejectedDoc, setHasRejectedDoc] = useState(false);
  const [userName, setUserName] = useState('');
  const [modalities, setModalities] = useState<any[]>([]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      if (!authStore.isAuthenticated()) {
        router.replace('/(auth)/login');
        return;
      }

      const data = await driverApi.getMe();
      const status = data.driver?.status || data.status;
      const name = data.driver?.name || data.name;
      const reason = data.driver?.pending_reason || null;

      setDriverStatus(status);
      setUserName(name);
      setPendingReason(reason);

      if (status === 'approved') {
        Alert.alert('Parabéns!', 'Sua conta foi aprovada! Agora você pode começar a trabalhar.', [
          { text: 'Começar', onPress: () => router.replace('/(driver)/online') },
        ]);
      } else if (status === 'rejected') {
        Alert.alert(
          'Cadastro não aprovado',
          'Seu cadastro não foi aprovado neste momento. Entre em contato com o suporte KAVIAR para mais informações.',
          [{ text: 'OK' }]
        );
      }

      try {
        const docsResult = await getMyDocuments();
        if (docsResult.success && docsResult.data) {
          setHasRejectedDoc(docsResult.data.some(d => d.status === 'rejected' || d.status === 'REJECTED'));
        }
      } catch {}

      try {
        const mods = await driverApi.getModalities();
        setModalities(mods);
      } catch {}
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Sair', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => {
        await authStore.clearAuth();
        router.replace('/(auth)/login');
      }},
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const isNeedsDocuments = driverStatus === 'needs_documents';
  const isRejected = driverStatus === 'rejected';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>KAVIAR</Text>
        <TouchableOpacity onPress={handleLogout} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="log-out-outline" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.center}>
        <View style={[styles.iconRing, isNeedsDocuments && { borderColor: '#3B82F6' }, isRejected && { borderColor: COLORS.danger }]}>
          <Ionicons
            name={isNeedsDocuments ? 'document-text-outline' : isRejected ? 'close-circle-outline' : 'time-outline'}
            size={40}
            color={isNeedsDocuments ? '#3B82F6' : isRejected ? COLORS.danger : COLORS.warning}
          />
        </View>

        <Text style={styles.title}>
          {isNeedsDocuments ? 'Documentos Pendentes' : isRejected ? 'Cadastro Não Aprovado' : 'Aguardando Aprovação'}
        </Text>
        {userName && <Text style={styles.userName}>Olá, {userName}!</Text>}

        {/* Status-specific messaging */}
        {isNeedsDocuments ? (
          <>
            <Text style={styles.message}>
              Seu cadastro precisa de correção. Envie os documentos pendentes para continuar sua análise no KAVIAR.
            </Text>
            {pendingReason && (
              <View style={[styles.infoBox, { borderColor: '#3B82F6' }]}>
                <Ionicons name="alert-circle" size={22} color="#3B82F6" />
                <Text style={[styles.infoText, { color: '#3B82F6' }]}>
                  {pendingReason}
                </Text>
              </View>
            )}
            <TouchableOpacity style={[styles.reviewBtn, { backgroundColor: '#3B82F6' }]} onPress={() => router.push('/(driver)/documents')}>
              <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />
              <Text style={styles.reviewBtnText}>Enviar Documentos</Text>
            </TouchableOpacity>
          </>
        ) : isRejected ? (
          <Text style={styles.message}>
            Seu cadastro não foi aprovado neste momento. Entre em contato com o suporte KAVIAR para mais informações.
          </Text>
        ) : (
          <>
            <Text style={styles.message}>
              Seus documentos foram enviados e estão sendo analisados pela nossa equipe.
            </Text>
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={22} color={COLORS.accent} />
              <Text style={styles.infoText}>
                O processo pode levar até 48 horas. Você será notificado quando sua conta for aprovada.
              </Text>
            </View>
          </>
        )}

        {/* Rejected docs (for pending status) */}
        {!isNeedsDocuments && !isRejected && hasRejectedDoc && (
          <>
            <View style={styles.rejectBox}>
              <Ionicons name="alert-circle" size={22} color={COLORS.danger} />
              <Text style={styles.rejectText}>
                Um ou mais documentos foram rejeitados. Revise e reenvie.
              </Text>
            </View>
            <TouchableOpacity style={styles.reviewBtn} onPress={() => router.push('/(driver)/documents')}>
              <Ionicons name="document-text-outline" size={18} color="#FFF" />
              <Text style={styles.reviewBtnText}>Revisar documentos</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Status */}
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Status atual</Text>
          <Text style={[styles.statusValue, { color: isNeedsDocuments ? '#3B82F6' : isRejected ? COLORS.danger : COLORS.warning }]}>
            {isNeedsDocuments ? 'CORREÇÃO PENDENTE' : isRejected ? 'NÃO APROVADO' : 'EM ANÁLISE'}
          </Text>
        </View>

        {/* Modalities */}
        {modalities.length > 0 && (
          <View style={{ width: '100%', marginBottom: 16 }}>
            <Text style={[styles.statusLabel, { marginBottom: 8 }]}>Modalidades</Text>
            {modalities.map(m => {
              const st = STATUS_LABELS[m.status] || { text: m.status, color: '#6B7280' };
              return (
                <View key={m.id} style={[styles.infoBox, { marginBottom: 8, borderColor: st.color }]}>
                  <Text style={{ fontSize: 16 }}>{MODALITY_LABELS[m.modality] || m.modality}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: st.color, marginLeft: 'auto' }}>{st.text}</Text>
                </View>
              );
            })}
            {modalities.some(m => m.status === 'REJECTED') && (
              <Text style={{ fontSize: 12, color: '#EF4444', textAlign: 'center' }}>
                {modalities.find(m => m.status === 'REJECTED')?.rejected_reason || 'Modalidade reprovada. Verifique com o suporte.'}
              </Text>
            )}
          </View>
        )}

        {/* Refresh */}
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={async () => { setRefreshing(true); await checkStatus(); setRefreshing(false); }}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={COLORS.textDark} />
          ) : (
            <Ionicons name="refresh" size={18} color={COLORS.textDark} />
          )}
          <Text style={styles.refreshBtnText}>{refreshing ? 'Verificando...' : 'Atualizar Status'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8,
  },
  brand: { fontSize: 18, fontWeight: '900', color: COLORS.primary, letterSpacing: 4 },
  center: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },

  iconRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, borderColor: COLORS.warning,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6, textAlign: 'center' },
  userName: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 16, textAlign: 'center' },
  message: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },

  infoBox: {
    flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.accent, width: '100%',
  },
  infoText: { flex: 1, fontSize: 14, color: COLORS.accent, marginLeft: 12, lineHeight: 20 },

  rejectBox: {
    flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.danger, width: '100%',
  },
  rejectText: { flex: 1, fontSize: 14, color: COLORS.danger, marginLeft: 12, lineHeight: 20 },

  reviewBtn: {
    flexDirection: 'row', backgroundColor: COLORS.danger, borderRadius: 12,
    padding: 14, alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 16,
  },
  reviewBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600', marginLeft: 8 },

  statusBox: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 20,
    marginBottom: 20, alignItems: 'center', width: '100%',
  },
  statusLabel: { fontSize: 13, color: COLORS.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusValue: { fontSize: 20, fontWeight: '800', letterSpacing: 2 },

  refreshBtn: {
    flexDirection: 'row', backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center',
  },
  refreshBtnText: { color: COLORS.textDark, fontSize: 15, fontWeight: '700', marginLeft: 8 },
});
