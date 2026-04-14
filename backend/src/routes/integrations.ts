import { Router } from 'express';
import { prisma } from '../lib/prisma';

export const integrationsRoutes = Router();

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

const URGENT_PATTERNS = [
  '⚠️ registro de emergência',
  'registro de emergencia',
  'emergência',
  'emergencia',
  'preciso de ajuda urgente',
  'socorro',
  'me ajuda por favor',
  'estou em perigo',
];

function detectUrgent(body: string): boolean {
  const lower = body.toLowerCase();
  return URGENT_PATTERNS.some(p => lower.includes(p));
}

/**
 * Resolve contact type and linked entity by phone number.
 * Order: driver → passenger → guide → consultant_lead → unknown
 */
async function resolveContact(phone: string): Promise<{
  contact_type: string;
  contact_name: string | null;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
}> {
  // Normalizar: remover whatsapp: prefix, manter só dígitos e +
  const clean = phone.replace('whatsapp:', '').trim();
  // Tentar match com e sem +55
  const variants = [clean];
  if (clean.startsWith('+55')) variants.push(clean.slice(3), clean.slice(1));
  if (clean.startsWith('55') && !clean.startsWith('+')) variants.push('+' + clean, clean.slice(2));
  if (!clean.startsWith('+') && !clean.startsWith('55')) variants.push('+55' + clean, '55' + clean);

  // Driver
  const driver = await prisma.drivers.findFirst({
    where: { phone: { in: variants } },
    select: { id: true, name: true },
  });
  if (driver) return { contact_type: 'driver', contact_name: driver.name, linked_entity_type: 'driver', linked_entity_id: driver.id };

  // Passenger
  const passenger = await prisma.passengers.findFirst({
    where: { phone: { in: variants } },
    select: { id: true, name: true },
  });
  if (passenger) return { contact_type: 'passenger', contact_name: passenger.name, linked_entity_type: 'passenger', linked_entity_id: passenger.id };

  // Guide
  const guide = await prisma.tourist_guides.findFirst({
    where: { phone: { in: variants } },
    select: { id: true, name: true },
  });
  if (guide) return { contact_type: 'guide', contact_name: guide.name, linked_entity_type: 'guide', linked_entity_id: guide.id };

  // Consultant lead
  const lead = await prisma.consultant_leads.findFirst({
    where: { phone: { in: variants }, status: { not: 'dismissed' } },
    select: { id: true, name: true },
  });
  if (lead) return { contact_type: 'lead', contact_name: lead.name, linked_entity_type: 'consultant_lead', linked_entity_id: lead.id };

  return { contact_type: 'unknown', contact_name: null, linked_entity_type: null, linked_entity_id: null };
}

// Twilio WhatsApp Inbound Webhook
integrationsRoutes.post('/twilio/whatsapp', async (req, res) => {
  // Responder TwiML vazio imediatamente (Twilio espera resposta rápida)
  res.set('Content-Type', 'text/xml');
  res.status(200).send(EMPTY_TWIML);

  // Persistir async (não bloqueia resposta ao Twilio)
  try {
    const { From, Body, MessageSid, ProfileName, MediaUrl0, MediaContentType0 } = req.body;
    if (!From || !Body) return;

    const phone = From.replace('whatsapp:', '').trim();
    const twilioSid = MessageSid || null;
    const preview = (Body || '').substring(0, 200);

    // Dedup: se já existe mensagem com esse twilio_sid, ignorar
    if (twilioSid) {
      const existing = await prisma.wa_messages.findFirst({ where: { twilio_sid: twilioSid } });
      if (existing) {
        console.log(`[WA_INBOUND] Duplicate SID ${twilioSid}, skipping`);
        return;
      }
    }

    const isUrgent = detectUrgent(Body);

    // Buscar ou criar conversa
    let conversation = await prisma.wa_conversations.findUnique({ where: { phone } });

    if (!conversation) {
      // Resolver contato
      const resolved = await resolveContact(phone);

      conversation = await prisma.wa_conversations.create({
        data: {
          phone,
          whatsapp_name: ProfileName || null,
          contact_name: resolved.contact_name,
          contact_type: resolved.contact_type,
          linked_entity_type: resolved.linked_entity_type,
          linked_entity_id: resolved.linked_entity_id,
          status: 'new',
          priority: isUrgent ? 'urgent' : 'normal',
          unread_count: 1,
          message_count: 1,
          last_message_at: new Date(),
          last_message_preview: preview,
          last_inbound_at: new Date(),
        },
      });

      console.log(`[WA_INBOUND] New conversation id=${conversation.id} phone=${phone.substring(0, 7)}*** type=${resolved.contact_type}${isUrgent ? ' URGENT' : ''}`);
    } else {
      // Atualizar conversa existente
      const updates: any = {
        unread_count: { increment: 1 },
        message_count: { increment: 1 },
        last_message_at: new Date(),
        last_message_preview: preview,
        last_inbound_at: new Date(),
      };

      // Atualizar whatsapp_name se veio e ainda não tinha
      if (ProfileName && !conversation.whatsapp_name) {
        updates.whatsapp_name = ProfileName;
      }

      // Escalar para urgent se mensagem de emergência (nunca desescalar)
      if (isUrgent && conversation.priority !== 'urgent') {
        updates.priority = 'urgent';
      }

      // Se estava resolvida, reabrir
      if (conversation.status === 'resolved') {
        updates.status = 'new';
      }

      // Re-resolver contato se ainda é unknown
      if (conversation.contact_type === 'unknown') {
        const resolved = await resolveContact(phone);
        if (resolved.contact_type !== 'unknown') {
          updates.contact_type = resolved.contact_type;
          updates.contact_name = resolved.contact_name;
          updates.linked_entity_type = resolved.linked_entity_type;
          updates.linked_entity_id = resolved.linked_entity_id;
        }
      }

      conversation = await prisma.wa_conversations.update({
        where: { id: conversation.id },
        data: updates,
      });
    }

    // Persistir mensagem
    await prisma.wa_messages.create({
      data: {
        conversation_id: conversation.id,
        direction: 'inbound',
        body: Body,
        twilio_sid: twilioSid,
        media_url: MediaUrl0 || null,
        media_type: MediaContentType0 || null,
      },
    });

    console.log(`[WA_INBOUND] msg conv=${conversation.id} type=${conversation.contact_type} preview="${preview.substring(0, 40)}..."`);
  } catch (err) {
    console.error('[WA_INBOUND] Error persisting message:', err);
  }
});
