const express = require('express');
const {
  getCommunityMetricsRealtime,
  getCommunityAnalytics,
  compareCommunityPerformance,
  calculateDailyMetrics,
  recordRideAcceptanceEvent,
  getCommunityAcceptanceRate,
  createIncentiveConfig,
  refreshMetricsView
} = require('../lib/analytics');

const router = express.Router();

/**
 * Buscar métricas em tempo real de todas as comunidades
 * GET /api/v1/analytics/communities
 */
router.get('/communities', async (req, res) => {
  try {
    const metrics = await getCommunityMetricsRealtime();
    
    res.status(200).json({
      success: true,
      data: metrics,
      count: metrics.length,
      last_updated: metrics[0]?.last_updated || null
    });
  } catch (error) {
    console.error('❌ Erro ao buscar métricas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Buscar analytics detalhados de uma comunidade específica
 * GET /api/v1/analytics/communities/:id
 */
router.get('/communities/:id', async (req, res) => {
  try {
    const { id: communityId } = req.params;
    const {
      days_back = 30,
      limit = 30
    } = req.query;
    
    // Validação de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(communityId)) {
      return res.status(400).json({
        success: false,
        error: 'ID da comunidade inválido'
      });
    }
    
    // Validação de parâmetros
    const daysBackNum = parseInt(days_back);
    const limitNum = parseInt(limit);
    
    if (isNaN(daysBackNum) || daysBackNum <= 0 || daysBackNum > 365) {
      return res.status(400).json({
        success: false,
        error: 'days_back deve ser entre 1 e 365'
      });
    }
    
    if (isNaN(limitNum) || limitNum <= 0 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'limit deve ser entre 1 e 100'
      });
    }
    
    const analytics = await getCommunityAnalytics(communityId, {
      days_back: daysBackNum,
      limit: limitNum
    });
    
    res.status(200).json(analytics);
  } catch (error) {
    console.error('❌ Erro ao buscar analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Comparar performance entre múltiplas comunidades
 * POST /api/v1/analytics/communities/compare
 * 
 * Body: {
 *   "community_ids": ["uuid1", "uuid2", "uuid3"],
 *   "days_back": 30
 * }
 */
router.post('/communities/compare', async (req, res) => {
  try {
    const {
      community_ids,
      days_back = 30
    } = req.body;
    
    // Validação básica
    if (!community_ids || !Array.isArray(community_ids) || community_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Campo obrigatório: community_ids (array não vazio)'
      });
    }
    
    if (community_ids.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Máximo 10 comunidades por comparação'
      });
    }
    
    // Validação de UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const invalidIds = community_ids.filter(id => !uuidRegex.test(id));
    
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos encontrados',
        invalid_ids: invalidIds
      });
    }
    
    // Validação de período
    const daysBackNum = parseInt(days_back);
    if (isNaN(daysBackNum) || daysBackNum <= 0 || daysBackNum > 365) {
      return res.status(400).json({
        success: false,
        error: 'days_back deve ser entre 1 e 365'
      });
    }
    
    const comparison = await compareCommunityPerformance(community_ids, daysBackNum);
    
    res.status(200).json(comparison);
  } catch (error) {
    console.error('❌ Erro ao comparar comunidades:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Calcular métricas diárias manualmente
 * POST /api/v1/analytics/calculate-metrics
 * 
 * Body: {
 *   "date": "2026-01-01" (opcional)
 * }
 */
router.post('/calculate-metrics', async (req, res) => {
  try {
    const { date } = req.body;
    
    // Validação de data se fornecida
    if (date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({
          success: false,
          error: 'Formato de data inválido. Use YYYY-MM-DD'
        });
      }
      
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Data inválida'
        });
      }
    }
    
    await calculateDailyMetrics(date);
    
    res.status(200).json({
      success: true,
      message: 'Métricas calculadas com sucesso',
      date: date || new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('❌ Erro ao calcular métricas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Registrar evento de aceitação de corrida
 * POST /api/v1/analytics/acceptance-events
 * 
 * Body: {
 *   "ride_id": "uuid",
 *   "driver_id": "uuid",
 *   "event_type": "offered|accepted|rejected|timeout",
 *   "response_time_seconds": 30 (opcional)
 * }
 */
router.post('/acceptance-events', async (req, res) => {
  try {
    const {
      ride_id,
      driver_id,
      event_type,
      response_time_seconds
    } = req.body;
    
    // Validação básica
    if (!ride_id || !driver_id || !event_type) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: ride_id, driver_id, event_type'
      });
    }
    
    // Validação de UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(ride_id) || !uuidRegex.test(driver_id)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }
    
    // Validação de tipo de evento
    const validEventTypes = ['offered', 'accepted', 'rejected', 'timeout'];
    if (!validEventTypes.includes(event_type)) {
      return res.status(400).json({
        success: false,
        error: 'event_type inválido. Use: offered, accepted, rejected, timeout'
      });
    }
    
    // Validação de tempo de resposta se fornecido
    if (response_time_seconds !== undefined) {
      const responseTime = parseInt(response_time_seconds);
      if (isNaN(responseTime) || responseTime < 0) {
        return res.status(400).json({
          success: false,
          error: 'response_time_seconds deve ser um número >= 0'
        });
      }
    }
    
    const eventId = await recordRideAcceptanceEvent({
      ride_id,
      driver_id,
      event_type,
      response_time_seconds: response_time_seconds ? parseInt(response_time_seconds) : null
    });
    
    res.status(201).json({
      success: true,
      data: {
        event_id: eventId,
        ride_id,
        driver_id,
        event_type
      },
      message: 'Evento registrado com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao registrar evento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Buscar taxa de aceitação de uma comunidade
 * GET /api/v1/analytics/communities/:id/acceptance-rate
 */
router.get('/communities/:id/acceptance-rate', async (req, res) => {
  try {
    const { id: communityId } = req.params;
    const { days_back = 30 } = req.query;
    
    // Validação de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(communityId)) {
      return res.status(400).json({
        success: false,
        error: 'ID da comunidade inválido'
      });
    }
    
    // Validação de período
    const daysBackNum = parseInt(days_back);
    if (isNaN(daysBackNum) || daysBackNum <= 0 || daysBackNum > 365) {
      return res.status(400).json({
        success: false,
        error: 'days_back deve ser entre 1 e 365'
      });
    }
    
    const acceptanceRate = await getCommunityAcceptanceRate(communityId, daysBackNum);
    
    res.status(200).json({
      success: true,
      data: {
        community_id: communityId,
        acceptance_rate: acceptanceRate,
        period_days: daysBackNum
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar taxa de aceitação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Criar configuração de incentivo versionada
 * POST /api/v1/analytics/incentive-configs
 * 
 * Body: {
 *   "community_id": "uuid" (opcional),
 *   "incentive_type": "community_bonus|recurrence_bonus|time_window_bonus|rating_bonus",
 *   "config_data": {...},
 *   "created_by": "admin_id"
 * }
 */
router.post('/incentive-configs', async (req, res) => {
  try {
    const {
      community_id,
      incentive_type,
      config_data,
      created_by,
      valid_from,
      valid_until
    } = req.body;
    
    // Validação básica
    if (!incentive_type || !config_data || !created_by) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: incentive_type, config_data, created_by'
      });
    }
    
    // Validação de UUID se fornecido
    if (community_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(community_id)) {
        return res.status(400).json({
          success: false,
          error: 'ID da comunidade inválido'
        });
      }
    }
    
    // Validação de tipo de incentivo
    const validTypes = ['community_bonus', 'recurrence_bonus', 'time_window_bonus', 'rating_bonus'];
    if (!validTypes.includes(incentive_type)) {
      return res.status(400).json({
        success: false,
        error: 'incentive_type inválido'
      });
    }
    
    const config = await createIncentiveConfig({
      community_id,
      incentive_type,
      config_data,
      created_by,
      valid_from,
      valid_until
    });
    
    res.status(201).json({
      success: true,
      data: config,
      message: 'Configuração de incentivo criada'
    });
  } catch (error) {
    console.error('❌ Erro ao criar configuração:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Atualizar view de métricas manualmente
 * POST /api/v1/analytics/refresh-metrics
 */
router.post('/refresh-metrics', async (req, res) => {
  try {
    await refreshMetricsView();
    
    res.status(200).json({
      success: true,
      message: 'Métricas atualizadas com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar métricas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
