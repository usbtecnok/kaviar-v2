const rateLimit = require('express-rate-limit');

/**
 * RATE LIMITING GERAL
 * 100 requisições por IP a cada 15 minutos
 */
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    success: false,
    error: 'Muitas requisições. Tente novamente em 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Retorna rate limit info nos headers
  legacyHeaders: false,
  // Não aplicar rate limit para rotas de webhook
  skip: (req) => {
    return req.path.startsWith('/webhooks/');
  }
});

/**
 * RATE LIMITING PARA LOGIN
 * 5 tentativas a cada 15 minutos
 */
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas de login por IP
  message: {
    success: false,
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Aplicar apenas em rotas de login
  skipSuccessfulRequests: true // Não contar requests bem-sucedidos
});

/**
 * RATE LIMITING PARA CRIAÇÃO DE CORRIDAS
 * 20 corridas por usuário a cada hora
 */
const rideCreationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // máximo 20 corridas por IP por hora
  message: {
    success: false,
    error: 'Limite de criação de corridas excedido. Tente novamente em 1 hora.',
    code: 'RIDE_CREATION_LIMIT_EXCEEDED',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * RATE LIMITING PARA WEBHOOKS TWILIO
 * Mais permissivo para não bloquear mensagens legítimas
 */
const webhookRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // máximo 100 webhooks por IP por minuto
  message: {
    success: false,
    error: 'Webhook rate limit exceeded',
    code: 'WEBHOOK_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: false, // Não expor headers para webhooks
  legacyHeaders: false
});

module.exports = {
  generalRateLimit,
  loginRateLimit,
  rideCreationRateLimit,
  webhookRateLimit
};
