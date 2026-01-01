/**
 * UTILITÁRIOS PARA MASCARAMENTO DE DADOS SENSÍVEIS (LGPD)
 */

/**
 * Mascarar número de telefone
 * +5511999999999 → +5511*****9999
 */
function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return phone;
  
  // Padrão brasileiro: +55XXYYYYYYYY
  if (phone.match(/^\+55\d{11}$/)) {
    return phone.replace(/(\+55\d{2})\d{5}(\d{4})/, '$1*****$2');
  }
  
  // Padrão internacional genérico
  if (phone.match(/^\+\d{7,15}$/)) {
    const start = phone.substring(0, 4);
    const end = phone.substring(phone.length - 3);
    const middle = '*'.repeat(phone.length - 7);
    return start + middle + end;
  }
  
  return phone;
}

/**
 * Mascarar email
 * usuario@exemplo.com → us****@exemplo.com
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return email;
  
  const [local, domain] = email.split('@');
  if (local.length <= 2) return email;
  
  const maskedLocal = local.substring(0, 2) + '*'.repeat(local.length - 2);
  return `${maskedLocal}@${domain}`;
}

/**
 * Mascarar localização
 * "Rua das Flores, 123, São Paulo" → "Rua das Flores, ***, São Paulo"
 */
function maskLocation(location) {
  if (!location || typeof location !== 'string') return location;
  
  // Mascarar números (possíveis endereços)
  return location.replace(/\d+/g, '***');
}

/**
 * Mascarar coordenadas GPS
 * { lat: -23.5505, lng: -46.6333 } → { lat: "***", lng: "***" }
 */
function maskCoordinates(coords) {
  if (!coords || typeof coords !== 'object') return coords;
  
  const masked = { ...coords };
  if (masked.lat) masked.lat = '***';
  if (masked.lng) masked.lng = '***';
  if (masked.latitude) masked.latitude = '***';
  if (masked.longitude) masked.longitude = '***';
  
  return masked;
}

/**
 * Mascarar dados sensíveis em objeto completo
 */
function maskSensitiveData(data) {
  if (!data || typeof data !== 'object') return data;
  
  const masked = { ...data };
  
  // Mascarar campos conhecidos
  if (masked.phone) masked.phone = maskPhone(masked.phone);
  if (masked.email) masked.email = maskEmail(masked.email);
  if (masked.pickup_location) masked.pickup_location = maskLocation(masked.pickup_location);
  if (masked.destination) masked.destination = maskLocation(masked.destination);
  if (masked.destination_location) masked.destination_location = maskLocation(masked.destination_location);
  
  // Mascarar coordenadas
  if (masked.coordinates) masked.coordinates = maskCoordinates(masked.coordinates);
  if (masked.location) masked.location = maskCoordinates(masked.location);
  
  // Mascarar arrays de objetos
  Object.keys(masked).forEach(key => {
    if (Array.isArray(masked[key])) {
      masked[key] = masked[key].map(item => 
        typeof item === 'object' ? maskSensitiveData(item) : item
      );
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskSensitiveData(masked[key]);
    }
  });
  
  return masked;
}

/**
 * Logger seguro que mascara dados automaticamente
 */
function secureLog(level, message, data = null) {
  const timestamp = new Date().toISOString();
  
  if (data) {
    const maskedData = maskSensitiveData(data);
    console[level](`[${timestamp}] ${message}`, maskedData);
  } else {
    console[level](`[${timestamp}] ${message}`);
  }
}

/**
 * Wrapper para console.log seguro
 */
const logger = {
  info: (message, data) => secureLog('log', `ℹ️ ${message}`, data),
  error: (message, data) => secureLog('error', `❌ ${message}`, data),
  warn: (message, data) => secureLog('warn', `⚠️ ${message}`, data),
  debug: (message, data) => {
    if (process.env.NODE_ENV === 'development') {
      secureLog('log', `🐛 ${message}`, data);
    }
  }
};

/**
 * Middleware para mascarar dados em responses (desenvolvimento)
 */
function maskResponseData(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    return next();
  }
  
  const originalSend = res.send;
  
  res.send = function(data) {
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        const masked = maskSensitiveData(parsed);
        logger.debug('API Response:', masked);
      } catch (e) {
        // Não é JSON, ignorar
      }
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}

/**
 * Remover campos sensíveis de payloads de erro
 */
function sanitizeErrorPayload(error, req) {
  const sanitized = {
    message: error.message,
    code: error.code,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };
  
  // NÃO incluir stack trace em produção
  if (process.env.NODE_ENV === 'development') {
    sanitized.stack = error.stack;
  }
  
  return sanitized;
}

module.exports = {
  maskPhone,
  maskEmail,
  maskLocation,
  maskCoordinates,
  maskSensitiveData,
  logger,
  maskResponseData,
  sanitizeErrorPayload
};
