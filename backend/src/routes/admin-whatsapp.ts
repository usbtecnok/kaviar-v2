import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, requireRole } from '../middlewares/auth';
import { auditWrite } from '../middlewares/audit-write';
import { getTwilioClient, getWhatsAppFrom, normalizeWhatsAppTo, WHATSAPP_ENV } from '../modules/whatsapp/whatsapp-client';

const router = Router();

// GET /api/admin/whatsapp/messages/:id/media — proxy seguro (auth via query param para <img src>)
router.get('/messages/:id/media', async (req: Request, res: Response) => {
  try {
    const tokenStr = (req.headers.authorization?.replace('Bearer ', '') || req.query.token) as string;
    if (!tokenStr) return res.status(401).json({ success: false, error: 'Não autorizado' });

    const jwt = require('jsonwebtoken');
    let admin: any = null;
    try {
      const decoded = jwt.verify(tokenStr, process.env.JWT_SECRET) as any;
      const adminId = decoded.userId || decoded.adminId;
      if (adminId) {
        const found = await prisma.admins.findUnique({ where: { id: adminId } });
        if (found?.is_active) admin = { id: found.id, role: found.role, name: found.name };
      }
    } catch {}
    if (!admin) return res.status(401).json({ success: false, error: 'Não autorizado' });

    const message = await prisma.wa_messages.findUnique({
      where: { id: req.params.id },
      include: { conversation: { select: { assignee_id: true } } },
    });

    if (!message || !message.media_url) {
      return res.status(404).json({ success: false, error: 'Mídia não encontrada' });
    }

    if (admin.role === 'PET_OPERATOR' && message.conversation.assignee_id !== admin.id) {
      return res.status(403).json({ success: false, error: 'Sem permissão' });
    }

    const twilioUrl = message.media_url;
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    const response = await fetch(twilioUrl, {
      headers: { Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64') },
    });

    if (!response.ok) {
      return res.status(502).json({ success: false, error: 'Erro ao buscar mídia' });
    }

    res.set('Content-Type', message.media_type || 'application/octet-stream');
    res.set('Cache-Control', 'private, max-age=3600');
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (err: any) {
    console.error('[WA_MEDIA] proxy error:', err.message);
    res.status(500).json({ success: false, error: 'Erro ao servir mídia' });
  }
});

router.use(authenticateAdmin);
router.use(requireRole(['SUPER_ADMIN', 'OPERATOR', 'PET_OPERATOR']));

// GET /api/admin/whatsapp/conversations
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const { status, contact_type, search, page = '1', limit = '30' } = req.query;
    const take = Math.min(parseInt(limit as string) || 30, 100);
    const skip = (Math.max(parseInt(page as string) || 1, 1) - 1) * take;

    const where: any = {};
    if (status) where.status = status;
    if (contact_type) where.contact_type = contact_type;

    // PET_OPERATOR vê apenas conversas pet atribuídas a ele
    const admin = (req as any).admin;
    if (admin.role === 'PET_OPERATOR') {
      where.assignee_id = admin.id;
    }
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

// POST /api/admin/whatsapp/conversations/send — enviar mensagem criando/usando conversa existente
router.post('/conversations/send', auditWrite('send_whatsapp', 'conversation'), async (req: Request, res: Response) => {
  try {
    const { phone, body, contact_type, linked_entity_type, linked_entity_id, assignee_id } = req.body;
    if (!phone || !body?.trim()) {
      return res.status(400).json({ success: false, error: 'phone e body são obrigatórios' });
    }

    const admin = (req as any).admin;
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    // Normalizar para E.164: +55DDDNÚMERO
    let normalizedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
    const digits = normalizedPhone.replace(/\D/g, '');
    if (digits.length === 11) normalizedPhone = `+55${digits}`; // DDD+num sem código país
    else if (digits.length === 13 && digits.startsWith('55')) normalizedPhone = `+${digits}`;
    else if (digits.length >= 12 && !digits.startsWith('55')) normalizedPhone = `+${digits}`;

    // Buscar conversa existente por telefone (variantes para evitar duplicidade)
    const suffix9 = digits.slice(-9);
    const allConvs = await prisma.wa_conversations.findMany({ where: { phone: { contains: suffix9 } }, take: 5 });
    let conversation = allConvs.find(c => c.phone.replace(/\D/g, '').slice(-9) === suffix9) || null;

    if (!conversation) {
      conversation = await prisma.wa_conversations.create({
        data: {
          phone: normalizedPhone,
          contact_type: contact_type || 'pet',
          linked_entity_type: linked_entity_type || null,
          linked_entity_id: linked_entity_id || null,
          assignee_id: assignee_id || null,
          status: 'in_progress',
          priority: 'normal',
          unread_count: 0,
          message_count: 0,
          last_message_at: new Date(),
          last_message_preview: body.trim().substring(0, 200),
        },
      });
    } else if (contact_type && linked_entity_type && linked_entity_id) {
      // Conversa existente recebe contexto Pet: atualizar classificação e vínculo
      conversation = await prisma.wa_conversations.update({
        where: { id: conversation.id },
        data: {
          contact_type,
          linked_entity_type,
          linked_entity_id,
          ...(assignee_id ? { assignee_id } : {}),
        },
      });
    }

    // Enviar via Twilio
    let twilioSid: string | null = null;
    if (WHATSAPP_ENV.enabled) {
      const client = getTwilioClient();
      const toPhone = conversation.phone.startsWith('+') ? conversation.phone : `+${conversation.phone}`;
      const msg = await client.messages.create({
        from: getWhatsAppFrom(),
        to: normalizeWhatsAppTo(toPhone),
        body: body.trim(),
      });
      twilioSid = msg.sid;
    }

    // Persistir mensagem outbound
    const message = await prisma.wa_messages.create({
      data: {
        conversation_id: conversation.id,
        direction: 'outbound',
        body: body.trim(),
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
        last_message_preview: body.trim().substring(0, 200),
        status: conversation.status === 'new' ? 'in_progress' : undefined,
      },
    });

    console.log(`[WA_SEND] conv=${conversation.id} admin=${admin.name} twilio=${twilioSid || 'disabled'}`);
    res.json({ success: true, data: { conversation_id: conversation.id, message } });
  } catch (err: any) {
    console.error('[WA_SEND] error:', err);
    res.status(500).json({ success: false, error: 'Erro ao enviar mensagem' });
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
router.post('/conversations/:id/messages', auditWrite('send_whatsapp', 'conversation'), async (req: Request, res: Response) => {
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
    case 'pet_homologation': {
      return prisma.pet_homologations.findUnique({
        where: { id },
        select: { id: true, name: true, phone: true, status: true, region: true, driver_id: true, operator_id: true, source: true },
      }).then(h => h ? { ...h, type: 'pet_homologation' } : null);
    }
    default:
      return null;
  }
}

export default router;
