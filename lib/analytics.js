const { supabase } = require('./supabase');

/**
 * SISTEMA DE ANALYTICS E MONITORAMENTO DE INCENTIVOS
 * 
 * Implementa coleta, análise e otimização data-driven do programa de incentivos
 * sem alterar regras de negócio existentes
 */

/**
 * Calcular métricas diárias para uma data específica
 * @param {string} targetDate - Data no formato YYYY-MM-DD (opcional, padrão hoje)
 * @returns {Promise<boolean>} Sucesso da operação
 */
async function calculateDailyMetrics(targetDate = null) {
  try {
    const date = targetDate || new Date().toISOString().split('T')[0];
    
    const { error } = await supabase
      .rpc('calculate_daily_metrics', {
        target_date: date
      });
    
    if (error) throw error;
    
    console.log('📊 Métricas diárias calculadas:', { date });
    return true;
  } catch (error) {
    console.error('Error calculating daily metrics:', error);
    throw error;
  }
}

/**
 * Buscar métricas em tempo real de todas as comunidades
 * @returns {Promise<Array>} Métricas das comunidades
 */
async function getCommunityMetricsRealtime() {
  try {
    const { data, error } = await supabase
      .from('community_metrics_realtime')
      .select('*')
      .order('rides_30d', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching realtime metrics:', error);
    throw error;
  }
}

/**
 * Buscar métricas históricas de uma comunidade
 * @param {string} communityId - ID da comunidade
 * @param {Object} filters - Filtros (days_back, limit)
 * @returns {Promise<Object>} Métricas históricas e análise
 */
async function getCommunityAnalytics(communityId, filters = {}) {
  try {
    const { days_back = 30, limit = 30 } = filters;
    
    // Buscar métricas diárias
    const { data: dailyMetrics, error: dailyError } = await supabase
      .from('community_metrics_daily')
      .select('*')
      .eq('community_id', communityId)
      .gte('date', new Date(Date.now() - days_back * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(limit);
    
    if (dailyError) throw dailyError;
    
    // Buscar métricas em tempo real
    const { data: realtimeMetrics, error: realtimeError } = await supabase
      .from('community_metrics_realtime')
      .select('*')
      .eq('community_id', communityId)
      .single();
    
    if (realtimeError && realtimeError.code !== 'PGRST116') throw realtimeError;
    
    // Calcular tendências
    const trends = calculateTrends(dailyMetrics || []);
    
    // Calcular ROI detalhado
    const roiAnalysis = calculateROIAnalysis(dailyMetrics || []);
    
    return {
      success: true,
      community_id: communityId,
      realtime_metrics: realtimeMetrics,
      daily_metrics: dailyMetrics || [],
      trends,
      roi_analysis: roiAnalysis,
      period: {
        days_back,
        from: new Date(Date.now() - days_back * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
      }
    };
  } catch (error) {
    console.error('Error fetching community analytics:', error);
    throw error;
  }
}

/**
 * Calcular tendências baseadas em métricas históricas
 * @param {Array} dailyMetrics - Métricas diárias ordenadas por data DESC
 * @returns {Object} Análise de tendências
 */
function calculateTrends(dailyMetrics) {
  if (!dailyMetrics || dailyMetrics.length < 2) {
    return {
      rides_trend: 0,
      bonus_trend: 0,
      revenue_trend: 0,
      local_percentage_trend: 0
    };
  }
  
  const recent = dailyMetrics.slice(0, Math.ceil(dailyMetrics.length / 2));
  const older = dailyMetrics.slice(Math.ceil(dailyMetrics.length / 2));
  
  const recentAvg = {
    rides: recent.reduce((sum, m) => sum + (m.total_rides || 0), 0) / recent.length,
    bonus: recent.reduce((sum, m) => sum + parseFloat(m.total_bonus_paid || 0), 0) / recent.length,
    revenue: recent.reduce((sum, m) => sum + parseFloat(m.total_revenue || 0), 0) / recent.length,
    local_pct: recent.reduce((sum, m) => {
      const total = m.total_rides || 0;
      const local = m.local_rides || 0;
      return sum + (total > 0 ? (local / total) * 100 : 0);
    }, 0) / recent.length
  };
  
  const olderAvg = {
    rides: older.reduce((sum, m) => sum + (m.total_rides || 0), 0) / older.length,
    bonus: older.reduce((sum, m) => sum + parseFloat(m.total_bonus_paid || 0), 0) / older.length,
    revenue: older.reduce((sum, m) => sum + parseFloat(m.total_revenue || 0), 0) / older.length,
    local_pct: older.reduce((sum, m) => {
      const total = m.total_rides || 0;
      const local = m.local_rides || 0;
      return sum + (total > 0 ? (local / total) * 100 : 0);
    }, 0) / older.length
  };
  
  return {
    rides_trend: olderAvg.rides > 0 ? ((recentAvg.rides - olderAvg.rides) / olderAvg.rides) * 100 : 0,
    bonus_trend: olderAvg.bonus > 0 ? ((recentAvg.bonus - olderAvg.bonus) / olderAvg.bonus) * 100 : 0,
    revenue_trend: olderAvg.revenue > 0 ? ((recentAvg.revenue - olderAvg.revenue) / olderAvg.revenue) * 100 : 0,
    local_percentage_trend: recentAvg.local_pct - olderAvg.local_pct
  };
}

/**
 * Calcular análise detalhada de ROI
 * @param {Array} dailyMetrics - Métricas diárias
 * @returns {Object} Análise de ROI
 */
function calculateROIAnalysis(dailyMetrics) {
  if (!dailyMetrics || dailyMetrics.length === 0) {
    return {
      total_investment: 0,
      total_revenue: 0,
      net_profit: 0,
      roi_percentage: 0,
      avg_bonus_per_ride: 0,
      cost_per_acquisition: 0
    };
  }
  
  const totals = dailyMetrics.reduce((acc, metric) => ({
    bonus: acc.bonus + parseFloat(metric.total_bonus_paid || 0),
    revenue: acc.revenue + parseFloat(metric.total_revenue || 0),
    rides: acc.rides + (metric.total_rides || 0),
    local_rides: acc.local_rides + (metric.local_rides || 0)
  }), { bonus: 0, revenue: 0, rides: 0, local_rides: 0 });
  
  const netProfit = totals.revenue - totals.bonus;
  const roiPercentage = totals.bonus > 0 ? (netProfit / totals.bonus) * 100 : 0;
  const avgBonusPerRide = totals.local_rides > 0 ? totals.bonus / totals.local_rides : 0;
  
  return {
    total_investment: totals.bonus,
    total_revenue: totals.revenue,
    net_profit: netProfit,
    roi_percentage: roiPercentage,
    avg_bonus_per_ride: avgBonusPerRide,
    cost_per_acquisition: avgBonusPerRide, // Simplificado
    efficiency_score: roiPercentage > 0 ? Math.min(roiPercentage / 100, 1) : 0
  };
}

/**
 * Registrar evento de aceitação de corrida
 * @param {Object} eventData - Dados do evento
 * @returns {Promise<string>} ID do evento criado
 */
async function recordRideAcceptanceEvent(eventData) {
  try {
    const {
      ride_id,
      driver_id,
      event_type, // 'offered', 'accepted', 'rejected', 'timeout'
      response_time_seconds = null
    } = eventData;
    
    const { data, error } = await supabase
      .rpc('record_ride_acceptance_event', {
        ride_uuid: ride_id,
        driver_uuid: driver_id,
        event_type_param: event_type,
        response_time_param: response_time_seconds
      });
    
    if (error) throw error;
    
    console.log('📈 Evento de aceitação registrado:', {
      rideId: ride_id,
      driverId: driver_id,
      eventType: event_type,
      responseTime: response_time_seconds
    });
    
    return data;
  } catch (error) {
    console.error('Error recording acceptance event:', error);
    throw error;
  }
}

/**
 * Buscar taxa de aceitação de uma comunidade
 * @param {string} communityId - ID da comunidade
 * @param {number} daysBack - Dias para trás (padrão 30)
 * @returns {Promise<number>} Taxa de aceitação em %
 */
async function getCommunityAcceptanceRate(communityId, daysBack = 30) {
  try {
    const { data, error } = await supabase
      .rpc('get_community_acceptance_rate', {
        community_uuid: communityId,
        days_back: daysBack
      });
    
    if (error) throw error;
    
    return parseFloat(data || 0);
  } catch (error) {
    console.error('Error fetching acceptance rate:', error);
    return 0;
  }
}

/**
 * Comparar performance entre comunidades
 * @param {Array} communityIds - IDs das comunidades para comparar
 * @param {number} daysBack - Período de análise
 * @returns {Promise<Object>} Comparação detalhada
 */
async function compareCommunityPerformance(communityIds, daysBack = 30) {
  try {
    const comparisons = await Promise.all(
      communityIds.map(async (communityId) => {
        const analytics = await getCommunityAnalytics(communityId, { days_back: daysBack });
        const acceptanceRate = await getCommunityAcceptanceRate(communityId, daysBack);
        
        return {
          community_id: communityId,
          community_name: analytics.realtime_metrics?.community_name || 'Unknown',
          metrics: analytics.realtime_metrics,
          roi_analysis: analytics.roi_analysis,
          trends: analytics.trends,
          acceptance_rate: acceptanceRate
        };
      })
    );
    
    // Ranking por ROI
    const rankedByROI = [...comparisons].sort((a, b) => 
      (b.roi_analysis?.roi_percentage || 0) - (a.roi_analysis?.roi_percentage || 0)
    );
    
    // Ranking por volume
    const rankedByVolume = [...comparisons].sort((a, b) => 
      (b.metrics?.rides_30d || 0) - (a.metrics?.rides_30d || 0)
    );
    
    // Estatísticas gerais
    const totalMetrics = comparisons.reduce((acc, comp) => ({
      total_rides: acc.total_rides + (comp.metrics?.rides_30d || 0),
      total_bonus: acc.total_bonus + (comp.roi_analysis?.total_investment || 0),
      total_revenue: acc.total_revenue + (comp.roi_analysis?.total_revenue || 0)
    }), { total_rides: 0, total_bonus: 0, total_revenue: 0 });
    
    return {
      success: true,
      period_days: daysBack,
      communities: comparisons,
      rankings: {
        by_roi: rankedByROI,
        by_volume: rankedByVolume
      },
      aggregated: {
        ...totalMetrics,
        avg_roi: comparisons.length > 0 ? 
          comparisons.reduce((sum, c) => sum + (c.roi_analysis?.roi_percentage || 0), 0) / comparisons.length : 0,
        avg_acceptance_rate: comparisons.length > 0 ?
          comparisons.reduce((sum, c) => sum + (c.acceptance_rate || 0), 0) / comparisons.length : 0
      }
    };
  } catch (error) {
    console.error('Error comparing community performance:', error);
    throw error;
  }
}

/**
 * Criar configuração de incentivo versionada
 * @param {Object} configData - Dados da configuração
 * @returns {Promise<Object>} Configuração criada
 */
async function createIncentiveConfig(configData) {
  try {
    const {
      community_id = null,
      incentive_type,
      config_data,
      created_by,
      valid_from = new Date().toISOString(),
      valid_until = null
    } = configData;
    
    // Desativar configurações anteriores do mesmo tipo
    await supabase
      .from('incentive_configs')
      .update({ 
        is_active: false,
        valid_until: new Date().toISOString()
      })
      .eq('community_id', community_id)
      .eq('incentive_type', incentive_type)
      .eq('is_active', true);
    
    // Criar nova configuração
    const { data, error } = await supabase
      .from('incentive_configs')
      .insert({
        community_id,
        incentive_type,
        config_data,
        created_by,
        valid_from,
        valid_until,
        is_active: true
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('⚙️ Configuração de incentivo criada:', {
      configId: data.id,
      communityId: community_id || 'global',
      incentiveType: incentive_type
    });
    
    return data;
  } catch (error) {
    console.error('Error creating incentive config:', error);
    throw error;
  }
}

/**
 * Refresh manual da view materializada de métricas
 * @returns {Promise<boolean>} Sucesso da operação
 */
async function refreshMetricsView() {
  try {
    const { error } = await supabase
      .rpc('refresh_community_metrics');
    
    if (error) throw error;
    
    console.log('🔄 View de métricas atualizada');
    return true;
  } catch (error) {
    console.error('Error refreshing metrics view:', error);
    throw error;
  }
}

module.exports = {
  calculateDailyMetrics,
  getCommunityMetricsRealtime,
  getCommunityAnalytics,
  recordRideAcceptanceEvent,
  getCommunityAcceptanceRate,
  compareCommunityPerformance,
  createIncentiveConfig,
  refreshMetricsView,
  calculateTrends,
  calculateROIAnalysis
};
