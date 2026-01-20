import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler, notFound } from './middlewares/error';
import { handleFeatureDisabledError, handleStatusTransitionError } from './middlewares/premium-tourism-flag';

// Core routes (always enabled)
import { authRoutes } from './routes/auth';
import { adminRoutes } from './routes/admin';
import complianceRoutes from './routes/compliance';
// import { adminManagementRoutes } from './routes/admin-management'; // DISABLED - legacy
// import { elderlyRoutes } from './routes/elderly'; // DISABLED - legacy
// import { governanceRoutes } from './routes/governance'; // DISABLED - legacy
// import { userAuthRoutes } from './routes/user-auth'; // DISABLED - legacy
// import { passwordResetRoutes } from './routes/password-reset'; // DISABLED - legacy

// Feature-based routes
import { integrationsRoutes } from './routes/integrations';
import { premiumTourismRoutes } from './routes/premium-tourism';
import { legacyRoutes } from './routes/legacy';
import geoRoutes from './routes/geo';
// import adminGeofenceRoutes from './routes/admin-geofence';
import ridesRoutes from './routes/rides';
import { governanceRoutes } from './routes/governance';
import { passengerAuthRoutes } from './routes/passenger-auth';
import { driverAuthRoutes } from './routes/driver-auth';
import { guideAuthRoutes } from './routes/guide-auth';
import { adminApprovalRoutes } from './routes/admin-approval';
import { ratingsRoutes } from './routes/ratings';
import driversRoutes from './routes/drivers';
import adminDriversRoutes from './routes/admin-drivers';

const app = express();

// ✅ Trust proxy (Render/production)
app.set('trust proxy', 1);

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
    gitCommit: process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || 'unknown',
    features,
    timestamp: new Date().toISOString(),
  });
});

// Core routes (always enabled)
console.log('📍 Mounting core routes...');
app.use('/api/admin/auth', authRoutes);
app.use('/api/admin', adminApprovalRoutes); // ✅ FONTE ÚNICA: drivers
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminDriversRoutes); // ✅ Driver details + documents
app.use('/api', complianceRoutes); // ✅ Compliance routes (driver + admin)
app.use('/api/ratings', ratingsRoutes);
app.use('/api/drivers', driversRoutes);
console.log('✅ Core routes mounted: /api/admin/*, /api/drivers/*, /api/ratings/*, /api/compliance/*');
// app.use('/api/auth', userAuthRoutes); // DISABLED - legacy
// app.use('/api/auth', passwordResetRoutes); // DISABLED - legacy

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
// app.use('/api/admin', adminRoutes); // DISABLED - legacy
// app.use('/api/admin', adminManagementRoutes); // DISABLED - legacy
// app.use('/api/admin/elderly', elderlyRoutes); // DISABLED - legacy
// app.use('/api/governance', governanceRoutes); // DISABLED - legacy

// Geo routes
app.use('/api/geo', geoRoutes);
// app.use('/api/admin/geofence', adminGeofenceRoutes); // DISABLED - legacy geofence routes
app.use('/api/rides', ridesRoutes);
app.use('/api/governance', governanceRoutes);
app.use('/api/auth', passengerAuthRoutes);
app.use('/api/auth', driverAuthRoutes);
app.use('/api/auth', guideAuthRoutes);
console.log('✅ Geo: /api/geo/*, /api/rides/*, /api/governance/*, /api/auth/*');

console.log('✅ Core: Pricing & Rides enabled, legacy routes disabled');

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
