import { prisma } from '../lib/prisma';

interface PromotionResult {
  eligibleFound: number;
  promotedCount: number;
  skippedCount: number;
  promotedDriverIds: string[];
}

interface PromotionOptions {
  dryRun?: boolean;
  limit?: number;
}

/**
 * Promove drivers para Premium Tourism após 6 meses de aprovação
 * 
 * Regra: drivers com status='approved' e approved_at >= 6 meses atrás
 * e premium_tourism_status='inactive' (ou NULL) são promovidos para 'active'
 * 
 * @param options.dryRun - Se true, não altera DB (apenas simula)
 * @param options.limit - Limite de drivers a promover (safe guard)
 */
export async function promotePremiumTourism(
  options: PromotionOptions = {}
): Promise<PromotionResult> {
  const { dryRun = false, limit } = options;
  
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  try {
    // Query drivers elegíveis
    const eligibleDrivers = await prisma.drivers.findMany({
      where: {
        status: 'approved',
        approved_at: {
          lte: sixMonthsAgo
        },
        OR: [
          { premium_tourism_status: 'inactive' },
          { premium_tourism_status: null }
        ]
      },
      select: {
        id: true,
        name: true,
        approved_at: true,
        premium_tourism_status: true
      },
      take: limit,
      orderBy: {
        approved_at: 'asc' // Mais antigos primeiro
      }
    });

    const eligibleFound = eligibleDrivers.length;
    const promotedDriverIds: string[] = [];
    let promotedCount = 0;
    let skippedCount = 0;

    if (dryRun) {
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        level: 'info',
        service: 'premium-tourism-promoter',
        action: 'dry-run',
        eligibleFound,
        message: 'Dry-run mode - no changes made',
        eligibleDrivers: eligibleDrivers.map(d => ({
          id: d.id,
          name: d.name,
          approved_at: d.approved_at,
          current_status: d.premium_tourism_status
        }))
      }));

      return {
        eligibleFound,
        promotedCount: 0,
        skippedCount: eligibleFound,
        promotedDriverIds: []
      };
    }

    // Promoção real
    if (eligibleFound > 0) {
      const now = new Date();
      
      const result = await prisma.drivers.updateMany({
        where: {
          id: {
            in: eligibleDrivers.map(d => d.id)
          }
        },
        data: {
          premium_tourism_status: 'active',
          premium_tourism_promoted_at: now,
          updated_at: now
        }
      });

      promotedCount = result.count;
      promotedDriverIds.push(...eligibleDrivers.map(d => d.id));

      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        level: 'info',
        service: 'premium-tourism-promoter',
        action: 'promote',
        eligibleFound,
        promotedCount,
        promotedDriverIds
      }));
    } else {
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        level: 'info',
        service: 'premium-tourism-promoter',
        action: 'promote',
        eligibleFound: 0,
        message: 'No eligible drivers found'
      }));
    }

    return {
      eligibleFound,
      promotedCount,
      skippedCount,
      promotedDriverIds
    };

  } catch (error: any) {
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'error',
      service: 'premium-tourism-promoter',
      error: error.message,
      stack: error.stack
    }));
    throw error;
  }
}
