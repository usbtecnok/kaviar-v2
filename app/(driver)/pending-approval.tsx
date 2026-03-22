import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authStore } from '../../src/auth/auth.store';
import { driverApi } from '../../src/api/driver.api';
import { getMyDocuments } from '../services/documentApi';
import { COLORS } from '../../src/config/colors';

export default function PendingApproval() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverStatus, setDriverStatus] = useState<string>('pending');
  const [hasRejectedDoc, setHasRejectedDoc] = useState(false);
  const [userName, setUserName] = useState('');

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

      setDriverStatus(status);
      setUserName(name);

      // Se aprovado, redirecionar para tela online
      if (status === 'approved') {
        Alert.alert(
          'Parabéns!',
          'Sua conta foi aprovada! Agora você pode começar a trabalhar.',
          [
            {
              text: 'Começar',
              onPress: () => router.replace('/(driver)/online')
            }
          ]
        );
      } else if (status === 'rejected') {
        Alert.alert(
          'Cadastro Rejeitado',
          'Infelizmente seu cadastro foi rejeitado. Entre em contato com o suporte para mais informações.',
          [{ text: 'OK' }]
        );
      }

      // Verificar documentos rejeitados (reusa o ciclo existente)
      try {
        const docsResult = await getMyDocuments();
        if (docsResult.success && docsResult.data) {
          setHasRejectedDoc(docsResult.data.some(d => d.status === 'rejected' || d.status === 'REJECTED'));
        }
      } catch {}
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sair',
      'Deseja realmente sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await authStore.clearAuth();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.warning} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="time-outline" size={80} color={COLORS.warning} />
        
        <Text style={styles.title}>Aguardando Aprovação</Text>
        
        {userName && (
          <Text style={styles.userName}>Olá, {userName}!</Text>
        )}
        
        <Text style={styles.message}>
          Seus documentos foram enviados com sucesso e estão sendo analisados pela nossa equipe.
        </Text>
        
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} />
          <Text style={styles.infoText}>
            O processo de aprovação pode levar até 48 horas. Você receberá uma notificação assim que sua conta for aprovada.
          </Text>
        </View>

        {hasRejectedDoc && (
          <View style={styles.rejectBox}>
            <Ionicons name="alert-circle" size={24} color={COLORS.danger} />
            <Text style={styles.rejectText}>
              Um ou mais documentos foram rejeitados. Revise e reenvie para continuar.
            </Text>
          </View>
        )}

        {hasRejectedDoc && (
          <TouchableOpacity style={styles.reviewButton} onPress={() => router.push('/(driver)/documents')}>
            <Ionicons name="document-text-outline" size={20} color="#FFF" />
            <Text style={styles.reviewButtonText}>Revisar documentos</Text>
          </TouchableOpacity>
        )}

        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Status atual:</Text>
          <Text style={[styles.statusValue, styles.statusPending]}>
            {driverStatus === 'pending' ? 'EM ANÁLISE' : driverStatus.toUpperCase()}
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={async () => { setRefreshing(true); await checkStatus(); setRefreshing(false); }} disabled={refreshing}>
          {refreshing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="refresh" size={20} color="#FFF" />
          )}
          <Text style={styles.refreshButtonText}>{refreshing ? 'Verificando...' : 'Atualizar Status'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  userName: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 12,
    lineHeight: 20,
  },
  statusBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusPending: {
    color: COLORS.warning,
  },
  rejectBox: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  rejectText: {
    flex: 1,
    fontSize: 14,
    color: '#C62828',
    marginLeft: 12,
    lineHeight: 20,
  },
  reviewButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 12,
  },
  reviewButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 12,
  },
  refreshButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  logoutButton: {
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  logoutButtonText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: '600',
  },
});
