/**
 * VALIDADORES E WHITELISTS PARA PREVENÇÃO DE MASS ASSIGNMENT
 */

/**
 * Whitelist para criação de corridas
 * APENAS estes campos são aceitos do cliente
 */
const RIDE_CREATION_WHITELIST = [
  'passenger_id',
  'pickup_location',
  'destination',
  'service_type',
  'service_notes',
  'base_amount'
];

/**
 * Whitelist para atualização de motorista
 */
const DRIVER_UPDATE_WHITELIST = [
  'is_available'
];

/**
 * Whitelist para solicitação de mudança de comunidade
 */
const COMMUNITY_CHANGE_WHITELIST = [
  'user_id',
  'user_type',
  'requested_community_id',
  'reason',
  'document_url'
];

/**
 * Campos que NUNCA devem ser aceitos do cliente
 * (devem ser calculados/definidos pelo backend)
 */
const FORBIDDEN_FIELDS = [
  'id',
  'created_at',
  'updated_at',
  'status',
  'driver_id',
  'community_id',
  'allow_external_drivers', // CRÍTICO: não pode ser manipulado pelo cliente
  'total_amount',
  'is_admin',
  'user_type',
  'is_active'
];

/**
 * Filtrar objeto usando whitelist
 */
function filterByWhitelist(data, whitelist) {
  if (!data || typeof data !== 'object') return {};
  
  const filtered = {};
  
  whitelist.forEach(field => {
    if (data.hasOwnProperty(field) && data[field] !== undefined) {
      filtered[field] = data[field];
    }
  });
  
  return filtered;
}

/**
 * Remover campos proibidos
 */
function removeForbiddenFields(data) {
  if (!data || typeof data !== 'object') return data;
  
  const cleaned = { ...data };
  
  FORBIDDEN_FIELDS.forEach(field => {
    delete cleaned[field];
  });
  
  return cleaned;
}

/**
 * Validar e sanitizar dados de criação de corrida
 */
function validateRideCreation(requestBody) {
  // Aplicar whitelist
  const filtered = filterByWhitelist(requestBody, RIDE_CREATION_WHITELIST);
  
  // Validações obrigatórias
  const errors = [];
  
  if (!filtered.passenger_id) {
    errors.push('passenger_id é obrigatório');
  }
  
  if (!filtered.pickup_location || filtered.pickup_location.trim().length < 3) {
    errors.push('pickup_location deve ter pelo menos 3 caracteres');
  }
  
  if (!filtered.destination || filtered.destination.trim().length < 3) {
    errors.push('destination deve ter pelo menos 3 caracteres');
  }
  
  // Validar service_type
  const validServiceTypes = [
    'STANDARD_RIDE', 'COMMUNITY_RIDE', 'TOUR_GUIDE',
    'ELDERLY_ASSISTANCE', 'SPECIAL_ASSISTANCE', 'COMMUNITY_SERVICE'
  ];
  
  if (filtered.service_type && !validServiceTypes.includes(filtered.service_type)) {
    errors.push('service_type inválido');
  }
  
  // Validar UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (filtered.passenger_id && !uuidRegex.test(filtered.passenger_id)) {
    errors.push('passenger_id deve ser um UUID válido');
  }
  
  // Validar base_amount se fornecido
  if (filtered.base_amount !== undefined) {
    const amount = parseFloat(filtered.base_amount);
    if (isNaN(amount) || amount < 0) {
      errors.push('base_amount deve ser um número positivo');
    }
    filtered.base_amount = amount;
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: filtered
  };
}

/**
 * Validar dados de atualização de motorista
 */
function validateDriverUpdate(requestBody) {
  const filtered = filterByWhitelist(requestBody, DRIVER_UPDATE_WHITELIST);
  const errors = [];
  
  if (filtered.is_available !== undefined && typeof filtered.is_available !== 'boolean') {
    errors.push('is_available deve ser boolean');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: filtered
  };
}

/**
 * Validar solicitação de mudança de comunidade
 */
function validateCommunityChangeRequest(requestBody) {
  const filtered = filterByWhitelist(requestBody, COMMUNITY_CHANGE_WHITELIST);
  const errors = [];
  
  // Validações obrigatórias
  if (!filtered.user_id) errors.push('user_id é obrigatório');
  if (!filtered.user_type) errors.push('user_type é obrigatório');
  if (!filtered.requested_community_id) errors.push('requested_community_id é obrigatório');
  if (!filtered.reason || filtered.reason.trim().length < 10) {
    errors.push('reason deve ter pelo menos 10 caracteres');
  }
  
  // Validar user_type
  if (filtered.user_type && !['driver', 'passenger'].includes(filtered.user_type)) {
    errors.push('user_type deve ser driver ou passenger');
  }
  
  // Validar UUIDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (filtered.user_id && !uuidRegex.test(filtered.user_id)) {
    errors.push('user_id deve ser um UUID válido');
  }
  if (filtered.requested_community_id && !uuidRegex.test(filtered.requested_community_id)) {
    errors.push('requested_community_id deve ser um UUID válido');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: filtered
  };
}

/**
 * Middleware para validação automática baseada na rota
 */
function validateRequest(validationType) {
  return (req, res, next) => {
    let validation;
    
    switch (validationType) {
      case 'ride_creation':
        validation = validateRideCreation(req.body);
        break;
      case 'driver_update':
        validation = validateDriverUpdate(req.body);
        break;
      case 'community_change':
        validation = validateCommunityChangeRequest(req.body);
        break;
      default:
        return next();
    }
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: validation.errors,
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Substituir req.body pelos dados validados e filtrados
    req.body = validation.data;
    next();
  };
}

module.exports = {
  RIDE_CREATION_WHITELIST,
  DRIVER_UPDATE_WHITELIST,
  COMMUNITY_CHANGE_WHITELIST,
  FORBIDDEN_FIELDS,
  filterByWhitelist,
  removeForbiddenFields,
  validateRideCreation,
  validateDriverUpdate,
  validateCommunityChangeRequest,
  validateRequest
};
