import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { ENV } from '../config/env';
import { authStore } from '../auth/auth.store';

export const apiClient = axios.create({
  baseURL: ENV.API_URL,
  timeout: ENV.API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// Request: attach token
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response: handle 401 (session expired)
let isLoggingOut = false;
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !isLoggingOut) {
      isLoggingOut = true;
      Alert.alert('Sessão expirada', 'Sua sessão expirou. Faça login novamente.');
      await authStore.clearAuth();
      isLoggingOut = false;
    }
    return Promise.reject(error);
  }
);
