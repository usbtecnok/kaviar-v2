import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/auth';

const router = Router();

const REGULATORY_CITY_STATUSES = [
  'NOT_STARTED',
  'CONTACTED',
  'WAITING_RESPONSE',
  'RESPONSE_RECEIVED',
  'DOCUMENTS_REQUESTED',
  'READY_TO_PROTOCOL',
  'PROTOCOL_SENT',
  'APPROVED',
  'REJECTED',
  'PAUSED',
] as const;

const CHECKLIST_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'DONE',
  'NOT_APPLICABLE',
] as const;

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  status: z.enum(REGULATORY_CITY_STATUSES).optional(),
  state: z.string().trim().length(2).optional(),
  city: z.string().trim().min(1).max(120).optional(),
  q: z.string().trim().min(1).max(120).optional(),
});

const createCaseSchema = z.object({
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().length(2),
  status: z.enum(REGULATORY_CITY_STATUSES),
  department_name: z.string().trim().max(255).optional().nullable(),
  contact_name: z.string().trim().max(255).optional().nullable(),
  contact_email: z.string().trim().email().max(255).optional().nullable(),
  contact_phone: z.string().trim().max(40).optional().nullable(),
  last_sent_at: z.coerce.date().optional().nullable(),
  last_response_at: z.coerce.date().optional().nullable(),
  next_follow_up_at: z.coerce.date().optional().nullable(),
  next_action: z.string().trim().max(2000).optional().nullable(),
  notes: z.string().trim().max(8000).optional().nullable(),
});

const updateCaseSchema = z.object({
  city: z.string().trim().min(1).max(120).optional(),
  state: z.string().trim().length(2).optional(),
  status: z.enum(REGULATORY_CITY_STATUSES).optional(),
  department_name: z.string().trim().max(255).optional().nullable(),
  contact_name: z.string().trim().max(255).optional().nullable(),
  contact_email: z.string().trim().email().max(255).optional().nullable(),
  contact_phone: z.string().trim().max(40).optional().nullable(),
  last_sent_at: z.coerce.date().optional().nullable(),
  last_response_at: z.coerce.date().optional().nullable(),
  next_follow_up_at: z.coerce.date().optional().nullable(),
  next_action: z.string().trim().max(2000).optional().nullable(),
  notes: z.string().trim().max(8000).optional().nullable(),
});

const createChecklistItemSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(4000).optional().nullable(),
  category: z.string().trim().max(120).optional().nullable(),
  status: z.enum(CHECKLIST_STATUSES).optional(),
  required: z.coerce.boolean().optional(),
  sort_order: z.coerce.number().int().min(0).optional(),
  notes: z.string().trim().max(8000).optional().nullable(),
  due_date: z.coerce.date().optional().nullable(),
});

const updateChecklistItemSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(4000).optional().nullable(),
  category: z.string().trim().max(120).optional().nullable(),
  status: z.enum(CHECKLIST_STATUSES).optional(),
  required: z.coerce.boolean().optional(),
  sort_order: z.coerce.number().int().min(0).optional(),
  notes: z.string().trim().max(8000).optional().nullable(),
  due_date: z.coerce.date().optional().nullable(),
});

const SANTA_RITA_TRANSPORT_TEMPLATE = [
  {
    title: 'CNH categoria B ou superior com EAR',
    description: 'Confirmar habilitação compatível e observação de atividade remunerada.',
    category: 'Condutor',
    sort_order: 1,
  },
  {
    title: 'Certidão negativa de antecedentes criminais',
    description: 'Coletar documento vigente do condutor responsável.',
    category: 'Condutor',
    sort_order: 2,
  },
  {
    title: 'Comprovante de inscrição como contribuinte individual do INSS ou MEI',
    description: 'Validar enquadramento previdenciário ou empresarial do prestador.',
    category: 'Cadastro',
    sort_order: 3,
  },
  {
    title: 'Seguro APP e seguro obrigatório quando aplicável',
    description: 'Confirmar cobertura ativa para operação municipal.',
    category: 'Veículo',
    sort_order: 4,
  },
  {
    title: 'CRLV regular e licenciado do veículo',
    description: 'Exigir documento atualizado e sem pendências de licenciamento.',
    category: 'Veículo',
    sort_order: 5,
  },
  {
    title: 'Comprovante de residência',
    description: 'Validar endereço atualizado do condutor.',
    category: 'Condutor',
    sort_order: 6,
  },
  {
    title: 'Duas fotos 3x4',
    description: 'Separar imagens recentes para ficha municipal.',
    category: 'Cadastro',
    sort_order: 7,
  },
  {
    title: 'Inscrição no Cadastro de Receitas Mobiliárias do Município',
    description: 'Confirmar inscrição fiscal municipal ou etapa equivalente.',
    category: 'Município',
    sort_order: 8,
  },
  {
    title: 'Certidão negativa de débitos municipais',
    description: 'Checar eventuais restrições ou débitos com a prefeitura.',
    category: 'Município',
    sort_order: 9,
  },
  {
    title: 'Alvará municipal específico',
    description: 'Validar exigência e emissão do alvará aplicável.',
    category: 'Município',
    sort_order: 10,
  },
  {
    title: 'Verificação de idade máxima do veículo',
    description: 'Conferir limite de idade definido pelo município.',
    category: 'Veículo',
    sort_order: 11,
  },
  {
    title: 'Protocolo junto ao setor municipal responsável',
    description: 'Registrar o andamento formal do processo.',
    category: 'Protocolo',
    sort_order: 12,
  },
] as const;

