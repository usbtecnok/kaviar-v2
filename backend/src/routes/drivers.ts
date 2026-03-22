import { Router, Request, Response } from 'express';
import { authenticateDriver } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { GeoResolveService } from '../services/geo-resolve';
import { uploadToS3 } from '../config/s3-upload';

const router = Router();
const geoResolveService = new GeoResolveService();

// GET /api/drivers/me - Retornar dados do motorista autenticado
router.get('/me', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).userId;

    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        available: true,
        vehicle_color: true,
        vehicle_model: true,
        vehicle_plate: true,
        neighborhood_id: true,
        community_id: true,
        created_at: true,
        approved_at: true,
      }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Motorista não encontrado'
      });
    }

    res.json({
      success: true,
      driver
    });
  } catch (error) {
    console.error('Error fetching driver:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar dados do motorista'
    });
  }
});

const completeProfileSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  phone: z.string().min(1, 'Telefone é obrigatório').optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  terms_accepted: z.literal(true, { errorMap: () => ({ message: 'Termos devem ser aceitos' }) }),
  privacy_accepted: z.literal(true, { errorMap: () => ({ message: 'Política de privacidade deve ser aceita' }) }),
  terms_version: z.string().min(1, 'Versão dos termos é obrigatória')
});

// POST /api/drivers/me/complete-profile
router.post('/me/complete-profile', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).userId;
    
    const data = completeProfileSchema.parse(req.body);

    // Resolve geolocation to neighborhood
    const geoResult = await geoResolveService.resolveCoordinates(data.latitude, data.longitude);

    // Prepare update data - only include name/phone if provided
    const updateData: any = {
      last_lat: data.latitude,
      last_lng: data.longitude,
      last_location_updated_at: new Date(),
      updated_at: new Date()
    };

    if (data.name) updateData.name = data.name;
    if (data.phone) updateData.phone = data.phone;

    // Update driver basic info and location
    await prisma.drivers.update({
      where: { id: driverId },
      data: updateData
    });

    // Store consent in dedicated table
    await prisma.driver_consents.upsert({
      where: { driver_id: driverId },
      create: {
        driver_id: driverId,
        terms_accepted_at: new Date(),
        privacy_accepted_at: new Date(),
        terms_version: data.terms_version
      },
      update: {
        terms_accepted_at: new Date(),
        privacy_accepted_at: new Date(),
        terms_version: data.terms_version
      }
    });

    res.json({
      success: true,
      message: 'Perfil completado com sucesso',
      data: {
        neighborhood: geoResult.resolvedArea?.name || null,
        profile_complete: true
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false,
        error: error.errors[0].message 
      });
    }
    console.error('Error completing profile:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao completar perfil'
    });
  }
});

// POST /api/drivers/me/online
router.post('/me/online', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).userId;

    // Verificar se motorista está aprovado
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: { status: true }
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Motorista não encontrado'
      });
    }

    if (driver.status !== 'approved') {
      return res.status(403).json({
        success: false,
        error: 'Apenas motoristas aprovados podem ficar online',
        currentStatus: driver.status
      });
    }

    // Atualizar campo correto (available, não status)
    await prisma.drivers.update({
      where: { id: driverId },
      data: {
        available: true,
        available_updated_at: new Date(),
        last_active_at: new Date()
      }
    });

    res.json({
      success: true,
      available: true
    });
  } catch (error) {
    console.error('Error setting driver online:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar status'
    });
  }
});

// GET /api/drivers/me/documents
router.get('/me/documents', authenticateDriver, async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).userId || (req as any).user?.id || (req as any).driver?.id;
    
    if (!driverId) {
      return res.status(401).json({
        success: false,
        error: 'Não autenticado'
      });
    }

    const documents = await prisma.driver_documents.findMany({
      where: { driver_id: driverId },
      orderBy: { created_at: 'desc' }
    });

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Error getting driver documents:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar documentos'
    });
  }
});

