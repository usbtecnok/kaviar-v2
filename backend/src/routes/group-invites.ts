import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { audit } from '../utils/audit';
import { invitePublicPayload } from '../services/group-access.service';

const router = Router();
const db = prisma as any;
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;

type GroupUser = {
  type: 'passenger' | 'driver';
  id: string;
  name?: string | null;
  phone?: string | null;
};

function getBearerToken(req: Request): string | null {
  const header = (req.headers.authorization || (req.headers as any).Authorization) as string | undefined;
  if (!header || typeof header !== 'string') return null;
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token.trim();
}

async function authenticateGroupUser(req: Request, res: Response, next: NextFunction) {
  try {
    if (!JWT_SECRET) return res.status(500).json({ success: false, error: 'JWT secret not configured' });

    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ success: false, error: 'Token ausente' });

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.userType === 'PASSENGER') {
      const passenger = await db.passengers.findUnique({ where: { id: decoded.userId } });
      if (!passenger) return res.status(401).json({ success: false, error: 'Token inválido' });
      (req as any).groupUser = { type: 'passenger', id: passenger.id, name: passenger.name, phone: passenger.phone } satisfies GroupUser;
      return next();
    }

    if (decoded.userType === 'DRIVER') {
      const driver = await db.drivers.findUnique({ where: { id: decoded.userId } });
      if (!driver) return res.status(401).json({ success: false, error: 'Token inválido' });
      (req as any).groupUser = { type: 'driver', id: driver.id, name: driver.name, phone: driver.phone } satisfies GroupUser;
      return next();
    }

    return res.status(403).json({ success: false, error: 'Acesso negado' });
  } catch (_error) {
    return res.status(401).json({ success: false, error: 'Token inválido' });
  }
}

function codeParam(req: Request) {
  return String(req.params.code || '').trim().toUpperCase();
}

function isInviteUnavailable(invite: any): string | null {
  if (invite.status === 'revoked') return 'Convite revogado';
  if (invite.status !== 'active') return 'Convite indisponível';
  if (new Date(invite.expires_at).getTime() <= Date.now()) return 'Convite expirado';
  if (invite.max_uses != null && invite.used_count >= invite.max_uses) return 'Convite atingiu o limite de uso';
  return null;
}

router.get('/invites/:code', async (req: Request, res: Response) => {
  try {
    const invite = await db.kaviar_group_invites.findUnique({
      where: { code: codeParam(req) },
      include: { group: true },
    });

    if (!invite) return res.status(404).json({ success: false, error: 'Convite não encontrado' });
    return res.json({ success: true, data: invitePublicPayload(invite) });
  } catch (error) {
    console.error('[GROUP_INVITE_PUBLIC_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar convite' });
  }
});

router.post('/invites/:code/join', authenticateGroupUser, async (req: Request, res: Response) => {
  try {
    if (req.body?.consent !== true) {
      return res.status(400).json({ success: false, error: 'Consentimento explícito é obrigatório' });
    }

    const invite = await db.kaviar_group_invites.findUnique({
      where: { code: codeParam(req) },
      include: { group: true },
    });

    if (!invite) return res.status(404).json({ success: false, error: 'Convite não encontrado' });

    const unavailable = isInviteUnavailable(invite);
    if (unavailable) return res.status(410).json({ success: false, error: unavailable });

    const user = (req as any).groupUser as GroupUser;
    const where = user.type === 'passenger'
      ? { group_id: invite.group_id, passenger_id: user.id }
      : { group_id: invite.group_id, driver_id: user.id };

    const existing = await db.kaviar_group_members.findFirst({ where });
    if (existing && existing.status !== 'removed') {
      if (existing.status === 'blocked') return res.status(403).json({ success: false, error: 'Vínculo bloqueado' });
      return res.json({ success: true, idempotent: true, data: { id: existing.id, group_id: existing.group_id, status: existing.status } });
    }

    const now = new Date();
    const member = await db.$transaction(async (tx: any) => {
      const latestInvite = await tx.kaviar_group_invites.findUnique({ where: { id: invite.id } });
      const latestUnavailable = isInviteUnavailable(latestInvite);
      if (latestUnavailable) throw Object.assign(new Error(latestUnavailable), { statusCode: 410 });

      const memberData: any = {
        group_id: invite.group_id,
        user_type: user.type,
        name: user.name || null,
        phone: user.phone || null,
        role: user.type === 'driver' ? 'trusted_driver' : 'member',
        status: 'active',
        invite_id: invite.id,
        invite_source: 'link',
        consented_at: now,
        joined_at: now,
      };
      if (user.type === 'passenger') memberData.passenger_id = user.id;
      if (user.type === 'driver') memberData.driver_id = user.id;

      const saved = existing
        ? await tx.kaviar_group_members.update({ where: { id: existing.id }, data: memberData })
        : await tx.kaviar_group_members.create({ data: memberData });

      await tx.kaviar_group_invites.update({ where: { id: invite.id }, data: { used_count: { increment: 1 } } });
      return saved;
    });

    await audit({
      adminId: invite.created_by_admin_id || 'system',
      action: 'kaviar_group_invite_accepted',
      entityType: 'kaviar_group_member',
      entityId: member.id,
      newValue: { group_id: invite.group_id, invite_id: invite.id, user_type: user.type },
      ipAddress: req.ip,
      userAgent: String(req.headers['user-agent'] || '').slice(0, 200),
    });

    return res.status(201).json({ success: true, data: { id: member.id, group_id: member.group_id, status: member.status } });
  } catch (error: any) {
    if (error?.statusCode) return res.status(error.statusCode).json({ success: false, error: error.message });
    console.error('[GROUP_INVITE_JOIN_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao aceitar convite' });
  }
});

export default router;