function asNullable(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEmail(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function buildSnippet(value: string | null | undefined, maxLength = 160): string | null {
  if (typeof value !== 'string') return null;
  const collapsed = value.replace(/\s+/g, ' ').trim();
  if (!collapsed) return null;
  if (collapsed.length <= maxLength) return collapsed;
  return `${collapsed.slice(0, maxLength - 1)}…`;
}

function isChecklistDone(status: unknown): boolean {
  return status === 'DONE';
}

router.use(authenticateAdmin, requireSuperAdmin);

// GET /api/admin/regulatory/cities
router.get('/regulatory/cities', async (req: Request, res: Response) => {
  try {
    const parsed = listQuerySchema.parse(req.query);

    const where: any = {};
    if (parsed.status) where.status = parsed.status;
    if (parsed.state) where.state = parsed.state.toUpperCase();
    if (parsed.city) where.city = { contains: parsed.city, mode: 'insensitive' };

    if (parsed.q) {
      where.OR = [
        { city: { contains: parsed.q, mode: 'insensitive' } },
        { state: { contains: parsed.q, mode: 'insensitive' } },
        { department_name: { contains: parsed.q, mode: 'insensitive' } },
        { contact_name: { contains: parsed.q, mode: 'insensitive' } },
        { contact_email: { contains: parsed.q, mode: 'insensitive' } },
        { notes: { contains: parsed.q, mode: 'insensitive' } },
        { next_action: { contains: parsed.q, mode: 'insensitive' } },
      ];
    }

    const skip = (parsed.page - 1) * parsed.limit;
    const [items, total] = await Promise.all([
      prisma.municipal_regulatory_cases.findMany({
        where,
        orderBy: [{ updated_at: 'desc' }, { city: 'asc' }],
        skip,
        take: parsed.limit,
      }),
      prisma.municipal_regulatory_cases.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / parsed.limit));

    return res.json({
      success: true,
      data: items,
      pagination: {
        page: parsed.page,
        limit: parsed.limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || 'Query inválida.' });
    }

    return res.status(500).json({ success: false, error: 'Erro ao listar casos regulatórios por cidade.' });
  }
});

// POST /api/admin/regulatory/cities
router.post('/regulatory/cities', async (req: Request, res: Response) => {
  try {
    const payload = createCaseSchema.parse(req.body);
    const adminId = (req as any).admin?.id || null;

    const created = await prisma.municipal_regulatory_cases.create({
      data: {
        city: payload.city,
        state: payload.state.toUpperCase(),
        status: payload.status,
        department_name: asNullable(payload.department_name),
        contact_name: asNullable(payload.contact_name),
        contact_email: asNullable(payload.contact_email),
        contact_phone: asNullable(payload.contact_phone),
        last_sent_at: payload.last_sent_at ?? null,
        last_response_at: payload.last_response_at ?? null,
        next_follow_up_at: payload.next_follow_up_at ?? null,
        next_action: asNullable(payload.next_action),
        notes: asNullable(payload.notes),
        created_by_admin_id: adminId,
        updated_by_admin_id: adminId,
      },
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || 'Payload inválido.' });
    }

    return res.status(500).json({ success: false, error: 'Erro ao criar caso regulatório por cidade.' });
  }
});

// GET /api/admin/regulatory/cities/:id
router.get('/regulatory/cities/:id', async (req: Request, res: Response) => {
  try {
    const item = await prisma.municipal_regulatory_cases.findUnique({
      where: { id: req.params.id },
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Caso regulatório não encontrado.' });
    }

    return res.json({ success: true, data: item });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Erro ao buscar caso regulatório por cidade.' });
  }
});

// GET /api/admin/regulatory/cities/:id/communications
router.get('/regulatory/cities/:id/communications', async (req: Request, res: Response) => {
  try {
    const item = await prisma.municipal_regulatory_cases.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        city: true,
        state: true,
        contact_email: true,
      },
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Caso regulatório não encontrado.' });
    }

    const contactEmail = normalizeEmail(item.contact_email);
    if (!contactEmail) {
      return res.json({
        success: true,
        data: {
          city: item,
          contactEmail: null,
          sent: [],
          received: [],
        },
      });
    }

    const [sentLogs, receivedLogs] = await Promise.all([
      prisma.email_send_logs.findMany({
        where: {
          OR: [
            { to_email: { equals: contactEmail, mode: 'insensitive' } },
            { cc_email: { equals: contactEmail, mode: 'insensitive' } },
          ],
        },
        orderBy: { created_at: 'desc' },
        take: 10,
        select: {
          id: true,
          subject: true,
          from_email: true,
          to_email: true,
          cc_email: true,
          status: true,
          created_at: true,
          provider_message_id: true,
          attachment_count: true,
        },
      }),
      prisma.inbound_email_messages.findMany({
        where: {
          OR: [
            { from_email: { equals: contactEmail, mode: 'insensitive' } },
            { to_email: { equals: contactEmail, mode: 'insensitive' } },
          ],
        },
        orderBy: { received_at: 'desc' },
        take: 10,
        select: {
          id: true,
          subject: true,
          from_email: true,
          to_email: true,
          status: true,
          received_at: true,
          normalized_body: true,
          text_body: true,
          has_attachments: true,
          attachment_count: true,
          message_id: true,
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        city: item,
        contactEmail,
        sent: sentLogs.map((log) => ({
          id: log.id,
          direction: 'sent',
          subject: log.subject,
          from: log.from_email,
          to: log.to_email,
          status: log.status,
          createdAt: log.created_at,
          sentAt: log.created_at,
          snippet: null,
          hasAttachments: (log.attachment_count || 0) > 0,
          originalId: log.id,
          providerMessageId: log.provider_message_id,
        })),
        received: receivedLogs.map((log) => ({
          id: log.id,
          direction: 'received',
          subject: log.subject || '(sem assunto)',
          from: log.from_email,
          to: log.to_email,
          status: log.status,
          receivedAt: log.received_at,
          createdAt: log.received_at,
          snippet: buildSnippet(log.normalized_body || log.text_body),
          hasAttachments: log.has_attachments || (log.attachment_count || 0) > 0,
          originalId: log.id,
          messageId: log.message_id,
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Erro ao buscar comunicações vinculadas.' });
  }
});

// PATCH /api/admin/regulatory/cities/:id
router.patch('/regulatory/cities/:id', async (req: Request, res: Response) => {
  try {
    const payload = updateCaseSchema.parse(req.body);

    const existing = await prisma.municipal_regulatory_cases.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Caso regulatório não encontrado.' });
    }

    const data: any = {
      updated_by_admin_id: (req as any).admin?.id || null,
    };

    if (payload.city !== undefined) data.city = payload.city;
    if (payload.state !== undefined) data.state = payload.state.toUpperCase();
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.department_name !== undefined) data.department_name = asNullable(payload.department_name);
    if (payload.contact_name !== undefined) data.contact_name = asNullable(payload.contact_name);
    if (payload.contact_email !== undefined) data.contact_email = asNullable(payload.contact_email);
    if (payload.contact_phone !== undefined) data.contact_phone = asNullable(payload.contact_phone);
    if (payload.last_sent_at !== undefined) data.last_sent_at = payload.last_sent_at;
    if (payload.last_response_at !== undefined) data.last_response_at = payload.last_response_at;
    if (payload.next_follow_up_at !== undefined) data.next_follow_up_at = payload.next_follow_up_at;
    if (payload.next_action !== undefined) data.next_action = asNullable(payload.next_action);
    if (payload.notes !== undefined) data.notes = asNullable(payload.notes);

    if (Object.keys(data).length === 1) {
      return res.status(400).json({ success: false, error: 'Nenhuma alteração enviada.' });
    }

    const updated = await prisma.municipal_regulatory_cases.update({
      where: { id: req.params.id },
      data,
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || 'Payload inválido.' });
    }

    return res.status(500).json({ success: false, error: 'Erro ao atualizar caso regulatório por cidade.' });
  }
});

// GET /api/admin/regulatory/cities/:id/checklist
router.get('/regulatory/cities/:id/checklist', async (req: Request, res: Response) => {
  try {
    const item = await prisma.municipal_regulatory_cases.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        city: true,
        state: true,
      },
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Caso regulatório não encontrado.' });
    }

    const checklistItems = await prisma.municipal_regulatory_checklist_items.findMany({
      where: { case_id: item.id },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
    });

    return res.json({
      success: true,
      data: {
        city: item,
        items: checklistItems,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Erro ao buscar checklist municipal.' });
  }
});

// POST /api/admin/regulatory/cities/:id/checklist
router.post('/regulatory/cities/:id/checklist', async (req: Request, res: Response) => {
  try {
    const payload = createChecklistItemSchema.parse(req.body);
    const adminId = (req as any).admin?.id || null;

    const city = await prisma.municipal_regulatory_cases.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });

    if (!city) {
      return res.status(404).json({ success: false, error: 'Caso regulatório não encontrado.' });
    }

    const created = await prisma.municipal_regulatory_checklist_items.create({
      data: {
        case_id: city.id,
        title: payload.title,
        description: asNullable(payload.description),
        category: asNullable(payload.category),
        status: payload.status || 'PENDING',
        required: payload.required ?? true,
        sort_order: payload.sort_order ?? 0,
        notes: asNullable(payload.notes),
        due_date: payload.due_date ?? null,
      },
    });

    return res.status(201).json({ success: true, data: created, meta: { created_by_admin_id: adminId } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || 'Payload inválido.' });
    }

    return res.status(500).json({ success: false, error: 'Erro ao criar item de checklist.' });
  }
});

// PATCH /api/admin/regulatory/cities/:id/checklist/:itemId
router.patch('/regulatory/cities/:id/checklist/:itemId', async (req: Request, res: Response) => {
  try {
    const payload = updateChecklistItemSchema.parse(req.body);

    const existing = await prisma.municipal_regulatory_checklist_items.findFirst({
      where: {
        id: req.params.itemId,
        case_id: req.params.id,
      },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Item de checklist não encontrado.' });
    }

    const data: any = {};

    if (payload.title !== undefined) data.title = payload.title;
    if (payload.description !== undefined) data.description = asNullable(payload.description);
    if (payload.category !== undefined) data.category = asNullable(payload.category);
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.required !== undefined) data.required = payload.required;
    if (payload.sort_order !== undefined) data.sort_order = payload.sort_order;
    if (payload.notes !== undefined) data.notes = asNullable(payload.notes);
    if (payload.due_date !== undefined) data.due_date = payload.due_date;

    const nextStatus = payload.status || existing.status;
    if (isChecklistDone(nextStatus)) {
      if (!existing.completed_at) {
        data.completed_at = new Date();
      }
    } else if (payload.status !== undefined) {
      data.completed_at = null;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhuma alteração enviada.' });
    }

    const updated = await prisma.municipal_regulatory_checklist_items.update({
      where: { id: existing.id },
      data,
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0]?.message || 'Payload inválido.' });
    }

    return res.status(500).json({ success: false, error: 'Erro ao atualizar item de checklist.' });
  }
});

// DELETE /api/admin/regulatory/cities/:id/checklist/:itemId
router.delete('/regulatory/cities/:id/checklist/:itemId', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.municipal_regulatory_checklist_items.findFirst({
      where: {
        id: req.params.itemId,
        case_id: req.params.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Item de checklist não encontrado.' });
    }

    await prisma.municipal_regulatory_checklist_items.delete({
      where: { id: existing.id },
    });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Erro ao excluir item de checklist.' });
  }
});

// POST /api/admin/regulatory/cities/:id/checklist/template/app-transport
router.post('/regulatory/cities/:id/checklist/template/app-transport', async (req: Request, res: Response) => {
  try {
    const city = await prisma.municipal_regulatory_cases.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });

    if (!city) {
      return res.status(404).json({ success: false, error: 'Caso regulatório não encontrado.' });
    }

    const existingCount = await prisma.municipal_regulatory_checklist_items.count({
      where: { case_id: city.id },
    });

    if (existingCount > 0) {
      return res.status(409).json({
        success: false,
        error: 'Checklist já possui itens cadastrados para esta cidade.',
      });
    }

    const created = await prisma.$transaction(
      SANTA_RITA_TRANSPORT_TEMPLATE.map((item) =>
        prisma.municipal_regulatory_checklist_items.create({
          data: {
            case_id: city.id,
            title: item.title,
            description: item.description,
            category: item.category,
            status: 'PENDING',
            required: true,
            sort_order: item.sort_order,
          },
        }),
      ),
    );

    return res.status(201).json({
      success: true,
      data: created,
      meta: {
        template: 'app-transport',
        created: created.length,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Erro ao aplicar modelo de checklist.' });
  }
});

export default router;
