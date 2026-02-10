import express from 'express';
import path from 'path';
import { config } from './config';
import { getUploadsPaths } from './config/uploads';
import { errorHandler, notFound } from './middlewares/error';
import { handleFeatureDisabledError, handleStatusTransitionError } from './middlewares/premium-tourism-flag';
import { prisma } from './lib/prisma';
import investorView from './middleware/investorView';

// Core routes (always enabled)
import { authRoutes } from './routes/auth';
import { passwordResetRoutes } from './routes/password-reset';
import { adminRoutes } from './routes/admin';
import complianceRoutes from './routes/compliance';
import dashboardRoutes from './routes/dashboard';
import matchRoutes from './routes/match';
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
import communityLeadersRoutes from './routes/community-leaders';
import feeCalculationRoutes from './routes/fee-calculation';
import driverDashboardRoutes from './routes/driver-dashboard';
import notificationsRoutes from './routes/notifications';
import passengerLocationsRoutes from './routes/passenger-locations';
import passengerFavoritesRoutes from './routes/passenger-favorites';
import passengerOnboardingRoutes from './routes/passenger-onboarding';
import neighborhoodStatsRoutes from './routes/neighborhood-stats';
import { rolloutRoutes } from './routes/rollout-temp';
import passengerProfileRoutes from './routes/passenger-profile';
import driverEarningsRoutes from './routes/driver-earnings';
import adminAuditRoutes from './routes/admin-audit';
import passengerRidesRoutes from './routes/passenger-rides';
import driverAvailabilityRoutes from './routes/driver-availability';
import adminDashboardMetricsRoutes from './routes/admin-dashboard-metrics';
import neighborhoodsSmartRoutes from './routes/neighborhoods-smart';
import driverTerritoryRoutes from './routes/driver-territory';

const app = express();

// ✅ Trust proxy (ALB)
app.set('trust proxy', 1);

// ✅ CORS - Manual headers BEFORE any middleware
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  console.log(`🔍 CORS middleware: ${req.method} ${req.path} | Origin: ${origin}`);

  const allowedOrigins = new Set([
    'https://app.kaviar.com.br',
    'https://kaviar.com.br',
    'https://www.kaviar.com.br',
    'https://d29p7cirgjqbxl.cloudfront.net',
    'http://localhost:5173',
  ]);

  // ✅ evita cache/proxy devolver preflight errado sem ACAO
  res.header('Vary', 'Origin');
  console.log(`📤 Set Vary: Origin`);

  if (origin && allowedOrigins.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    console.log(`✅ Set Access-Control-Allow-Origin: ${origin}`);
  } else {
    console.log(`❌ Origin not allowed: ${origin}`);
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.header('Access-Control-Max-Age', '600');

  if (req.method === 'OPTIONS') {
    console.log(`🔚 Responding to OPTIONS with 204`);
    return res.status(204).send('');
  }

  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Core health check (always available)
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'KAVIAR API' });
});

app.get('/api/health', async (req, res) => {
  const startTime = Date.now();
  const checks: any = { database: false, s3: false };

  try {
    // Database check
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (e) {
    checks.database = false;
  }

  // S3 check (basic - just verify env var exists)
  checks.s3 = !!process.env.AWS_S3_BUCKET;

  const responseTime = Date.now() - startTime;
  const healthy = checks.database && checks.s3;

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    status: healthy ? 'healthy' : 'degraded',
    message: 'KAVIAR Backend',
    version: process.env.GIT_COMMIT || 'unknown',
    uptime: process.uptime(),
    responseTime,
    checks,
    features: {
      twilio_whatsapp: config.integrations.enableTwilioWhatsapp,
      premium_tourism: config.premiumTourism.enablePremiumTourism,
      legacy: config.legacy.enableLegacy
    },
    timestamp: new Date().toISOString(),
  });
});

// Core routes (always enabled)
console.log('📍 Mounting core routes...');
app.use('/api/admin/auth', authRoutes);
app.use('/api/admin/auth', passwordResetRoutes);

// Investor invites (SUPER_ADMIN only, before investorView middleware)
import investorInvitesRoutes from './routes/investor-invites';
app.use('/api/admin/investors', investorInvitesRoutes);

// Demo Mode / Investor View Middleware (read-only)
app.use('/api', investorView);

