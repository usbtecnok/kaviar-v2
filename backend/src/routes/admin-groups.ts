import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { authenticateAdmin, requireRole } from '../middlewares/auth';
import { applyTerritoryScope } from '../middlewares/territory-scope';
import { audit, auditCtx } from '../utils/audit';
import {
  KAVIAR_GROUP_MEMBER_ROLES,
  KAVIAR_GROUP_MEMBER_STATUSES,
  KAVIAR_GROUP_MEMBER_TYPES,
  KAVIAR_GROUP_STATUSES,
  assertGroupCreateScope,
  canAccessGroup,
  canWriteGroups,
  cleanString,
  getGroupScopeWhere,
  isAllowedValue,
  publicGroupSelect,
  validateGroupType,
} from '../services/group-access.service';

const router = Router();
const db = prisma as any;
const ADMIN_ROLES = ['SUPER_ADMIN', 'TERRITORIAL_MANAGER', 'TERRITORIAL_OPERATOR'];
const GROUP_POST_CATEGORIES = ['general', 'important', 'schedule', 'meeting_point'] as const;
const GROUP_POST_STATUSES = ['published', 'archived'] as const;
const GROUP_POST_AUTHOR_TYPES = ['admin', 'responsible'] as const;

router.use(authenticateAdmin);
router.use(requireRole(ADMIN_ROLES));
router.use(applyTerritoryScope);

function forbiddenWrite(res: Response) {
  return res.status(403).json({ success: false, error: 'Permissão insuficiente para alterar grupos' });
}

function buildGroupData(body: any, adminId?: string) {
  const type = validateGroupType(body.type);
  if (!type) return { error: 'Tipo de grupo inválido' };

  const status = body.status === undefined ? 'active' : body.status;
  if (!isAllowedValue(status, KAVIAR_GROUP_STATUSES)) return { error: 'Status de grupo inválido' };

  const publicName = cleanString(body.public_name ?? body.name, 120);
  if (!publicName) return { error: 'Nome público é obrigatório' };

  return {
    data: {
      public_name: publicName,
      internal_name: cleanString(body.internal_name, 160),
      type,
      responsible_name: cleanString(body.responsible_name, 160),
      responsible_phone: cleanString(body.responsible_phone, 30),
      responsible_email: cleanString(body.responsible_email, 255),
      description: cleanString(body.description, 500),
      rules: body.rules && typeof body.rules === 'object' ? body.rules : undefined,
      status,
      community_id: cleanString(body.community_id, 255),
      neighborhood_id: cleanString(body.neighborhood_id, 255),
      territory_id: cleanString(body.territory_id, 255),
      created_by_admin_id: adminId,
    },
  };
}

function buildGroupPatch(body: any) {
  const data: any = {};

  if (body.type !== undefined) {
    const type = validateGroupType(body.type);
    if (!type) return { error: 'Tipo de grupo inválido' };
    data.type = type;
  }
  if (body.status !== undefined) {
    if (!isAllowedValue(body.status, KAVIAR_GROUP_STATUSES)) return { error: 'Status de grupo inválido' };
    data.status = body.status;
  }
  if (body.public_name !== undefined || body.name !== undefined) {
    const publicName = cleanString(body.public_name ?? body.name, 120);
    if (!publicName) return { error: 'Nome público é obrigatório' };
    data.public_name = publicName;
  }

  for (const [key, max] of [
    ['internal_name', 160],
    ['responsible_name', 160],
    ['responsible_phone', 30],
    ['responsible_email', 255],
    ['description', 500],
    ['community_id', 255],
    ['neighborhood_id', 255],
    ['territory_id', 255],
  ] as const) {
    if (body[key] !== undefined) data[key] = cleanString(body[key], max) || null;
  }

  if (body.rules !== undefined) data.rules = body.rules && typeof body.rules === 'object' ? body.rules : null;
  return { data };
}

async function auditAdmin(req: Request, action: string, entityType: string, entityId: string, newValue?: any, oldValue?: any) {
  const ctx = auditCtx(req);
  await audit({
    adminId: ctx.adminId,
    adminEmail: ctx.adminEmail,
    action,
    entityType,
    entityId,
    oldValue,
    newValue,
    ipAddress: ctx.ip,
    userAgent: ctx.ua,
  });
}

