import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import Constants from 'expo-constants';
import { ENV } from '../config/env';
import { authStore } from '../auth/auth.store';

const APP_VERSION = Constants.expoConfig?.version || '0.0.0';

export const apiClient = axios.create({
  baseURL: ENV.API_URL,
  timeout: ENV.API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// Request: attach token + app version
apiClient.interceptors.request.use(async (config) => {
  config.headers['X-App-Version'] = APP_VERSION;
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
