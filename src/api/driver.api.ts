import { apiClient } from './client';
import { Ride, RideOffer } from '../types/ride';

export const driverApi = {
  // v2: Disponibilidade
  setAvailability: (availability: 'online' | 'offline') =>
    apiClient.post('/api/v2/drivers/me/availability', { availability }),

  goOnline: () => apiClient.post('/api/v2/drivers/me/availability', { availability: 'online' }),
  goOffline: () => apiClient.post('/api/v2/drivers/me/availability', { availability: 'offline' }),

  // v2: Localização
  sendLocation: (lat: number, lng: number) =>
    apiClient.post('/api/v2/drivers/me/location', { lat, lng }),

  // v2: Ofertas
  getOffers: async (): Promise<RideOffer[]> => {
    const { data } = await apiClient.get('/api/v2/drivers/me/offers');
    return data.data || [];
  },

  acceptOffer: async (offerId: string): Promise<{ ride_id: string }> => {
    const { data } = await apiClient.post(`/api/v2/drivers/offers/${offerId}/accept`);
    return data.data;
  },

  rejectOffer: (offerId: string) =>
    apiClient.post(`/api/v2/drivers/offers/${offerId}/reject`),

  // v2: Corrida ativa
  getCurrentRide: async (): Promise<Ride | null> => {
    const { data } = await apiClient.get('/api/v2/drivers/me/current-ride');
    return data.data || null;
  },

  // v2: Lifecycle da corrida
  arrived: (rideId: string) =>
    apiClient.post(`/api/v2/rides/${rideId}/arrived`),

  startRide: (rideId: string) =>
    apiClient.post(`/api/v2/rides/${rideId}/start`),

  completeRide: async (rideId: string) => {
    const { data } = await apiClient.post(`/api/v2/rides/${rideId}/complete`);
    return data;
  },

  // v2: Location update durante corrida (emite SSE para passageiro)
  sendRideLocation: (rideId: string, lat: number, lng: number) =>
    apiClient.post(`/api/v2/rides/${rideId}/location`, { lat, lng }),

  // v2: Créditos
  getCredits: async (): Promise<{ balance: number }> => {
    const { data } = await apiClient.get('/api/v2/drivers/me/credits');
    return data.data;
  },

  getCreditPackages: async (): Promise<{ id: string; credits: number; price: number; priceCents: number }[]> => {
    const { data } = await apiClient.get('/api/v2/drivers/me/credits/packages');
    return data.data || [];
  },

  purchaseCredits: async (packageId: string) => {
    const { data } = await apiClient.post('/api/v2/drivers/me/credits/purchase', { packageId });
    return data.data;
  },

  getCreditPurchases: async () => {
    const { data } = await apiClient.get('/api/v2/drivers/me/credits/purchases');
    return data.data || [];
  },

  // v1: Perfil (não tem v2 equivalente)
  getMe: async () => {
    const { data } = await apiClient.get('/api/drivers/me');
    return data;
  },
};
