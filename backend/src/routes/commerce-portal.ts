import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateCommerce } from '../middlewares/commerce-auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/commerce/me
router.get('/me', authenticateCommerce, async (req: Request, res: Response) => {
  try {
    const account = await prisma.commerce_accounts.findUnique({ where: { id: (req as any).commerceAccount.id } });
    res.json({ success: true, data: { account, user: (req as any).commerceUser } });
  } catch { res.status(500).json({ success: false, error: 'Erro' }); }
});

// GET /api/commerce/products
router.get('/products', authenticateCommerce, async (req: Request, res: Response) => {
  try {
    const products = await prisma.commerce_products.findMany({
      where: { commerce_account_id: (req as any).commerceAccount.id, deleted_at: null },
      orderBy: { sort_order: 'asc' },
    });
    res.json({ success: true, data: products });
  } catch { res.status(500).json({ success: false, error: 'Erro ao listar produtos' }); }
});

// POST /api/commerce/products
router.post('/products', authenticateCommerce, async (req: Request, res: Response) => {
  try {
    const { name, description, category, price_cents, image_url, is_available, is_restricted, stock_quantity, min_stock_alert, sort_order } = req.body;
    if (!name || price_cents === undefined) return res.status(400).json({ success: false, error: 'Nome e preço obrigatórios' });

    // Restricted products cannot be available
    const available = is_restricted ? false : (is_available ?? true);

    const product = await prisma.commerce_products.create({
      data: {
        commerce_account_id: (req as any).commerceAccount.id,
        name, description: description || null, category: category || null,
        price_cents: Math.max(0, parseInt(price_cents)),
        image_url: image_url || null,
        is_available: available,
        is_restricted: is_restricted ?? false,
        stock_quantity: stock_quantity ?? null,
        min_stock_alert: min_stock_alert ?? null,
        sort_order: sort_order ?? 0,
      },
    });
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao criar produto' });
  }
});

// PATCH /api/commerce/products/:id
router.patch('/products/:id', authenticateCommerce, async (req: Request, res: Response) => {
  try {
    const existing = await prisma.commerce_products.findFirst({
      where: { id: req.params.id, commerce_account_id: (req as any).commerceAccount.id, deleted_at: null },
    });
    if (!existing) return res.status(404).json({ success: false, error: 'Produto não encontrado' });

    const { name, description, category, price_cents, image_url, is_available, is_restricted, stock_quantity, min_stock_alert, sort_order } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description || null;
    if (category !== undefined) data.category = category || null;
    if (price_cents !== undefined) data.price_cents = Math.max(0, parseInt(price_cents));
    if (image_url !== undefined) data.image_url = image_url || null;
    if (stock_quantity !== undefined) data.stock_quantity = stock_quantity;
    if (min_stock_alert !== undefined) data.min_stock_alert = min_stock_alert;
    if (sort_order !== undefined) data.sort_order = sort_order;

    // Restricted logic
    const finalRestricted = is_restricted !== undefined ? is_restricted : existing.is_restricted;
    if (is_restricted !== undefined) data.is_restricted = is_restricted;
    if (is_available !== undefined) {
      data.is_available = finalRestricted ? false : is_available;
    } else if (finalRestricted && existing.is_available) {
      data.is_available = false; // Force unavailable if now restricted
    }

    const product = await prisma.commerce_products.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao atualizar produto' });
  }
});

// PATCH /api/commerce/products/:id/availability
router.patch('/products/:id/availability', authenticateCommerce, async (req: Request, res: Response) => {
  try {
    const existing = await prisma.commerce_products.findFirst({
      where: { id: req.params.id, commerce_account_id: (req as any).commerceAccount.id, deleted_at: null },
    });
    if (!existing) return res.status(404).json({ success: false, error: 'Produto não encontrado' });
    if (existing.is_restricted) return res.status(400).json({ success: false, error: 'Produto restrito não pode ser disponibilizado' });

    const product = await prisma.commerce_products.update({
      where: { id: req.params.id },
      data: { is_available: !existing.is_available },
    });
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro' });
  }
});

// DELETE /api/commerce/products/:id (soft delete)
router.delete('/products/:id', authenticateCommerce, async (req: Request, res: Response) => {
  try {
    const existing = await prisma.commerce_products.findFirst({
      where: { id: req.params.id, commerce_account_id: (req as any).commerceAccount.id, deleted_at: null },
    });
    if (!existing) return res.status(404).json({ success: false, error: 'Produto não encontrado' });

    await prisma.commerce_products.update({ where: { id: req.params.id }, data: { deleted_at: new Date() } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao remover' });
  }
});

// ─── Orders ─────────────────────────────────────────────────────────────────

// GET /api/commerce/orders
router.get('/orders', authenticateCommerce, async (req: Request, res: Response) => {
  try {
    const orders = await prisma.commerce_orders.findMany({
      where: { commerce_account_id: (req as any).commerceAccount.id },
      include: { items: true },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: orders });
  } catch { res.status(500).json({ success: false, error: 'Erro ao listar pedidos' }); }
});

// PATCH /api/commerce/orders/:id/status
router.patch('/orders/:id/status', authenticateCommerce, async (req: Request, res: Response) => {
  try {
    const { status, cancel_reason } = req.body;
    const valid = ['ACCEPTED', 'PREPARING', 'READY', 'CANCELED', 'COMPLETED'];
    if (!valid.includes(status)) return res.status(400).json({ success: false, error: `Status inválido. Válidos: ${valid.join(', ')}` });

    const order = await prisma.commerce_orders.findFirst({
      where: { id: req.params.id, commerce_account_id: (req as any).commerceAccount.id },
    });
    if (!order) return res.status(404).json({ success: false, error: 'Pedido não encontrado' });

    const data: any = { status };
    if (status === 'ACCEPTED') {
      data.accepted_at = new Date();
      // Deduct stock on accept
      const items = await prisma.commerce_order_items.findMany({ where: { order_id: order.id } });
      for (const item of items) {
        const product = await prisma.commerce_products.findUnique({ where: { id: item.product_id } });
        if (product && product.stock_quantity !== null) {
          await prisma.commerce_products.update({ where: { id: item.product_id }, data: { stock_quantity: Math.max(0, product.stock_quantity - item.quantity) } });
        }
      }
    }
    if (status === 'PREPARING') data.prepared_at = new Date();
    if (status === 'READY') data.ready_at = new Date();
    if (status === 'CANCELED') { data.canceled_at = new Date(); data.cancel_reason = cancel_reason || null; }
    if (status === 'COMPLETED') data.completed_at = new Date();

    const updated = await prisma.commerce_orders.update({ where: { id: order.id }, data });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao atualizar pedido' });
  }
});

export default router;
