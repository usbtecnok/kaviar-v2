// Tipos de corrida
export type RideStatus = 'requested' | 'accepted' | 'completed' | 'cancelled';

export interface Ride {
  id: string;
  driver_id?: string;
  passenger_id: string;
  origin: string;
  destination: string;
  status: RideStatus;
  price: number;
  created_at: string;
  updated_at: string;
}
