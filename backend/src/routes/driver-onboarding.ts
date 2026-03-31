import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { driverRegistrationService } from '../services/driver-registration.service';

const router = Router();

const driverOnboardingSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone é obrigatório'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  document_cpf: z.string().min(11, 'CPF deve ter 11 dígitos').max(11, 'CPF deve ter 11 dígitos'),
  vehicle_color: z.string().min(2, 'Cor do veículo é obrigatória'),
  vehicle_model: z.string().nullable().optional(),
  vehicle_plate: z.string().nullable().optional(),
  accepted_terms: z.boolean().refine(val => val === true, {
    message: 'Você deve aceitar os termos de uso'
  }),
  neighborhoodId: z.string().optional(),
  communityId: z.string().optional(),
  lat: z.number({ required_error: 'Localização GPS é obrigatória' }),
  lng: z.number({ required_error: 'Localização GPS é obrigatória' }),
  familyBonusAccepted: z.boolean().optional(),
  familyProfile: z.string().optional()
});

// POST /api/driver/onboarding - Cadastro público de motorista (web)
router.post('/onboarding', async (req: Request, res: Response) => {
  try {
    const data = driverOnboardingSchema.parse(req.body);

    // Chamar mesma service do endpoint do app
    const result = await driverRegistrationService.register({
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      document_cpf: data.document_cpf,
      vehicle_color: data.vehicle_color,
      vehicle_model: data.vehicle_model ?? undefined,
      vehicle_plate: data.vehicle_plate ?? undefined,
      accepted_terms: data.accepted_terms,
      neighborhoodId: data.neighborhoodId,
      communityId: data.communityId,
      lat: data.lat,
      lng: data.lng,
      familyBonusAccepted: data.familyBonusAccepted,
      familyProfile: data.familyProfile as 'individual' | 'familiar' | undefined,
      verificationMethod: 'GPS_AUTO',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || undefined
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Cadastro realizado com sucesso',
      data: {
        id: result.driver!.id,
        name: result.driver!.name,
        email: result.driver!.email,
        status: result.driver!.status
      },
      token: result.token
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0].message
      });
    }
    console.error('Error in driver onboarding:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao realizar cadastro'
    });
  }
});

export default router;
