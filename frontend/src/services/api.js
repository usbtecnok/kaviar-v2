import axios from 'axios';

// Configuração base da API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * SERVIÇO DE API - ÚNICA FONTE DE VERDADE
 * 
 * Todas as chamadas ao backend passam por aqui.
 * Frontend NÃO contém lógica de negócio.
 */

// ==================== CORRIDAS ====================

export const ridesAPI = {
  // Criar corrida (padrão ou especial)
  create: (rideData) => api.post('/api/v1/rides', rideData),
  
  // Permitir motoristas externos
  allowExternal: (rideId, passengerId) => 
    api.post(`/api/v1/rides/${rideId}/allow-external`, { passenger_id: passengerId }),
  
  // Buscar motoristas elegíveis
  getEligibleDrivers: (rideId) => 
    api.get(`/api/v1/rides/${rideId}/eligible-drivers`),
  
  // Verificar se motorista pode aceitar
  canDriverAccept: (rideId, driverId) => 
    api.get(`/api/v1/rides/${rideId}/can-accept/${driverId}`)
};

// ==================== SERVIÇOS ESPECIAIS ====================

export const specialServicesAPI = {
  // Configurações de serviços
  getConfigs: () => api.get('/api/v1/special-services/configs'),
  
  // Calcular valor total
  calculateTotal: (baseAmount, serviceType, customFee = null) => 
    api.post('/api/v1/special-services/calculate-total', {
      base_amount: baseAmount,
      service_type: serviceType,
      custom_fee: customFee
    }),
  
  // Verificar habilitação do motorista
  checkEligibility: (driverId, serviceType) => 
    api.get(`/api/v1/special-services/drivers/${driverId}/eligibility/${serviceType}`),
  
  // Motoristas habilitados para serviço
  getEligibleDrivers: (serviceType, communityId = null) => {
    const params = communityId ? `?community_id=${communityId}` : '';
    return api.get(`/api/v1/special-services/drivers/eligible/${serviceType}${params}`);
  },
  
  // Criar corrida especial
  createRide: (rideData) => api.post('/api/v1/special-services/rides', rideData),
  
  // Registrar aceite
  recordAcceptance: (rideId, driverId) => 
    api.post(`/api/v1/special-services/rides/${rideId}/accept`, { driver_id: driverId }),
  
  // Histórico do motorista
  getDriverHistory: (driverId, days = 30) => 
    api.get(`/api/v1/special-services/drivers/${driverId}/history?days=${days}`),
  
  // Estatísticas
  getStats: (communityId = null, daysBack = 30) => {
    const params = new URLSearchParams();
    if (communityId) params.append('community_id', communityId);
    params.append('days_back', daysBack);
    return api.get(`/api/v1/special-services/stats?${params}`);
  }
};

// ==================== COMUNIDADES ====================

export const communitiesAPI = {
  // Listar comunidades
  list: () => api.get('/api/v1/communities'),
  
  // Buscar comunidade específica
  get: (id) => api.get(`/api/v1/communities/${id}`),
  
  // Criar comunidade
  create: (communityData) => api.post('/api/v1/communities', communityData)
};

// ==================== MUDANÇA DE COMUNIDADE ====================

export const communityChangeAPI = {
  // Criar solicitação
  createRequest: (requestData) => 
    api.post('/api/v1/community-change/request', requestData),
  
  // Listar solicitações
  getRequests: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return api.get(`/api/v1/community-change/requests?${params}`);
  },
  
  // Buscar solicitação específica
  getRequest: (id) => api.get(`/api/v1/community-change/requests/${id}`),
  
  // Aprovar solicitação
  approve: (id, reviewData) => 
    api.post(`/api/v1/community-change/${id}/approve`, reviewData),
  
  // Rejeitar solicitação
  reject: (id, reviewData) => 
    api.post(`/api/v1/community-change/${id}/reject`, reviewData),
  
  // Histórico do usuário
  getUserHistory: (userId, userType) => 
    api.get(`/api/v1/community-change/history/${userId}/${userType}`),
  
  // Estatísticas
  getStats: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return api.get(`/api/v1/community-change/stats?${params}`);
  }
};

