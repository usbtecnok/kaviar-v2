import { prisma } from '../lib/prisma';
import { getCreditBalance } from './credit.service';

export async function getDriverFinancialSummary(driverId: string, period: string) {
  const daysMap: Record<string, number> = { today: 0, '7d': 7, '30d': 30 };
  const days = daysMap[period] ?? 30;

  const now = new Date();
  const since = new Date(now);
  if (period === 'today') {
    since.setHours(0, 0, 0, 0);
  } else {
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);
  }

  const rides = await prisma.rides_v2.findMany({
    where: {
      driver_id: driverId,
      status: { in: ['completed', 'canceled_by_passenger', 'canceled_by_driver'] },
      updated_at: { gte: since },
    },
    select: { id: true, status: true, is_homebound: true },
  });

  const completedIds = rides.filter(r => r.status === 'completed').map(r => r.id);
  const completed = completedIds.length;
  const canceled = rides.length - completed;
  const homebound = rides.filter(r => r.status === 'completed' && r.is_homebound).length;

  let gross = 0, platformFee = 0, net = 0, creditsConsumed = 0;
  const territoryCounts: Record<string, number> = {};

  if (completed > 0) {
    const settlements = await prisma.ride_settlements.findMany({
      where: { ride_id: { in: completedIds } },
      select: {
        final_price: true, fee_amount: true, driver_earnings: true,
        credit_cost: true, settlement_territory: true,
      },
    });

    for (const s of settlements) {
      gross += Number(s.final_price ?? 0);
      platformFee += Number(s.fee_amount);
      net += Number(s.driver_earnings);
      creditsConsumed += s.credit_cost ?? 0;
      const t = s.settlement_territory || 'UNKNOWN';
      territoryCounts[t] = (territoryCounts[t] || 0) + 1;
    }
  }

  const balance = await getCreditBalance(driverId);
  const round2 = (n: number) => Math.round(n * 100) / 100;

  return {
    period,
    since: since.toISOString(),
    rides: { completed, canceled },
    financial: {
      gross: round2(gross),
      platform_fee: round2(platformFee),
      net: round2(net),
      avg_ticket: completed > 0 ? round2(gross / completed) : 0,
    },
    credits: { consumed: creditsConsumed, balance },
    territory: territoryCounts,
    homebound,
  };
}
