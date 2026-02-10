import axios from 'axios';
import { API_BASE_URL } from '../config/api';


// Instância principal do Axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Helper: detectar rotas de autenticação
const isAuthRoute = (url) => {
  return url?.includes('/api/auth/') || 
         url?.includes('/login') || 
         url?.includes('/register') ||
         url?.includes('/forgot-password') ||
         url?.includes('/reset-password');
};

// Helper: detectar escopo por URL
const getTokenScope = (url) => {
  if (url?.includes('/api/drivers/')) return 'driver';
  if (url?.includes('/api/admin/')) return 'admin';
  return 'passenger';
};

// Interceptor de Request - Adiciona JWT automaticamente
api.interceptors.request.use(
  (config) => {
    const url = config.url || '';
    
    // NUNCA enviar Authorization para rotas de autenticação
    if (isAuthRoute(url)) {
      delete config.headers.Authorization;
      console.log('[API] Auth route - NO token:', config.method?.toUpperCase(), url);
      return config;
    }
    
    // Selecionar token por escopo
    const scope = getTokenScope(url);
    let token = null;
    
    if (scope === 'driver') {
      token = localStorage.getItem('kaviar_driver_token');
    } else if (scope === 'admin') {
      token = localStorage.getItem('kaviar_admin_token');
    } else {
      token = localStorage.getItem('kaviar_token');
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log('[API] Request:', config.method?.toUpperCase(), url, {
      scope,
      hasAuth: !!token
    });
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de Response - Trata erros automaticamente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    
    if (error.response?.status === 401) {
      // Se 401 em rota de autenticação, apenas devolver erro (sem redirect)
      if (isAuthRoute(url)) {
        console.log('[API] 401 em auth route - sem redirect');
        return Promise.reject(error);
      }
      
      // 401 em rota protegida: limpar token do escopo e redirecionar
      const scope = getTokenScope(url);
      
      console.log('[API] 401 em rota protegida - scope:', scope);
      
      if (scope === 'driver') {
        localStorage.removeItem('kaviar_driver_token');
        localStorage.removeItem('kaviar_driver_data');
        window.location.href = '/motorista/login';
      } else if (scope === 'admin') {
        localStorage.removeItem('kaviar_admin_token');
        localStorage.removeItem('kaviar_admin_data');
        window.location.href = '/admin/login';
      } else {
        localStorage.removeItem('kaviar_token');
        localStorage.removeItem('kaviar_user');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
