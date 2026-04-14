import rateLimit from 'express-rate-limit';

// Rate limiting for login attempts (by IP)
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Rate limiting for login attempts (by email — prevents brute force on a single account)
export const loginByEmailRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: 'Muitas tentativas para esta conta. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = (req.body?.email || '').toLowerCase().trim();
    return email || req.ip || 'unknown';
  },
});

// Rate limiting for password reset requests
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 reset requests per hour
  message: {
    success: false,
    error: 'Muitas solicitações de redefinição de senha. Tente novamente em 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for registration
export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: {
    success: false,
    error: 'Muitos cadastros realizados. Tente novamente em 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for elderly admin operations
export const elderlyAdminRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute for admin
  message: {
    success: false,
    error: 'Muitas operações administrativas. Tente novamente em 1 minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
