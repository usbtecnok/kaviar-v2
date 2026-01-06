import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler, notFound } from './middlewares/error';
import { handleFeatureDisabledError, handleStatusTransitionError } from './middlewares/premium-tourism-flag';

// Core routes (always enabled)
import { authRoutes } from './routes/auth';
import { adminRoutes } from './routes/admin';
import { adminManagementRoutes } from './routes/admin-management';
import { elderlyRoutes } from './routes/elderly';
import { governanceRoutes } from './routes/governance';
import { userAuthRoutes } from './routes/user-auth';
import { passwordResetRoutes } from './routes/password-reset';

// Feature-based routes
import { integrationsRoutes } from './routes/integrations';
import { premiumTourismRoutes } from './routes/premium-tourism';
import { legacyRoutes } from './routes/legacy';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    'https://kaviar-frontend.onrender.com',
    'http://localhost:5173',  // Vite dev
    'http://localhost:4173',  // Vite preview
    'http://localhost:3000'   // Legacy (manter por enquanto)
  ],
  credentials: true,
  allowedHeaders: ['Authorization', 'Content-Type'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));
app.options("*", cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Core health check (always available)
app.get('/api/health', (req, res) => {
  const features = {
    twilio_whatsapp: config.integrations.enableTwilioWhatsapp,
    premium_tourism: config.premiumTourism.enablePremiumTourism,
    legacy: config.legacy.enableLegacy
  };

  res.json({
    success: true,
    message: 'KAVIAR Backend is running',
    features,
    timestamp: new Date().toISOString(),
  });
});

// Core routes (always enabled)
app.use('/api/admin/auth', authRoutes);
app.use('/api/auth', userAuthRoutes);
app.use('/api/auth', passwordResetRoutes);

// Feature-based route mounting with logging
console.log('🚀 Mounting routes based on feature flags:');

// Integrations (Twilio/WhatsApp) - Default ON
if (config.integrations.enableTwilioWhatsapp) {
  app.use('/webhooks', integrationsRoutes);
  console.log('✅ Integrations: /webhooks/* (Twilio WhatsApp)');
} else {
  console.log('❌ Integrations: DISABLED');
}

// Premium Tourism
if (config.premiumTourism.enablePremiumTourism) {
  app.use('/api', premiumTourismRoutes);
  console.log('✅ Premium Tourism: /api/admin/tour-*, /api/governance/tour-*');
} else {
  console.log('❌ Premium Tourism: DISABLED');
}

// Legacy APIs
if (config.legacy.enableLegacy) {
  app.use('/api/legacy', legacyRoutes);
  console.log('✅ Legacy: /api/legacy/* (Admin auth required)');
} else {
  console.log('❌ Legacy: DISABLED');
}

// Core admin/governance routes (filtered by feature flags internally)
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminManagementRoutes);
app.use('/api/admin/elderly', elderlyRoutes);
app.use('/api/governance', governanceRoutes);
console.log('✅ Core: /api/admin/*, /api/governance/* (filtered internally)');

// Feature disabled handler for disabled routes
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.path}`);
  
  if (req.path.startsWith('/api/legacy') && !config.legacy.enableLegacy) {
    return res.status(404).json({
      error: 'FEATURE_DISABLED',
      feature: 'LEGACY'
    });
  }
  
  if (req.path.startsWith('/webhooks') && !config.integrations.enableTwilioWhatsapp) {
    return res.status(404).json({
      error: 'FEATURE_DISABLED',
      feature: 'TWILIO_WHATSAPP'
    });
  }
  
  next();
});

// Error handling
app.use(notFound);
app.use(handleFeatureDisabledError);
app.use(handleStatusTransitionError);
app.use(errorHandler);

export default app;
