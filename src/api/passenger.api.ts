import { apiClient } from './client';
import { Ride } from '../types/ride';

interface RequestRideParams {
  origin: { lat: number; lng: number; text?: string };
  destination: { lat: number; lng: number; text?: string };
  type?: string;
}

export const passengerApi = {
  requestRide: async (params: RequestRideParams): Promise<{ ride_id: string; status: string }> => {
    const { data } = await apiClient.post('/api/v2/rides', params);
    return data.data;
  },

  getRide: async (rideId: string): Promise<Ride> => {
    const { data } = await apiClient.get(`/api/v2/rides/${rideId}`);
    return data.data;
  },

  cancelRide: async (rideId: string): Promise<void> => {
    await apiClient.post(`/api/v2/rides/${rideId}/cancel`);
  },
};
