import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './client';
import { User } from '../types/user';

const DEVICE_ID_KEY = 'kaviar_device_id';

async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// API de autenticação
export const authApi = {
  loginDriver: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const device_id = await getDeviceId();
    const device_model = `${Platform.OS}/${Platform.Version}`;
    const response = await apiClient.post('/api/auth/driver/login', { email, password, device_id, device_model });
    return response.data;
  },

  loginPassenger: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const response = await apiClient.post('/api/auth/passenger/login', { email, password });
    return response.data;
  },

  register: async (data: any): Promise<{ token: string; user: User }> => {
    const response = await apiClient.post('/api/auth/passenger/register', data);
    return response.data;
  },
};
