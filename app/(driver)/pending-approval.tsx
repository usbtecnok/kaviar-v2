import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authStore } from '../../src/auth/auth.store';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || 'https://api.kaviar.com.br';

export default function PendingApproval() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [driverStatus, setDriverStatus] = useState<string>('pending');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Verificar a cada 30s
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const token = authStore.getToken();
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/drivers/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao verificar status');
      }

      const data = await response.json();
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
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#d32f2f" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="time-outline" size={80} color="#FF9800" />
        
        <Text style={styles.title}>Aguardando Aprovação</Text>
        
        {userName && (
          <Text style={styles.userName}>Olá, {userName}!</Text>
        )}
        
        <Text style={styles.message}>
          Seus documentos foram enviados com sucesso e estão sendo analisados pela nossa equipe.
        </Text>
        
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color="#2196F3" />
          <Text style={styles.infoText}>
            O processo de aprovação pode levar até 48 horas. Você receberá uma notificação assim que sua conta for aprovada.
          </Text>
        </View>

        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Status atual:</Text>
          <Text style={[styles.statusValue, styles.statusPending]}>
            {driverStatus === 'pending' ? 'EM ANÁLISE' : driverStatus.toUpperCase()}
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={checkStatus}>
          <Ionicons name="refresh" size={20} color="#FFF" />
          <Text style={styles.refreshButtonText}>Atualizar Status</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    color: '#333',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  userName: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
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
    borderColor: '#2196F3',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 12,
    lineHeight: 20,
  },
  statusBox: {
    backgroundColor: '#FFF',
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
    color: '#666',
    marginBottom: 8,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusPending: {
    color: '#FF9800',
  },
  refreshButton: {
    flexDirection: 'row',
    backgroundColor: '#2196F3',
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
    color: '#d32f2f',
    fontSize: 16,
    fontWeight: '600',
  },
});
