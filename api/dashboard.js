const express = require('express');
const { supabase } = require('../lib/supabase');
const { getCommunityMetricsRealtime } = require('../lib/analytics');

const router = express.Router();

/**
 * Overview geral do sistema
 * GET /api/v1/dashboard/overview
 */
router.get('/overview', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = Math.min(Math.max(parseInt(days) || 30, 1), 365);
    
    // Buscar métricas agregadas de todas as comunidades
    const metricsData = await getCommunityMetricsRealtime();
    
    // Calcular totais agregados
    const totals = metricsData.reduce((acc, community) => ({
      total_rides: acc.total_rides + (community.rides_30d || 0),
      local_rides: acc.local_rides + (community.local_rides_30d || 0),
      external_rides: acc.external_rides + (community.external_rides_30d || 0),
      total_bonus: acc.total_bonus + parseFloat(community.total_bonus_30d || 0),
      total_revenue: acc.total_revenue + parseFloat(community.total_revenue_30d || 0),
      active_communities: acc.active_communities + (community.community_status === 'active' ? 1 : 0),
      pending_communities: acc.pending_communities + (community.community_status === 'pending' ? 1 : 0),
      total_drivers: acc.total_drivers + (community.active_drivers || 0)
    }), {
      total_rides: 0,
      local_rides: 0,
      external_rides: 0,
      total_bonus: 0,
      total_revenue: 0,
      active_communities: 0,
      pending_communities: 0,
      total_drivers: 0
    });
    
    // Calcular métricas derivadas
    const localRidePercentage = totals.total_rides > 0 ? 
      Math.round((totals.local_rides / totals.total_rides) * 100 * 100) / 100 : 0;
    
    const netProfit = totals.total_revenue - totals.total_bonus;
    const roiPercentage = totals.total_bonus > 0 ? 
      Math.round((netProfit / totals.total_bonus) * 100 * 100) / 100 : 0;
    
    const avgBonusPerRide = totals.local_rides > 0 ? 
      Math.round((totals.total_bonus / totals.local_rides) * 100) / 100 : 0;
    
    // Buscar taxa de aceitação média (últimos 30 dias)
    const { data: acceptanceData } = await supabase
      .from('ride_acceptance_events')
      .select('event_type')
      .gte('created_at', new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000).toISOString());
    
    const acceptanceStats = (acceptanceData || []).reduce((acc, event) => ({
      offered: acc.offered + (event.event_type === 'offered' ? 1 : 0),
      accepted: acc.accepted + (event.event_type === 'accepted' ? 1 : 0)
    }), { offered: 0, accepted: 0 });
    
    const avgAcceptanceRate = acceptanceStats.offered > 0 ? 
      Math.round((acceptanceStats.accepted / acceptanceStats.offered) * 100 * 100) / 100 : 0;
    
    res.status(200).json({
      success: true,
      period_days: daysNum,
      overview: {
        rides: {
          total: totals.total_rides,
          local: totals.local_rides,
          external: totals.external_rides,
          local_percentage: localRidePercentage
        },
        financial: {
          total_bonus_paid: totals.total_bonus,
          total_revenue: totals.total_revenue,
          net_profit: netProfit,
          roi_percentage: roiPercentage,
          avg_bonus_per_ride: avgBonusPerRide
        },
        communities: {
          active: totals.active_communities,
          pending: totals.pending_communities,
          total: totals.active_communities + totals.pending_communities
        },
        drivers: {
          total_active: totals.total_drivers,
          avg_per_community: totals.active_communities > 0 ? 
            Math.round((totals.total_drivers / totals.active_communities) * 100) / 100 : 0
        },
        performance: {
          avg_acceptance_rate: avgAcceptanceRate,
          efficiency_score: Math.min(roiPercentage / 100, 1)
        }
      },
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro no dashboard overview:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Métricas detalhadas por comunidade
 * GET /api/v1/dashboard/communities
 */
router.get('/communities', async (req, res) => {
  try {
    const { 
      limit = 20, 
      offset = 0,
      sort_by = 'rides',
      order = 'desc',
      status = 'all'
    } = req.query;
    
    // Validações
    const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const offsetNum = Math.max(parseInt(offset) || 0, 0);
    const validSortFields = ['rides', 'roi', 'bonus', 'revenue', 'drivers', 'name'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'rides';
    const sortOrder = ['asc', 'desc'].includes(order) ? order : 'desc';
    const validStatuses = ['all', 'active', 'pending'];
    const statusFilter = validStatuses.includes(status) ? status : 'all';
    
    // Buscar dados das comunidades
    let metricsData = await getCommunityMetricsRealtime();
    
    // Filtrar por status se especificado
    if (statusFilter !== 'all') {
      metricsData = metricsData.filter(community => 
        community.community_status === statusFilter
      );
    }
    
    // Enriquecer dados com métricas calculadas
    const enrichedData = metricsData.map(community => {
      const netProfit = parseFloat(community.total_revenue_30d || 0) - parseFloat(community.total_bonus_30d || 0);
      const roiPercentage = parseFloat(community.total_bonus_30d || 0) > 0 ? 
        (netProfit / parseFloat(community.total_bonus_30d)) * 100 : 0;
      
      return {
        community_id: community.community_id,
        name: community.community_name,
        status: community.community_status,
        rides: {
          total: community.rides_30d || 0,
          local: community.local_rides_30d || 0,
          external: community.external_rides_30d || 0,
          local_percentage: community.local_rides_percentage || 0
        },
        financial: {
          bonus_paid: parseFloat(community.total_bonus_30d || 0),
          revenue: parseFloat(community.total_revenue_30d || 0),
          net_profit: netProfit,
          roi_percentage: Math.round(roiPercentage * 100) / 100
        },
        drivers: {
          active: community.active_drivers || 0
        },
        performance: {
          efficiency_score: Math.min(Math.max(roiPercentage / 100, 0), 1)
        }
      };
    });
    
    // Ordenar dados
    enrichedData.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'rides':
          aValue = a.rides.total;
          bValue = b.rides.total;
          break;
        case 'roi':
          aValue = a.financial.roi_percentage;
          bValue = b.financial.roi_percentage;
          break;
        case 'bonus':
          aValue = a.financial.bonus_paid;
          bValue = b.financial.bonus_paid;
          break;
        case 'revenue':
          aValue = a.financial.revenue;
          bValue = b.financial.revenue;
          break;
        case 'drivers':
          aValue = a.drivers.active;
          bValue = b.drivers.active;
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        default:
          aValue = a.rides.total;
          bValue = b.rides.total;
      }
      
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });
    
    // Aplicar paginação
    const paginatedData = enrichedData.slice(offsetNum, offsetNum + limitNum);
    
    // Calcular estatísticas do conjunto filtrado
    const stats = enrichedData.reduce((acc, community) => ({
      total_communities: acc.total_communities + 1,
      total_rides: acc.total_rides + community.rides.total,
      total_bonus: acc.total_bonus + community.financial.bonus_paid,
      total_revenue: acc.total_revenue + community.financial.revenue,
      avg_roi: acc.avg_roi + community.financial.roi_percentage
    }), {
      total_communities: 0,
      total_rides: 0,
      total_bonus: 0,
      total_revenue: 0,
      avg_roi: 0
    });
    
    if (stats.total_communities > 0) {
      stats.avg_roi = Math.round((stats.avg_roi / stats.total_communities) * 100) / 100;
    }
    
    res.status(200).json({
      success: true,
      communities: paginatedData,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: enrichedData.length,
        has_more: offsetNum + limitNum < enrichedData.length
      },
      filters: {
        sort_by: sortField,
        order: sortOrder,
        status: statusFilter
      },
      stats,
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro no dashboard de comunidades:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
