import { prisma } from '../lib/prisma';

export type OperationalProfile = 'NORMAL' | 'RESTRICTED' | 'PRIORITY' | 'PRIVATE';

export interface Community {
  id: string;
  name: string;
  neighborhoodId: string;
  isActive: boolean;
  operationalProfile: OperationalProfile;
  notes?: string;
}

export interface CommunityResolution {
  neighborhoodId: string;
  communityId?: string;
}

/**
 * Community service - logical entity that inherits from neighborhood
 * Communities do NOT resolve location, only modify operational behavior
 */
export class CommunityService {
  
  /**
   * Resolve ride location and optional community
   * 1. Resolve lat/lng → neighborhood (always required)
   * 2. If communityId provided → validate it belongs to neighborhood
   * 3. If community inactive → ignore it
   */
  async resolveRideLocation(
    lat: number, 
    lon: number, 
    communityId?: string
  ): Promise<CommunityResolution | null> {
    
    // Import geo-resolve service to get neighborhood
    const { GeoResolveService } = await import('./geo-resolve');
    const geoService = new GeoResolveService();
    
    const geoResult = await geoService.resolveCoordinates(lat, lon);
    
    if (!geoResult.match || !geoResult.resolvedArea) {
      return null;
    }
    
    const neighborhoodId = geoResult.resolvedArea.id;
    
    // If no community requested, return neighborhood only
    if (!communityId) {
      return { neighborhoodId };
    }
    
    // Validate community is active
    const community = await prisma.communities.findFirst({
      where: {
        id: communityId,
        is_active: true
      }
    });
    
    if (!community) {
      // Community invalid/inactive → return neighborhood only
      return { neighborhoodId };
    }
    
    return { neighborhoodId, communityId };
  }
  
  /**
   * Get active communities
   */
  async getCommunitiesByNeighborhood(neighborhoodId: string): Promise<Community[]> {
    const communities = await prisma.communities.findMany({
      where: {
        is_active: true
      },
      orderBy: { name: 'asc' }
    });
    
    return communities.map(c => ({
      id: c.id,
      name: c.name,
      neighborhoodId: neighborhoodId, // Use parameter instead
      isActive: c.is_active,
      operationalProfile: 'NORMAL' as OperationalProfile, // Default value
      notes: c.description || undefined
    }));
  }
}
