import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface LedgerEvent {
  driverId: string;
  communityId: string;
  eventType: string;
  eventData: any;
  rating?: number;
  passengerId?: string;
  rideId?: string;
}

interface DriverReputation {
  level: string;
  badge: string;
  stats: {
    total_rides: number;
    avg_rating: number;
    validation_score: number;
  };
  first_ride_at: Date | null;
  last_ride_at: Date | null;
}

/**
 * Generate SHA-256 hash for ledger immutability
 */
function generateHash(data: LedgerEvent): string {
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify({ ...data, timestamp });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Record event in immutable ledger
 */
export async function recordLedgerEvent(event: LedgerEvent): Promise<any> {
  const hash = generateHash(event);
  
  const ledgerEntry = await prisma.$queryRaw`
    INSERT INTO community_reputation_ledger (
      id, driver_id, community_id, event_type, event_data, 
      rating, passenger_id, ride_id, hash, created_at
    )
    VALUES (
      gen_random_uuid()::text,
      ${event.driverId},
      ${event.communityId},
      ${event.eventType},
      ${JSON.stringify(event.eventData)}::jsonb,
      ${event.rating || null},
      ${event.passengerId || null},
      ${event.rideId || null},
      ${hash},
      NOW()
    )
    RETURNING *
  `;
  
  return ledgerEntry;
}

/**
 * Get driver reputation for a specific community
 */
export async function getDriverReputation(
  driverId: string,
  communityId: string
): Promise<DriverReputation | null> {
  const stats: any = await prisma.$queryRaw`
    SELECT 
      reputation_level as level,
      badge_type as badge,
      total_rides,
      avg_rating,
      validation_score,
      first_ride_at,
      last_ride_at
    FROM driver_reputation_stats
    WHERE driver_id = ${driverId} AND community_id = ${communityId}
    LIMIT 1
  `;
  
  if (!stats || stats.length === 0) {
    return null;
  }
  
  const stat = stats[0];
  
  return {
    level: stat.level,
    badge: stat.badge,
    stats: {
      total_rides: stat.total_rides,
      avg_rating: parseFloat(stat.avg_rating),
      validation_score: stat.validation_score,
    },
    first_ride_at: stat.first_ride_at,
    last_ride_at: stat.last_ride_at,
  };
}

/**
 * Validate driver by community leader
 */
export async function validateDriver(
  leaderId: string,
  driverId: string,
  communityId: string,
  notes?: string
): Promise<any> {
  // Check if leader is active
  const leader: any = await prisma.$queryRaw`
    SELECT id, name, validation_weight, is_active
    FROM community_leaders
    WHERE id = ${leaderId} AND community_id = ${communityId}
    LIMIT 1
  `;
  
  if (!leader || leader.length === 0) {
    throw new Error('Leader not found');
  }
  
  if (!leader[0].is_active) {
    throw new Error('Leader is not active');
  }
  
  // Check if validation already exists
  const existing: any = await prisma.$queryRaw`
    SELECT id FROM driver_validations
    WHERE driver_id = ${driverId} 
      AND community_id = ${communityId}
      AND validator_id = ${leaderId}
    LIMIT 1
  `;
  
  if (existing && existing.length > 0) {
    throw new Error('Driver already validated by this leader');
  }
  
  // Insert validation
  const validation = await prisma.$queryRaw`
    INSERT INTO driver_validations (
      id, driver_id, community_id, validator_id, 
      validator_type, validation_weight, notes, created_at
    )
    VALUES (
      gen_random_uuid()::text,
      ${driverId},
      ${communityId},
      ${leaderId},
      'COMMUNITY_LEADER',
      ${leader[0].validation_weight},
      ${notes || null},
      NOW()
    )
    RETURNING *
  `;
  
  // Record in ledger
  await recordLedgerEvent({
    driverId,
    communityId,
    eventType: 'LEADER_VALIDATION',
    eventData: {
      validator_id: leaderId,
      validator_name: leader[0].name,
      validation_weight: leader[0].validation_weight,
      notes: notes || null,
    },
  });
  
  // Update validation score in stats
  await prisma.$queryRaw`
    UPDATE driver_reputation_stats
    SET 
      validation_score = validation_score + ${leader[0].validation_weight},
      updated_at = NOW()
    WHERE driver_id = ${driverId} AND community_id = ${communityId}
  `;
  
  // Recalculate reputation level
  await prisma.$queryRaw`
    UPDATE driver_reputation_stats
    SET 
      reputation_level = calculate_reputation_level(total_rides, avg_rating, validation_score),
      badge_type = get_badge_type(calculate_reputation_level(total_rides, avg_rating, validation_score))
    WHERE driver_id = ${driverId} AND community_id = ${communityId}
  `;
  
  return validation;
}

/**
 * Get ledger history for a driver in a community
 */
export async function getDriverLedgerHistory(
  driverId: string,
  communityId: string,
  limit: number = 50
): Promise<any[]> {
  const history = await prisma.$queryRaw`
    SELECT 
      id, event_type, event_data, rating, 
      passenger_id, ride_id, hash, created_at
    FROM community_reputation_ledger
    WHERE driver_id = ${driverId} AND community_id = ${communityId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  
  return history as any[];
}
