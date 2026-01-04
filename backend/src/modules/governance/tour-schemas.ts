import { z } from 'zod';

export const createTourBookingSchema = z.object({
  tourPackageId: z.string().cuid(),
  passengerName: z.string().min(1, 'Nome é obrigatório').max(100),
  passengerEmail: z.string().email('Email inválido'),
  passengerPhone: z.string().min(1, 'Telefone é obrigatório').max(20),
  passengerCount: z.number().int().min(1, 'Mínimo 1 passageiro').max(8, 'Máximo 8 passageiros'),
  scheduledDate: z.string().transform(val => new Date(val)),
  specialRequests: z.string().max(500).optional().nullable(),
  emergencyContact: z.string().min(1, 'Contato de emergência é obrigatório').max(100),
  emergencyPhone: z.string().min(1, 'Telefone de emergência é obrigatório').max(20)
});

export type CreateTourBookingData = z.infer<typeof createTourBookingSchema>;
