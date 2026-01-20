import { Router, Request, Response } from 'express';
import { authenticateDriver } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { GeoResolveService } from '../services/geo-resolve';
import { getUploadsPaths } from '../config/uploads';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const geoResolveService = new GeoResolveService();

// Configurar multer para upload de arquivos (usando path canônico)
const { certidoesDir } = getUploadsPaths();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, certidoesDir);
  },
  filename: (req, file, cb) => {
    const driverId = (req as any).userId;
    const ext = path.extname(file.originalname);
    const filename = `${driverId}-${Date.now()}${ext}`;
    const fullPath = path.join(certidoesDir, filename);
    console.log(`📄 Saving file: ${fullPath}`);
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|jpg|jpeg|png/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(ext);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Apenas arquivos PDF, JPG, JPEG ou PNG são permitidos'));
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
router.post('/me/documents', authenticateDriver, upload.fields([
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
    
    if (!driverId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Usuário não autenticado'
      });
    }

    const files = req.files as Record<string, Express.Multer.File[]>;

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

    // Construir URLs dos arquivos
    const cpfUrl = `/uploads/certidoes/${files.cpf[0].filename}`;
    const rgUrl = `/uploads/certidoes/${files.rg[0].filename}`;
    const cnhUrl = `/uploads/certidoes/${files.cnh[0].filename}`;
    const proofOfAddressUrl = `/uploads/certidoes/${files.proofOfAddress[0].filename}`;
    const vehiclePhotoUrls = files.vehiclePhoto.map(f => `/uploads/certidoes/${f.filename}`);
    const backgroundCheckUrl = `/uploads/certidoes/${files.backgroundCheck[0].filename}`;

    // Extrair dados adicionais do body
    const { pix_key, pix_key_type, vehiclePlate, vehicleModel, vehicleColor, communityId, lgpdAccepted, termsAccepted } = req.body;

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
        console.log(`  ✓ Updated driver ${driverId}`);

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
          const existing = await tx.driver_documents.findFirst({
            where: { driver_id: driverId, type: doc.type }
          });

          if (existing) {
            await tx.driver_documents.update({
              where: { id: existing.id },
              data: {
                file_url: doc.url,
                status: 'SUBMITTED',
                submitted_at: new Date(),
                updated_at: new Date()
              }
            });
            console.log(`  ✓ Updated driver_document: ${doc.type}`);
          } else {
            await tx.driver_documents.create({
              data: {
                id: `doc_${driverId}_${doc.type}_${Date.now()}`,
                driver_id: driverId,
                type: doc.type,
                file_url: doc.url,
                status: 'SUBMITTED',
                submitted_at: new Date(),
                updated_at: new Date()
              }
            });
            console.log(`  ✓ Created driver_document: ${doc.type}`);
          }
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
