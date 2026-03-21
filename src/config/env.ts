import { Platform } from 'react-native';

// Em dev: emulador Android usa 10.0.2.2, dispositivo físico/iOS usa IP da rede
const DEV_API_HOST = Platform.OS === 'android' ? '10.0.2.2' : '10.137.11.154';
const DEV_API_URL = `http://${DEV_API_HOST}:3003`;

// Configuração de ambiente
export const ENV = {
  API_URL: process.env.EXPO_PUBLIC_API_URL || DEV_API_URL,
  API_TIMEOUT: 10000,
};
