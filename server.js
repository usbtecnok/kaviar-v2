require('dotenv').config()
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const webhookRoutes = require('./webhooks/twilio-whatsapp');

const app = express();
const PORT = process.env.PORT || 3000;

// Verificar configurações obrigatórias
const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN', 
  'TWILIO_WHATSAPP_NUMBER',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  console.error('Please check your .env file');
  process.exit(1);
}

// Security middleware
app.use(helmet());
app.use(cors());

// Parse URL-encoded bodies (Twilio webhook format)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Kaviar WhatsApp Webhook + Supabase',
    version: '2.0.0',
    integrations: {
      twilio: 'Connected',
      supabase: 'Connected'
    }
  });
});

// Webhook routes
app.use('/webhooks', webhookRoutes);

// API routes
const messagesApi = require('./api/messages');
const auditApi = require('./api/audit');
app.use('/api/messages', messagesApi);
app.use('/api/audit', auditApi);

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
      'POST /api/audit/log'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Kaviar WhatsApp + Supabase Server running on port ${PORT}`);
  console.log(`📱 WhatsApp Sandbox: +1 413 475 9634 (Greenfield, MA)`);
  console.log(`🗄️ Supabase Project: xcxxcexdsbaxgmmnxkgc`);
  console.log(`🔗 Webhook URL: http://localhost:${PORT}/webhooks/twilio/whatsapp`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test Endpoint: http://localhost:${PORT}/webhooks/twilio/test`);
  console.log(`⚙️ Console Twilio: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox`);
  console.log(`📊 Supabase Dashboard: https://supabase.com/dashboard/project/xcxxcexdsbaxgmmnxkgc`);
});

module.exports = app;
