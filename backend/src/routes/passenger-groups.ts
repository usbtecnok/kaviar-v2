import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticatePassenger } from '../middlewares/auth';

const router = Router();
const db = prisma as any;

function isActiveAndVisiblePost(post: any) {
  if (!post) return false;
  if (post.status !== 'published') return false;
  if (post.expires_at && new Date(post.expires_at).getTime() <= Date.now()) return false;
  return true;
}

async function getActivePassengerMembership(passengerId: string, groupId: string) {
  return db.kaviar_group_members.findFirst({
    where: {
      passenger_id: passengerId,
      group_id: groupId,
      status: 'active',
    },
  });
}

router.get('/me/groups', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).passenger?.id || (req as any).passengerId || (req as any).userId;
    if (!passengerId) return res.status(401).json({ success: false, error: 'Passageiro não autenticado' });

    const memberships = await db.kaviar_group_members.findMany({
      where: {
        passenger_id: passengerId,
        status: { not: 'removed' },
      },
      select: {
        id: true,
        role: true,
        status: true,
        invite_source: true,
        joined_at: true,
        created_at: true,
        group: {
          select: {
            id: true,
            public_name: true,
            description: true,
            status: true,
            community_id: true,
            neighborhood_id: true,
            territory_id: true,
          },
        },
      },
      orderBy: [{ joined_at: 'desc' }, { created_at: 'desc' }],
    });

    return res.json({ success: true, data: memberships });
  } catch (error) {
    console.error('[PASSENGER_GROUPS_LIST_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao listar grupos' });
  }
});

router.get('/me/groups/:groupId/posts', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).passenger?.id || (req as any).passengerId || (req as any).userId;
    if (!passengerId) return res.status(401).json({ success: false, error: 'Passageiro não autenticado' });

    const membership = await getActivePassengerMembership(passengerId, req.params.groupId);
    if (!membership) return res.status(403).json({ success: false, error: 'Você não participa deste grupo' });

    const posts = await db.kaviar_group_posts.findMany({
      where: {
        group_id: req.params.groupId,
        status: 'published',
        OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
      },
      include: {
        reads: {
          where: { member_id: membership.id },
          select: { read_at: true },
        },
      },
      orderBy: [
        { is_pinned: 'desc' },
        { published_at: 'desc' },
        { created_at: 'desc' },
      ],
    });

    const visiblePosts = posts.filter(isActiveAndVisiblePost);

    return res.json({
      success: true,
      data: visiblePosts.map((post: any) => ({
        ...post,
        is_read_by_me: post.reads?.length > 0,
        read_at: post.reads?.[0]?.read_at || null,
      })),
    });
  } catch (error) {
    console.error('[PASSENGER_GROUP_POSTS_LIST_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao listar comunicados' });
  }
});

router.post('/me/groups/:groupId/posts/:postId/read', authenticatePassenger, async (req: Request, res: Response) => {
  try {
    const passengerId = (req as any).passenger?.id || (req as any).passengerId || (req as any).userId;
    if (!passengerId) return res.status(401).json({ success: false, error: 'Passageiro não autenticado' });

    const membership = await getActivePassengerMembership(passengerId, req.params.groupId);
    if (!membership) return res.status(403).json({ success: false, error: 'Você não participa deste grupo' });

    const post = await db.kaviar_group_posts.findFirst({
      where: {
        id: req.params.postId,
        group_id: req.params.groupId,
      },
    });

    if (!post) return res.status(404).json({ success: false, error: 'Comunicado não encontrado' });
    if (!isActiveAndVisiblePost(post)) return res.status(410).json({ success: false, error: 'Comunicado indisponível' });

    const read = await db.kaviar_group_post_reads.upsert({
      where: {
        post_id_member_id: {
          post_id: post.id,
          member_id: membership.id,
        },
      },
      create: {
        post_id: post.id,
        member_id: membership.id,
        read_at: new Date(),
      },
      update: {
        read_at: new Date(),
      },
    });

    return res.json({ success: true, data: read });
  } catch (error) {
    console.error('[PASSENGER_GROUP_POST_READ_ERROR]', error);
    return res.status(500).json({ success: false, error: 'Erro ao marcar comunicado como ciente' });
  }
});

export default router;
