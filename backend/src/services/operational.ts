import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type OperationalProfile = 'NORMAL' | 'RESTRICTED' | 'PRIORITY' | 'PRIVATE';

export interface OperationalContext {
  neighborhoodId: string;
  communityId?: string | null;
  operationalProfile: OperationalProfile;
}

export interface DriverQuery {
  where: any;
  orderBy?: any[];
}

/**
 * Operational service - canonical operational profiles
 * Defines HOW rides operate (not WHERE)
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
   * Apply canonical operational rules to driver dispatch
   * Profile NEVER changes geography, NEVER recreates Ride
   */
  applyDispatchRules(
    baseDriverQuery: DriverQuery,
    context: OperationalContext
  ): DriverQuery {
    
    switch (context.operationalProfile) {
      case 'NORMAL':
        // Dispatch padrão - comportamento base do sistema
        return this.dispatchStandard(baseDriverQuery);
        
      case 'RESTRICTED':
        // Dispatch filtrado - exige aprovação e flag operacional
        return this.dispatchFilteredDrivers(baseDriverQuery);
        
      case 'PRIORITY':
        // Dispatch em 2 fases - locais primeiro, fallback geral
        return this.dispatchLocalFirstThenFallback(baseDriverQuery);
        
      case 'PRIVATE':
        // Dispatch exclusivo - apenas vinculados, pode falhar
        return this.dispatchExclusiveOrFail(baseDriverQuery);
        
      default:
        return this.dispatchStandard(baseDriverQuery);
    }
  }
  
  /**
   * NORMAL: Comportamento base do sistema
   */
  private dispatchStandard(query: DriverQuery): DriverQuery {
    return {
      where: {
        ...query.where,
        status: 'active'
      },
      orderBy: [
        { created_at: 'desc' }
      ]
    };
  }
  
  /**
   * RESTRICTED: Exige motorista aprovado com flag operacional
   */
  private dispatchFilteredDrivers(query: DriverQuery): DriverQuery {
    return {
      where: {
        ...query.where,
        status: 'active',
        is_approved: true,
        // can_operate_restricted: true // Would need this field
      },
      orderBy: [
        { created_at: 'desc' }
      ]
    };
  }
  
  /**
   * PRIORITY: Motoristas locais primeiro, fallback para pool geral
   */
  private dispatchLocalFirstThenFallback(query: DriverQuery): DriverQuery {
    return {
      where: {
        ...query.where,
        status: 'active'
      },
      orderBy: [
        // Priority logic would need driver-community relation
        { is_premium: 'desc' }, // Placeholder for local priority
        { created_at: 'desc' }
      ]
    };
  }
  
  /**
   * PRIVATE: Apenas motoristas vinculados, único que pode falhar
   */
  private dispatchExclusiveOrFail(query: DriverQuery): DriverQuery {
    return {
      where: {
        ...query.where,
        status: 'active',
        // is_linked_to_community: true // Would need this relation
        is_premium: true // Placeholder for exclusive access
      },
      orderBy: [
        { created_at: 'desc' }
      ]
    };
  }
  
  /**
   * Check if operational profile can fail during dispatch
   */
  canFailOperationally(profile: OperationalProfile): boolean {
    return profile === 'PRIVATE';
  }
}
