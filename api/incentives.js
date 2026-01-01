const express = require('express');
const {
  processRideCompletion,
  getDriverEarnings,
  setBonusConfig,
  getBonusConfig,
  updateCommunityStatus
} = require('../lib/incentives');

const router = express.Router();

/**
 * Finalizar corrida com cálculo automático de bônus
 * POST /api/v1/incentives/complete-ride
 * 
 * Body: {
 *   "ride_id": "uuid",
 *   "driver_id": "uuid", 
 *   "base_amount": 15.50,
 *   "passenger_amount": 15.50
 * }
 */
router.post('/complete-ride', async (req, res) => {
  try {
    const {
      ride_id,
      driver_id,
      base_amount,
      passenger_amount
    } = req.body;
    
    // Validação básica
    if (!ride_id || !driver_id || !base_amount || !passenger_amount) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: ride_id, driver_id, base_amount, passenger_amount'
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
    
    // Validação de valores
    const baseAmountNum = parseFloat(base_amount);
    const passengerAmountNum = parseFloat(passenger_amount);
    
    if (isNaN(baseAmountNum) || baseAmountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valor base inválido'
      });
    }
    
    if (isNaN(passengerAmountNum) || passengerAmountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valor do passageiro inválido'
      });
    }
    
    const result = await processRideCompletion({
      ride_id,
      driver_id,
      base_amount: baseAmountNum,
      passenger_amount: passengerAmountNum
    });
    
    res.status(200).json({
      success: true,
      data: result,
      message: 'Corrida finalizada com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao finalizar corrida:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Buscar extrato de ganhos do motorista
 * GET /api/v1/incentives/drivers/:driverId/earnings
 */
router.get('/drivers/:driverId/earnings', async (req, res) => {
  try {
    const { driverId } = req.params;
    const {
      limit = 50,
      offset = 0,
      date_from,
      date_to
    } = req.query;
    
    // Validação de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(driverId)) {
      return res.status(400).json({
        success: false,
        error: 'ID do motorista inválido'
      });
    }
    
    // Validação de paginação
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    
    if (isNaN(limitNum) || limitNum <= 0 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit deve ser entre 1 e 100'
      });
    }
    
    if (isNaN(offsetNum) || offsetNum < 0) {
      return res.status(400).json({
        success: false,
        error: 'Offset deve ser >= 0'
      });
    }
    
    const filters = {
      limit: limitNum,
      offset: offsetNum
    };
    
    // Adicionar filtros de data se válidos
    if (date_from) {
      const dateFrom = new Date(date_from);
      if (!isNaN(dateFrom.getTime())) {
        filters.date_from = dateFrom.toISOString();
      }
    }
    
    if (date_to) {
      const dateTo = new Date(date_to);
      if (!isNaN(dateTo.getTime())) {
        filters.date_to = dateTo.toISOString();
      }
    }
    
    const earnings = await getDriverEarnings(driverId, filters);
    
    res.status(200).json(earnings);
  } catch (error) {
    console.error('❌ Erro ao buscar ganhos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Configurar bônus para comunidade ou global
 * POST /api/v1/incentives/bonus-config
 * 
 * Body: {
 *   "community_id": "uuid" (opcional, null = global),
 *   "bonus_type": "percentage" | "fixed",
 *   "bonus_value": 5.00
 * }
 */
router.post('/bonus-config', async (req, res) => {
  try {
    const {
      community_id = null,
      bonus_type = 'percentage',
      bonus_value
    } = req.body;
    
    // Validação básica
    if (!bonus_value) {
      return res.status(400).json({
        success: false,
        error: 'Campo obrigatório: bonus_value'
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
    
    const config = await setBonusConfig({
      community_id,
      bonus_type,
      bonus_value
    });
    
    res.status(201).json({
      success: true,
      data: config,
      message: 'Configuração de bônus atualizada'
    });
  } catch (error) {
    console.error('❌ Erro ao configurar bônus:', error);
    
    if (error.message?.includes('inválido') || error.message?.includes('maior que zero')) {
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
 * Buscar configuração de bônus
 * GET /api/v1/incentives/bonus-config
 * GET /api/v1/incentives/bonus-config?community_id=uuid
 */
router.get('/bonus-config', async (req, res) => {
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
    
    const config = await getBonusConfig(community_id || null);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuração de bônus não encontrada'
      });
    }
    
    res.status(200).json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('❌ Erro ao buscar configuração:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Atualizar status de uma comunidade manualmente
 * POST /api/v1/incentives/communities/:id/update-status
 */
router.post('/communities/:id/update-status', async (req, res) => {
  try {
    const { id: communityId } = req.params;
    
    // Validação de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(communityId)) {
      return res.status(400).json({
        success: false,
        error: 'ID da comunidade inválido'
      });
    }
    
    const result = await updateCommunityStatus(communityId);
    
    res.status(200).json({
      success: true,
      data: result,
      message: 'Status da comunidade atualizado'
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
