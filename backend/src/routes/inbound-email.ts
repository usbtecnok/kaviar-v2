import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { InboundAttachmentValidationError, inboundEmailAttachmentsService } from '../services/inbound-email-attachments.service';

const router = Router();

const INBOUND_PROVIDER = 'CLOUDFLARE_EMAIL_WORKER';
const INBOUND_PAYLOAD_MAX_BYTES = 2 * 1024 * 1024;
const INBOUND_MAX_ATTACHMENTS_METADATA = 20;
const INBOUND_MAX_RAW_HEADERS = 120;
const INBOUND_MAX_BODY_CHARS = 400000;
const ALLOWED_TO_EMAILS = new Set([
  'contato@kaviar.com.br',
  'suporte@kaviar.com.br',
  'financeiro@kaviar.com.br',
  'no-reply@kaviar.com.br',
]);
const INBOUND_SECRET_HEADER = 'x-kaviar-inbound-email-secret';

const attachmentMetadataSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(255).optional(),
  size: z.number().int().nonnegative().max(25 * 1024 * 1024).optional(),
});

const reserveInboundAttachmentUploadSchema = z.object({
  inbound_email_id: z.string().trim().uuid('inbound_email_id invalido'),
  filename: z.string().trim().min(1).max(255),
  content_type: z.string().trim().min(1).max(255),
  size_bytes: z.number().int().positive(),
  sha256: z.string().trim().length(64),
});

const finalizeInboundAttachmentUploadSchema = z.object({
  inbound_email_id: z.string().trim().uuid('inbound_email_id invalido'),
});

const inboundPayloadSchema = z.object({
  received_at: z.string().datetime().optional(),
  from_email: z.string().trim().email('from_email invalido'),
  from_name: z.string().trim().max(255).optional().nullable(),
  to_email: z.string().trim().email('to_email invalido'),
  subject: z.string().trim().max(255).optional().nullable(),
  text_body: z.string().max(INBOUND_MAX_BODY_CHARS).optional().nullable(),
  html_body: z.string().max(INBOUND_MAX_BODY_CHARS).optional().nullable(),
  normalized_body: z.string().max(INBOUND_MAX_BODY_CHARS).optional().nullable(),
  message_id: z.string().trim().max(255).optional().nullable(),
  in_reply_to: z.string().trim().max(255).optional().nullable(),
  references_header: z.string().trim().max(4000).optional().nullable(),
  has_attachments: z.boolean().optional(),
  attachment_count: z.number().int().min(0).max(INBOUND_MAX_ATTACHMENTS_METADATA).optional(),
  attachments_metadata: z.array(attachmentMetadataSchema).max(INBOUND_MAX_ATTACHMENTS_METADATA).optional().nullable(),
  raw_headers: z.record(z.string().max(200), z.string().max(2000)).optional().nullable(),
}).superRefine((value, ctx) => {
  if (value.raw_headers && Object.keys(value.raw_headers).length > INBOUND_MAX_RAW_HEADERS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `raw_headers excede o limite de ${INBOUND_MAX_RAW_HEADERS} chaves.`,
    });
  }
});

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function secureEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function isInboundTableMissing(error: unknown): boolean {
  const code = (error as any)?.code;
  if (code === 'P2021') return true;

  const message = String((error as any)?.message || '').toLowerCase();
  return message.includes('inbound_email_messages') && (message.includes('does not exist') || message.includes('relation') || message.includes('table'));
}

function isPayloadTooLargeZodError(error: z.ZodError): boolean {
  return error.errors.some((issue) => {
    if (issue.code === 'too_big') return true;
    if (issue.code === 'custom' && issue.message.toLowerCase().includes('excede o limite')) return true;
    return false;
  });
}

