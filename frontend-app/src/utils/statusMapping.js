// Status mapping utility for backward compatibility
// Ensures FASES 1-6 remain functional with new status system

export const STATUS_MAPPING = {
  // Legacy → New mapping
  'in_progress': 'started',
  'driver_assigned': 'accepted',
  'cancelled': 'cancelled_by_admin',
  'canceled': 'cancelled_by_admin',
  
  // Reverse mapping for display
  'started': 'in_progress',
  'cancelled_by_admin': 'cancelled',
  'cancelled_by_user': 'cancelled',
  'cancelled_by_driver': 'cancelled'
};

export const STATUS_LABELS = {
  // All possible status with labels
  'requested': 'Solicitada',
  'accepted': 'Aceita',
  'driver_assigned': 'Aceita', // Fallback
  'arrived': 'Motorista chegou',
  'started': 'Em andamento',
  'in_progress': 'Em andamento', // Fallback
  'completed': 'Concluída',
  'paid': 'Paga',
  'cancelled_by_user': 'Cancelada',
  'cancelled_by_driver': 'Cancelada',
  'cancelled_by_admin': 'Cancelada',
  'cancelled': 'Cancelada', // Fallback
  'canceled': 'Cancelada' // Fallback
};

export const STATUS_COLORS = {
  'requested': 'warning',
  'accepted': 'info',
  'driver_assigned': 'info', // Fallback
  'arrived': 'primary',
  'started': 'secondary',
  'in_progress': 'secondary', // Fallback
  'completed': 'success',
  'paid': 'success',
  'cancelled_by_user': 'error',
  'cancelled_by_driver': 'error',
  'cancelled_by_admin': 'error',
  'cancelled': 'error', // Fallback
  'canceled': 'error' // Fallback
};

// Utility functions
export const mapLegacyStatus = (status) => {
  return STATUS_MAPPING[status] || status;
};

export const getStatusLabel = (status) => {
  return STATUS_LABELS[status] || status;
};

export const getStatusColor = (status) => {
  return STATUS_COLORS[status] || 'default';
};

// For backward compatibility with FASES 1-6
export const normalizeStatusForDisplay = (status) => {
  // Convert new status back to legacy for existing UI components
  const reverseMapping = {
    'started': 'in_progress',
    'cancelled_by_admin': 'cancelled',
    'cancelled_by_user': 'cancelled',
    'cancelled_by_driver': 'cancelled'
  };
  
  return reverseMapping[status] || status;
};
