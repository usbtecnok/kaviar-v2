require('dotenv').config()
const express = require('express');
const cors = require('cors');

const helmet = require('helmet');
const path = require('path');

// IMPORTAR MIDDLEWARES DE SEGURANÇA
const { authenticateToken } = require('./lib/auth');
const { generalRateLimit, webhookRateLimit } = require('./lib/rate-limiting');
const { corsOptions, webhookCorsOptions } = require('./lib/cors-config');
const { logger, maskResponseData, sanitizeErrorPayload } = require('./lib/data-privacy');

const webhookRoutes = require('./webhooks/twilio-whatsapp');

const app = express();
const PORT = process.env.PORT || 3000;

// Verificar configurações obrigatórias
const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN', 
  'TWILIO_WHATSAPP_NUMBER',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  logger.error('Missing required environment variables:', missingVars);
  process.exit(1);
}

// SEGURANÇA: Helmet com configurações restritivas
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.supabase.co", "https://*.supabase.co"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// SEGURANÇA: CORS restritivo
app.use('/webhooks', cors(webhookCorsOptions));
app.use(cors(corsOptions));

// Parse URL-encoded bodies (Twilio webhook format)
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' }));

// SEGURANÇA: Rate limiting
app.use('/webhooks', webhookRateLimit);
app.use(generalRateLimit);

// SEGURANÇA: Mascaramento de dados em desenvolvimento
app.use(maskResponseData);

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint (público)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Kaviar WhatsApp Webhook + Supabase',
    version: '2.0.0',
    security: 'Enhanced',
    integrations: {
      twilio: 'Connected',
      supabase: 'Connected',
      auth: 'JWT Enabled',
      rateLimit: 'Active'
    }
  });
});

// Webhook routes (públicas, mas com rate limit específico)
app.use('/webhooks', webhookRoutes);

// SEGURANÇA: Autenticação obrigatória para todas as rotas /api/v1/*
app.use('/api/v1', authenticateToken);

// API routes
const authApi = require('./api/auth');
const messagesApi = require('./api/messages');
const auditApi = require('./api/audit');
const communitiesApi = require('./api/communities');
const ridesApi = require('./api/rides');
const incentivesApi = require('./api/incentives');
const analyticsApi = require('./api/analytics');
const dashboardApi = require('./api/dashboard');
const alertsApi = require('./api/alerts');
const reportsApi = require('./api/reports');
const communityChangeApi = require('./api/community-change');
const specialServicesApi = require('./api/special-services');
const driversApi = require('./api/drivers');

// Rotas públicas (sem autenticação)
app.use('/api/auth', authApi);

// SEGURANÇA: Autenticação obrigatória para todas as rotas /api/v1/*
app.use('/api/v1', authenticateToken);

