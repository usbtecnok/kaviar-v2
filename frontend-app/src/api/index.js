import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

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
    // ✅ CORREÇÃO: Suportar admin e usuário comum
    const token = localStorage.getItem('kaviar_admin_token') || localStorage.getItem('kaviar_token');
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
      // Detectar contexto (admin ou usuário comum)
      const isAdmin = localStorage.getItem('kaviar_admin_token');
      
      if (isAdmin) {
        localStorage.removeItem('kaviar_admin_token');
        localStorage.removeItem('kaviar_admin_data');
        window.location.href = '/admin/login';
      } else {
        localStorage.removeItem('kaviar_token');
        localStorage.removeItem('kaviar_user');
        window.location.href = '/login';
      }
    }
    // Não redirecionar em 403 - deixar componente tratar
    return Promise.reject(error);
  }
);

export default api;
