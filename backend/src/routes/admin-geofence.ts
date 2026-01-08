import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateAdmin } from '../middlewares/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * POST /api/admin/geofence/import-geojson
 * Import GeoJSON FeatureCollection for mass area registration
 * Body: { type, city?, geojson }
 */
router.post('/import-geojson', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { type, city, geojson } = req.body;

    // Validate required fields
    if (!type || !geojson) {
      return res.status(400).json({
        error: 'Missing required fields: type and geojson'
      });
    }

    // Validate GeoJSON structure
    if (!geojson.type || geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
      return res.status(400).json({
        error: 'Invalid GeoJSON: must be a FeatureCollection with features array'
      });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    console.log(`Starting GeoJSON import: ${geojson.features.length} features`);

    for (const [index, feature] of geojson.features.entries()) {
      try {
        // Extract name from properties
        const name = feature.properties?.name || 
                    feature.properties?.NAME || 
                    feature.properties?.nome ||
                    `${type}_${index + 1}`;

        // Validate geometry
        if (!feature.geometry || !['Polygon', 'MultiPolygon'].includes(feature.geometry.type)) {
          errors.push(`Feature ${index}: Invalid geometry type (${feature.geometry?.type})`);
          errorCount++;
          continue;
        }

        // Convert geometry to PostGIS format - ensure MultiPolygon
        let geometryForPostGIS;
        if (feature.geometry.type === 'Polygon') {
          // Convert Polygon to MultiPolygon
          geometryForPostGIS = {
            type: 'MultiPolygon',
            coordinates: [feature.geometry.coordinates]
          };
        } else if (feature.geometry.type === 'MultiPolygon') {
          geometryForPostGIS = feature.geometry;
        } else {
          errors.push(`Feature ${index}: Unsupported geometry type (${feature.geometry.type})`);
          errorCount++;
          continue;
        }

        const geojsonString = JSON.stringify(geometryForPostGIS);
        
        // Convert to legacy geofence format for UI compatibility
        let legacyGeofence = null;
        if (feature.geometry.type === 'Polygon' && feature.geometry.coordinates[0]) {
          const coordinates = feature.geometry.coordinates[0];
          legacyGeofence = JSON.stringify({
            type: 'polygon',
            path: coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }))
          });
        }

        // Generate unique ID for upsert
        const communityId = `${type.toLowerCase()}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

        // Upsert community with all required fields
        const result = await prisma.$queryRaw`
          INSERT INTO communities (
            id, name, description, is_active, created_at, updated_at, 
            auto_activation, deactivation_threshold, min_active_drivers,
            geofence, geom
          ) VALUES (
            ${communityId},
            ${name},
            ${city ? `${name} - ${city}` : name},
            true,
            NOW(),
            NOW(),
            false,
            1,
            3,
            ${legacyGeofence},
            ST_GeomFromGeoJSON(${geojsonString})
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            geofence = EXCLUDED.geofence,
            geom = ST_GeomFromGeoJSON(${geojsonString}),
            updated_at = NOW()
          RETURNING (xmax = 0) AS inserted
        `;

        if (Array.isArray(result) && result.length > 0) {
          const wasInserted = (result[0] as any).inserted;
          if (wasInserted) {
            insertedCount++;
          } else {
            updatedCount++;
          }
        }

      } catch (featureError: any) {
        errors.push(`Feature ${index} (${feature.properties?.name || 'unnamed'}): ${featureError.message}`);
        errorCount++;
      }
    }

    const summary = {
      total: geojson.features.length,
      inserted: insertedCount,
      updated: updatedCount,
      errors: errorCount,
      type,
      city: city || null
    };

    console.log('GeoJSON import completed:', summary);

    return res.json({
      success: true,
      summary,
      errors: errors.length > 0 ? errors.slice(0, 10) : [] // Limit error messages
    });

  } catch (error: any) {
    console.error('GeoJSON import error:', error);
    return res.status(500).json({
      error: 'Internal server error during GeoJSON import',
      details: error.message
    });
  }
});

export default router;