async function getScopedGroup(req: Request, id: string) {
  const group = await db.kaviar_groups.findUnique({ where: { id } });
  if (!group) return null;
  if (!canAccessGroup(group, (req as any).admin, (req as any).territoryScope)) return false;
  return group;
}

async function uniqueInviteCode() {
  for (let i = 0; i < 8; i += 1) {
    const code = `GKV-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const exists = await db.kaviar_group_invites.findUnique({ where: { code } });
    if (!exists) return code;
  }
  throw new Error('Não foi possível gerar convite único');
}

function parseOptionalFutureDate(value: any) {
  if (value == null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { error: 'Data de expiração inválida' };
  if (date.getTime() <= Date.now()) return { error: 'Data de expiração precisa ser futura' };
  return { data: date };
}

function buildGroupPostData(body: any, groupId: string, admin: { id: string; name?: string | null }) {
  const title = cleanString(body.title, 120);
  if (!title) return { error: 'Título é obrigatório' };

  const content = cleanString(body.body, 8000);
  if (!content) return { error: 'Mensagem é obrigatória' };

  const category = cleanString(body.category, 40) || 'general';
  if (!GROUP_POST_CATEGORIES.includes(category as any)) return { error: 'Categoria de comunicado inválida' };

  const status = cleanString(body.status, 30) || 'published';
  if (!GROUP_POST_STATUSES.includes(status as any)) return { error: 'Status de comunicado inválido' };

  const pinned = body.is_pinned === true || body.is_pinned === 'true' || body.is_pinned === 1 || body.is_pinned === '1';
  const expiresAt = parseOptionalFutureDate(body.expires_at);
  if (expiresAt && 'error' in expiresAt) return expiresAt;

  const authorType = 'admin';
  if (!GROUP_POST_AUTHOR_TYPES.includes(authorType)) return { error: 'Autor do comunicado inválido' };

  return {
    data: {
      group_id: groupId,
      author_type: authorType,
      author_admin_id: admin.id,
      author_member_id: null,
      author_display_name_snapshot: cleanString(admin.name, 160) || null,
      title,
      body: content,
      category,
      is_pinned: pinned,
      status,
      published_at: new Date(),
      expires_at: expiresAt ? expiresAt.data : null,
    },
  };
}

function mapPostWithReadCount(post: any) {
  return {
    ...post,
    read_count: post._count?.reads || 0,
  };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const where: any = { ...getGroupScopeWhere((req as any).admin, (req as any).territoryScope) };
    if (req.query.status) where.status = req.query.status;
    if (req.query.type) where.type = req.query.type;
    if (req.query.search) {
      where.public_name = { contains: String(req.query.search), mode: 'insensitive' };
    }

    const groups = await db.kaviar_groups.findMany({
      where,
      select: { ...publicGroupSelect(), _count: { select: { members: true, invites: true } } },
      orderBy: { created_at: 'desc' },
      take: Math.min(Number(req.query.limit) || 100, 200),
    });

    res.json({ success: true, data: groups });
  } catch (error) {
    console.error('[ADMIN_GROUPS_LIST_ERROR]', error);
    res.status(500).json({ success: false, error: 'Erro ao listar grupos' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    if (!canWriteGroups((req as any).admin)) return forbiddenWrite(res);

    const built = buildGroupData(req.body, (req as any).admin?.id);
    if ('error' in built) return res.status(400).json({ success: false, error: built.error });
    if (!assertGroupCreateScope(built.data, (req as any).admin, (req as any).territoryScope)) {
      return res.status(403).json({ success: false, error: 'Grupo fora do escopo territorial' });
    }

    const group = await db.kaviar_groups.create({ data: built.data });
    await auditAdmin(req, 'kaviar_group_created', 'kaviar_group', group.id, { group_id: group.id, type: group.type, status: group.status });
    res.status(201).json({ success: true, data: group });
  } catch (error) {
    console.error('[ADMIN_GROUPS_CREATE_ERROR]', error);
    res.status(500).json({ success: false, error: 'Erro ao criar grupo' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const group = await db.kaviar_groups.findUnique({
      where: { id: req.params.id },
      include: {
        members: { orderBy: { created_at: 'desc' }, take: 200 },
        invites: { orderBy: { created_at: 'desc' }, take: 100 },
      },
    });

    if (!group) return res.status(404).json({ success: false, error: 'Grupo não encontrado' });
    if (!canAccessGroup(group, (req as any).admin, (req as any).territoryScope)) {
      return res.status(403).json({ success: false, error: 'Grupo fora do escopo territorial' });
    }

    res.json({ success: true, data: group });
  } catch (error) {
    console.error('[ADMIN_GROUPS_DETAIL_ERROR]', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar grupo' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    if (!canWriteGroups((req as any).admin)) return forbiddenWrite(res);

    const current = await getScopedGroup(req, req.params.id);
    if (current === null) return res.status(404).json({ success: false, error: 'Grupo não encontrado' });
    if (current === false) return res.status(403).json({ success: false, error: 'Grupo fora do escopo territorial' });

    const built = buildGroupPatch(req.body);
    if ('error' in built) return res.status(400).json({ success: false, error: built.error });
    if (!assertGroupCreateScope({ ...current, ...built.data }, (req as any).admin, (req as any).territoryScope)) {
      return res.status(403).json({ success: false, error: 'Grupo fora do escopo territorial' });
    }

    const group = await db.kaviar_groups.update({ where: { id: req.params.id }, data: built.data });
    await auditAdmin(req, 'kaviar_group_updated', 'kaviar_group', group.id, { group_id: group.id, status: group.status }, current);
    res.json({ success: true, data: group });
  } catch (error) {
    console.error('[ADMIN_GROUPS_UPDATE_ERROR]', error);
    res.status(500).json({ success: false, error: 'Erro ao atualizar grupo' });
  }
});

router.post('/:id/invites', async (req: Request, res: Response) => {
  try {
    if (!canWriteGroups((req as any).admin)) return forbiddenWrite(res);

    const group = await getScopedGroup(req, req.params.id);
    if (group === null) return res.status(404).json({ success: false, error: 'Grupo não encontrado' });
    if (group === false) return res.status(403).json({ success: false, error: 'Grupo fora do escopo territorial' });

    const expiresAt = new Date(req.body.expires_at);
    if (!req.body.expires_at || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      return res.status(400).json({ success: false, error: 'Convite precisa ter expiração futura' });
    }

    const maxUses = req.body.max_uses == null ? null : Number(req.body.max_uses);
    if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses <= 0)) {
      return res.status(400).json({ success: false, error: 'Limite de uso inválido' });
    }

    const invite = await db.kaviar_group_invites.create({
      data: {
        group_id: req.params.id,
        code: await uniqueInviteCode(),
        status: 'active',
        max_uses: maxUses,
        expires_at: expiresAt,
        created_by_admin_id: (req as any).admin?.id,
      },
    });

    await auditAdmin(req, 'kaviar_group_invite_created', 'kaviar_group_invite', invite.id, { group_id: req.params.id, invite_id: invite.id, expires_at: invite.expires_at });
    res.status(201).json({ success: true, data: invite });
  } catch (error) {
    console.error('[ADMIN_GROUP_INVITE_CREATE_ERROR]', error);
    res.status(500).json({ success: false, error: 'Erro ao criar convite' });
  }
});

router.patch('/:id/invites/:inviteId/revoke', async (req: Request, res: Response) => {
  try {
    if (!canWriteGroups((req as any).admin)) return forbiddenWrite(res);

    const invite = await db.kaviar_group_invites.findUnique({ where: { id: req.params.inviteId }, include: { group: true } });
    if (!invite || invite.group_id !== req.params.id) return res.status(404).json({ success: false, error: 'Convite não encontrado' });
    if (!canAccessGroup(invite.group, (req as any).admin, (req as any).territoryScope)) {
      return res.status(403).json({ success: false, error: 'Grupo fora do escopo territorial' });
    }

    const revoked = await db.kaviar_group_invites.update({
      where: { id: req.params.inviteId },
      data: { status: 'revoked', revoked_at: new Date() },
    });

    await auditAdmin(req, 'kaviar_group_invite_revoked', 'kaviar_group_invite', revoked.id, { group_id: req.params.id, invite_id: revoked.id }, invite);
    res.json({ success: true, data: revoked });
  } catch (error) {
    console.error('[ADMIN_GROUP_INVITE_REVOKE_ERROR]', error);
    res.status(500).json({ success: false, error: 'Erro ao revogar convite' });
  }
});

router.post('/:id/members', async (req: Request, res: Response) => {
  try {
    if (!canWriteGroups((req as any).admin)) return forbiddenWrite(res);

    const group = await getScopedGroup(req, req.params.id);
    if (group === null) return res.status(404).json({ success: false, error: 'Grupo não encontrado' });
    if (group === false) return res.status(403).json({ success: false, error: 'Grupo fora do escopo territorial' });

    const userType = req.body.user_type;
    const role = req.body.role || (userType === 'driver' ? 'trusted_driver' : 'member');
    const status = req.body.status || 'pending';
    if (!isAllowedValue(userType, KAVIAR_GROUP_MEMBER_TYPES)) return res.status(400).json({ success: false, error: 'Tipo de membro inválido' });
    if (!isAllowedValue(role, KAVIAR_GROUP_MEMBER_ROLES)) return res.status(400).json({ success: false, error: 'Papel de membro inválido' });
    if (!isAllowedValue(status, KAVIAR_GROUP_MEMBER_STATUSES)) return res.status(400).json({ success: false, error: 'Status de membro inválido' });

    const data: any = {
      group_id: req.params.id,
      user_type: userType,
      role,
      status,
      name: cleanString(req.body.name, 160),
      phone: cleanString(req.body.phone, 30),
      invite_source: cleanString(req.body.invite_source, 40),
      joined_at: status === 'active' ? new Date() : null,
    };

    if (userType === 'passenger') data.passenger_id = cleanString(req.body.passenger_id, 255);
    if (userType === 'driver') data.driver_id = cleanString(req.body.driver_id, 255);
    if (userType === 'passenger' && !data.passenger_id) return res.status(400).json({ success: false, error: 'passenger_id é obrigatório' });
    if (userType === 'driver' && !data.driver_id) return res.status(400).json({ success: false, error: 'driver_id é obrigatório' });

    const existing = await db.kaviar_group_members.findFirst({
      where: userType === 'passenger'
        ? { group_id: req.params.id, passenger_id: data.passenger_id }
        : userType === 'driver'
          ? { group_id: req.params.id, driver_id: data.driver_id }
          : { group_id: req.params.id, user_type: 'responsible', phone: data.phone },
    });
    if (existing) return res.status(200).json({ success: true, data: existing, idempotent: true });

    const member = await db.kaviar_group_members.create({ data });
    await auditAdmin(req, 'kaviar_group_member_created', 'kaviar_group_member', member.id, { group_id: req.params.id, member_id: member.id, user_type: member.user_type, status: member.status });
    res.status(201).json({ success: true, data: member });
  } catch (error) {
    console.error('[ADMIN_GROUP_MEMBER_CREATE_ERROR]', error);
    res.status(500).json({ success: false, error: 'Erro ao criar membro' });
  }
});

router.patch('/:id/members/:memberId', async (req: Request, res: Response) => {
  try {
    if (!canWriteGroups((req as any).admin)) return forbiddenWrite(res);

    const member = await db.kaviar_group_members.findUnique({ where: { id: req.params.memberId }, include: { group: true } });
    if (!member || member.group_id !== req.params.id) return res.status(404).json({ success: false, error: 'Membro não encontrado' });
    if (!canAccessGroup(member.group, (req as any).admin, (req as any).territoryScope)) {
      return res.status(403).json({ success: false, error: 'Grupo fora do escopo territorial' });
    }

    const data: any = {};
    if (req.body.status !== undefined) {
      if (!isAllowedValue(req.body.status, KAVIAR_GROUP_MEMBER_STATUSES)) return res.status(400).json({ success: false, error: 'Status de membro inválido' });
      data.status = req.body.status;
      if (req.body.status === 'active' && !member.joined_at) data.joined_at = new Date();
    }
    if (req.body.role !== undefined) {
      if (!isAllowedValue(req.body.role, KAVIAR_GROUP_MEMBER_ROLES)) return res.status(400).json({ success: false, error: 'Papel de membro inválido' });
      data.role = req.body.role;
    }
    if (req.body.name !== undefined) data.name = cleanString(req.body.name, 160) || null;
    if (req.body.phone !== undefined) data.phone = cleanString(req.body.phone, 30) || null;

    const updated = await db.kaviar_group_members.update({ where: { id: req.params.memberId }, data });
    await auditAdmin(req, 'kaviar_group_member_updated', 'kaviar_group_member', updated.id, { group_id: req.params.id, member_id: updated.id, status: updated.status }, member);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[ADMIN_GROUP_MEMBER_UPDATE_ERROR]', error);
    res.status(500).json({ success: false, error: 'Erro ao atualizar membro' });
  }
});

router.get('/:id/posts', async (req: Request, res: Response) => {
  try {
    const group = await getScopedGroup(req, req.params.id);
    if (group === null) return res.status(404).json({ success: false, error: 'Grupo não encontrado' });
    if (group === false) return res.status(403).json({ success: false, error: 'Grupo fora do escopo territorial' });

    const posts = await db.kaviar_group_posts.findMany({
      where: { group_id: req.params.id },
      include: { _count: { select: { reads: true } } },
      orderBy: [
        { is_pinned: 'desc' },
        { published_at: 'desc' },
        { created_at: 'desc' },
      ],
    });

    const activeMembersCount = await db.kaviar_group_members.count({
      where: {
        group_id: req.params.id,
        status: 'active',
      },
    });

    return res.json({
      success: true,
      data: posts.map((post: any) => ({
        ...mapPostWithReadCount(post),
        active_members_count: activeMembersCount,
      })),
    });
  } catch (error) {
    console.error('[ADMIN_GROUP_POSTS_LIST_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao listar comunicados' });
  }
});

router.post('/:id/posts', async (req: Request, res: Response) => {
  try {
    if (!canWriteGroups((req as any).admin)) return forbiddenWrite(res);

    const group = await getScopedGroup(req, req.params.id);
    if (group === null) return res.status(404).json({ success: false, error: 'Grupo não encontrado' });
    if (group === false) return res.status(403).json({ success: false, error: 'Grupo fora do escopo territorial' });

    const built = buildGroupPostData(req.body, req.params.id, (req as any).admin);
    if ('error' in built) return res.status(400).json({ success: false, error: built.error });

    const post = await db.kaviar_group_posts.create({ data: built.data });
    await auditAdmin(req, 'kaviar_group_post_created', 'kaviar_group_post', post.id, { group_id: req.params.id, post_id: post.id, category: post.category, status: post.status });
    return res.status(201).json({ success: true, data: post });
  } catch (error) {
    console.error('[ADMIN_GROUP_POST_CREATE_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao criar comunicado' });
  }
});

router.patch('/:id/posts/:postId', async (req: Request, res: Response) => {
  try {
    if (!canWriteGroups((req as any).admin)) return forbiddenWrite(res);

    const group = await getScopedGroup(req, req.params.id);
    if (group === null) return res.status(404).json({ success: false, error: 'Grupo não encontrado' });
    if (group === false) return res.status(403).json({ success: false, error: 'Grupo fora do escopo territorial' });

    const existing = await db.kaviar_group_posts.findFirst({ where: { id: req.params.postId, group_id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Comunicado não encontrado' });

    const data: any = {};

    if (req.body.title !== undefined) {
      const title = cleanString(req.body.title, 120);
      if (!title) return res.status(400).json({ success: false, error: 'Título é obrigatório' });
      data.title = title;
    }

    if (req.body.body !== undefined) {
      const content = cleanString(req.body.body, 8000);
      if (!content) return res.status(400).json({ success: false, error: 'Mensagem é obrigatória' });
      data.body = content;
    }

    if (req.body.category !== undefined) {
      const category = cleanString(req.body.category, 40);
      if (!category || !GROUP_POST_CATEGORIES.includes(category as any)) {
        return res.status(400).json({ success: false, error: 'Categoria de comunicado inválida' });
      }
      data.category = category;
    }

    if (req.body.status !== undefined) {
      const status = cleanString(req.body.status, 30);
      if (!status || !GROUP_POST_STATUSES.includes(status as any)) {
        return res.status(400).json({ success: false, error: 'Status de comunicado inválido' });
      }
      data.status = status;
    }

    if (req.body.is_pinned !== undefined) {
      data.is_pinned = req.body.is_pinned === true || req.body.is_pinned === 'true' || req.body.is_pinned === 1 || req.body.is_pinned === '1';
    }

    if (req.body.expires_at !== undefined) {
      const parsed = parseOptionalFutureDate(req.body.expires_at);
      if (parsed && 'error' in parsed) return res.status(400).json({ success: false, error: parsed.error });
      data.expires_at = parsed ? parsed.data : null;
    }

    const updated = await db.kaviar_group_posts.update({ where: { id: existing.id }, data });
    await auditAdmin(req, 'kaviar_group_post_updated', 'kaviar_group_post', updated.id, { group_id: req.params.id, post_id: updated.id, status: updated.status, is_pinned: updated.is_pinned }, existing);
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[ADMIN_GROUP_POST_UPDATE_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao atualizar comunicado' });
  }
});

router.patch('/:id/posts/:postId/archive', async (req: Request, res: Response) => {
  try {
    if (!canWriteGroups((req as any).admin)) return forbiddenWrite(res);

    const group = await getScopedGroup(req, req.params.id);
    if (group === null) return res.status(404).json({ success: false, error: 'Grupo não encontrado' });
    if (group === false) return res.status(403).json({ success: false, error: 'Grupo fora do escopo territorial' });

    const existing = await db.kaviar_group_posts.findFirst({ where: { id: req.params.postId, group_id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Comunicado não encontrado' });

    const updated = await db.kaviar_group_posts.update({
      where: { id: existing.id },
      data: { status: 'archived' },
    });

    await auditAdmin(req, 'kaviar_group_post_archived', 'kaviar_group_post', updated.id, { group_id: req.params.id, post_id: updated.id });
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[ADMIN_GROUP_POST_ARCHIVE_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao arquivar comunicado' });
  }
});

router.patch('/:id/posts/:postId/pin', async (req: Request, res: Response) => {
  try {
    if (!canWriteGroups((req as any).admin)) return forbiddenWrite(res);

    const group = await getScopedGroup(req, req.params.id);
    if (group === null) return res.status(404).json({ success: false, error: 'Grupo não encontrado' });
    if (group === false) return res.status(403).json({ success: false, error: 'Grupo fora do escopo territorial' });

    const existing = await db.kaviar_group_posts.findFirst({ where: { id: req.params.postId, group_id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Comunicado não encontrado' });

    const updated = await db.kaviar_group_posts.update({
      where: { id: existing.id },
      data: { is_pinned: true },
    });

    await auditAdmin(req, 'kaviar_group_post_pinned', 'kaviar_group_post', updated.id, { group_id: req.params.id, post_id: updated.id, is_pinned: true });
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[ADMIN_GROUP_POST_PIN_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao fixar comunicado' });
  }
});

router.patch('/:id/posts/:postId/unpin', async (req: Request, res: Response) => {
  try {
    if (!canWriteGroups((req as any).admin)) return forbiddenWrite(res);

    const group = await getScopedGroup(req, req.params.id);
    if (group === null) return res.status(404).json({ success: false, error: 'Grupo não encontrado' });
    if (group === false) return res.status(403).json({ success: false, error: 'Grupo fora do escopo territorial' });

    const existing = await db.kaviar_group_posts.findFirst({ where: { id: req.params.postId, group_id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, error: 'Comunicado não encontrado' });

    const updated = await db.kaviar_group_posts.update({
      where: { id: existing.id },
      data: { is_pinned: false },
    });

    await auditAdmin(req, 'kaviar_group_post_unpinned', 'kaviar_group_post', updated.id, { group_id: req.params.id, post_id: updated.id, is_pinned: false });
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[ADMIN_GROUP_POST_UNPIN_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao desafixar comunicado' });
  }
});

export default router;
