const express = require('express');
const {
  checkDriverServiceEligibility,
  getEligibleDriversForService,
  enableDriverSpecialServices,
  getSpecialServiceConfigs,
  calculateServiceTotal,
  createSpecialServiceRide,
  recordSpecialServiceAcceptance,
  getDriverSpecialServiceHistory,
  getSpecialServiceStats
} = require('../lib/special-services');

const router = express.Router();

/**
 * Listar configurações de serviços especiais
 * GET /api/v1/special-services/configs
 */
router.get('/configs', async (req, res) => {
  try {
    const { service_type } = req.query;
    
    const configs = await getSpecialServiceConfigs(service_type);
    
    res.status(200).json({
      success: true,
      configs: service_type ? [configs] : configs,
      count: service_type ? 1 : configs.length
    });
  } catch (error) {
    console.error('❌ Erro ao buscar configurações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Verificar habilitação do motorista para serviço
 * GET /api/v1/special-services/drivers/:id/eligibility/:service_type
 */
router.get('/drivers/:id/eligibility/:service_type', async (req, res) => {
  try {
    const { id: driverId, service_type } = req.params;
    
    // Validação de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(driverId)) {
      return res.status(400).json({
        success: false,
        error: 'ID do motorista inválido'
      });
    }
    
    // Validação de tipo de serviço
    const validServiceTypes = [
      'STANDARD_RIDE', 'COMMUNITY_RIDE', 'TOUR_GUIDE',
      'ELDERLY_ASSISTANCE', 'SPECIAL_ASSISTANCE', 'COMMUNITY_SERVICE'
    ];
    
    if (!validServiceTypes.includes(service_type)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de serviço inválido'
      });
    }
    
    const isEligible = await checkDriverServiceEligibility(driverId, service_type);
    
    res.status(200).json({
      success: true,
      driver_id: driverId,
      service_type,
      is_eligible: isEligible
    });
  } catch (error) {
    console.error('❌ Erro ao verificar habilitação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Buscar motoristas habilitados para serviço
 * GET /api/v1/special-services/drivers/eligible/:service_type
 */
router.get('/drivers/eligible/:service_type', async (req, res) => {
  try {
    const { service_type } = req.params;
    const { community_id } = req.query;
    
    // Validação de tipo de serviço
    const validServiceTypes = [
      'STANDARD_RIDE', 'COMMUNITY_RIDE', 'TOUR_GUIDE',
      'ELDERLY_ASSISTANCE', 'SPECIAL_ASSISTANCE', 'COMMUNITY_SERVICE'
    ];
    
    if (!validServiceTypes.includes(service_type)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de serviço inválido'
      });
    }
    
    const drivers = await getEligibleDriversForService(service_type, community_id);
    
    res.status(200).json({
      success: true,
      service_type,
      community_id: community_id || 'all',
      drivers,
      count: drivers.length
    });
  } catch (error) {
    console.error('❌ Erro ao buscar motoristas habilitados:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Habilitar motorista para serviços especiais
 * POST /api/v1/special-services/drivers/:id/enable
 * 
 * Body: {
 *   "can_tour_guide": true,
 *   "can_elderly_assistance": false,
 *   "can_special_assistance": true,
 *   "can_community_service": false,
 *   "enabled_by": "admin@kaviar.com"
 * }
 */
router.post('/drivers/:id/enable', async (req, res) => {
  try {
    const { id: driverId } = req.params;
    const {
      can_tour_guide,
      can_elderly_assistance,
      can_special_assistance,
      can_community_service,
      enabled_by
    } = req.body;
    
    // Validação de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(driverId)) {
      return res.status(400).json({
        success: false,
        error: 'ID do motorista inválido'
      });
    }
    
    if (!enabled_by) {
      return res.status(400).json({
        success: false,
        error: 'Campo obrigatório: enabled_by'
      });
    }
    
    const services = {
      can_tour_guide: Boolean(can_tour_guide),
      can_elderly_assistance: Boolean(can_elderly_assistance),
      can_special_assistance: Boolean(can_special_assistance),
      can_community_service: Boolean(can_community_service)
    };
    
    const result = await enableDriverSpecialServices(driverId, services, enabled_by);
    
    res.status(200).json({
      success: true,
      driver: result,
      message: 'Motorista habilitado para serviços especiais'
    });
  } catch (error) {
    console.error('❌ Erro ao habilitar motorista:', error);
    
    if (error.message?.includes('não encontrado')) {
      return res.status(404).json({
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
 * Calcular valor total com taxa adicional
 * POST /api/v1/special-services/calculate-total
 * 
 * Body: {
 *   "base_amount": 25.50,
 *   "service_type": "TOUR_GUIDE",
 *   "custom_fee": 20.00 (opcional)
 * }
 */
router.post('/calculate-total', async (req, res) => {
  try {
    const { base_amount, service_type, custom_fee } = req.body;
    
    if (!base_amount || !service_type) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: base_amount, service_type'
      });
    }
    
    if (isNaN(base_amount) || base_amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'base_amount deve ser um número positivo'
      });
    }
    
    const totalAmount = await calculateServiceTotal(
      parseFloat(base_amount),
      service_type,
      custom_fee ? parseFloat(custom_fee) : null
    );
    
    const additionalFee = totalAmount - parseFloat(base_amount);
    
    res.status(200).json({
      success: true,
      calculation: {
        base_amount: parseFloat(base_amount),
        additional_fee: additionalFee,
        total_amount: totalAmount,
        service_type
      }
    });
  } catch (error) {
    console.error('❌ Erro ao calcular total:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Criar corrida com serviço especial
 * POST /api/v1/special-services/rides
 * 
 * DEPRECATED: Use POST /api/v1/rides com service_type
 */
router.post('/rides', async (req, res) => {
  res.status(410).json({
    success: false,
    error: 'Endpoint descontinuado. Use POST /api/v1/rides com service_type',
    migration: {
      old: 'POST /api/v1/special-services/rides',
      new: 'POST /api/v1/rides',
      note: 'Adicione service_type no payload'
    }
  });
});

/**
 * Registrar aceite de serviço especial
 * POST /api/v1/special-services/rides/:id/accept
 * 
 * Body: {
 *   "driver_id": "uuid"
 * }
 */
router.post('/rides/:id/accept', async (req, res) => {
  try {
    const { id: rideId } = req.params;
    const { driver_id } = req.body;
    
    // Validação de UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(rideId) || !uuidRegex.test(driver_id)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }
    
    const acceptance = await recordSpecialServiceAcceptance(rideId, driver_id);
    
    res.status(200).json({
      success: true,
      acceptance,
      message: 'Aceite de serviço especial registrado'
    });
  } catch (error) {
    console.error('❌ Erro ao registrar aceite:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Histórico de serviços especiais do motorista
 * GET /api/v1/special-services/drivers/:id/history
 */
router.get('/drivers/:id/history', async (req, res) => {
  try {
    const { id: driverId } = req.params;
    const { days = 30 } = req.query;
    
    // Validação de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(driverId)) {
      return res.status(400).json({
        success: false,
        error: 'ID do motorista inválido'
      });
    }
    
    const daysNum = Math.min(Math.max(parseInt(days) || 30, 1), 365);
    
    const history = await getDriverSpecialServiceHistory(driverId, daysNum);
    
    res.status(200).json({
      success: true,
      driver_id: driverId,
      period_days: daysNum,
      history,
      count: history.length
    });
  } catch (error) {
    console.error('❌ Erro ao buscar histórico:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Estatísticas de serviços especiais
 * GET /api/v1/special-services/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { community_id, days_back = 30 } = req.query;
    
    const daysNum = Math.min(Math.max(parseInt(days_back) || 30, 1), 365);
    
    const stats = await getSpecialServiceStats({
      community_id,
      days_back: daysNum
    });
    
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

module.exports = router;
