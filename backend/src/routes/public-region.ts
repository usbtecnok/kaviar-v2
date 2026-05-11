import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

function slugify(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// GET /api/public/region/:slug
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug.toLowerCase();

    // Find community by slug (derived from name)
    const communities = await prisma.communities.findMany({ where: { is_active: true }, select: { id: true, name: true } });
    const community = communities.find(c => slugify(c.name) === slug);

    if (!community) {
      // Region not found — return placeholder
      const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return res.json({ success: true, data: { name, drivers_count: 0, partner: null, found: false } });
    }

    // Count active drivers in this community
    const drivers_count = await prisma.drivers.count({ where: { status: 'approved', neighborhood_id: community.id } });

    // Find territorial partner linked to this area (by address or name match)
    const partners = await prisma.territorial_partners.findMany({ where: { status: 'active' }, select: { id: true, name: true, logo_url: true, address: true } });
    const partner = partners.find(p => p.address?.toLowerCase().includes(slug.replace(/-/g, ' ')) || slugify(p.name).includes(slug)) || null;

    // Generate presigned logo if partner has one
    let partnerData = null;
    if (partner) {
      let logo_presigned = null;
      if (partner.logo_url) {
        try {
          const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
          const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
          const s3 = new S3Client({ region: 'us-east-2' });
          const list: any = await s3.send(new ListObjectsV2Command({ Bucket: 'kaviar-uploads-847895361928', Prefix: `partner-logos/${partner.id}`, MaxKeys: 5 }));
          const key = list.Contents?.sort((a: any, b: any) => new Date(b.LastModified).getTime() - new Date(a.LastModified).getTime())?.[0]?.Key;
          if (key) logo_presigned = await getSignedUrl(s3, new GetObjectCommand({ Bucket: 'kaviar-uploads-847895361928', Key: key }), { expiresIn: 3600 });
        } catch {}
      }
      partnerData = { name: partner.name, logo_url: logo_presigned };
    }

    res.json({ success: true, data: { name: community.name, drivers_count, partner: partnerData, found: true } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro' });
  }
});

export default router;