app.use('/api/admin/dashboard', dashboardRoutes); // ✅ Dashboard overview
app.use('/api/match', matchRoutes); // ✅ Territorial match system
app.use('/api/admin', adminApprovalRoutes); // ✅ FONTE ÚNICA: drivers
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminDriversRoutes); // ✅ Driver details + documents
app.use('/api/admin/dashboard', adminDashboardMetricsRoutes); // ✅ Real-time metrics
app.use('/api/admin/community-leaders', communityLeadersRoutes); // ✅ Community leaders management
app.use('/api', complianceRoutes); // ✅ Compliance routes (driver + admin)
app.use('/api/ratings', ratingsRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/drivers', driverDashboardRoutes); // ✅ Driver dashboard
app.use('/api/drivers', driverTerritoryRoutes); // ✅ Territory & badges
app.use('/api/drivers', notificationsRoutes); // ✅ Notifications
app.use('/api/drivers', driverEarningsRoutes); // ✅ Earnings report
app.use('/api/drivers', driverAvailabilityRoutes); // ✅ Availability toggle
app.use('/api/neighborhoods', neighborhoodsSmartRoutes); // ✅ Smart neighborhood list
app.use('/api/passengers', passengerLocationsRoutes); // ✅ Frequent locations
app.use('/api/passengers', passengerProfileRoutes); // ✅ Profile management
app.use('/api/passenger', passengerFavoritesRoutes); // ✅ Favorite locations (beta)
app.use('/api/passenger/onboarding', passengerOnboardingRoutes); // ✅ GPS-first onboarding
app.use('/api/trips', feeCalculationRoutes); // ✅ Fee calculation system
app.use('/api', neighborhoodStatsRoutes); // ✅ Neighborhood stats & ranking
app.use('/api/drivers', driverEarningsRoutes); // ✅ Earnings report
app.use('/api/drivers', driverAvailabilityRoutes); // ✅ Availability toggle
app.use('/api/rides', passengerRidesRoutes); // ✅ Passenger ride actions
app.use('/api/admin', adminAuditRoutes); // ✅ Audit logs
app.use('/api/temp', rolloutRoutes); // 🔧 TEMPORARY - Phase 2 rollout
console.log('✅ Core routes mounted:');
console.log('   - /api/admin/auth/*');
console.log('   - /api/admin/dashboard/* (overview)');
console.log('   - /api/match/* (territorial match system)');
console.log('   - /api/admin/drivers/* (approval + details + documents)');
console.log('   - /api/admin/compliance/* (documents pending/expiring/approve/reject)');
console.log('   - /api/drivers/me/compliance/* (driver compliance)');
console.log('   - /api/drivers/*');
console.log('   - /api/drivers/:id/dashboard (driver stats)');
console.log('   - /api/ratings/*');
console.log('   - /api/trips/* (fee calculation)');
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

// ✅ Serve uploaded files (must be BEFORE 404 handler)
const { uploadsBaseDir } = getUploadsPaths();
app.use('/uploads', express.static(uploadsBaseDir));
console.log(`✅ Static files: /uploads -> ${uploadsBaseDir}`);

// ✅ S3 presigned URL endpoint (fallback for files not found locally)
import { getPresignedUrl, extractS3Key } from './config/s3-upload';

app.get('/uploads/*', async (req, res, next) => {
  try {
    const key = req.path.replace('/uploads/', '');
    
    // Check if file exists in S3
    const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
    const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-2' });
    
    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key
      }));
      
      // File exists in S3, generate presigned URL
      const presignedUrl = await getPresignedUrl(key);
      return res.redirect(presignedUrl);
    } catch (s3Error: any) {
      if (s3Error.name === 'NotFound') {
        // File not in S3, return 404 with helpful message
        return res.status(404).json({
          success: false,
          error: 'Arquivo não encontrado',
          message: 'Este documento foi enviado antes da migração para S3 e não está mais disponível. Por favor, solicite ao motorista que faça upload novamente.',
          key
        });
      }
      throw s3Error;
    }
  } catch (error) {
    next();
  }
});

// Error handling
app.use(notFound);
app.use(handleFeatureDisabledError);
app.use(handleStatusTransitionError);
app.use(errorHandler);

export default app;

// ci: trigger backend deploy
