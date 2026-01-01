const express = require('express');
const {
  createRideWithCommunity,
  allowExternalDrivers,
  getEligibleDriversForRide,
  canDriverAcceptRide
} = require('../lib/communities');
const { isCommunityActive } = require('../lib/incentives');
const { checkDriverServiceEligibility, calculateServiceTotal } = require('../lib/special-services');
const {
  acceptRide,
  declineRide,
  startRide,
  completeRide,
  cancelRide,
  getRideById
} = require('../lib/ride-states');
const { validateRideOwnership } = require('../lib/auth');
const { validateRequest } = require('../lib/validation');
const { rideCreationRateLimit } = require('../lib/rate-limiting');
const { logger } = require('../lib/data-privacy');

const router = express.Router();

/**
 * Criar nova corrida com isolamento por comunidade
 * POST /api/v1/rides
 * SEGURANÇA: Autenticação obrigatória + Rate limiting + Validação
 */
router.post('/', rideCreationRateLimit, validateRequest('ride_creation'), async (req, res) => {
  try {
    const {
      passenger_id,
      pickup_location,
      destination,
      service_type = 'STANDARD_RIDE',
      service_notes = null,
      base_amount
    } = req.body;
    
    // SEGURANÇA: Verificar se usuário autenticado pode criar corrida para este passageiro
    if (!req.user.is_admin && req.user.id !== passenger_id) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado - só pode criar corridas para si mesmo',
        code: 'ACCESS_DENIED'
      });
    }
    
    // SEGURANÇA: Verificar se usuário é passageiro (exceto admin)
    if (!req.user.is_admin && req.user.user_type !== 'passenger') {
      return res.status(403).json({
        success: false,
        error: 'Apenas passageiros podem criar corridas',
        code: 'INVALID_USER_TYPE'
      });
    }
    
    // Calcular valor total se for serviço especial
    let totalAmount = base_amount;
    if (service_type !== 'STANDARD_RIDE' && base_amount) {
      totalAmount = await calculateServiceTotal(
        parseFloat(base_amount),
        service_type,
        null // additional_fee removido do cliente
      );
    }
    
    // Verificar se a comunidade do passageiro está ativa
    const { getPassengerCommunity } = require('../lib/communities');
    const passengerCommunity = await getPassengerCommunity(passenger_id);
    
    if (!passengerCommunity) {
      return res.status(400).json({
        success: false,
        error: 'Passageiro não possui comunidade associada',
        code: 'NO_COMMUNITY'
      });
    }
    
    const communityActive = await isCommunityActive(passengerCommunity.id);
    if (!communityActive) {
      return res.status(400).json({
        success: false,
        error: 'Comunidade não está ativa. Aguarde mais motoristas se cadastrarem.',
        code: 'COMMUNITY_INACTIVE',
        community: {
          id: passengerCommunity.id,
          name: passengerCommunity.name,
          status: 'pending'
        }
      });
    }
    
    // SEGURANÇA: Dados controlados pelo backend (não aceitos do cliente)
    const rideData = {
      passenger_id,
      pickup_location: pickup_location.trim(),
      destination: destination.trim(),
      allow_external_drivers: false, // SEMPRE false inicialmente
      service_type,
      additional_fee: 0, // Controlado pelo backend
      service_notes,
      base_amount: base_amount ? parseFloat(base_amount) : null,
      total_amount: totalAmount ? parseFloat(totalAmount) : null,
      status: 'pending' // Sempre pending
    };
    
    const ride = await createRideWithCommunity(rideData);
    
    logger.info('🚗 Nova corrida criada:', {
      rideId: ride.id,
      passengerId: passenger_id,
      communityId: ride.community_id,
      serviceType: service_type,
      userId: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: ride,
      message: 'Corrida criada com sucesso'
    });
  } catch (error) {
    logger.error('❌ Erro ao criar corrida:', { error: error.message, userId: req.user?.id });
    
    if (error.message?.includes('comunidade')) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: 'COMMUNITY_ERROR'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * Permitir motoristas externos em uma corrida
 * POST /api/v1/rides/:id/allow-external
 * 
 * Body: {
 *   "passenger_id": "uuid"
 * }
 */
router.post('/:id/allow-external', async (req, res) => {
  try {
    const { id: rideId } = req.params;
    const { passenger_id } = req.body;
    
    // Validação básica
    if (!passenger_id) {
      return res.status(400).json({
        success: false,
        error: 'Campo obrigatório: passenger_id'
      });
    }
    
    // Validação de UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(rideId) || !uuidRegex.test(passenger_id)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }
    
    const updatedRide = await allowExternalDrivers(rideId, passenger_id);
    
    console.log('🌍 Motoristas externos permitidos:', {
      rideId,
      passengerId: passenger_id
    });
    
    res.status(200).json({
      success: true,
      data: updatedRide,
      message: 'Motoristas externos permitidos com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao permitir motoristas externos:', error);
    
    if (error.message?.includes('passageiro') || error.message?.includes('permitidos')) {
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
 * Listar motoristas elegíveis para uma corrida
 * GET /api/v1/rides/:id/eligible-drivers
 */
router.get('/:id/eligible-drivers', async (req, res) => {
  try {
    const { id: rideId } = req.params;
    
    // Validação de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(rideId)) {
      return res.status(400).json({
        success: false,
        error: 'ID da corrida inválido'
      });
    }
    
    const eligibleDrivers = await getEligibleDriversForRide(rideId);
    
    res.status(200).json({
      success: true,
      data: eligibleDrivers,
      count: eligibleDrivers.length
    });
  } catch (error) {
    console.error('❌ Erro ao buscar motoristas elegíveis:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Verificar se motorista pode aceitar corrida
 * GET /api/v1/rides/:rideId/can-accept/:driverId
 */
router.get('/:rideId/can-accept/:driverId', async (req, res) => {
  try {
    const { rideId, driverId } = req.params;
    
    // Validação de UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(rideId) || !uuidRegex.test(driverId)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }
    
    const canAccept = await canDriverAcceptRide(driverId, rideId);
    
    res.status(200).json({
      success: true,
      data: {
        can_accept: canAccept,
        driver_id: driverId,
        ride_id: rideId
      }
    });
  } catch (error) {
    console.error('❌ Erro ao verificar elegibilidade:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Aceitar corrida
 * POST /api/v1/rides/:id/accept
 * SEGURANÇA: Validação de propriedade + Autorização
 */
router.post('/:id/accept', validateRideOwnership, async (req, res) => {
  try {
    const { id: rideId } = req.params;
    const { driver_id } = req.body;
    
    // SEGURANÇA: Verificar se usuário pode aceitar esta corrida
    if (!req.user.is_admin && req.user.id !== driver_id) {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado - só pode aceitar corridas para si mesmo',
        code: 'ACCESS_DENIED'
      });
    }
    
    // SEGURANÇA: Verificar se usuário é motorista (exceto admin)
    if (!req.user.is_admin && req.user.user_type !== 'driver') {
      return res.status(403).json({
        success: false,
        error: 'Apenas motoristas podem aceitar corridas',
        code: 'INVALID_USER_TYPE'
      });
    }
    
    // Validação de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(driver_id)) {
      return res.status(400).json({
        success: false,
        error: 'ID do motorista inválido',
        code: 'INVALID_UUID'
      });
    }
    
    const ride = await acceptRide(rideId, driver_id);
    
    logger.info('✅ Corrida aceita:', {
      rideId,
      driverId: driver_id,
      userId: req.user.id
    });
    
    res.status(200).json({
      success: true,
      data: ride,
      message: 'Corrida aceita com sucesso'
    });
  } catch (error) {
    logger.error('❌ Erro ao aceitar corrida:', { 
      error: error.message, 
      rideId: req.params.id,
      userId: req.user?.id 
    });
    
    if (error.message?.includes('não encontrada') || 
        error.message?.includes('não está disponível') ||
        error.message?.includes('outro motorista')) {
      return res.status(409).json({
        success: false,
        error: error.message,
        code: 'CONFLICT'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * Recusar corrida
 * POST /api/v1/rides/:id/decline
 * 
 * Body: {
 *   "driver_id": "uuid",
 *   "reason": "string" (opcional)
 * }
 */
router.post('/:id/decline', async (req, res) => {
  try {
    const { id: rideId } = req.params;
    const { driver_id, reason } = req.body;
    
    // Validação de UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(rideId) || !uuidRegex.test(driver_id)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }
    
    const ride = await declineRide(rideId, driver_id, reason);
    
    res.status(200).json({
      success: true,
      data: ride,
      message: 'Corrida recusada'
    });
  } catch (error) {
    console.error('❌ Erro ao recusar corrida:', error);
    
    if (error.message?.includes('não encontrada') || 
        error.message?.includes('não pode')) {
      return res.status(409).json({
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
 * Iniciar corrida
 * POST /api/v1/rides/:id/start
 * 
 * Body: {
 *   "driver_id": "uuid"
 * }
 */
router.post('/:id/start', async (req, res) => {
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
    
    const ride = await startRide(rideId, driver_id);
    
    res.status(200).json({
      success: true,
      data: ride,
      message: 'Corrida iniciada'
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar corrida:', error);
    
    if (error.message?.includes('não pode ser iniciada') || 
        error.message?.includes('não encontrada')) {
      return res.status(409).json({
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
 * Finalizar corrida
 * POST /api/v1/rides/:id/finish
 * 
 * Body: {
 *   "driver_id": "uuid",
 *   "final_amount": number (opcional)
 * }
 */
router.post('/:id/finish', async (req, res) => {
  try {
    const { id: rideId } = req.params;
    const { driver_id, final_amount } = req.body;
    
    // Validação de UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(rideId) || !uuidRegex.test(driver_id)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }
    
    const ride = await completeRide(rideId, driver_id, final_amount);
    
    res.status(200).json({
      success: true,
      data: ride,
      message: 'Corrida finalizada com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao finalizar corrida:', error);
    
    if (error.message?.includes('não pode ser finalizada') || 
        error.message?.includes('não encontrada')) {
      return res.status(409).json({
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
 * Cancelar corrida
 * POST /api/v1/rides/:id/cancel
 * 
 * Body: {
 *   "user_id": "uuid",
 *   "reason": "string"
 * }
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id: rideId } = req.params;
    const { user_id, reason } = req.body;
    
    // Validação básica
    if (!user_id || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: user_id, reason'
      });
    }
    
    // Validação de UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(rideId) || !uuidRegex.test(user_id)) {
      return res.status(400).json({
        success: false,
        error: 'IDs inválidos'
      });
    }
    
    const ride = await cancelRide(rideId, user_id, reason);
    
    res.status(200).json({
      success: true,
      data: ride,
      message: 'Corrida cancelada'
    });
  } catch (error) {
    console.error('❌ Erro ao cancelar corrida:', error);
    
    if (error.message?.includes('não encontrada') || 
        error.message?.includes('não tem permissão') ||
        error.message?.includes('não pode ser cancelada')) {
      return res.status(409).json({
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
 * Buscar corrida por ID
 * GET /api/v1/rides/:id
 * SEGURANÇA: Validação de propriedade obrigatória
 */
router.get('/:id', validateRideOwnership, async (req, res) => {
  try {
    const { id: rideId } = req.params;
    
    // Usar dados da corrida já validados pelo middleware
    const ride = req.ride;
    
    // Buscar dados completos se necessário
    const fullRide = await getRideById(rideId, req.user.id);
    
    logger.info('📋 Corrida consultada:', {
      rideId,
      userId: req.user.id,
      userType: req.user.user_type
    });
    
    res.status(200).json({
      success: true,
      data: fullRide
    });
  } catch (error) {
    logger.error('❌ Erro ao buscar corrida:', { 
      error: error.message,
      rideId: req.params.id,
      userId: req.user?.id 
    });
    
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Corrida não encontrada',
        code: 'NOT_FOUND'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
