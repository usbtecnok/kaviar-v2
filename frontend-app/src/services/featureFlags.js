/**
 * Feature Flags Service
 * Verifica quais funcionalidades estão habilitadas no backend
 */
import { apiClient } from '../lib/apiClient';

export const checkPremiumTourismEnabled = async () => {
  try {
    // Método principal: verificar via health endpoint
    const { data: health } = await apiClient.get('/api/health');
    if (health) {
      return health.features?.premium_tourism === true;
    }

    // Fallback: tentar endpoint governance
    try {
      await apiClient.get('/api/governance/tour-packages');
      return true;
    } catch {
      return false;
    }
    
  } catch (error) {
    console.warn('Error checking Premium Tourism feature flag:', error);
    return false;
  }
};

export const getFeatureFlags = async () => {
  try {
    const { data: health } = await apiClient.get('/api/health');
    return health?.features || {};
  } catch (error) {
    console.warn('Error getting feature flags:', error);
    return {};
  }
};
