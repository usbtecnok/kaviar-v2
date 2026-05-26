import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, requireSuperAdmin } from '../middlewares/auth';
import bcrypt from 'bcrypt';

const router = Router();

router.use(authenticateAdmin);
router.use(requireSuperAdmin);

const PET_ROLES = ['PET_OPERATOR', 'PET_SUPERVISOR', 'PET_ADMIN'];

// GET /api/admin/pet/operators
router.get('/', async (_req: Request, res: Response) => {
  try {
    const operators = await prisma.admins.findMany({
      where: { role: { in: PET_ROLES } },
      select: { id: true, name: true, email: true, phone: true, role: true, is_active: true, created_at: true },
      orderBy: { created_at: 'desc' },
    });
    return res.json({ success: true, data: operators });
  } catch (err) {
    console.error('[PET_OPERATORS] list error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao listar operadores' });
  }
});

// POST /api/admin/pet/operators
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Nome, email e senha são obrigatórios' });
    }

    const assignRole = role && PET_ROLES.includes(role) ? role : 'PET_OPERATOR';

    const existing = await prisma.admins.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const operator = await prisma.admins.create({
      data: { name, email, password: hashedPassword, phone: phone || null, role: assignRole, is_active: true, must_change_password: true },
      select: { id: true, name: true, email: true, phone: true, role: true, is_active: true, created_at: true },
    });

    console.log(`[PET_OPERATORS] created ${operator.email} role=${assignRole}`);
    return res.json({ success: true, data: operator });
  } catch (err) {
    console.error('[PET_OPERATORS] create error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao criar operador' });
  }
});

// PATCH /api/admin/pet/operators/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { name, phone, is_active } = req.body;

    const existing = await prisma.admins.findUnique({ where: { id: req.params.id } });
    if (!existing || !PET_ROLES.includes(existing.role)) {
      return res.status(404).json({ success: false, error: 'Operador não encontrado' });
    }

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (is_active !== undefined) data.is_active = is_active;

    const operator = await prisma.admins.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, phone: true, role: true, is_active: true, created_at: true },
    });

    console.log(`[PET_OPERATORS] updated ${operator.email} is_active=${operator.is_active}`);
    return res.json({ success: true, data: operator });
  } catch (err) {
    console.error('[PET_OPERATORS] update error:', err);
    return res.status(500).json({ success: false, error: 'Erro ao atualizar operador' });
  }
});

export default router;
