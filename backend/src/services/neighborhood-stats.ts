import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface NeighborhoodStats {
  neighborhood: string;
  activeDrivers: number;
  totalSavings: number;
  topDrivers: Array<{
    name: string;
    savings: number;
    tripsCount: number;
  }>;
  driverRank?: number;
  driverPercentile?: number;
}

export class NeighborhoodStatsService {
  async getNeighborhoodStats(driverId: string, period: 'week' | 'month' = 'month'): Promise<NeighborhoodStats | null> {
    const driver = await prisma.drivers.findUnique({
      where: { id: driverId },
      select: { 
        neighborhood_id: true, 
        name: true,
        neighborhoods: {
          select: { name: true }
        }
      }
    });

    if (!driver?.neighborhood_id || !driver.neighborhoods?.name) return null;

    const neighborhoodName = driver.neighborhoods.name;
    const startDate = this.getStartDate(period);

    // Motoristas ativos no bairro (com pelo menos 1 corrida no período)
    const activeDriversResult = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(DISTINCT d.id) as count
      FROM drivers d
      JOIN rides t ON t.driver_id = d.id
      WHERE d.neighborhood_id = ${driver.neighborhood_id}
        AND t.status = 'completed'
        AND t.created_at >= ${startDate}
    `;
    
    const activeDrivers = Number(activeDriversResult[0]?.count || 0);

    // Economia total do bairro (diferença entre 25% Uber e taxa Kaviar)
    const neighborhoodTrips = await prisma.$queryRaw<Array<{ total_savings: number }>>`
      SELECT 
        COALESCE(SUM(
          (t.price * 0.25) - t.platform_fee
        ), 0) as total_savings
      FROM rides t
      JOIN drivers d ON t.driver_id = d.id
      WHERE d.neighborhood_id = ${driver.neighborhood_id}
        AND t.status = 'completed'
        AND t.created_at >= ${startDate}
    `;

    const totalSavings = neighborhoodTrips[0]?.total_savings || 0;

    // Top 3 motoristas do bairro
    const topDrivers = await prisma.$queryRaw<Array<{
      driver_id: string;
      driver_name: string;
      savings: number;
      trips_count: number;
    }>>`
      SELECT 
        d.id as driver_id,
        d.name as driver_name,
        COALESCE(SUM(
          (t.price * 0.25) - t.platform_fee
        ), 0) as savings,
        COUNT(t.id) as trips_count
      FROM drivers d
      JOIN rides t ON t.driver_id = d.id
      WHERE d.neighborhood_id = ${driver.neighborhood_id}
        AND t.status = 'completed'
        AND t.created_at >= ${startDate}
      GROUP BY d.id, d.name
      ORDER BY savings DESC
      LIMIT 3
    `;

    // Ranking do motorista atual
    const allDriversRanked = await prisma.$queryRaw<Array<{
      driver_id: string;
      savings: number;
      rank: number;
    }>>`
      WITH driver_savings AS (
        SELECT 
          d.id as driver_id,
          COALESCE(SUM(
            (t.price * 0.25) - t.platform_fee
          ), 0) as savings
        FROM drivers d
        JOIN rides t ON t.driver_id = d.id
        WHERE d.neighborhood_id = ${driver.neighborhood_id}
          AND t.status = 'completed'
          AND t.created_at >= ${startDate}
        GROUP BY d.id
      )
      SELECT 
        driver_id,
        savings,
        ROW_NUMBER() OVER (ORDER BY savings DESC) as rank
      FROM driver_savings
    `;

    const driverRanking = allDriversRanked.find(d => d.driver_id === driverId);
    const driverRank = driverRanking?.rank ? Number(driverRanking.rank) : undefined;
    const driverPercentile = driverRank && activeDrivers > 0 
      ? Math.round((1 - (driverRank / activeDrivers)) * 100)
      : undefined;

    return {
      neighborhood: neighborhoodName,
      activeDrivers,
      totalSavings: Number(totalSavings),
      topDrivers: topDrivers.map(d => ({
        name: this.maskName(d.driver_name),
        savings: Number(d.savings),
        tripsCount: Number(d.trips_count)
      })),
      driverRank,
      driverPercentile
    };
  }

  private getStartDate(period: 'week' | 'month'): Date {
    const now = new Date();
    if (period === 'week') {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  private maskName(name: string): string {
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].charAt(0) + '***';
    }
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
  }
}
