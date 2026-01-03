import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Instância principal do Axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor de Request - Adiciona JWT automaticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('kaviar_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de Response - Trata erros automaticamente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido/expirado - logout automático
      localStorage.removeItem('kaviar_token');
      localStorage.removeItem('kaviar_user');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // Acesso negado - redirecionar para página de erro
      window.location.href = '/access-denied';
    }
    return Promise.reject(error);
  }
);

export default api;
