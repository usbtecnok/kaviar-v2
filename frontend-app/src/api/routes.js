// Mapeamento das rotas do frontend para o backend existente
export const API_ROUTES = {
  // Autenticação (usar endpoints existentes ou criar mock)
  AUTH: {
    LOGIN: '/api/messages/test', // Temporário - usar endpoint existente para teste
  },
  
  // Dashboard Admin
  ADMIN: {
    SUMMARY: '/api/v1/dashboard/overview',
    COMMUNITIES: '/api/v1/communities',
    COMMUNITY_UPDATE: (id) => `/api/v1/communities/${id}`,
  },
  
  // Motorista
  DRIVER: {
    STATUS: '/api/v1/drivers/available', // Adaptar para status individual
    AVAILABILITY: '/api/v1/drivers/availability',
    EARNINGS: (id) => `/api/v1/incentives/drivers/${id}/earnings`,
  },
  
  // Passageiro
  PASSENGER: {
    REQUEST_RIDE: '/api/v1/rides',
    RIDE_STATUS: (id) => `/api/v1/rides/${id}`,
    CANCEL_RIDE: (id) => `/api/v1/rides/${id}/cancel`,
  },
  
  // Corridas
  RIDES: {
    ACCEPT: (id) => `/api/v1/rides/${id}/accept`,
    DECLINE: (id) => `/api/v1/rides/${id}/decline`,
    START: (id) => `/api/v1/rides/${id}/start`,
    FINISH: (id) => `/api/v1/rides/${id}/finish`,
  },
  
  // Emergência
  EMERGENCY: {
    PANIC: '/api/messages/panic',
  },
  
  // Analytics (usar endpoints existentes)
  ANALYTICS: {
    COMMUNITIES: '/api/v1/analytics/communities',
    METRICS: '/api/v1/analytics/calculate-metrics',
  }
};

export default API_ROUTES;