router.post('/cloudflare', async (req: Request, res: Response) => {
  try {
    const contentLength = Number(req.headers['content-length'] || '0');
    if (Number.isFinite(contentLength) && contentLength > INBOUND_PAYLOAD_MAX_BYTES) {
      return res.status(413).json({ success: false, error: 'Payload inbound excede o limite de 2 MB.' });
    }

    const configuredSecret = (process.env.INBOUND_EMAIL_WEBHOOK_SECRET || '').trim();
    if (!configuredSecret) {
      return res.status(503).json({ success: false, error: 'Webhook de inbound desabilitado.' });
    }

    const incomingSecret = String(req.headers[INBOUND_SECRET_HEADER] || '').trim();
    if (!incomingSecret || !secureEquals(incomingSecret, configuredSecret)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const parsed = inboundPayloadSchema.parse(req.body || {});
    const toEmail = parsed.to_email.trim().toLowerCase();
    const fromEmail = parsed.from_email.trim().toLowerCase();

    if (!ALLOWED_TO_EMAILS.has(toEmail)) {
      return res.status(400).json({ success: false, error: 'Alias institucional invalido para inbox.' });
    }

    const messageId = normalizeOptionalText(parsed.message_id);
    if (messageId) {
      const existing = await prisma.inbound_email_messages.findUnique({
        where: { message_id: messageId },
        select: { id: true },
      });

      if (existing) {
        return res.json({ success: true, data: { id: existing.id, duplicated: true } });
      }
    }

    const attachmentsMetadata = Array.isArray(parsed.attachments_metadata) ? parsed.attachments_metadata.map((item) => ({
      filename: item.filename,
      contentType: item.contentType || null,
      size: typeof item.size === 'number' ? item.size : null,
    })) : [];

    const hasAttachments = typeof parsed.has_attachments === 'boolean'
      ? parsed.has_attachments
      : attachmentsMetadata.length > 0;

    const attachmentCount = typeof parsed.attachment_count === 'number'
      ? parsed.attachment_count
      : attachmentsMetadata.length;

    const created = await prisma.inbound_email_messages.create({
      data: {
        received_at: parsed.received_at ? new Date(parsed.received_at) : new Date(),
        from_email: fromEmail,
        from_name: normalizeOptionalText(parsed.from_name),
        to_email: toEmail,
        subject: normalizeOptionalText(parsed.subject),
        text_body: normalizeOptionalText(parsed.text_body),
        html_body: normalizeOptionalText(parsed.html_body),
        normalized_body: normalizeOptionalText(parsed.normalized_body),
        message_id: messageId,
        in_reply_to: normalizeOptionalText(parsed.in_reply_to),
        references_header: normalizeOptionalText(parsed.references_header),
        provider: INBOUND_PROVIDER,
        status: 'NEW',
        has_attachments: hasAttachments,
        attachment_count: attachmentCount,
        attachments_metadata: attachmentsMetadata.length ? attachmentsMetadata : undefined,
        raw_headers: parsed.raw_headers || undefined,
      },
      select: { id: true },
    });

    return res.json({ success: true, data: { id: created.id, duplicated: false } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const tooLarge = isPayloadTooLargeZodError(error);
      return res.status(tooLarge ? 413 : 400).json({ success: false, error: error.errors[0]?.message || 'Payload invalido.' });
    }

    if (isInboundTableMissing(error)) {
      console.warn('[INBOUND_EMAIL_TABLE_MISSING] migration pendente para inbound_email_messages');
      return res.status(503).json({ success: false, error: 'Inbox indisponivel ate aplicar migration.' });
    }

    console.error('[INBOUND_EMAIL_INGEST_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro interno no ingest de emails.' });
  }
});

router.post('/cloudflare/attachments/request-upload', async (req: Request, res: Response) => {
  try {
    const configuredSecret = (process.env.INBOUND_EMAIL_WEBHOOK_SECRET || '').trim();
    if (!configuredSecret) {
      return res.status(503).json({ success: false, error: 'Webhook de inbound desabilitado.' });
    }

    const incomingSecret = String(req.headers[INBOUND_SECRET_HEADER] || '').trim();
    if (!incomingSecret || !secureEquals(incomingSecret, configuredSecret)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const parsed = reserveInboundAttachmentUploadSchema.parse(req.body || {});
    const reserved = await inboundEmailAttachmentsService.reserveUpload({
      inboundEmailId: parsed.inbound_email_id,
      filename: parsed.filename,
      contentType: parsed.content_type,
      sizeBytes: parsed.size_bytes,
      sha256: parsed.sha256,
    });

    return res.json({
      success: true,
      data: {
        attachment_id: reserved.attachmentId,
        storage_key: reserved.storageKey,
        upload_url: reserved.uploadUrl,
        expires_in: reserved.expiresIn,
        status: reserved.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || 'Payload invalido.' });
    }

    if (error instanceof InboundAttachmentValidationError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }

    console.error('[INBOUND_EMAIL_ATTACHMENT_RESERVE_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro interno ao reservar upload do anexo.' });
  }
});

router.post('/cloudflare/attachments/:attachmentId/finalize', async (req: Request, res: Response) => {
  try {
    const configuredSecret = (process.env.INBOUND_EMAIL_WEBHOOK_SECRET || '').trim();
    if (!configuredSecret) {
      return res.status(503).json({ success: false, error: 'Webhook de inbound desabilitado.' });
    }

    const incomingSecret = String(req.headers[INBOUND_SECRET_HEADER] || '').trim();
    if (!incomingSecret || !secureEquals(incomingSecret, configuredSecret)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const parsed = finalizeInboundAttachmentUploadSchema.parse(req.body || {});
    const finalized = await inboundEmailAttachmentsService.finalizeUpload({
      inboundEmailId: parsed.inbound_email_id,
      attachmentId: String(req.params.attachmentId || ''),
    });

    return res.json({ success: true, data: finalized });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || 'Payload invalido.' });
    }

    if (error instanceof InboundAttachmentValidationError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }

    console.error('[INBOUND_EMAIL_ATTACHMENT_FINALIZE_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro interno ao finalizar upload do anexo.' });
  }
});

export default router;
