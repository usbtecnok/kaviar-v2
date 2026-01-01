const express = require('express');
const {
  getActiveAlerts,
  acknowledgeAlert,
  resolveAlert,
  setAlertThreshold,
  getAlertThresholds,
  getAlertStats,
  evaluateCommunityAlerts
} = require('../lib/alerts');
const { runAlertsMonitoringNow } = require('../lib/analytics-jobs');

const router = express.Router();

/**
 * Buscar alertas ativos
 * GET /api/v1/alerts/active
 */
router.get('/active', async (req, res) => {
  try {
    const {
      community_id,
      alert_type,
      severity,
      limit = 50,
      offset = 0
    } = req.query;
    
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
    
    // Validação de tipo de alerta
    if (alert_type) {
      const validTypes = ['roi_low', 'bonus_excessive', 'acceptance_low', 'volume_low'];
      if (!validTypes.includes(alert_type)) {
        return res.status(400).json({
          success: false,
          error: 'Tipo de alerta inválido'
        });
      }
    }
    
    // Validação de severidade
    if (severity) {
      const validSeverities = ['low', 'medium', 'high', 'critical'];
      if (!validSeverities.includes(severity)) {
        return res.status(400).json({
          success: false,
          error: 'Severidade inválida'
        });
      }
    }
    
    const alerts = await getActiveAlerts({
      community_id,
      alert_type,
      severity,
      limit: Math.min(parseInt(limit) || 50, 100),
      offset: Math.max(parseInt(offset) || 0, 0)
    });
    
    res.status(200).json({
      success: true,
      alerts,
      count: alerts.length,
      filters: {
        community_id,
        alert_type,
        severity
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar alertas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Reconhecer um alerta
 * POST /api/v1/alerts/:id/acknowledge
 */
router.post('/:id/acknowledge', async (req, res) => {
  try {
    const { id: alertId } = req.params;
    const { acknowledged_by } = req.body;
    
    // Validação de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(alertId)) {
      return res.status(400).json({
        success: false,
        error: 'ID do alerta inválido'
      });
    }
    
    if (!acknowledged_by) {
      return res.status(400).json({
        success: false,
        error: 'Campo obrigatório: acknowledged_by'
      });
    }
    
    const alert = await acknowledgeAlert(alertId, acknowledged_by);
    
    res.status(200).json({
      success: true,
      alert,
      message: 'Alerta reconhecido com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao reconhecer alerta:', error);
    
    if (error.message?.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Alerta não encontrado ou já processado'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Resolver um alerta
 * POST /api/v1/alerts/:id/resolve
 */
router.post('/:id/resolve', async (req, res) => {
  try {
    const { id: alertId } = req.params;
    
    // Validação de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(alertId)) {
      return res.status(400).json({
        success: false,
        error: 'ID do alerta inválido'
      });
    }
    
    const alert = await resolveAlert(alertId);
    
    res.status(200).json({
      success: true,
      alert,
      message: 'Alerta resolvido com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao resolver alerta:', error);
    
    if (error.message?.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Alerta não encontrado ou já processado'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Configurar threshold de alerta
 * POST /api/v1/alerts/thresholds
 */
router.post('/thresholds', async (req, res) => {
  try {
    const {
      community_id,
      threshold_type,
      threshold_value,
      created_by
    } = req.body;
    
    // Validação básica
    if (!threshold_type || !threshold_value || !created_by) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: threshold_type, threshold_value, created_by'
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
    
    const threshold = await setAlertThreshold({
      community_id,
      threshold_type,
      threshold_value,
      created_by
    });
    
    res.status(201).json({
      success: true,
      threshold,
      message: 'Threshold configurado com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao configurar threshold:', error);
    
    if (error.message?.includes('inválido')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Buscar thresholds configurados
 * GET /api/v1/alerts/thresholds
 */
router.get('/thresholds', async (req, res) => {
  try {
    const { community_id } = req.query;
    
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
    
    const thresholds = await getAlertThresholds(community_id);
    
    res.status(200).json({
      success: true,
      thresholds,
      count: thresholds.length
    });
  } catch (error) {
    console.error('❌ Erro ao buscar thresholds:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Estatísticas de alertas
 * GET /api/v1/alerts/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const daysNum = Math.min(Math.max(parseInt(days) || 7, 1), 365);
    
    const stats = await getAlertStats(daysNum);
    
    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Executar monitoramento manual de alertas
 * POST /api/v1/alerts/monitor
 */
router.post('/monitor', async (req, res) => {
  try {
    const { community_id } = req.body;
    
    let alerts;
    
    if (community_id) {
      // Validação de UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(community_id)) {
        return res.status(400).json({
          success: false,
          error: 'ID da comunidade inválido'
        });
      }
      
      // Monitorar comunidade específica
      alerts = await evaluateCommunityAlerts(community_id);
    } else {
      // Monitorar todas as comunidades
      alerts = await runAlertsMonitoringNow();
    }
    
    res.status(200).json({
      success: true,
      alerts_triggered: alerts.length,
      alerts: alerts.map(alert => ({
        alert_id: alert.alert_id,
        alert_type: alert.alert_type,
        severity: alert.severity,
        message: alert.message
      })),
      message: 'Monitoramento executado com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro no monitoramento manual:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
