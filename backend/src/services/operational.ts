import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type OperationalProfile = 'NORMAL' | 'RESTRICTED' | 'PRIORITY' | 'PRIVATE';

export interface OperationalContext {
  neighborhoodId: string;
  communityId?: string | null;
  operationalProfile: OperationalProfile;
}

/**
 * Operational service - resolves HOW rides operate (not WHERE)
 * Reads from immutable ride anchors, never geography
 */
export class OperationalService {
  
  /**
   * Resolve operational context from ride anchors
   * Source: Ride.neighborhoodId + Ride.communityId (immutable)
   */
  async resolveOperationalContext(
    neighborhoodId: string, 
    communityId?: string | null
  ): Promise<OperationalContext> {
    
    let operationalProfile: OperationalProfile = 'NORMAL';
    
    // If community exists, get its operational profile
    if (communityId) {
      const community = await prisma.communities.findFirst({
        where: {
          id: communityId,
          is_active: true
        }
      });
      
      if (community) {
        operationalProfile = community.operational_profile as OperationalProfile;
      }
    }
    
    return {
      neighborhoodId,
      communityId,
      operationalProfile
    };
  }
  
  /**
   * Apply operational filters to driver selection
   * Community does NOT redefine territory, only filters/prioritizes
   */
  applyOperationalFilters(
    baseDriverQuery: any,
    context: OperationalContext
  ): any {
    
    switch (context.operationalProfile) {
      case 'PRIORITY':
        // Prioritize local drivers (implementation depends on driver model)
        return {
          ...baseDriverQuery,
          orderBy: [
            // Add priority logic here if needed
            { created_at: 'desc' }
          ]
        };
        
      case 'RESTRICTED':
        // Apply allowlist/extra criteria
        return {
          ...baseDriverQuery,
          where: {
            ...baseDriverQuery.where,
            // Add restriction logic here if needed
            is_premium: true
          }
        };
        
      case 'PRIVATE':
        // Only linked drivers (would need driver-community relation)
        return {
          ...baseDriverQuery,
          where: {
            ...baseDriverQuery.where,
            // Add private logic here if needed
            status: 'verified'
          }
        };
        
      case 'NORMAL':
      default:
        // No changes to base query
        return baseDriverQuery;
    }
  }
}
