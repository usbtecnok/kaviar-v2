import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Sistema de Notificações Inteligentes Kaviar
 * Alertas baseados em comportamento territorial
 */

export interface Notification {
  type: 'OUTSIDE_FENCE' | 'RETURN_HOME' | 'HIGH_DEMAND' | 'SAVINGS_MILESTONE' | 'BADGE_EARNED';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  data?: any;
}

/**
 * Verifica se motorista está fora da cerca e deve ser notificado
 */
export async function checkOutsideFenceNotification(
  driverId: string,
  currentLat: number,
  currentLng: number
): Promise<Notification | null> {
  
  // Buscar bairro base do motorista
  const driver: any = await prisma.drivers.findUnique({
    where: { id: driverId },
    select: { neighborhood_id: true }
  });

  if (!driver?.neighborhood_id) return null;

  // Verificar se está dentro do bairro
  const inNeighborhood = await prisma.$queryRaw<Array<{ inside: boolean }>>`
    SELECT EXISTS(
      SELECT 1 FROM neighborhood_geofences ng
      WHERE ng.neighborhood_id = ${driver.neighborhood_id}
        AND ST_Contains(ng.geom, ST_SetSRID(ST_MakePoint(${currentLng}, ${currentLat}), 4326))
    ) as inside
  `;

  if (inNeighborhood[0]?.inside) return null;

  // Buscar nome do bairro
  const neighborhood: any = await prisma.neighborhoods.findUnique({
    where: { id: driver.neighborhood_id },
    select: { name: true }
  });

  return {
    type: 'OUTSIDE_FENCE',
    title: '📍 Você está fora da sua cerca virtual',
    message: `Volte para ${neighborhood?.name} e pague apenas 7% de taxa!`,
    priority: 'medium',
    actionUrl: '/navigate-home',
    data: { neighborhoodId: driver.neighborhood_id }
  };
}

/**
 * Notifica quando vale a pena voltar para casa
 */
export async function checkReturnHomeNotification(
  driverId: string
): Promise<Notification | null> {
  
  // Buscar últimas 3 corridas
  const recentTrips: any[] = await prisma.$queryRaw`
    SELECT match_type, platform_fee_percentage
    FROM trips
    WHERE driver_id = ${driverId}
    ORDER BY created_at DESC
    LIMIT 3
  `;

  // Se 3 corridas seguidas fora da cerca (20%)
  const allOutside = recentTrips.every(t => t.match_type === 'OUTSIDE_FENCE');
  
  if (!allOutside || recentTrips.length < 3) return null;

  return {
    type: 'RETURN_HOME',
    title: '💰 Vale a pena voltar!',
    message: 'Suas últimas 3 corridas foram com taxa de 20%. Volte para seu bairro e economize!',
    priority: 'high',
    actionUrl: '/navigate-home'
  };
}

/**
 * Notifica marcos de economia
 */
export async function checkSavingsMilestone(
  driverId: string
): Promise<Notification | null> {
  
  const stats: any = await prisma.$queryRaw`
    SELECT 
      SUM(fare_amount) as total_fare,
      SUM(platform_fee_amount) as total_kaviar_fee
    FROM trips
    WHERE driver_id = ${driverId}
      AND created_at >= NOW() - INTERVAL '30 days'
  `;

  const totalFare = Number(stats[0]?.total_fare || 0);
  const kaviarFee = Number(stats[0]?.total_kaviar_fee || 0);
  const uberFee = (totalFare * 25) / 100;
  const savings = uberFee - kaviarFee;

  // Marcos: R$ 50, 100, 200, 500
  const milestones = [50, 100, 200, 500];
  const milestone = milestones.find(m => savings >= m && savings < m + 10);

  if (!milestone) return null;

  return {
    type: 'SAVINGS_MILESTONE',
    title: `🎉 Você economizou R$ ${savings.toFixed(0)}!`,
    message: `Parabéns! Você já economizou R$ ${savings.toFixed(2)} vs Uber nos últimos 30 dias.`,
    priority: 'low',
    actionUrl: '/dashboard',
    data: { savings, milestone }
  };
}

/**
 * Notifica conquista de badge
 */
export async function checkBadgeEarned(
  driverId: string
): Promise<Notification | null> {
  
  const stats: any = await prisma.$queryRaw`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE match_type = 'SAME_NEIGHBORHOOD') as in_neighborhood
    FROM trips
    WHERE driver_id = ${driverId}
      AND created_at >= NOW() - INTERVAL '7 days'
  `;

  const total = Number(stats[0]?.total || 0);
  const inNeighborhood = Number(stats[0]?.in_neighborhood || 0);
  const percentage = total > 0 ? (inNeighborhood / total) * 100 : 0;

  // Badge: 80%+ corridas no bairro
  if (percentage >= 80 && total >= 10) {
    return {
      type: 'BADGE_EARNED',
      title: '🏆 Badge Embaixador do Bairro!',
      message: `${percentage.toFixed(0)}% das suas corridas foram no seu bairro. Você é um verdadeiro embaixador!`,
      priority: 'low',
      actionUrl: '/badges',
      data: { percentage, badge: 'NEIGHBORHOOD_AMBASSADOR' }
    };
  }

  return null;
}

/**
 * Verifica todas as notificações para um motorista
 */
export async function checkAllNotifications(
  driverId: string,
  currentLat?: number,
  currentLng?: number
): Promise<Notification[]> {
  
  const notifications: Notification[] = [];

  // 1. Fora da cerca (se tiver localização)
  if (currentLat && currentLng) {
    const outsideFence = await checkOutsideFenceNotification(driverId, currentLat, currentLng);
    if (outsideFence) notifications.push(outsideFence);
  }

  // 2. Vale a pena voltar
  const returnHome = await checkReturnHomeNotification(driverId);
  if (returnHome) notifications.push(returnHome);

  // 3. Marco de economia
  const savings = await checkSavingsMilestone(driverId);
  if (savings) notifications.push(savings);

  // 4. Badge conquistado
  const badge = await checkBadgeEarned(driverId);
  if (badge) notifications.push(badge);

  return notifications;
}

/**
 * Salva notificação no banco (opcional)
 */
export async function saveNotification(
  driverId: string,
  notification: Notification
): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO driver_notifications (
        driver_id, type, title, message, priority, action_url, data, created_at
      ) VALUES (
        ${driverId}, ${notification.type}, ${notification.title}, 
        ${notification.message}, ${notification.priority}, 
        ${notification.actionUrl || null}, ${JSON.stringify(notification.data || {})}, NOW()
      )
    `;
  } catch (error) {
    console.error('Erro ao salvar notificação:', error);
  }
}
