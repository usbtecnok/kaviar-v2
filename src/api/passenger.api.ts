import { apiClient } from './client';
import { Ride } from '../types/ride';

interface RequestRideParams {
  origin: { lat: number; lng: number; text?: string };
  destination: { lat: number; lng: number; text?: string };
  type?: string;
  trip_details?: { passengers: number; has_luggage: boolean };
  scheduled_for?: string;
  wait_requested?: boolean;
  wait_estimated_min?: number;
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

  respondAdjustment: async (rideId: string, accept: boolean): Promise<{ success: boolean; status: string }> => {
    const { data } = await apiClient.post(`/api/v2/rides/${rideId}/adjustment-response`, { accept });
    return data;
  },

  sendBoardingStatus: async (rideId: string, status: 'at_door' | 'descending' | '2_minutes'): Promise<void> => {
    await apiClient.post(`/api/v2/rides/${rideId}/boarding-status`, { status });
  },

  getActiveRide: async (): Promise<Ride | null> => {
    const { data } = await apiClient.get('/api/v2/rides/active');
    return data.data;
  },

  triggerEmergency: async (rideId: string): Promise<{ event_id: string }> => {
    const { data } = await apiClient.post(`/api/v2/rides/${rideId}/emergency`);
    return data;
  },
};