// POST /api/drivers/me/documents (multi-file upload)
router.post('/me/documents', authenticateDriver, uploadToS3.fields([
  { name: 'cpf', maxCount: 1 },
  { name: 'rg', maxCount: 1 },
  { name: 'cnh', maxCount: 1 },
  { name: 'proofOfAddress', maxCount: 1 },
  { name: 'vehiclePhoto', maxCount: 5 },
  { name: 'backgroundCheck', maxCount: 1 },
  { name: 'certidao', maxCount: 1 } // alias temporário
]), async (req: Request, res: Response) => {
  try {
    const driverId = (req as any).userId || (req as any).user?.id || (req as any).driver?.id;
    
    // ✅ LOG ESTRUTURADO: Início
    console.log(JSON.stringify({
      level: 'info',
      action: 'upload_start',
      driverId,
      ip: (req as any).ip || req.headers['x-forwarded-for'] || 'unknown',
      timestamp: new Date().toISOString()
    }));
    
    // ✅ VALIDAÇÃO 2: Rate limiting (3 tentativas / 10 minutos)
    const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();
    const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutos
    const RATE_LIMIT_MAX = 3;

    if (driverId) {
      const now = Date.now();
      const rateData = RATE_LIMIT_MAP.get(driverId);

      if (rateData) {
        if (now < rateData.resetAt) {
          if (rateData.count >= RATE_LIMIT_MAX) {
            const retryAfter = Math.ceil((rateData.resetAt - now) / 1000);
            return res.status(429).json({
              success: false,
              error: 'RATE_LIMIT',
              message: `Limite de ${RATE_LIMIT_MAX} uploads atingido. Tente novamente em ${Math.ceil(retryAfter / 60)} minutos`,
              retryAfter
            });
          }
          rateData.count++;
        } else {
          RATE_LIMIT_MAP.set(driverId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
        }
      } else {
        RATE_LIMIT_MAP.set(driverId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
      }
    }

    if (!driverId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Usuário não autenticado'
      });
    }

    const files = req.files as Record<string, Express.Multer.File[]>;

    // ✅ VALIDAÇÃO 1: MIME types e tamanho
    const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB

    if (files) {
      for (const [fieldName, fileArray] of Object.entries(files)) {
        for (const file of fileArray) {
          // Validar MIME type
          if (!ALLOWED_MIMES.includes(file.mimetype)) {
            return res.status(400).json({
              success: false,
              error: 'INVALID_FILE_TYPE',
              message: `Arquivo ${file.originalname} tem tipo inválido. Aceitos: JPEG, PNG, PDF`,
              field: fieldName,
              receivedType: file.mimetype
            });
          }
          // Validar tamanho
          if (file.size > MAX_SIZE) {
            return res.status(400).json({
              success: false,
              error: 'FILE_TOO_LARGE',
              message: `Arquivo ${file.originalname} excede 5MB (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
              field: fieldName,
              maxSize: '5MB'
            });
          }
        }
      }
    }

    // Alias temporário: certidao -> backgroundCheck
    if ((!files?.backgroundCheck || files.backgroundCheck.length === 0) && files?.certidao?.length) {
      files.backgroundCheck = files.certidao;
    }

    // Validar arquivos obrigatórios
    const missing: string[] = [];
    // Verificar se é reenvio (já tem documentos no banco)
    const existingDocs = await prisma.driver_documents.findMany({
      where: { driver_id: driverId },
      select: { type: true }
    });
    const isResubmit = existingDocs.length > 0;

    const requireOne = (key: string) => {
      if (!files?.[key] || files[key].length === 0) {
        missing.push(key);
      }
    };

    // Primeiro envio: exigir todos. Reenvio: aceitar parcial.
    if (!isResubmit) {
      requireOne('cpf');
      requireOne('rg');
      requireOne('cnh');
      requireOne('proofOfAddress');
      requireOne('vehiclePhoto');
      requireOne('backgroundCheck');

      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_FILES',
          message: 'Documentos obrigatórios pendentes',
          missingFiles: missing
        });
      }
    } else {
      // Reenvio: precisa de pelo menos 1 arquivo
      const sentKeys = files ? Object.keys(files).filter(k => files[k]?.length > 0) : [];
      if (sentKeys.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'NO_FILES',
          message: 'Envie pelo menos um documento'
        });
      }
      console.log(JSON.stringify({
        level: 'info',
        action: 'upload_resubmit',
        driverId,
        files: sentKeys,
        timestamp: new Date().toISOString()
      }));
    }

    // Construir URLs dos arquivos (S3 key ou local filename)
    const fileUrl = (f: any) => f.key || `certidoes/${f.filename}`;

    // Construir lista de documentos a persistir (só os enviados)
    const docTypesToUpsert: Array<{ type: string; url: string }> = [];
    const typeMap: Record<string, string> = {
      cpf: 'CPF', rg: 'RG', cnh: 'CNH',
      proofOfAddress: 'PROOF_OF_ADDRESS',
      vehiclePhoto: 'VEHICLE_PHOTO',
      backgroundCheck: 'BACKGROUND_CHECK',
      certidao: 'BACKGROUND_CHECK',
    };

    if (files) {
      // Alias: certidao -> backgroundCheck
      if ((!files.backgroundCheck || files.backgroundCheck.length === 0) && files.certidao?.length) {
        files.backgroundCheck = files.certidao;
      }
      for (const [key, fileArray] of Object.entries(files)) {
        if (fileArray?.length > 0 && typeMap[key]) {
          docTypesToUpsert.push({ type: typeMap[key], url: fileUrl(fileArray[0]) });
        }
      }
    }

    // Extrair dados adicionais do body (aceitar ambos formatos)
    const vehicleColor = req.body.vehicleColor || req.body.vehicle_color;
    const vehiclePlate = req.body.vehiclePlate || req.body.vehicle_plate;
    const vehicleModel = req.body.vehicleModel || req.body.vehicle_model;
    const { pix_key, pix_key_type, communityId, lgpdAccepted, termsAccepted } = req.body;

    // Persistir documentos em transação
    let upsertedCount = 0;
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Atualizar driver (campos legacy — só se enviados)
        const updateData: any = { updated_at: new Date() };
        const bgDoc = docTypesToUpsert.find(d => d.type === 'BACKGROUND_CHECK');
        if (bgDoc) updateData.certidao_nada_consta_url = bgDoc.url;

        if (pix_key) updateData.pix_key = pix_key;
        if (pix_key_type) updateData.pix_key_type = pix_key_type;
        if (vehiclePlate) updateData.vehicle_plate = vehiclePlate;
        if (vehicleModel) updateData.vehicle_model = vehicleModel;
        if (vehicleColor) updateData.vehicle_color = vehicleColor;
        if (communityId) updateData.community_id = communityId;

        await tx.drivers.update({
          where: { id: driverId },
          data: updateData
        });

        // 2. Persistir em driver_documents (só os enviados)
        for (const doc of docTypesToUpsert) {
          await tx.driver_documents.upsert({
            where: {
              driver_id_type: { driver_id: driverId, type: doc.type }
            },
            create: {
              id: `doc_${driverId}_${doc.type}_${Date.now()}`,
              driver_id: driverId,
              type: doc.type,
              file_url: doc.url,
              status: 'SUBMITTED',
              submitted_at: new Date(),
              updated_at: new Date()
            },
            update: {
              file_url: doc.url,
              status: 'SUBMITTED',
              submitted_at: new Date(),
              rejected_at: null,
              rejected_by_admin_id: null,
              reject_reason: null,
              updated_at: new Date()
            }
          });
          upsertedCount++;
        }

        // 3. Persistir BACKGROUND_CHECK em compliance (só se enviado)
        if (bgDoc) {
          await tx.driver_compliance_documents.create({
            data: {
              id: `compliance_${driverId}_${Date.now()}`,
              driver_id: driverId,
              type: 'criminal_record',
              file_url: bgDoc.url,
              status: 'pending',
              lgpd_consent_accepted: lgpdAccepted === 'true' || lgpdAccepted === true,
              lgpd_consent_ip: (req as any).ip || req.headers['x-forwarded-for'] || 'unknown',
              lgpd_consent_at: new Date(),
              created_at: new Date(),
              updated_at: new Date()
            }
          });
        }

        // 4. Sync LGPD consent to consents table (required by approval validation)
        if (lgpdAccepted === 'true' || lgpdAccepted === true) {
          await tx.consents.upsert({
            where: {
              subject_type_subject_id_type: {
                subject_type: 'DRIVER',
                subject_id: driverId,
                type: 'lgpd'
              }
            },
            update: {
              accepted: true,
              accepted_at: new Date(),
              ip_address: (req as any).ip || req.headers['x-forwarded-for'] || 'unknown',
              user_agent: req.headers['user-agent'] || 'unknown'
            },
            create: {
              id: `consent_${driverId}_lgpd_${Date.now()}`,
              user_id: driverId,
              subject_type: 'DRIVER',
              subject_id: driverId,
              type: 'lgpd',
              accepted: true,
              accepted_at: new Date(),
              ip_address: (req as any).ip || req.headers['x-forwarded-for'] || 'unknown',
              user_agent: req.headers['user-agent'] || 'unknown'
            }
          });
        }

        // 5. Sync community to driver_verifications (required by approval validation)
        if (communityId) {
          await tx.driver_verifications.upsert({
            where: { driver_id: driverId },
            update: {
              community_id: communityId,
              updated_at: new Date()
            },
            create: {
              id: `verification_${driverId}`,
              driver_id: driverId,
              community_id: communityId,
              status: 'PENDING',
              created_at: new Date(),
              updated_at: new Date()
            }
          });
        }
      });
    } catch (txError) {
      console.error('❌ Transaction failed:', txError);
      throw txError; // Re-throw para ser capturado pelo catch externo
    }

    // ✅ LOG ESTRUTURADO: Sucesso
    const uploadedTypes = docTypesToUpsert.map(d => d.type);
    console.log(JSON.stringify({
      level: 'info',
      action: 'upload_success',
      driverId,
      isResubmit,
      uploadedTypes,
      savedDriverDocuments: upsertedCount,
      timestamp: new Date().toISOString()
    }));

    res.json({
      success: true,
      message: 'Documentos enviados com sucesso',
      received: uploadedTypes,
      savedDriverDocuments: upsertedCount,
      data: Object.fromEntries(docTypesToUpsert.map(d => [d.type, d.url]))
    });
  } catch (error) {
    const driverId = (req as any).userId;
    
    // ✅ LOG ESTRUTURADO: Erro
    console.error(JSON.stringify({
      level: 'error',
      action: 'upload_failed',
      driverId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      filesReceived: req.files ? Object.keys(req.files as any) : [],
      timestamp: new Date().toISOString()
    }));

    console.error('❌ Error uploading documents:', error);
    console.error('Driver ID:', (req as any).userId);
    console.error('Files received:', req.files ? Object.keys(req.files as any) : 'none');
    
    // ✅ Detectar erro de conexão Prisma
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isPrismaError = errorMessage.includes('Closed') || 
                          errorMessage.includes('connection') || 
                          errorMessage.includes('PrismaClient');
    
    if (isPrismaError) {
      return res.status(500).json({
        success: false,
        error: 'DB_WRITE_FAILED',
        message: 'Falha ao salvar documentos no banco de dados. Tente novamente.'
      });
    }
    res.status(500).json({
      success: false,
      error: 'UPLOAD_FAILED',
      message: error instanceof Error ? error.message : 'Falha ao enviar documentos'
    });
  }
});

// PATCH /api/drivers/location (MVP - sem auth para seed/testing)
const locationSchema = z.object({
  driverId: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});

router.patch('/location', async (req: Request, res: Response) => {
  try {
    const data = locationSchema.parse(req.body);

    const driver = await prisma.drivers.findUnique({ where: { id: data.driverId } });
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Motorista não encontrado' });
    }

    await prisma.drivers.update({
      where: { id: data.driverId },
      data: {
        last_lat: data.lat,
        last_lng: data.lng,
        last_location_updated_at: new Date(),
        updated_at: new Date()
      }
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    console.error('Error updating location:', error);
    res.status(500).json({ success: false, error: 'Erro ao atualizar localização' });
  }
});

export default router;
