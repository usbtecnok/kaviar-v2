import { z } from 'zod';

// Driver consent schema
export const driverConsentSchema = z.object({
  driverId: z.string().cuid(),
  consentType: z.enum(['lgpd', 'terms', 'privacy']),
  accepted: z.boolean(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional()
});

// Document submission schema
export const documentSubmissionSchema = z.object({
  documents: z.array(z.object({
    type: z.enum(['CPF', 'RG', 'CNH', 'PROOF_OF_ADDRESS', 'VEHICLE_PHOTO', 'BACKGROUND_CHECK']),
    file_url: z.string().url()
  })),
  communityId: z.string().cuid().optional()
});

// Document verification schema (admin)
export const documentVerificationSchema = z.object({
  adminId: z.string().cuid()
});

// Document rejection schema (admin)
export const documentRejectionSchema = z.object({
  adminId: z.string().cuid(),
  reason: z.string().min(1, 'Motivo da rejeição é obrigatório')
});

// Driver ID param schema
export const driverIdSchema = z.object({
  id: z.string().cuid()
});

// Document ID param schema
export const documentIdSchema = z.object({
  docId: z.string().cuid()
});

export type DriverConsentRequest = z.infer<typeof driverConsentSchema>;
export type DocumentSubmissionRequest = z.infer<typeof documentSubmissionSchema>;
export type DocumentVerificationRequest = z.infer<typeof documentVerificationSchema>;
export type DocumentRejectionRequest = z.infer<typeof documentRejectionSchema>;