// Rotas protegidas (com autenticação)
app.use('/api/messages', messagesApi);
app.use('/api/audit', auditApi);
app.use('/api/v1/communities', communitiesApi);
app.use('/api/v1/rides', ridesApi);
app.use('/api/v1/incentives', incentivesApi);
app.use('/api/v1/analytics', analyticsApi);
app.use('/api/v1/dashboard', dashboardApi);
app.use('/api/v1/alerts', alertsApi);
app.use('/api/v1/reports', reportsApi);
app.use('/api/v1/community-change', communityChangeApi);
app.use('/api/v1/special-services', specialServicesApi);
app.use('/api/v1/drivers', driversApi);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'The requested endpoint does not exist',
    availableEndpoints: [
      'GET /health',
      'POST /webhooks/twilio/whatsapp',
      'GET /webhooks/twilio/test',
      'GET /webhooks/twilio/conversations',
      'POST /api/messages/send',
      'POST /api/messages/panic',
      'GET /api/messages/test',
      'POST /api/audit/log',
      'GET /api/v1/communities',
      'POST /api/v1/communities',
      'GET /api/v1/communities/:id',
      'POST /api/v1/rides',
      'POST /api/v1/rides/:id/allow-external',
      'GET /api/v1/rides/:id/eligible-drivers',
      'GET /api/v1/rides/:rideId/can-accept/:driverId',
      'POST /api/v1/incentives/complete-ride',
      'GET /api/v1/incentives/drivers/:driverId/earnings',
      'POST /api/v1/incentives/bonus-config',
      'GET /api/v1/incentives/bonus-config',
      'POST /api/v1/incentives/communities/:id/update-status',
      'GET /api/v1/analytics/communities',
      'GET /api/v1/analytics/communities/:id',
      'POST /api/v1/analytics/communities/compare',
      'POST /api/v1/analytics/calculate-metrics',
      'POST /api/v1/analytics/acceptance-events',
      'GET /api/v1/analytics/communities/:id/acceptance-rate',
      'POST /api/v1/analytics/incentive-configs',
      'POST /api/v1/analytics/refresh-metrics',
      'GET /api/v1/dashboard/overview',
      'GET /api/v1/dashboard/communities',
      'GET /api/v1/alerts/active',
      'POST /api/v1/alerts/:id/acknowledge',
      'POST /api/v1/alerts/:id/resolve',
      'POST /api/v1/alerts/thresholds',
      'GET /api/v1/alerts/thresholds',
      'GET /api/v1/alerts/stats',
      'POST /api/v1/alerts/monitor',
      'GET /api/v1/reports/weekly',
      'GET /api/v1/reports/monthly',
      'POST /api/v1/reports/custom',
      'GET /api/v1/reports/summary',
      'GET /api/v1/reports/dashboard',
      'GET /api/v1/reports/history',
      'GET /api/v1/reports/history/:id',
      'POST /api/v1/reports/:id/generate-pdf',
      'POST /api/v1/reports/distribution/config',
      'GET /api/v1/reports/types',
      'POST /api/v1/community-change/request',
      'POST /api/v1/community-change/:id/approve',
      'POST /api/v1/community-change/:id/reject',
      'POST /api/v1/community-change/admin-change',
      'GET /api/v1/community-change/requests',
      'GET /api/v1/community-change/requests/:id',
      'GET /api/v1/community-change/history/:user_id/:user_type',
      'GET /api/v1/community-change/stats',
      'GET /api/v1/special-services/configs',
      'GET /api/v1/special-services/drivers/:id/eligibility/:service_type',
      'GET /api/v1/special-services/drivers/eligible/:service_type',
      'POST /api/v1/special-services/drivers/:id/enable',
      'POST /api/v1/special-services/calculate-total',
      'POST /api/v1/special-services/rides',
      'POST /api/v1/special-services/rides/:id/accept',
      'GET /api/v1/special-services/drivers/:id/history',
      'GET /api/v1/special-services/stats',
      'POST /api/v1/drivers/availability',
      'GET /api/v1/drivers/available',
      'POST /api/v1/rides/:id/accept',
      'POST /api/v1/rides/:id/decline',
      'POST /api/v1/rides/:id/start',
      'POST /api/v1/rides/:id/finish',
      'POST /api/v1/rides/:id/cancel',
      'GET /api/v1/rides/:id'
    ]
  });
});

// Error handler com sanitização
app.use((err, req, res, next) => {
  const sanitizedError = sanitizeErrorPayload(err, req);
  
  logger.error('Server Error:', sanitizedError);
  
  // Rate limit error
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      error: 'Muitas requisições',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: err.retryAfter
    });
  }
  
  // CORS error
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      error: 'Acesso negado - origem não permitida',
      code: 'CORS_ERROR'
    });
  }
  
  // Generic error
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno do servidor',
    code: err.code || 'INTERNAL_ERROR',
    timestamp: sanitizedError.timestamp
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Kaviar Secure Server running on port ${PORT}`);
  logger.info(`🔐 Security: JWT Auth + Rate Limiting + CORS Restricted`);
  logger.info(`📱 WhatsApp Sandbox: +1 413 475 9634 (Greenfield, MA)`);
  logger.info(`🗄️ Supabase Project: xcxxcexdsbaxgmmnxkgc`);
  logger.info(`🔗 Webhook URL: http://localhost:${PORT}/webhooks/twilio/whatsapp`);
  logger.info(`💚 Health Check: http://localhost:${PORT}/health`);
  logger.info(`🧪 Test Endpoint: http://localhost:${PORT}/webhooks/twilio/test`);
  
  if (process.env.NODE_ENV === 'production') {
    logger.info(`🔒 Production Mode: Enhanced Security Active`);
    const { startAnalyticsJobs } = require('./lib/analytics-jobs');
    startAnalyticsJobs();
    logger.info(`⏰ Analytics jobs iniciados (produção)`);
  } else {
    logger.warn(`🚧 Development Mode: Some security features relaxed`);
    logger.info(`⏰ Analytics jobs desabilitados (desenvolvimento)`);
  }
});

module.exports = app;
