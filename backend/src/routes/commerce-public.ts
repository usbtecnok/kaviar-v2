import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const VALID_ORDER_STATUSES = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'CANCELED', 'COMPLETED'];

// GET /api/public/commerce/:slug — public store page
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const account = await prisma.commerce_accounts.findFirst({
      where: { slug: req.params.slug, is_active: true, deleted_at: null },
      select: { id: true, name: true, trade_name: true, category: true, address: true, phone: true, logo_url: true, slug: true },
    });
    if (!account) return res.status(404).json({ success: false, error: 'Comércio não encontrado' });

    const products = await prisma.commerce_products.findMany({
      where: { commerce_account_id: account.id, is_available: true, is_restricted: false, deleted_at: null },
      select: { id: true, name: true, description: true, category: true, price_cents: true, image_url: true, stock_quantity: true, sort_order: true },
      orderBy: { sort_order: 'asc' },
    });

    res.json({ success: true, data: { account, products } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao carregar comércio' });
  }
});

// POST /api/public/commerce/:slug/orders — create order
router.post('/:slug/orders', async (req: Request, res: Response) => {
  try {
    const { customer_name, customer_phone, customer_address, delivery_type, notes, items } = req.body;
    if (!customer_name || !customer_phone || !items?.length) {
      return res.status(400).json({ success: false, error: 'Nome, telefone e itens são obrigatórios' });
    }

    const account = await prisma.commerce_accounts.findFirst({
      where: { slug: req.params.slug, is_active: true, deleted_at: null },
    });
    if (!account) return res.status(404).json({ success: false, error: 'Comércio não encontrado' });

    // Validate products and build order items
    const productIds = items.map((i: any) => i.product_id);
    const products = await prisma.commerce_products.findMany({
      where: { id: { in: productIds }, commerce_account_id: account.id, deleted_at: null },
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    const orderItems: { product_id: string; product_name: string; quantity: number; unit_price_cents: number; total_cents: number; notes: string | null }[] = [];

    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (!product) return res.status(400).json({ success: false, error: `Produto não encontrado: ${item.product_id}` });
      if (!product.is_available) return res.status(400).json({ success: false, error: `Produto indisponível: ${product.name}` });
      if (product.is_restricted) return res.status(400).json({ success: false, error: `Produto restrito: ${product.name}` });
      const qty = Math.max(1, parseInt(item.quantity) || 1);
      if (product.stock_quantity !== null && product.stock_quantity < qty) {
        return res.status(400).json({ success: false, error: `Estoque insuficiente: ${product.name} (disponível: ${product.stock_quantity})` });
      }
      orderItems.push({ product_id: product.id, product_name: product.name, quantity: qty, unit_price_cents: product.price_cents, total_cents: product.price_cents * qty, notes: item.notes || null });
    }

    const isDelivery = delivery_type === 'delivery';
    if (isDelivery && !customer_address) return res.status(400).json({ success: false, error: 'Endereço obrigatório para entrega' });

    const subtotal_cents = orderItems.reduce((sum, i) => sum + i.total_cents, 0);
    const delivery_fee_cents = isDelivery ? 300 : 0;
    const commissionRate = Number(account.commission_percent) / 100;
    const kaviar_commission_cents = Math.round(subtotal_cents * commissionRate);
    const commerce_net_cents = subtotal_cents - kaviar_commission_cents;
    const total_cents = subtotal_cents + delivery_fee_cents;

    // Generate unique order_code
    let order_code = '';
    for (let i = 0; i < 5; i++) {
      order_code = 'KAV-' + String(Math.floor(1000 + Math.random() * 9000));
      const exists = await prisma.commerce_orders.findFirst({ where: { order_code } });
      if (!exists) break;
    }

    const order = await prisma.commerce_orders.create({
      data: {
        commerce_account_id: account.id,
        customer_name, customer_phone,
        customer_address: customer_address || null,
        delivery_type: isDelivery ? 'delivery' : 'pickup',
        delivery_fee_cents,
        subtotal_cents, kaviar_commission_cents, commerce_net_cents, total_cents,
        order_code,
        notes: notes || null,
        items: { create: orderItems },
      },
      include: { items: true },
    });

    res.status(201).json({ success: true, data: { id: order.id, order_code: order.order_code, status: order.status, total_cents: order.total_cents, delivery_fee_cents: order.delivery_fee_cents } });
  } catch (error) {
    console.error('[commerce-public] order error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar pedido' });
  }
});

