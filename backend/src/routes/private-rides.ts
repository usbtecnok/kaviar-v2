import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateAdmin } from '../middlewares/auth';

const router = Router();
const prisma = new PrismaClient();

// Public: submit request (no auth)
router.post('/request', async (req: Request, res: Response) => {
  try {
    const { name, phone, service_type, scheduled_date, scheduled_time, origin, destination, round_trip, wait_at_destination, notes, partner_id } = req.body;
    if (!name || !phone || !scheduled_date || !scheduled_time || !origin || !destination) {
      return res.status(400).json({ success: false, error: 'Preencha todos os campos obrigatórios' });
    }
    const request = await prisma.private_ride_requests.create({
      data: { name, phone, service_type: service_type || 'outro', scheduled_date, scheduled_time, origin, destination, round_trip: !!round_trip, wait_at_destination: !!wait_at_destination, notes: notes || null, partner_id: partner_id || null },
    });
    res.status(201).json({ success: true, data: { id: request.id } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao enviar solicitação' });
  }
});

// Admin: list requests
router.get('/', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { status, date } = req.query;
    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (date) where.scheduled_date = date;
    const requests = await prisma.private_ride_requests.findMany({ where, orderBy: { created_at: 'desc' }, take: 100 });
    const counts = {
      new: await prisma.private_ride_requests.count({ where: { status: 'new' } }),
      analyzing: await prisma.private_ride_requests.count({ where: { status: 'analyzing' } }),
      confirmed: await prisma.private_ride_requests.count({ where: { status: 'confirmed' } }),
    };
    res.json({ success: true, data: requests, counts });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro' });
  }
});

// Admin: update status
router.patch('/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { status, assigned_driver, admin_notes } = req.body;
    const data: any = { updated_at: new Date() };
    if (status) data.status = status;
    if (assigned_driver !== undefined) data.assigned_driver = assigned_driver;
    if (admin_notes !== undefined) data.admin_notes = admin_notes;
    const updated = await prisma.private_ride_requests.update({ where: { id: req.params.id }, data });

    // Send WhatsApp when confirmed
    if (status === 'confirmed' && updated.phone) {
      try {
        const { whatsappEvents } = require('../modules/whatsapp');
        const phoneDigits = updated.phone.replace(/\D/g, '');
        const phoneE164 = phoneDigits.startsWith('55') ? `+${phoneDigits}` : `+55${phoneDigits}`;
        const msg = `Olá ${updated.name}! Sua solicitação KAVIAR Particular foi *confirmada*.\n\n📅 ${updated.scheduled_date} às ${updated.scheduled_time}\n📍 ${updated.origin} → ${updated.destination}${updated.round_trip ? ' (ida e volta)' : ''}${updated.assigned_driver ? `\n🚗 Motorista: ${updated.assigned_driver}` : ''}\n\nAguarde o motorista no local e horário combinados.`;
        const encodedMsg = encodeURIComponent(msg);
        // Return WhatsApp link for admin to send
        (res as any).whatsappLink = `https://wa.me/${phoneE164.replace('+', '')}?text=${encodedMsg}`;
      } catch {}
    }

    res.json({ success: true, data: updated, whatsapp_link: (res as any).whatsappLink || null });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao atualizar' });
  }
});

export default router;
