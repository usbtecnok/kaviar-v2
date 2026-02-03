// Configuração centralizada da API
const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

const PROD_DEFAULT = 'https://api.kaviar.com.br';
const DEV_DEFAULT = 'http://localhost:3001';

export const API_BASE_URL =
  envUrl || (import.meta.env.PROD ? PROD_DEFAULT : DEV_DEFAULT);

console.log('🔧 API Base URL:', API_BASE_URL);
