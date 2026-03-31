import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Em dev: emulador Android usa 10.0.2.2, dispositivo físico/iOS usa IP da rede
const DEV_API_HOST = Platform.OS === 'android' ? '10.0.2.2' : '10.137.11.154';
const DEV_API_URL = `http://${DEV_API_HOST}:3003`;

// Configuração de ambiente
// Prioridade: extra do app.config.js > process.env > fallback dev
export const ENV = {
  API_URL: Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL
    || process.env.EXPO_PUBLIC_API_URL
    || DEV_API_URL,
  API_TIMEOUT: 10000,
};
