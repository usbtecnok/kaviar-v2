import { apiClient } from './apiClient';
import { logger } from './logger';

export const auth = {
  async login(email, password) {
    logger.log('AUTH_LOGIN_START', 'Attempting login', { email });
    const data = await apiClient.post('/api/auth/driver/login', { email, password });
    localStorage.setItem('token', data.token);
    logger.log('AUTH_LOGIN_SUCCESS', 'Login successful', { 
      userId: data.user?.id,
      status: data.user?.status 
    });
    return data;
  },

  logout() {
    logger.log('AUTH_LOGOUT', 'User logged out');
    localStorage.removeItem('token');
  },

  getToken() {
    return localStorage.getItem('token');
  },

  isAuthenticated() {
    return !!this.getToken();
  }
};
