import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEV_API_HOST = Platform.OS === 'android' ? '10.0.2.2' : '10.137.11.154';
const DEV_API_URL = `http://${DEV_API_HOST}:3003`;
const PROD_API_URL = 'https://api.kaviar.com.br';

const isDev = __DEV__;

export const ENV = {
  API_URL: isDev
    ? (Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || DEV_API_URL)
    : PROD_API_URL,
  API_TIMEOUT: 10000,
};
