// Tipos de corrida (v2)
export type RideStatus =
  | 'requested' | 'offered' | 'accepted' | 'arrived'
  | 'in_progress' | 'completed'
  | 'canceled_by_passenger' | 'canceled_by_driver' | 'no_driver';

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'canceled';

export interface Ride {
  id: string;
  driver_id?: string;
  passenger_id: string;
  status: RideStatus;
  ride_type: string;
  origin_lat: number;
  origin_lng: number;
  origin_text?: string;
  dest_lat: number;
  dest_lng: number;
  destination_text?: string;
  requested_at: string;
  accepted_at?: string;
  arrived_at?: string;
  started_at?: string;
  completed_at?: string;
  passenger?: { name: string; phone?: string };
  driver?: { name: string; phone?: string; vehicle_model?: string; vehicle_plate?: string; vehicle_color?: string; id?: string; last_lat?: number; last_lng?: number };
}

export interface RideOffer {
  id: string;
  ride_id: string;
  driver_id: string;
  status: OfferStatus;
  sent_at: string;
  expires_at: string;
  ride: {
    id: string;
    status: RideStatus;
    ride_type: string;
    origin_lat: number;
    origin_lng: number;
    origin_text?: string;
    dest_lat: number;
    dest_lng: number;
    destination_text?: string;
    requested_at: string;
    passenger?: { name: string };
  };
}

// Labels para exibição
export const RIDE_STATUS_LABEL: Record<RideStatus, string> = {
  requested: 'Solicitada',
  offered: 'Ofertada',
  accepted: 'Aceita',
  arrived: 'Motorista chegou',
  in_progress: 'Em andamento',
  completed: 'Finalizada',
  canceled_by_passenger: 'Cancelada pelo passageiro',
  canceled_by_driver: 'Cancelada pelo motorista',
  no_driver: 'Sem motorista',
};
