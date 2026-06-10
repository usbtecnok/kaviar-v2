import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateAdmin } from '../middlewares/auth';

const router = Router();
router.use(authenticateAdmin);

// GET /api/admin/my-operator-profile
router.get('/', async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    let profile = await prisma.operator_profiles.findUnique({
      where: { admin_id: admin.id },
      include: { territory: { select: { id: true, name: true, level: true } } },
    });

    // On-demand: criar profile se TERRITORIAL_OPERATOR ou TERRITORIAL_MANAGER com territory_access
    if (!profile && (admin.role === 'TERRITORIAL_OPERATOR' || admin.role === 'TERRITORIAL_MANAGER')) {
      const access = await prisma.admin_territory_access.findFirst({ where: { admin_id: admin.id } });
      if (access) {
        const relationshipType = admin.role === 'TERRITORIAL_MANAGER' ? 'territorial_manager' : 'territorial_operator';
        profile = await prisma.operator_profiles.create({
          data: {
            admin_id: admin.id,
            territory_id: access.territory_id,
            display_name: admin.name || 'Operador Territorial',
            relationship_type: relationshipType,
            recipient_type: 'individual',
            contract_status: 'pending',
            document_status: 'pending',
            is_active: false,
          },
          include: { territory: { select: { id: true, name: true, level: true } } },
        });
      }
    }

    if (!profile) return res.json({ success: true, data: null });
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao buscar perfil' });
  }
});

// GET /api/admin/my-operator-profile/contract-template-url
router.get('/contract-template-url', async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const profile = await prisma.operator_profiles.findUnique({
      where: { admin_id: admin.id },
      select: { contract_template_url: true },
    });
    if (!profile) return res.status(404).json({ success: false, error: 'Perfil não encontrado' });
    if (!profile.contract_template_url) return res.status(404).json({ success: false, error: 'Modelo de contrato não disponível' });

    const { getPresignedUrl } = await import('../config/s3-upload');
    const url = await getPresignedUrl(profile.contract_template_url);
    res.json({ success: true, data: { url } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao gerar URL do modelo' });
  }
});

// POST /api/admin/my-operator-profile/submit-contract — Gestora envia PDF assinado
router.post('/submit-contract', async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const profile = await prisma.operator_profiles.findUnique({ where: { admin_id: admin.id } });
    if (!profile) return res.status(404).json({ success: false, error: 'Perfil não encontrado' });

    if (!['available', 'rejected'].includes(profile.contract_status)) {
      return res.status(409).json({ success: false, error: `Envio não permitido no estado '${profile.contract_status}'. Permitido: available, rejected.` });
    }

    const { uploadToS3, getPresignedUrl } = await import('../config/s3-upload');
    const multer = (await import('multer')).default;
    const multerS3 = (await import('multer-s3')).default;
    const { S3Client } = await import('@aws-sdk/client-s3');

    const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-2' });
    const bucket = process.env.AWS_S3_BUCKET || 'kaviar-uploads-847895361928';

    const upload = multer({
      storage: multerS3({ s3, bucket, contentType: multerS3.AUTO_CONTENT_TYPE, key: (_r: any, _f: any, cb: any) => cb(null, `contract-submissions/${profile.id}/${Date.now()}.pdf`) }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_r: any, file: any, cb: any) => { file.mimetype === 'application/pdf' ? cb(null, true) : cb(new Error('Apenas PDF permitido')); },
    }).single('file');

    upload(req, res, async (err: any) => {
      if (err) return res.status(400).json({ success: false, error: err.message || 'Erro no upload' });
      const file = req.file as any;
      if (!file) return res.status(400).json({ success: false, error: 'Arquivo PDF obrigatório' });

      // Supersede previous rejected submissions
      await prisma.contract_submissions.updateMany({
        where: { operator_profile_id: profile.id, status: 'rejected' },
        data: { status: 'superseded', updated_at: new Date() },
      });

      // Create submission
      await prisma.contract_submissions.create({
        data: { operator_profile_id: profile.id, submitted_by_admin_id: admin.id, s3_key: file.key, status: 'submitted' },
      });

      // Update operator_profiles.contract_status
      await prisma.operator_profiles.update({
        where: { admin_id: admin.id },
        data: { contract_status: 'submitted', updated_at: new Date() },
      });

      res.json({ success: true, data: { submitted: true } });
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao enviar contrato' });
  }
});

// GET /api/admin/my-operator-profile/submissions — Histórico de envios
router.get('/submissions', async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const profile = await prisma.operator_profiles.findUnique({ where: { admin_id: admin.id }, select: { id: true } });
    if (!profile) return res.status(404).json({ success: false, error: 'Perfil não encontrado' });

    const submissions = await prisma.contract_submissions.findMany({
      where: { operator_profile_id: profile.id },
      select: { id: true, status: true, rejection_reason: true, created_at: true, reviewed_at: true },
      orderBy: { created_at: 'desc' },
      take: 10,
    });
    res.json({ success: true, data: submissions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao buscar histórico' });
  }
});

// GET /api/admin/my-operator-profile/contract-url
router.get('/contract-url', async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const profile = await prisma.operator_profiles.findUnique({
      where: { admin_id: admin.id },
      select: { contract_url: true },
    });
    if (!profile) return res.status(404).json({ success: false, error: 'Perfil não encontrado' });
    if (!profile.contract_url) return res.status(404).json({ success: false, error: 'Contrato não disponível' });

    const { getPresignedUrl } = await import('../config/s3-upload');
    const url = await getPresignedUrl(profile.contract_url);
    res.json({ success: true, data: { url } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao gerar URL do contrato' });
  }
});

// POST /api/admin/my-operator-profile/accept-terms
router.post('/accept-terms', async (req: Request, res: Response) => {
  try {
    const admin = (req as any).admin;
    const profile = await prisma.operator_profiles.findUnique({ where: { admin_id: admin.id } });
    if (!profile) return res.status(404).json({ success: false, error: 'Perfil não encontrado' });

    if (profile.terms_accepted_at) {
      return res.json({ success: true, data: { already_accepted: true, accepted_at: profile.terms_accepted_at } });
    }

    const now = new Date();
    const updated = await prisma.operator_profiles.update({
      where: { admin_id: admin.id },
      data: {
        terms_accepted_at: now,
        responsibility_terms_accepted_at: now,
        confidentiality_terms_accepted_at: now,
        terms_version: 'v1.0-captador',
        terms_accepted_by: admin.id,
        contract_status: 'signed',
      },
    });

    res.json({ success: true, data: { accepted_at: updated.terms_accepted_at, terms_version: updated.terms_version } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao aceitar termos' });
  }
});

export default router;
