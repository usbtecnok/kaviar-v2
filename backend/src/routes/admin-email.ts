import path from 'path';
import multer from 'multer';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import { emailService } from '../services/email/email.service';
import { buildKaviarTestEmailTemplate, buildOperationalNoticeTemplate } from '../services/email/templates/kaviar-defaults';
import { audit, auditCtx } from '../utils/audit';

const router = Router();

const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_LOG_LIMIT = 50;
const EMAIL_LOG_STATUS = {
  SENT: 'SENT',
  ERROR: 'ERROR',
} as const;
const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);
const ALLOWED_ATTACHMENT_EXTENSIONS_BY_MIME: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};
const BLOCKED_EXTENSIONS = new Set([
  '.exe',
  '.zip',
  '.js',
  '.html',
  '.htm',
  '.docm',
  '.bat',
  '.cmd',
  '.com',
  '.msi',
  '.scr',
  '.ps1',
  '.vbs',
  '.jar',
  '.sh',
]);

const uploadOfficialAttachments = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_ATTACHMENT_SIZE_BYTES,
    files: MAX_ATTACHMENTS,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) {
      cb(new Error(`Tipo de arquivo bloqueado: ${ext}`));
      return;
    }

    if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(file.mimetype)) {
      cb(new Error('Tipo de arquivo nao permitido. Use apenas PDF, JPG ou PNG.'));
      return;
    }

    cb(null, true);
  },
});

const sendTestEmailSchema = z.object({
  to: z.string().email('Email de destino invalido'),
  template: z.enum(['test', 'operational']).default('test'),
  from: z.enum([
    'KAVIAR <no-reply@kaviar.com.br>',
    'KAVIAR <contato@kaviar.com.br>',
    'KAVIAR Suporte <suporte@kaviar.com.br>',
    'KAVIAR Financeiro <financeiro@kaviar.com.br>',
    'KAVIAR Notificações <no-reply@kaviar.com.br>',
    'KAVIAR <suporte@kaviar.com.br>',
    'KAVIAR <financeiro@kaviar.com.br>',
    'no-reply@kaviar.com.br',
    'contato@kaviar.com.br',
    'suporte@kaviar.com.br',
    'financeiro@kaviar.com.br',
  ]).optional(),
  title: z.string().min(3).max(120).optional(),
  message: z.string().min(3).max(4000).optional(),
});

const sendOfficialEmailSchema = z.object({
  to: z.string().email('Email de destino invalido'),
  subject: z.string().trim().min(3, 'Assunto obrigatorio').max(180, 'Assunto muito longo'),
  message: z.string().trim().min(3, 'Mensagem obrigatoria').max(12000, 'Mensagem muito longa'),
  from: z.enum([
    'KAVIAR <contato@kaviar.com.br>',
    'KAVIAR Suporte <suporte@kaviar.com.br>',
    'KAVIAR Financeiro <financeiro@kaviar.com.br>',
  ]),
});

function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  );
}

function isAllowedTestRecipient(email: string): boolean {
  const requested = email.trim().toLowerCase();

  const explicitAllowlist = parseAllowlist(process.env.EMAIL_TEST_ALLOWED_TO);
  if (explicitAllowlist.size > 0) {
    return explicitAllowlist.has(requested);
  }

  const forwardTo = process.env.FORWARD_TO_EMAIL?.trim().toLowerCase();
  if (forwardTo) {
    return requested === forwardTo;
  }

  return false;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeAttachmentFilename(originalName: string, mimeType: string, index: number): string {
  const baseName = path.basename(originalName || `anexo-${index + 1}`);
  const originalExt = path.extname(baseName).toLowerCase();
  const allowedExts = ALLOWED_ATTACHMENT_EXTENSIONS_BY_MIME[mimeType] || [];
  const selectedExt = allowedExts.includes(originalExt) ? originalExt : (allowedExts[0] || '');

  const rawWithoutExt = originalExt ? baseName.slice(0, -originalExt.length) : baseName;
  const asciiOnly = rawWithoutExt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\- ]+/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '');

  const safeBase = (asciiOnly || `anexo-${index + 1}`).slice(0, 80);
  return `${safeBase}${selectedExt}`;
}

