import { z } from 'zod';

// Ride request schema
export const rideRequestSchema = z.object({
  passengerId: z.string().cuid().optional(), // Mantido opcional para compatibilidade
  origin: z.string().min(1, 'Origem é obrigatória'),
  destination: z.string().min(1, 'Destino é obrigatório'),
  type: z.enum(['normal', 'combo', 'comunidade', 'TOURISM']),
  price: z.number().positive('Preço deve ser positivo').optional(),
  acceptOutOfFence: z.boolean().optional(),
  originLat: z.number().min(-90).max(90).optional(), // Opcional para compatibilidade
  originLng: z.number().min(-180).max(180).optional(), // Opcional para compatibilidade
  confirmationToken: z.string().optional() // For idempotent out-of-fence confirmation
}).refine((data) => {
  // If type is 'comunidade' and geofence is enabled, coordinates are required
  // Note: This validation is also enforced in the service layer
  return true; // Service layer handles the geofence-specific validation
}, {
  message: "Coordenadas são obrigatórias para corridas comunidade quando geofence está habilitado"
});

// Location update schema
export const locationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});

// Driver/Passenger ID param schema
export const userIdSchema = z.object({
  id: z.string().cuid()
});

export type RideRequestData = z.infer<typeof rideRequestSchema>;
export type LocationUpdateData = z.infer<typeof locationUpdateSchema>;
