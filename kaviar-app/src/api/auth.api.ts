import { apiClient } from './client';
import { User } from '../types/user';

// API de autenticação
export const authApi = {
  loginDriver: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const response = await apiClient.post('/auth/driver/login', { email, password });
    return response.data;
  },

  loginPassenger: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const response = await apiClient.post('/auth/passenger/login', { email, password });
    return response.data;
  },

  register: async (data: any): Promise<{ token: string; user: User }> => {
    const response = await apiClient.post('/auth/passenger/register', data);
    return response.data;
  },
};
