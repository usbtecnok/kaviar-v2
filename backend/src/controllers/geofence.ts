import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { isLikelyInRioCity, fmtLatLng, canVerifyGeofence, pickCanonical } from '../utils/geofence-governance';

const prisma = new PrismaClient();

export const updateCommunityGeofence = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { geofence, centerLat, centerLng } = req.body;

    // Validações básicas
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID da comunidade é obrigatório'
      });
    }

    // Validar geofence se fornecido
    if (geofence) {
      if (geofence.type !== 'polygon') {
        return res.status(400).json({
          success: false,
          message: 'Apenas polígonos são suportados'
        });
      }

      if (!Array.isArray(geofence.path) || geofence.path.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Polígono deve ter pelo menos 3 pontos'
        });
      }

      // Validar cada ponto
      for (const point of geofence.path) {
        if (typeof point.lat !== 'number' || typeof point.lng !== 'number') {
          return res.status(400).json({
            success: false,
            message: 'Todos os pontos devem ter lat e lng numéricos'
          });
        }

        if (point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180) {
          return res.status(400).json({
            success: false,
            message: 'Coordenadas fora dos limites válidos'
          });
        }
      }
    }

    // Validar centerLat/centerLng se fornecidos
    if (centerLat !== undefined || centerLng !== undefined) {
      if (centerLat !== null && (typeof centerLat !== 'number' || centerLat < -90 || centerLat > 90)) {
        return res.status(400).json({
          success: false,
          message: 'centerLat deve ser um número entre -90 e 90'
        });
      }

      if (centerLng !== null && (typeof centerLng !== 'number' || centerLng < -180 || centerLng > 180)) {
        return res.status(400).json({
          success: false,
          message: 'centerLng deve ser um número entre -180 e 180'
        });
      }
    }

    // Verificar se comunidade existe
    const existingCommunity = await prisma.community.findUnique({
      where: { id }
    });

    if (!existingCommunity) {
      return res.status(404).json({
        success: false,
        message: 'Comunidade não encontrada'
      });
    }

    // Preparar dados para atualização
    const updateData: any = {};
    
    if (geofence !== undefined) {
      updateData.geofence = geofence ? JSON.stringify(geofence) : null;
    }
    
    if (centerLat !== undefined) {
      updateData.centerLat = centerLat;
    }
    
    if (centerLng !== undefined) {
      updateData.centerLng = centerLng;
    }

    // Atualizar comunidade
    const updatedCommunity = await prisma.community.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        geofence: true,
        centerLat: true,
        centerLng: true,
        radiusMeters: true
      }
    });

    console.log(`✅ Community updated: ${updatedCommunity.name}`);

    res.json({
      success: true,
      data: updatedCommunity,
      message: 'Comunidade atualizada com sucesso'
    });

  } catch (error) {
    console.error('❌ Error updating community:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

export const getCommunitiesWithDuplicates = async (req: Request, res: Response) => {
  try {
    const { includeArchived } = req.query;
    
    const whereClause = includeArchived === '1' || includeArchived === 'true' 
      ? {} 
      : { isActive: true };

    const communities = await prisma.community.findMany({
      where: whereClause,
      include: {
        geofenceData: {
          select: {
            centerLat: true,
            centerLng: true,
            geojson: true,
            confidence: true,
            isVerified: true,
            reviewNotes: true,
            updatedAt: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Detectar duplicados por nome (case-insensitive, trim)
    const nameGroups = new Map<string, any[]>();
    
    communities.forEach(community => {
      const normalizedName = community.name.trim().toLowerCase();
      if (!nameGroups.has(normalizedName)) {
        nameGroups.set(normalizedName, []);
      }
      nameGroups.get(normalizedName)!.push(community);
    });

    // Processar cada grupo
    const processedCommunities = [];
    
    for (const [normalizedName, group] of nameGroups.entries()) {
      if (group.length === 1) {
        // Não duplicado
        processedCommunities.push({
          ...group[0],
          isDuplicate: false,
          duplicateCount: 1,
          canonicalId: group[0].id,
          duplicateIds: [group[0].id]
        });
      } else {
        // Duplicado - escolher canônico
        const canonical = pickCanonical(group.map(c => ({
          ...c,
          geofence: c.geofenceData ? { geometry: c.geofenceData.geojson ? JSON.parse(c.geofenceData.geojson) : null } : null,
          geofenceStatus: c.geofenceData?.geojson ? 200 : 404
        })));

        // Adicionar todos os duplicados com informação de canonicidade
        group.forEach(community => {
          processedCommunities.push({
            ...community,
            isDuplicate: true,
            duplicateCount: group.length,
            canonicalId: canonical.id,
            isCanonical: community.id === canonical.id,
            duplicateIds: group.map(c => c.id)
          });
        });
      }
    }

    res.json({
      success: true,
      data: processedCommunities
    });

  } catch (error) {
    console.error('❌ Error fetching communities with duplicates:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

export const archiveCommunity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Verificar se comunidade existe
    const existingCommunity = await prisma.community.findUnique({
      where: { id }
    });

    if (!existingCommunity) {
      return res.status(404).json({
        success: false,
        message: 'Comunidade não encontrada'
      });
    }

    // Arquivar usando isActive=false
    const archivedCommunity = await prisma.community.update({
      where: { id },
      data: { 
        isActive: false,
        lastEvaluatedAt: new Date()
      }
    });

    // Log da ação (opcional - pode ser implementado depois)
    console.log(`📦 Community archived: ${archivedCommunity.name} (ID: ${id}) - Reason: ${reason || 'N/A'}`);

    res.json({
      success: true,
      data: archivedCommunity,
      message: 'Comunidade arquivada com sucesso'
    });

  } catch (error) {
    console.error('❌ Error archiving community:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};