function mapAttachments(files: Express.Multer.File[]) {
  return files.map((file, index) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowedExts = ALLOWED_ATTACHMENT_EXTENSIONS_BY_MIME[file.mimetype] || [];

    if (BLOCKED_EXTENSIONS.has(ext)) {
      throw new Error(`Tipo de arquivo bloqueado: ${ext}`);
    }

    if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(file.mimetype)) {
      throw new Error('Tipo de arquivo nao permitido. Use apenas PDF, JPG ou PNG.');
    }

    if (!allowedExts.includes(ext)) {
      throw new Error(`Extensao nao permitida para ${file.mimetype}.`);
    }

    return {
      filename: sanitizeAttachmentFilename(file.originalname, file.mimetype, index),
      content: file.buffer,
      contentType: file.mimetype,
      size: file.size,
    };
  });
}

function parseOfficialRequestBody(req: Request) {
  const body = req.body || {};
  return sendOfficialEmailSchema.parse({
    to: body.to,
    from: body.from,
    subject: body.subject,
    message: body.message,
  });
}

function parseSender(value: string): { fromEmail: string; fromName: string | null } {
  const trimmed = (value || '').trim();
  const matched = trimmed.match(/^(.*)<([^>]+)>$/);
  if (matched) {
    const fromName = matched[1].trim().replace(/^"|"$/g, '');
    const fromEmail = matched[2].trim().toLowerCase();
    return {
      fromEmail,
      fromName: fromName || null,
    };
  }

  return {
    fromEmail: trimmed.toLowerCase(),
    fromName: null,
  };
}

function normalizeLogStatus(raw: unknown): typeof EMAIL_LOG_STATUS[keyof typeof EMAIL_LOG_STATUS] | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toUpperCase();
  if (value === EMAIL_LOG_STATUS.SENT || value === EMAIL_LOG_STATUS.ERROR) {
    return value;
  }
  return null;
}

type EmailAttachmentMetadata = {
  filename: string;
  contentType: string;
  size: number;
};

async function writeEmailSendLog(params: {
  adminId: string;
  adminEmail: string | null;
  fromEmail: string;
  fromName: string | null;
  toEmail: string;
  ccEmail?: string | null;
  subject: string;
  provider: string;
  status: typeof EMAIL_LOG_STATUS[keyof typeof EMAIL_LOG_STATUS];
  errorMessage?: string | null;
  attachmentMetadata: EmailAttachmentMetadata[];
  providerMessageId?: string | null;
}) {
  try {
    await prisma.email_send_logs.create({
      data: {
        admin_id: params.adminId,
        admin_email: params.adminEmail,
        from_email: params.fromEmail,
        from_name: params.fromName,
        to_email: params.toEmail,
        cc_email: params.ccEmail || null,
        subject: params.subject,
        provider: params.provider,
        status: params.status,
        error_message: params.errorMessage || null,
        attachment_count: params.attachmentMetadata.length,
        attachments_metadata: params.attachmentMetadata.length ? params.attachmentMetadata : undefined,
        provider_message_id: params.providerMessageId || null,
      },
    });
  } catch (logError) {
    console.error('[ADMIN_EMAIL_LOG_WRITE_FAILED]', logError);
  }
}

async function writeAuditSafely(payload: Parameters<typeof audit>[0]) {
  try {
    await audit(payload);
  } catch (auditError) {
    console.error('[ADMIN_EMAIL_AUDIT_WRITE_FAILED]', auditError);
  }
}

function isEmailSendLogsTableMissing(error: unknown): boolean {
  const code = (error as any)?.code;
  if (code === 'P2021') return true;

  const message = String((error as any)?.message || '').toLowerCase();
  return message.includes('email_send_logs') && (message.includes('does not exist') || message.includes('relation') || message.includes('table'));
}

function serializeEmailSendLog(log: any) {
  return {
    id: log.id,
    created_at: log.created_at,
    admin_id: log.admin_id,
    admin_email: log.admin_email,
    from_email: log.from_email,
    from_name: log.from_name,
    to_email: log.to_email,
    cc_email: log.cc_email,
    subject: log.subject,
    provider: log.provider,
    status: log.status,
    error_message: log.error_message,
    attachment_count: log.attachment_count,
    attachments_metadata: Array.isArray(log.attachments_metadata) ? log.attachments_metadata : null,
    provider_message_id: log.provider_message_id,
  };
}

function handleOfficialAttachmentsUpload(req: Request, res: Response, next: NextFunction): void {
  uploadOfficialAttachments.array('attachments', MAX_ATTACHMENTS)(req, res, (err: any) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          success: false,
          error: 'Cada anexo pode ter no maximo 5 MB.',
        });
        return;
      }

      if (err.code === 'LIMIT_FILE_COUNT') {
        res.status(400).json({
          success: false,
          error: 'Voce pode enviar no maximo 3 anexos por email.',
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'Falha ao processar anexos. Revise os arquivos e tente novamente.',
      });
      return;
    }

    res.status(400).json({
      success: false,
      error: err?.message || 'Arquivo invalido. Use somente PDF, JPG ou PNG.',
    });
  });
}