// POST /api/public/commerce/orders/:id/pay — generate Pix for order
router.post('/orders/:id/pay', async (req: Request, res: Response) => {
  try {
    const order = await prisma.commerce_orders.findFirst({
      where: { id: req.params.id },
      include: { account: { select: { name: true } } },
    });
    if (!order) return res.status(404).json({ success: false, error: 'Pedido não encontrado' });
    if (order.payment_status === 'paid') return res.json({ success: true, data: { already_paid: true } });
    if (order.pix_qr_code) return res.json({ success: true, data: { pix_qr_code: order.pix_qr_code, pix_copy_paste: order.pix_copy_paste, pix_expires_at: order.pix_expires_at, payment_status: order.payment_status } });

    const { getCommerceCustomerId, createPixPayment } = require('../services/asaas.service');
    const customerId = await getCommerceCustomerId();
    const extRef = `co_order_${order.id}`;
    const pix = await createPixPayment(customerId, order.total_cents, extRef, `Pedido ${order.account.name}`);

    await prisma.commerce_orders.update({
      where: { id: order.id },
      data: { asaas_payment_id: pix.paymentId, pix_qr_code: pix.qrCode, pix_copy_paste: pix.copyPaste, pix_expires_at: pix.expirationDate ? new Date(pix.expirationDate) : null, payment_method: 'pix' },
    });

    res.json({ success: true, data: { pix_qr_code: pix.qrCode, pix_copy_paste: pix.copyPaste, pix_expires_at: pix.expirationDate, invoice_url: pix.invoiceUrl } });
  } catch (error: any) {
    console.error('[commerce-public] pay error:', error.message);
    res.status(500).json({ success: false, error: 'Erro ao gerar Pix' });
  }
});

// GET /api/public/commerce/orders/:code/status
router.get('/orders/:code/status', async (req: Request, res: Response) => {
  try {
    const order = await prisma.commerce_orders.findFirst({ where: { OR: [{ id: req.params.code }, { order_code: req.params.code }] }, select: { payment_status: true, status: true, delivery_status: true } });
    if (!order) return res.status(404).json({ success: false, error: 'Não encontrado' });
    res.json({ success: true, data: order });
  } catch { res.status(500).json({ success: false, error: 'Erro' }); }
});

// GET /api/public/commerce/orders/:code/track
router.get('/orders/:code/track', async (req: Request, res: Response) => {
  try {
    const order = await prisma.commerce_orders.findFirst({
      where: { OR: [{ order_code: req.params.code }, { id: req.params.code }] },
      include: { account: { select: { name: true, trade_name: true } }, items: true },
    });
    if (!order) return res.status(404).json({ success: false, error: 'Pedido não encontrado' });
    const showCode = order.delivery_type === 'delivery' && order.delivery_code && ['READY', 'DISPATCHED'].includes(order.status);
    res.json({ success: true, data: {
      order_code: order.order_code, status: order.status, payment_status: order.payment_status,
      delivery_type: order.delivery_type, delivery_status: order.delivery_status,
      delivery_fee_cents: order.delivery_fee_cents, subtotal_cents: order.subtotal_cents, total_cents: order.total_cents,
      customer_name: order.customer_name, commerce_name: order.account.trade_name || order.account.name,
      items: order.items.map(i => ({ name: i.product_name, quantity: i.quantity, total_cents: i.total_cents })),
      delivery_code: showCode ? order.delivery_code : null,
      driver_name: order.driver_name || null, created_at: order.created_at,
    } });
  } catch { res.status(500).json({ success: false, error: 'Erro' }); }
});

export default router;