// ==================== INCENTIVOS ====================

export const incentivesAPI = {
  // Completar corrida
  completeRide: (rideData) => 
    api.post('/api/v1/incentives/complete-ride', rideData),
  
  // Ganhos do motorista
  getDriverEarnings: (driverId, filters = {}) => {
    const params = new URLSearchParams(filters);
    return api.get(`/api/v1/incentives/drivers/${driverId}/earnings?${params}`);
  },
  
  // Configuração de bônus
  getBonusConfig: () => api.get('/api/v1/incentives/bonus-config'),
  setBonusConfig: (config) => api.post('/api/v1/incentives/bonus-config', config),
  
  // Atualizar status da comunidade
  updateCommunityStatus: (communityId, status) => 
    api.post(`/api/v1/incentives/communities/${communityId}/update-status`, { status })
};

// ==================== ANALYTICS ====================

export const analyticsAPI = {
  // Métricas de comunidades
  getCommunityMetrics: (communityId = null) => {
    const endpoint = communityId 
      ? `/api/v1/analytics/communities/${communityId}`
      : '/api/v1/analytics/communities';
    return api.get(endpoint);
  },
  
  // Comparar comunidades
  compareCommunities: (communityIds) => 
    api.post('/api/v1/analytics/communities/compare', { community_ids: communityIds }),
  
  // Calcular métricas
  calculateMetrics: () => api.post('/api/v1/analytics/calculate-metrics'),
  
  // Taxa de aceitação
  getAcceptanceRate: (communityId) => 
    api.get(`/api/v1/analytics/communities/${communityId}/acceptance-rate`)
};

// ==================== DASHBOARD ====================

export const dashboardAPI = {
  // Visão geral
  getOverview: () => api.get('/api/v1/dashboard/overview'),
  
  // Comunidades
  getCommunities: () => api.get('/api/v1/dashboard/communities')
};

// ==================== ALERTAS ====================

export const alertsAPI = {
  // Alertas ativos
  getActive: () => api.get('/api/v1/alerts/active'),
  
  // Reconhecer alerta
  acknowledge: (alertId, userId) => 
    api.post(`/api/v1/alerts/${alertId}/acknowledge`, { acknowledged_by: userId }),
  
  // Resolver alerta
  resolve: (alertId, userId, notes) => 
    api.post(`/api/v1/alerts/${alertId}/resolve`, { 
      resolved_by: userId, 
      resolution_notes: notes 
    }),
  
  // Configurar thresholds
  setThresholds: (thresholds) => 
    api.post('/api/v1/alerts/thresholds', thresholds),
  
  // Buscar thresholds
  getThresholds: () => api.get('/api/v1/alerts/thresholds'),
  
  // Estatísticas
  getStats: () => api.get('/api/v1/alerts/stats')
};

// ==================== RELATÓRIOS ====================

export const reportsAPI = {
  // Relatório executivo
  getExecutive: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return api.get(`/api/v1/reports/executive?${params}`);
  },
  
  // Gerar PDF
  generatePDF: (reportId) => 
    api.post(`/api/v1/reports/${reportId}/generate-pdf`),
  
  // Distribuir relatório
  distribute: (reportId, recipients) => 
    api.post(`/api/v1/reports/executive/distribute`, { 
      report_id: reportId, 
      recipients 
    }),
  
  // Histórico
  getHistory: () => api.get('/api/v1/reports/history'),
  
  // Dashboard de relatórios
  getDashboard: () => api.get('/api/v1/reports/dashboard')
};

// ==================== INTERCEPTORS ====================

// Request interceptor para adicionar token se necessário
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

// Response interceptor para tratamento de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    // Redirect para login se não autorizado
    if (error.response?.status === 401) {
      localStorage.removeItem('kaviar_token');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api;
