import { apiClient } from './client';
import { Ride } from '../types/ride';

// API de corridas
export const ridesApi = {
  requestRide: async (origin: string, destination: string): Promise<Ride> => {
    const response = await apiClient.post('/rides', {
      pickup: { lat: 0, lng: 0 }, // TODO: Usar coordenadas reais
      dropoff: { lat: 0, lng: 0 },
      passengerId: 'current-user', // TODO: Pegar do auth store
      origin,
      destination,
    });
    return response.data;
  },

  getRide: async (rideId: string): Promise<Ride> => {
    const response = await apiClient.get(`/rides/${rideId}`);
    return response.data;
  },

  rateDriver: async (rideId: string, rating: number, comment?: string): Promise<void> => {
    await apiClient.post('/ratings', {
      rideId,
      rating,
      comment,
      raterType: 'PASSENGER',
    });
  },
};
