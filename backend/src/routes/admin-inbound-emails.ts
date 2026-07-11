import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/auth';
import { prisma } from '../lib/prisma';

const router = Router();

const MAX_LIMIT = 50;
const INBOUND_STATUSES = {
  NEW: 'NEW',
  READ: 'READ',
  ARCHIVED: 'ARCHIVED',
} as const;

type InboundStatus = typeof INBOUND_STATUSES[keyof typeof INBOUND_STATUSES];

const patchStatusSchema = z.object({
  status: z.enum(['NEW', 'READ', 'ARCHIVED']),
});

function normalizeStatus(raw: unknown): InboundStatus | null {
  if (typeof raw !== 'string') return null;
  const status = raw.trim().toUpperCase();
  if (status === INBOUND_STATUSES.NEW || status === INBOUND_STATUSES.READ || status === INBOUND_STATUSES.ARCHIVED) {
    return status;
  }
  return null;
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isInboundTableMissing(error: unknown): boolean {
  const code = (error as any)?.code;
  if (code === 'P2021') return true;

  const message = String((error as any)?.message || '').toLowerCase();
  return message.includes('inbound_email_messages') && (message.includes('does not exist') || message.includes('relation') || message.includes('table'));
}

function serializeInboundEmail(item: any) {
  return {
    id: item.id,
    received_at: item.received_at,
    from_email: item.from_email,
    from_name: item.from_name,
    to_email: item.to_email,
    subject: item.subject,
    text_body: item.text_body,
    html_body: item.html_body,
    normalized_body: item.normalized_body,
    message_id: item.message_id,
    in_reply_to: item.in_reply_to,
    references_header: item.references_header,
    provider: item.provider,
    status: item.status,
    has_attachments: item.has_attachments,
    attachment_count: item.attachment_count,
    attachments_metadata: Array.isArray(item.attachments_metadata) ? item.attachments_metadata : null,
    raw_headers: item.raw_headers && typeof item.raw_headers === 'object' ? item.raw_headers : null,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

router.use(authenticateAdmin, requireSuperAdmin);

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const requestedLimit = parseInt(String(req.query.limit || String(MAX_LIMIT)), 10) || MAX_LIMIT;
    const limit = Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);
    const where: any = {};

    const status = normalizeStatus(req.query.status);
    if (req.query.status && !status) {
      return res.status(400).json({ success: false, error: 'Filtro status invalido. Use NEW, READ ou ARCHIVED.' });
    }
    if (status) {
      where.status = status;
    }

    if (req.query.to) {
      where.to_email = { contains: String(req.query.to).trim().toLowerCase(), mode: 'insensitive' };
    }

    if (req.query.from) {
      where.from_email = { contains: String(req.query.from).trim().toLowerCase(), mode: 'insensitive' };
    }

    const query = normalizeOptionalText(req.query.q);
    if (query) {
      where.OR = [
        { subject: { contains: query, mode: 'insensitive' } },
        { from_email: { contains: query, mode: 'insensitive' } },
        { from_name: { contains: query, mode: 'insensitive' } },
      ];
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
      where.received_at = {};
      if (dateFromRaw) where.received_at.gte = dateFromRaw;
      if (dateToRaw) where.received_at.lte = dateToRaw;
    }

    const [rows, total] = await Promise.all([
      prisma.inbound_email_messages.findMany({
        where,
        orderBy: { received_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          received_at: true,
          from_email: true,
          from_name: true,
          to_email: true,
          subject: true,
          status: true,
          provider: true,
          has_attachments: true,
          attachment_count: true,
          message_id: true,
          created_at: true,
          updated_at: true,
        },
      }),
      prisma.inbound_email_messages.count({ where }),
    ]);

    return res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    if (isInboundTableMissing(error)) {
      console.warn('[ADMIN_INBOUND_EMAIL_TABLE_MISSING] migration pendente para inbound_email_messages');
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 1,
        },
        warning: 'Inbox temporariamente indisponivel. Execute a migration pendente.',
      });
    }

    console.error('[ADMIN_INBOUND_EMAILS_LIST_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao listar caixa de entrada institucional.' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || '');
    const item = await prisma.inbound_email_messages.findUnique({ where: { id } });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Email inbound nao encontrado.' });
    }

    return res.json({ success: true, data: serializeInboundEmail(item) });
  } catch (error) {
    if (isInboundTableMissing(error)) {
      return res.status(503).json({ success: false, error: 'Inbox indisponivel ate aplicar migration.' });
    }

    console.error('[ADMIN_INBOUND_EMAILS_GET_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao carregar email inbound.' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || '');
    const parsed = patchStatusSchema.parse(req.body || {});

    const updated = await prisma.inbound_email_messages.update({
      where: { id },
      data: { status: parsed.status },
    });

    return res.json({ success: true, data: serializeInboundEmail(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || 'Payload invalido.' });
    }

    if ((error as any)?.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Email inbound nao encontrado.' });
    }

    if (isInboundTableMissing(error)) {
      return res.status(503).json({ success: false, error: 'Inbox indisponivel ate aplicar migration.' });
    }

    console.error('[ADMIN_INBOUND_EMAILS_PATCH_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao atualizar status do email inbound.' });
  }
});

export default router;
