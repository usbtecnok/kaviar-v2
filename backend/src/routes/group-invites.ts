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

function responsibleCodeParam(req: Request) {
  return String(req.params.code || '').trim().toUpperCase();
}

function isInviteUnavailable(invite: any): string | null {
  if (invite.status === 'revoked') return 'Convite revogado';
  if (invite.status !== 'active') return 'Convite indisponível';
  if (new Date(invite.expires_at).getTime() <= Date.now()) return 'Convite expirado';
  if (invite.max_uses != null && invite.used_count >= invite.max_uses) return 'Convite atingiu o limite de uso';
  return null;
}

function mapResponsibleInviteStatus(invite: any): string {
  if (!invite) return 'invalid';
  if (invite.status === 'revoked') return 'revoked';
  if (invite.status === 'consumed') return 'consumed';
  if (new Date(invite.expires_at).getTime() <= Date.now()) return 'expired';
  if (invite.max_uses != null && invite.used_count >= invite.max_uses) return 'consumed';
  if (invite.status !== 'active') return 'invalid';
  return 'active';
}

function responsibleInvitePublicPayload(invite: any) {
  return {
    code: invite.code,
    status: mapResponsibleInviteStatus(invite),
    expires_at: invite.expires_at,
    group: {
      id: invite.group.id,
      public_name: invite.group.public_name,
      description: invite.group.description,
    },
  };
}

function getResponsibleInviteError(status: string) {
  if (status === 'expired') return 'Convite expirado.';
  if (status === 'revoked') return 'Convite revogado.';
  if (status === 'consumed') return 'Convite já utilizado.';
  return 'Convite inválido.';
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

router.get('/responsible-invites/:code', async (req: Request, res: Response) => {
  try {
    const invite = await db.kaviar_group_responsible_invites.findUnique({
      where: { code: responsibleCodeParam(req) },
      include: { group: true },
    });

    if (!invite) return res.status(404).json({ success: false, error: 'Convite inválido.' });
    return res.json({ success: true, data: responsibleInvitePublicPayload(invite) });
  } catch (error) {
    console.error('[GROUP_RESPONSIBLE_INVITE_PUBLIC_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao buscar convite de Responsável do Grupo' });
  }
});

router.post('/responsible-invites/:code/accept', authenticateGroupUser, async (req: Request, res: Response) => {
  try {
    if (req.body?.consent !== true) {
      return res.status(400).json({ success: false, error: 'Consentimento explícito é obrigatório' });
    }

    const user = (req as any).groupUser as GroupUser;
    if (user.type !== 'passenger') {
      return res.status(403).json({ success: false, error: 'Você não tem permissão para aceitar este convite.' });
    }

    const invite = await db.kaviar_group_responsible_invites.findUnique({
      where: { code: responsibleCodeParam(req) },
      include: { group: true },
    });

    if (!invite) return res.status(404).json({ success: false, error: 'Convite inválido.' });

    const inviteStatus = mapResponsibleInviteStatus(invite);
    if (inviteStatus === 'consumed' && invite.accepted_by_passenger_id === user.id) {
      return res.json({
        success: true,
        idempotent: true,
        data: {
          invite_id: invite.id,
          group_id: invite.group_id,
          status: invite.status,
        },
      });
    }
    if (inviteStatus !== 'active') {
      const statusCode = inviteStatus === 'consumed' ? 409 : inviteStatus === 'invalid' ? 404 : 410;
      return res.status(statusCode).json({ success: false, error: getResponsibleInviteError(inviteStatus) });
    }

    const consentTextVersion = String(req.body?.consent_text_version || 'v1').trim().slice(0, 50) || 'v1';
    const now = new Date();

    const result = await db.$transaction(async (tx: any) => {
      const latestInvite = await tx.kaviar_group_responsible_invites.findUnique({ where: { id: invite.id } });
      if (!latestInvite) throw Object.assign(new Error('Convite inválido.'), { statusCode: 404 });

      const latestStatus = mapResponsibleInviteStatus(latestInvite);
      if (latestStatus === 'consumed' && latestInvite.accepted_by_passenger_id === user.id) {
        return {
          idempotent: true,
          invite: latestInvite,
          member: await tx.kaviar_group_members.findFirst({ where: { group_id: latestInvite.group_id, passenger_id: user.id } }),
        };
      }
      if (latestStatus !== 'active') {
        const statusCode = latestStatus === 'consumed' ? 409 : latestStatus === 'invalid' ? 404 : 410;
        throw Object.assign(new Error(getResponsibleInviteError(latestStatus)), { statusCode });
      }

      const existingMember = await tx.kaviar_group_members.findFirst({
        where: { group_id: latestInvite.group_id, passenger_id: user.id },
      });

      if (existingMember?.status === 'blocked') {
        throw Object.assign(new Error('Você não tem permissão para aceitar este convite.'), { statusCode: 403 });
      }

      await tx.kaviar_group_members.updateMany({
        where: {
          group_id: latestInvite.group_id,
          role: 'responsible',
          status: 'active',
        },
        data: { role: 'member' },
      });

      const memberData: any = {
        user_type: 'passenger',
        passenger_id: user.id,
        name: user.name || null,
        phone: user.phone || null,
        role: 'responsible',
        status: 'active',
        invite_source: 'responsible_invite',
        joined_at: existingMember?.joined_at || now,
        consented_at: now,
      };

      const member = existingMember
        ? await tx.kaviar_group_members.update({ where: { id: existingMember.id }, data: memberData })
        : await tx.kaviar_group_members.create({
          data: {
            group_id: latestInvite.group_id,
            ...memberData,
          },
        });

      const updatedInvite = await tx.kaviar_group_responsible_invites.update({
        where: { id: latestInvite.id },
        data: {
          status: 'consumed',
          used_count: 1,
          accepted_by_member_id: member.id,
          accepted_by_passenger_id: user.id,
          consent_text_version: consentTextVersion,
          consent_given_at: now,
          accepted_at: now,
        },
      });

      return { idempotent: false, invite: updatedInvite, member };
    });

    await audit({
      adminId: invite.invited_by_admin_id || 'system',
      action: 'kaviar_group_responsible_invite_accepted',
      entityType: 'kaviar_group_responsible_invite',
      entityId: invite.id,
      newValue: {
        group_id: invite.group_id,
        invite_id: invite.id,
        accepted_by_passenger_id: user.id,
        idempotent: !!result.idempotent,
      },
      ipAddress: req.ip,
      userAgent: String(req.headers['user-agent'] || '').slice(0, 200),
    });

    return res.status(result.idempotent ? 200 : 201).json({
      success: true,
      idempotent: !!result.idempotent,
      data: {
        invite_id: result.invite.id,
        group_id: result.invite.group_id,
        invite_status: result.invite.status,
        member_id: result.member?.id || null,
      },
    });
  } catch (error: any) {
    if (error?.statusCode) return res.status(error.statusCode).json({ success: false, error: error.message });
    console.error('[GROUP_RESPONSIBLE_INVITE_ACCEPT_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Não foi possível concluir o aceite agora. Tente novamente.' });
  }
});

export default router;