router.use(authenticateAdmin);
router.use(requireSuperAdmin);

// POST /api/admin/email/test
router.post('/test', async (req: Request, res: Response) => {
  try {
    const parsed = sendTestEmailSchema.parse(req.body);

    if (!isAllowedTestRecipient(parsed.to)) {
      return res.status(403).json({
        success: false,
        error: 'Envio de teste nao autorizado para este destinatario.',
      });
    }

    const template = parsed.template === 'operational'
      ? buildOperationalNoticeTemplate({
          title: parsed.title || 'Aviso Operacional',
          message: parsed.message || 'Mensagem operacional de teste do KAVIAR.',
        })
      : buildKaviarTestEmailTemplate();

    const result = await emailService.sendMail({
      to: parsed.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      from: parsed.from || 'KAVIAR <no-reply@kaviar.com.br>',
    });

    if (!result.ok) {
      return res.status(502).json({
        success: false,
        error: 'Falha no envio SMTP. Verifique configuracao do provider e conectividade.',
        data: {
          provider: result.provider,
          from: result.from,
        },
      });
    }

    const runtime = emailService.getRuntimeInfo();

    return res.json({
      success: true,
      message: 'Solicitacao de envio processada.',
      data: {
        to: parsed.to,
        template: parsed.template,
        from: result.from,
        provider: result.provider,
        providerDefault: runtime.provider,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }

    return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// POST /api/admin/email/send
router.post('/send', handleOfficialAttachmentsUpload, async (req: Request, res: Response) => {
  const ctx = auditCtx(req as any);
  const auditEntityId = `admin-email-${Date.now()}`;
  const admin = (req as any).admin;
  const adminId = String(admin?.id || ctx.adminId || '');
  const adminEmail = (admin?.email || ctx.adminEmail || null) as string | null;

  try {
    const parsed = parseOfficialRequestBody(req);
    const files = ((req.files as Express.Multer.File[]) || []);

    if (files.length > MAX_ATTACHMENTS) {
      return res.status(400).json({
        success: false,
        error: 'Voce pode enviar no maximo 3 anexos por email.',
      });
    }

    const attachments = mapAttachments(files);
    const attachmentMetadata = attachments.map((attachment) => ({
      filename: attachment.filename,
      size: attachment.size,
      contentType: attachment.contentType,
    }));

    const normalizedTo = parsed.to.trim().toLowerCase();
    const normalizedSubject = parsed.subject.trim();
    const normalizedMessage = parsed.message.trim();
    const sender = parseSender(parsed.from);

    const html = `<div style="font-family: Arial, Helvetica, sans-serif; color: #111; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(normalizedMessage).replace(/\n/g, '<br/>')}</div>`;

    const result = await emailService.sendMail({
      to: normalizedTo,
      subject: normalizedSubject,
      text: normalizedMessage,
      html,
      from: parsed.from,
      attachments,
    });

    if (!result.ok) {
      await writeEmailSendLog({
        adminId,
        adminEmail,
        fromEmail: sender.fromEmail,
        fromName: sender.fromName,
        toEmail: normalizedTo,
        subject: normalizedSubject,
        provider: result.provider,
        status: EMAIL_LOG_STATUS.ERROR,
        errorMessage: result.error || 'send_failed',
        attachmentMetadata,
        providerMessageId: result.messageId || null,
      });

      await writeAuditSafely({
        adminId: ctx.adminId,
        adminEmail: ctx.adminEmail,
        action: 'admin_email_send_failed',
        entityType: 'admin_email',
        entityId: auditEntityId,
        newValue: {
          from: parsed.from,
          to: normalizedTo,
          subject: normalizedSubject,
          provider: result.provider,
          attachments: attachmentMetadata,
          status: 'error',
          error: result.error || 'send_failed',
        },
        ipAddress: ctx.ip,
        userAgent: ctx.ua,
      });

      return res.status(502).json({
        success: false,
        error: 'Falha no envio de email oficial. Verifique provider e conectividade.',
        data: {
          provider: result.provider,
          from: result.from,
          to: normalizedTo,
          subject: normalizedSubject,
          attachments: attachmentMetadata,
        },
      });
    }

    await writeEmailSendLog({
      adminId,
      adminEmail,
      fromEmail: sender.fromEmail,
      fromName: sender.fromName,
      toEmail: normalizedTo,
      subject: normalizedSubject,
      provider: result.provider,
      status: EMAIL_LOG_STATUS.SENT,
      attachmentMetadata,
      providerMessageId: result.messageId || null,
    });

    await writeAuditSafely({
      adminId: ctx.adminId,
      adminEmail: ctx.adminEmail,
      action: 'admin_email_send_success',
      entityType: 'admin_email',
      entityId: auditEntityId,
      newValue: {
        from: result.from,
        to: normalizedTo,
        subject: normalizedSubject,
        provider: result.provider,
        attachments: attachmentMetadata,
        status: 'success',
        providerMessageId: result.messageId || null,
      },
      ipAddress: ctx.ip,
      userAgent: ctx.ua,
    });

    return res.json({
      success: true,
      message: 'Email oficial enviado com sucesso.',
      data: {
        status: 'success',
        provider: result.provider,
        from: result.from,
        to: normalizedTo,
        subject: normalizedSubject,
        attachments: attachmentMetadata,
        messageId: result.messageId || null,
      },
    });
  } catch (error) {
    const body = req.body || {};
    const sender = typeof body.from === 'string' ? parseSender(body.from) : { fromEmail: 'unknown@kaviar.com.br', fromName: null };

    if (adminId) {
      await writeEmailSendLog({
        adminId,
        adminEmail,
        fromEmail: sender.fromEmail,
        fromName: sender.fromName,
        toEmail: typeof body.to === 'string' ? body.to.trim().toLowerCase() : 'invalid_to',
        subject: typeof body.subject === 'string' ? body.subject.trim().slice(0, 180) : 'invalid_subject',
        provider: emailService.getRuntimeInfo().provider,
        status: EMAIL_LOG_STATUS.ERROR,
        errorMessage: (error as Error)?.message || 'unknown_error',
        attachmentMetadata: [],
      });
    }

    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }

    await writeAuditSafely({
      adminId: ctx.adminId,
      adminEmail: ctx.adminEmail,
      action: 'admin_email_send_exception',
      entityType: 'admin_email',
      entityId: auditEntityId,
      newValue: {
        status: 'error',
        error: (error as Error).message,
      },
      ipAddress: ctx.ip,
      userAgent: ctx.ua,
    });

    return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

// GET /api/admin/email/logs
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const requestedLimit = parseInt(String(req.query.limit || String(MAX_LOG_LIMIT)), 10) || MAX_LOG_LIMIT;
    const limit = Math.min(Math.max(requestedLimit, 1), MAX_LOG_LIMIT);
    const where: any = {};

    if (req.query.to) {
      where.to_email = { contains: String(req.query.to).trim().toLowerCase(), mode: 'insensitive' };
    }

    if (req.query.from) {
      where.from_email = { contains: String(req.query.from).trim().toLowerCase(), mode: 'insensitive' };
    }

    if (req.query.status) {
      const status = normalizeLogStatus(req.query.status);
      if (!status) {
        return res.status(400).json({ success: false, error: 'Filtro status invalido. Use SENT ou ERROR.' });
      }
      where.status = status;
    }

    const dateFromRaw = req.query.date_from ? new Date(String(req.query.date_from)) : null;
    const dateToRaw = req.query.date_to ? new Date(String(req.query.date_to)) : null;

    if (dateFromRaw && Number.isNaN(dateFromRaw.getTime())) {
      return res.status(400).json({ success: false, error: 'date_from invalido.' });
    }

    if (dateToRaw && Number.isNaN(dateToRaw.getTime())) {
      return res.status(400).json({ success: false, error: 'date_to invalido.' });
    }

    if (dateFromRaw || dateToRaw) {
      where.created_at = {};
      if (dateFromRaw) where.created_at.gte = dateFromRaw;
      if (dateToRaw) where.created_at.lte = dateToRaw;
    }

    const [logs, total] = await Promise.all([
      prisma.email_send_logs.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.email_send_logs.count({ where }),
    ]);

    return res.json({
      success: true,
      data: logs.map(serializeEmailSendLog),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    if (isEmailSendLogsTableMissing(error)) {
      console.warn('[ADMIN_EMAIL_LOGS_TABLE_MISSING] migration pendente para email_send_logs');
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 1,
        },
        warning: 'Historico temporariamente indisponivel. Execute a migration pendente para habilitar os logs.',
      });
    }

    console.error('[ADMIN_EMAIL_LOGS_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao carregar historico de envios oficiais.' });
  }
});

export default router;
