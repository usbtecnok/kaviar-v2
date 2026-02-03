/**
import { API_BASE_URL } from '../config/api';
 * Feature Flags Service
 * Verifica quais funcionalidades estão habilitadas no backend
 */


export const checkPremiumTourismEnabled = async () => {
  try {
    // Método principal: verificar via health endpoint
    const healthResponse = await fetch(`${API_BASE_URL}/api/health`);
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      return health.features?.premium_tourism === true;
    }

    // Fallback: tentar endpoint governance
    const fallbackResponse = await fetch(`${API_BASE_URL}/api/governance/tour-packages`);
    return fallbackResponse.status !== 404;
    
  } catch (error) {
    console.warn('Error checking Premium Tourism feature flag:', error);
    return false;
  }
};

export const getFeatureFlags = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (response.ok) {
      const health = await response.json();
      return health.features || {};
    }
    return {};
  } catch (error) {
    console.warn('Error getting feature flags:', error);
    return {};
  }
};
