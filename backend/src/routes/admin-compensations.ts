import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, requireRole } from '../middlewares/auth';
import { createPixPayment } from '../services/asaas.service';

const router = Router();
router.use(authenticateAdmin);

const AMOUNT_CENTS = parseInt(process.env.COMPENSATION_AMOUNT_CENTS || '500', 10);
const CREDITS = parseInt(process.env.COMPENSATION_CREDITS || '1', 10);
const COMPENSATION_CUSTOMER_ID = process.env.ASAAS_COMPENSATION_CUSTOMER_ID || '';

// GET /api/admin/compensations — listar
router.get('/', async (_req: Request, res: Response) => {
  try {
    const items = await prisma.ride_compensations.findMany({
      orderBy: { created_at: 'desc' },
      take: 50,
    });
    return res.json({ success: true, data: items });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/compensations — gerar compensação Pix
router.post('/', requireRole(['SUPER_ADMIN', 'FINANCE']), async (req: Request, res: Response) => {
  try {
    const { ride_id, notes } = req.body;
    if (!ride_id) return res.status(400).json({ success: false, error: 'ride_id obrigatório' });

    // Verificar elegibilidade
    const ride = await prisma.rides_v2.findUnique({ where: { id: ride_id } });
    if (!ride) return res.status(404).json({ success: false, error: 'Corrida não encontrada' });
    if (ride.status !== 'canceled_by_passenger') return res.status(400).json({ success: false, error: 'Corrida não foi cancelada pelo passageiro' });
    if (!ride.arrived_at) return res.status(400).json({ success: false, error: 'Motorista não havia chegado ao local' });
    if (!ride.driver_id) return res.status(400).json({ success: false, error: 'Corrida sem motorista atribuído' });

    // Idempotência: já existe compensação para esta corrida?
    const existing = await prisma.ride_compensations.findUnique({ where: { ride_id } });
    if (existing) return res.status(409).json({ success: false, error: 'Compensação já gerada para esta corrida', data: existing });

    const adminId = (req as any).adminId;
    const extRef = `compensation:${ride_id}`;

    // Gerar cobrança Pix via Asaas (customer fixo KAVIAR Compensações)
    if (!COMPENSATION_CUSTOMER_ID) return res.status(500).json({ success: false, error: 'Customer Asaas de compensações não configurado (ASAAS_COMPENSATION_CUSTOMER_ID)' });

    let pix;
    try {
      pix = await createPixPayment(COMPENSATION_CUSTOMER_ID, AMOUNT_CENTS, extRef, 'KAVIAR: Apoio ao motorista — corrida cancelada após chegada');
    } catch (pixErr: any) {
      return res.status(500).json({ success: false, error: `Erro ao gerar Pix: ${pixErr.message}` });
    }

    const comp = await prisma.ride_compensations.create({
      data: {
        ride_id,
        driver_id: ride.driver_id,
        passenger_id: ride.passenger_id,
        amount_cents: AMOUNT_CENTS,
        credits_amount: CREDITS,
        external_reference: extRef,
        asaas_payment_id: pix.paymentId,
        pix_qr_code: pix.qrCode,
        pix_copy_paste: pix.copyPaste,
        pix_expires_at: pix.expirationDate ? new Date(pix.expirationDate) : null,
        invoice_url: pix.invoiceUrl,
        notes,
        created_by: adminId,
      },
    });

    console.log(`[COMPENSATION] created id=${comp.id} ride=${ride_id} driver=${ride.driver_id} amount=${AMOUNT_CENTS} asaas=${pix.paymentId}`);
    return res.json({ success: true, data: comp });
  } catch (err: any) {
    console.error('[COMPENSATION] create error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/compensations/:id/waive — dispensar cobrança
router.patch('/:id/waive', requireRole(['SUPER_ADMIN', 'FINANCE']), async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const comp = await prisma.ride_compensations.findUnique({ where: { id: req.params.id } });
    if (!comp) return res.status(404).json({ success: false, error: 'Compensação não encontrada' });
    if (comp.status !== 'pending') return res.status(400).json({ success: false, error: `Não é possível dispensar: status=${comp.status}` });

    const updated = await prisma.ride_compensations.update({
      where: { id: req.params.id },
      data: { status: 'waived', waived_at: new Date(), waived_by: (req as any).adminId, waived_reason: reason || null },
    });

    console.log(`[COMPENSATION] waived id=${comp.id} by=${(req as any).adminId}`);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
