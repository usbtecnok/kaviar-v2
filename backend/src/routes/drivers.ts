import { Router, Request, Response } from 'express';
import { authenticateDriver } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { GeoResolveService } from '../services/geo-resolve';
import { uploadToS3 } from '../config/s3-upload';

const router = Router();
const geoResolveService = new GeoResolveService();

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
    console.log('[complete-profile] Driver ID:', driverId);
    
    const data = completeProfileSchema.parse(req.body);
    console.log('[complete-profile] Data validated');

    // Resolve geolocation to neighborhood
    const geoResult = await geoResolveService.resolveCoordinates(data.latitude, data.longitude);
    console.log('[complete-profile] Geo result:', geoResult);

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
    console.log('[complete-profile] Driver updated');

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
    console.log('[complete-profile] Consent saved');

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

    await prisma.drivers.update({
      where: { id: driverId },
      data: {
        status: 'online',
        last_active_at: new Date(),
        updated_at: new Date()
      }
    });

    res.json({
      success: true,
      status: 'online'
    });
  } catch (error) {
    console.error('Error setting driver online:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar status'
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
    
    console.log('[UPLOAD] Driver ID:', driverId);
    console.log('[UPLOAD] Files received:', req.files ? Object.keys(req.files) : 'NONE');
    console.log('[UPLOAD] Body keys:', Object.keys(req.body));
    
    if (!driverId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Usuário não autenticado'
      });
    }

    const files = req.files as Record<string, Express.Multer.File[]>;

    // Log detalhado dos arquivos
    if (files) {
      Object.entries(files).forEach(([key, fileArray]) => {
        console.log(`[UPLOAD] ${key}:`, fileArray.map(f => `${f.originalname} (${f.size} bytes)`));
      });
    }

    // Alias temporário: certidao -> backgroundCheck
    if ((!files?.backgroundCheck || files.backgroundCheck.length === 0) && files?.certidao?.length) {
      files.backgroundCheck = files.certidao;
    }

    // Validar arquivos obrigatórios
    const missing: string[] = [];
    const requireOne = (key: string) => {
      if (!files?.[key] || files[key].length === 0) {
        missing.push(key);
      }
    };

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

    // Construir URLs dos arquivos (S3 keys)
    const cpfUrl = (files.cpf[0] as any).key;
    const rgUrl = (files.rg[0] as any).key;
    const cnhUrl = (files.cnh[0] as any).key;
    const proofOfAddressUrl = (files.proofOfAddress[0] as any).key;
    const vehiclePhotoUrls = files.vehiclePhoto.map((f: any) => f.key);
    const backgroundCheckUrl = (files.backgroundCheck[0] as any).key;

    // Extrair dados adicionais do body (aceitar ambos formatos)
    const vehicleColor = req.body.vehicleColor || req.body.vehicle_color;
    const vehiclePlate = req.body.vehiclePlate || req.body.vehicle_plate;
    const vehicleModel = req.body.vehicleModel || req.body.vehicle_model;
    const { pix_key, pix_key_type, communityId, lgpdAccepted, termsAccepted } = req.body;

    console.log('[DOCS] vehicleColor incoming:', vehicleColor);
    console.log('[DOCS] vehiclePlate incoming:', vehiclePlate);
    console.log('[DOCS] vehicleModel incoming:', vehicleModel);
    console.log('[DOCS] Full body keys:', Object.keys(req.body));

    // Persistir documentos em transação
    let upsertedCount = 0;
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Atualizar driver (campos legacy)
        const updateData: any = {
          certidao_nada_consta_url: backgroundCheckUrl,
          updated_at: new Date()
        };

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
        console.log(`  ✓ Updated driver ${driverId} with vehicle_color:`, vehicleColor);

        // 2. Persistir em driver_documents (para validação de aprovação)
        const docTypes = [
          { type: 'CPF', url: cpfUrl },
          { type: 'RG', url: rgUrl },
          { type: 'CNH', url: cnhUrl },
          { type: 'PROOF_OF_ADDRESS', url: proofOfAddressUrl },
          { type: 'VEHICLE_PHOTO', url: vehiclePhotoUrls[0] }, // primeira foto
          { type: 'BACKGROUND_CHECK', url: backgroundCheckUrl }
        ];

        for (const doc of docTypes) {
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
              updated_at: new Date()
            }
          });
          console.log(`  ✓ Upserted driver_document: ${doc.type}`);
          upsertedCount++;
        }

        // 3. Persistir BACKGROUND_CHECK em driver_compliance_documents (para Admin/Compliance)
        await tx.driver_compliance_documents.create({
          data: {
            id: `compliance_${driverId}_${Date.now()}`,
            driver_id: driverId,
            type: 'criminal_record',
            file_url: backgroundCheckUrl,
            status: 'pending',
            lgpd_consent_accepted: lgpdAccepted === 'true' || lgpdAccepted === true,
            lgpd_consent_ip: (req as any).ip || req.headers['x-forwarded-for'] || 'unknown',
            lgpd_consent_at: new Date(),
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        console.log(`  ✓ Created driver_compliance_document`);

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
          console.log(`  ✓ Synced LGPD consent to consents table`);
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
          console.log(`  ✓ Synced community to driver_verifications`);
        }
      });
    } catch (txError) {
      console.error('❌ Transaction failed:', txError);
      throw txError; // Re-throw para ser capturado pelo catch externo
    }

    // ✅ Log sucesso com evidência
    console.log(`✅ Documents uploaded for driver ${driverId}:`);
    console.log(`   Files received: ${Object.keys(files).join(', ')}`);
    console.log(`   driver_documents upserted: ${upsertedCount}`);
    console.log(`   driver_compliance_documents created: 1`);

    res.json({
      success: true,
      message: 'Documentos enviados com sucesso',
      received: Object.keys(files),
      savedDriverDocuments: upsertedCount,
      savedComplianceDocs: 1,
      data: {
        cpf: cpfUrl,
        rg: rgUrl,
        cnh: cnhUrl,
        proofOfAddress: proofOfAddressUrl,
        vehiclePhotos: vehiclePhotoUrls,
        backgroundCheck: backgroundCheckUrl
      }
    });
  } catch (error) {
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

export default router;
