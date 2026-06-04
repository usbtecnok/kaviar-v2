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

    const subtotal_cents = orderItems.reduce((sum, i) => sum + i.total_cents, 0);
    const commissionRate = Number(account.commission_percent) / 100;
    const kaviar_commission_cents = Math.round(subtotal_cents * commissionRate);
    const commerce_net_cents = subtotal_cents - kaviar_commission_cents;
    const total_cents = subtotal_cents;

    const order = await prisma.commerce_orders.create({
      data: {
        commerce_account_id: account.id,
        customer_name, customer_phone,
        customer_address: customer_address || null,
        delivery_type: delivery_type === 'delivery' ? 'delivery' : 'pickup',
        subtotal_cents, kaviar_commission_cents, commerce_net_cents, total_cents,
        notes: notes || null,
        items: { create: orderItems },
      },
      include: { items: true },
    });

    res.status(201).json({ success: true, data: { id: order.id, status: order.status, total_cents: order.total_cents } });
  } catch (error) {
    console.error('[commerce-public] order error:', error);
    res.status(500).json({ success: false, error: 'Erro ao criar pedido' });
  }
});

export default router;
