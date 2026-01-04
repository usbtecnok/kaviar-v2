import rateLimit from 'express-rate-limit';
import { config } from '../config';

// In-memory store for email-based rate limiting
const emailAttempts = new Map<string, { count: number; resetTime: number }>();

// Admin login rate limiting by IP
export const adminLoginRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.rateLimit?.adminLogin || 10, // 10 attempts per minute (configurable via ENV)
  message: {
    success: false,
    error: 'Muitas tentativas de login. Tente novamente em 1 minuto.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    // Log blocked attempt
    console.log(`🚫 Rate limit exceeded for admin login - IP: ${req.ip} - Time: ${new Date().toISOString()}`);
    
    res.status(429).json({
      success: false,
      error: 'Muitas tentativas de login. Tente novamente em 1 minuto.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 60
    });
  },
  skip: (req) => {
    // Skip rate limiting in test environment
    return process.env.NODE_ENV === 'test';
  }
});

// Email-based rate limiting middleware
export const emailRateLimit = (req: any, res: any, next: any) => {
  // Skip in test environment
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  const email = req.body?.email?.toLowerCase();
  if (!email) {
    return next();
  }

  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxAttempts = config.rateLimit?.adminLoginPerEmail || 5; // 5 attempts per email per minute

  // Clean expired entries
  for (const [key, value] of emailAttempts.entries()) {
    if (now > value.resetTime) {
      emailAttempts.delete(key);
    }
  }

  const emailData = emailAttempts.get(email);
  
  if (!emailData) {
    // First attempt for this email
    emailAttempts.set(email, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (now > emailData.resetTime) {
    // Window expired, reset
    emailAttempts.set(email, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (emailData.count >= maxAttempts) {
    // Rate limit exceeded for this email
    console.log(`🚫 Email rate limit exceeded - Email: ${email} - IP: ${req.ip} - Time: ${new Date().toISOString()}`);
    
    return res.status(429).json({
      success: false,
      error: 'Muitas tentativas de login. Tente novamente em 1 minuto.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 60
    });
  }

  // Increment attempt count
  emailData.count++;
  return next();
};
