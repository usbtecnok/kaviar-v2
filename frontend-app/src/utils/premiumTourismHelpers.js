/**
 * Premium Tourism Helpers
 * Formatação, validação e utilitários
 */

// Formatação
export const formatPrice = (price) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
};

export const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
};

export const formatTourType = (type) => {
  const types = {
    'TOUR': 'Tour Turístico',
    'AIRPORT_TRANSFER': 'Transfer Aeroporto'
  };
  return types[type] || type;
};

// Status de Booking
export const getTourBookingStatusColor = (status) => {
  const colors = {
    'REQUESTED': 'warning',
    'CONFIRMED': 'info', 
    'COMPLETED': 'success',
    'CANCELLED': 'error'
  };
  return colors[status] || 'default';
};

export const getTourBookingStatusLabel = (status) => {
  const labels = {
    'REQUESTED': 'Solicitado',
    'CONFIRMED': 'Confirmado',
    'COMPLETED': 'Concluído', 
    'CANCELLED': 'Cancelado'
  };
  return labels[status] || status;
};

// Validação
export const validateTourPackage = (data) => {
  const errors = {};

  if (!data.title?.trim()) {
    errors.title = 'Título é obrigatório';
  }

  if (!data.description?.trim()) {
    errors.description = 'Descrição é obrigatória';
  }

  if (!data.type) {
    errors.type = 'Tipo é obrigatório';
  }

  if (!data.partnerName?.trim()) {
    errors.partnerName = 'Nome do parceiro é obrigatório';
  }

  if (!data.basePrice || data.basePrice <= 0) {
    errors.basePrice = 'Preço deve ser maior que zero';
  }

  if (!data.locations || data.locations.length === 0) {
    errors.locations = 'Pelo menos um local é obrigatório';
  }

  if (!data.estimatedDurationMinutes || data.estimatedDurationMinutes <= 0) {
    errors.estimatedDurationMinutes = 'Duração deve ser maior que zero';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Transições de Status Permitidas
export const getValidStatusTransitions = (currentStatus) => {
  const transitions = {
    'REQUESTED': ['CONFIRMED', 'CANCELLED'],
    'CONFIRMED': ['COMPLETED', 'CANCELLED'],
    'CANCELLED': [], // Final
    'COMPLETED': []  // Final
  };
  
  return transitions[currentStatus] || [];
};

export const canTransitionTo = (from, to) => {
  return getValidStatusTransitions(from).includes(to);
};

// Mensagens de Erro
export const ERROR_MESSAGES = {
  FEATURE_DISABLED: 'Funcionalidade Premium Tourism não está habilitada',
  VALIDATION_ERROR: 'Dados inválidos. Verifique os campos obrigatórios',
  NETWORK_ERROR: 'Erro de conexão. Tente novamente',
  UNAUTHORIZED: 'Acesso negado. Faça login novamente',
  NOT_FOUND: 'Recurso não encontrado',
  SERVER_ERROR: 'Erro interno. Contate o suporte',
  INVALID_STATUS_TRANSITION: 'Transição de status inválida'
};
