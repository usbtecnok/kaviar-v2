import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, requireRole } from '../middlewares/auth';
import { getTwilioClient, getWhatsAppFrom, normalizeWhatsAppTo, WHATSAPP_ENV } from '../modules/whatsapp/whatsapp-client';

const router = Router();

router.use(authenticateAdmin);
router.use(requireRole(['SUPER_ADMIN', 'OPERATOR']));

// GET /api/admin/whatsapp/conversations
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const { status, contact_type, search, page = '1', limit = '30' } = req.query;
    const take = Math.min(parseInt(limit as string) || 30, 100);
    const skip = (Math.max(parseInt(page as string) || 1, 1) - 1) * take;

    const where: any = {};
    if (status) where.status = status;
    if (contact_type) where.contact_type = contact_type;
    if (search) {
      const s = String(search).trim();
      where.OR = [
        { phone: { contains: s } },
        { contact_name: { contains: s, mode: 'insensitive' } },
        { whatsapp_name: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [conversations, total] = await Promise.all([
      prisma.wa_conversations.findMany({
        where,
        orderBy: [
          { priority: 'desc' },  // urgent (u) > normal (n) alphabetically desc
          { last_message_at: { sort: 'desc', nulls: 'last' } },
        ],
        take,
        skip,
      }),
      prisma.wa_conversations.count({ where }),
    ]);

    const unreadTotal = await prisma.wa_conversations.aggregate({
      _sum: { unread_count: true },
      where: { unread_count: { gt: 0 } },
    });

    res.json({
      success: true,
      data: conversations,
      pagination: { page: Math.floor(skip / take) + 1, limit: take, total, totalPages: Math.ceil(total / take) },
      unreadTotal: unreadTotal._sum.unread_count || 0,
    });
  } catch (err: any) {
    console.error('[WA_ADMIN] list error:', err);
    res.status(500).json({ success: false, error: 'Erro ao listar conversas' });
  }
});

// GET /api/admin/whatsapp/conversations/:id
router.get('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const conversation = await prisma.wa_conversations.findUnique({
      where: { id: req.params.id },
      include: {
        messages: { orderBy: { created_at: 'asc' } },
      },
    });

    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversa não encontrada' });
    }

    // Resolver contexto da entidade vinculada
    let linkedEntity: any = null;
    if (conversation.linked_entity_type && conversation.linked_entity_id) {
      linkedEntity = await resolveLinkedEntity(conversation.linked_entity_type, conversation.linked_entity_id);
    }

    // Marcar como lida
    if (conversation.unread_count > 0) {
      await prisma.wa_conversations.update({
        where: { id: conversation.id },
        data: { unread_count: 0 },
      });
    }

    res.json({
      success: true,
      data: {
        ...conversation,
        unread_count: 0,
        linkedEntity,
      },
    });
  } catch (err: any) {
    console.error('[WA_ADMIN] detail error:', err);
    res.status(500).json({ success: false, error: 'Erro ao buscar conversa' });
  }
});

// POST /api/admin/whatsapp/conversations/:id/messages
router.post('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const { body } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ success: false, error: 'Mensagem não pode ser vazia' });
    }

    const conversation = await prisma.wa_conversations.findUnique({ where: { id: req.params.id } });
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversa não encontrada' });
    }

    const admin = (req as any).admin;
    const messageBody = body.trim();

    // Enviar via Twilio
    let twilioSid: string | null = null;
    if (WHATSAPP_ENV.enabled) {
      const client = getTwilioClient();
      const msg = await client.messages.create({
        from: getWhatsAppFrom(),
        to: normalizeWhatsAppTo(conversation.phone),
        body: messageBody,
      });
      twilioSid = msg.sid;
    }

    // Persistir mensagem outbound
    const message = await prisma.wa_messages.create({
      data: {
        conversation_id: conversation.id,
        direction: 'outbound',
        body: messageBody,
        twilio_sid: twilioSid,
        sent_by_admin_id: admin.id,
        sent_by_admin_name: admin.name,
      },
    });

    // Atualizar conversa
    await prisma.wa_conversations.update({
      where: { id: conversation.id },
      data: {
        message_count: { increment: 1 },
        last_message_at: new Date(),
        last_message_preview: messageBody.substring(0, 200),
        status: conversation.status === 'new' ? 'in_progress' : conversation.status,
      },
    });

    console.log(`[WA_OUTBOUND] conv=${conversation.id} admin=${admin.name} twilio=${twilioSid || 'disabled'}`);

    res.json({ success: true, data: message });
  } catch (err: any) {
    console.error('[WA_ADMIN] send error:', err);
    res.status(500).json({ success: false, error: 'Erro ao enviar mensagem' });
  }
});

// PATCH /api/admin/whatsapp/conversations/:id
router.patch('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const conversation = await prisma.wa_conversations.findUnique({ where: { id: req.params.id } });
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversa não encontrada' });
    }

    const { status, contact_type, linked_entity_type, linked_entity_id, internal_notes } = req.body;
    const data: any = {};

    if (status !== undefined) data.status = status;
    if (contact_type !== undefined) data.contact_type = contact_type;
    if (internal_notes !== undefined) data.internal_notes = internal_notes;

    // Vínculo: atualizar tipo + id juntos, e resolver nome
    if (linked_entity_type !== undefined) {
      data.linked_entity_type = linked_entity_type || null;
      data.linked_entity_id = linked_entity_id || null;

      if (linked_entity_type && linked_entity_id) {
        const entity = await resolveLinkedEntity(linked_entity_type, linked_entity_id);
        if (entity) data.contact_name = entity.name;
      }
    }

    const updated = await prisma.wa_conversations.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('[WA_ADMIN] update error:', err);
    res.status(500).json({ success: false, error: 'Erro ao atualizar conversa' });
  }
});

// Resolver entidade vinculada para o painel de contexto
async function resolveLinkedEntity(type: string, id: string): Promise<any> {
  switch (type) {
    case 'driver': {
      const d = await prisma.drivers.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, phone: true, status: true, vehicle_model: true, vehicle_color: true, vehicle_plate: true, neighborhood_id: true },
      });
      if (!d) return null;
      const balance = await prisma.$queryRawUnsafe<any[]>('SELECT balance FROM credit_balance WHERE driver_id = $1', id);
      return { ...d, type: 'driver', credits: balance[0]?.balance ? parseFloat(balance[0].balance) : 0 };
    }
    case 'passenger': {
      return prisma.passengers.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, phone: true, status: true, neighborhood_id: true },
      }).then(p => p ? { ...p, type: 'passenger' } : null);
    }
    case 'guide': {
      return prisma.tourist_guides.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, phone: true, status: true, community_id: true },
      }).then(g => g ? { ...g, type: 'guide' } : null);
    }
    case 'consultant_lead': {
      return prisma.consultant_leads.findUnique({
        where: { id },
        select: { id: true, name: true, phone: true, status: true, region: true, source: true },
      }).then(l => l ? { ...l, type: 'consultant_lead' } : null);
    }
    default:
      return null;
  }
}

export default router;
