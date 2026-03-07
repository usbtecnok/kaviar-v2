import { apiClient } from './client';

// API de motorista
export const driverApi = {
  setOnline: async (): Promise<void> => {
    await apiClient.post('/drivers/me/online');
  },

  acceptRide: async (rideId: string): Promise<void> => {
    await apiClient.put(`/rides/${rideId}/accept`);
  },

  completeRide: async (rideId: string): Promise<void> => {
    await apiClient.put(`/rides/${rideId}/complete`);
  },
};
