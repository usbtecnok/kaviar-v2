// Configuração centralizada da API
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://kaviar-backend-prod.us-east-1.elasticbeanstalk.com';

console.log('🔧 API Base URL:', API_BASE_URL);
