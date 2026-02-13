import { z } from 'zod';

// Pagination schema
export const paginationSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
});

// Drivers query schema
export const driversQuerySchema = paginationSchema.extend({
  status: z.enum(['pending', 'approved', 'suspended', 'rejected']).optional(),
  search: z.string().optional(), // Search by name or email
  dateFrom: z.string().optional(), // Filter by creation date
  dateTo: z.string().optional(),
  sortBy: z.enum(['name', 'email', 'createdAt', 'lastActiveAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Driver suspension schema
export const suspendDriverSchema = z.object({
  reason: z.string().min(1, 'Motivo da suspensão é obrigatório'),
});

// Passengers query schema
export const passengersQuerySchema = paginationSchema;

// Rides query schema
export const ridesQuerySchema = paginationSchema.extend({
  status: z.enum(['requested', 'accepted', 'arrived', 'started', 'completed', 'paid', 'cancelled_by_user', 'cancelled_by_driver', 'cancelled_by_admin']).optional(),
  type: z.enum(['normal', 'combo', 'comunidade', 'TOURISM']).optional(),
  driver_id: z.string().optional(),
  passengerId: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['created_at', 'updated_at', 'price', 'status']).optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Status update schema
export const updateStatusSchema = z.object({
  status: z.enum(['requested', 'accepted', 'arrived', 'started', 'completed', 'paid']),
  reason: z.string().min(1, 'Justificativa é obrigatória'),
});

// Audit query schema
export const auditQuerySchema = paginationSchema.extend({
  rideId: z.string().optional(),
  adminId: z.string().optional(),
  action: z.enum(['cancel', 'force_complete', 'status_update', 'reassign_driver']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// Ride cancellation schema
export const cancelRideSchema = z.object({
  reason: z.string().min(1, 'Motivo do cancelamento é obrigatório'),
});

// Ride reassignment schema
export const reassignRideSchema = z.object({
  newDriverId: z.string().cuid('ID do motorista inválido'),
  reason: z.string().min(1, 'Motivo da reatribuição é obrigatório'),
});

// Force complete ride schema
export const forceCompleteRideSchema = z.object({
  reason: z.string().min(1, 'Motivo da finalização forçada é obrigatório'),
});

// Ride ID param schema
export const rideIdSchema = z.object({
  id: z.string().min(1),
});

// Driver ID param schema
export const driverIdSchema = z.object({
  id: z.string().cuid(),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;
export type DriversQuery = z.infer<typeof driversQuerySchema>;
export type SuspendDriverData = z.infer<typeof suspendDriverSchema>;
export type PassengersQuery = z.infer<typeof passengersQuerySchema>;
export type RidesQuery = z.infer<typeof ridesQuerySchema>;
export type CancelRideData = z.infer<typeof cancelRideSchema>;
export type ReassignRideData = z.infer<typeof reassignRideSchema>;
export type ForceCompleteRideData = z.infer<typeof forceCompleteRideSchema>;
export type UpdateStatusData = z.infer<typeof updateStatusSchema>;
export type AuditQuery = z.infer<typeof auditQuerySchema>;
export type RideIdParam = z.infer<typeof rideIdSchema>;
export type DriverIdParam = z.infer<typeof driverIdSchema>;
