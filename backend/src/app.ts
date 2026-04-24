import express from 'express';
import path from 'path';
import { config } from './config';
import { getUploadsPaths } from './config/uploads';
import { errorHandler, notFound } from './middlewares/error';
import { handleFeatureDisabledError, handleStatusTransitionError } from './middlewares/premium-tourism-flag';
import { prisma } from './lib/prisma';
import investorView from './middlewares/investorView';
import { requestIdMiddleware } from './middlewares/request-id';
import { structuredLogger } from './middlewares/structured-logger';

// Core routes (always enabled)
import { authRoutes } from './routes/auth';
import { passwordResetRoutes } from './routes/password-reset';
import { phoneAuthRoutes } from './routes/phone-auth';
import { adminRoutes } from './routes/admin';
import complianceRoutes from './routes/compliance';
import dashboardRoutes from './routes/dashboard';
import matchRoutes from './routes/match';

// Feature-based routes
import { integrationsRoutes } from './routes/integrations';
import { premiumTourismRoutes } from './routes/premium-tourism';
import geoRoutes from './routes/geo';
// v1 rides routes removed — all traffic uses /api/v2/rides
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
import driverOnboardingRoutes from './routes/driver-onboarding';
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
import { publicRoutes } from './routes/public';
import adminPresignRoutes from './routes/admin-presign';
import consultantLeadsRoutes from './routes/consultant-leads';
import adminStaffRoutes from './routes/admin-staff';
import adminWhatsappRoutes from './routes/admin-whatsapp';
import adminOperationsRoutes from './routes/admin-operations';
import adminReferralRoutes from './routes/admin-referrals';
import ridesV2Routes from './routes/rides-v2';
import driversV2Routes from './routes/drivers-v2';
import realtimeRoutes from './routes/realtime';

const app = express();

// ✅ Trust proxy (ALB)
app.set('trust proxy', 1);

// ✅ Request ID (primeiro middleware)
app.use(requestIdMiddleware);

// ✅ Structured logging (segundo middleware)
app.use(structuredLogger);

// CORS
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;

  const allowedOrigins = new Set([
    'https://app.kaviar.com.br',
    'https://kaviar.com.br',
    'https://www.kaviar.com.br',
    'https://d29p7cirgjqbxl.cloudfront.net',
    ...(process.env.NODE_ENV !== 'production' ? [
      'http://localhost:5173',
      'http://localhost:4173',
      'http://localhost:4174',
    ] : []),
  ]);

  res.header('Vary', 'Origin');

  // Healthcheck ALB e requests server-to-server (sem Origin)
  if (!origin) {
    return next();
  }

  if (allowedOrigins.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    return res.status(403).json({ success: false, error: 'CORS origin not allowed' });
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.header('Access-Control-Max-Age', '600');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting (in-memory, no Redis needed)
import rateLimit from 'express-rate-limit';
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many attempts, try again later' } });
const publicLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'Too many requests' } });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, message: { error: 'Rate limit exceeded' } });
app.use('/api/admin/auth', authLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/public', publicLimiter);
app.use('/api', apiLimiter);

// Core health check (always available)
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'KAVIAR API' });
});

// Debug endpoint (DEV only) - force error for testing
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/_debug/error', (req, res, next) => {
    next(new Error('Test error from debug endpoint'));
  });
}

// LIVENESS: ALB + container health check (verifies DB connectivity)
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      message: 'KAVIAR Backend',
      version: process.env.GIT_COMMIT || 'unknown',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: 'unhealthy',
      message: 'Database unreachable',
      version: process.env.GIT_COMMIT || 'unknown',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }
});

// READINESS: dependency checks (200 if ready, 503 if not)
app.get('/api/health/ready', async (req, res) => {
  const startTime = Date.now();
  const checks: any = { database: false, s3: false };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (e) {
    checks.database = false;
  }

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
    },
    timestamp: new Date().toISOString(),
  });
});

// Core routes (always enabled)
app.use('/api/admin/auth', authRoutes);
app.use('/api/admin/auth', passwordResetRoutes);

// Investor invites (SUPER_ADMIN only, before investorView middleware)
import investorInvitesRoutes from './routes/investor-invites-v2';
app.use('/api/admin/investors', investorInvitesRoutes);
app.use('/i', investorInvitesRoutes); // public short invite links

// Demo Mode / Investor View Middleware (read-only)
app.use('/api', investorView);

app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/admin', adminApprovalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminDriversRoutes);
app.use('/api/admin', adminPresignRoutes);
app.use('/api/admin/dashboard', adminDashboardMetricsRoutes);
app.use('/api/admin/community-leaders', communityLeadersRoutes);
app.use('/api', complianceRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/drivers', driverDashboardRoutes);
app.use('/api/drivers', driverTerritoryRoutes);
app.use('/api/drivers', notificationsRoutes);
app.use('/api/drivers', driverEarningsRoutes);
app.use('/api/drivers', driverAvailabilityRoutes);
app.use('/api/neighborhoods', neighborhoodsSmartRoutes);
app.use('/api/passengers', passengerLocationsRoutes);
app.use('/api/passengers', passengerProfileRoutes);
app.use('/api/passenger', passengerFavoritesRoutes);
app.use('/api/passenger/onboarding', passengerOnboardingRoutes);
app.use('/api/driver', driverOnboardingRoutes);
app.use('/api/trips', feeCalculationRoutes);
app.use('/api', neighborhoodStatsRoutes);
app.use('/api/rides', passengerRidesRoutes);
app.use('/api/admin', adminAuditRoutes);
app.use('/api/temp', rolloutRoutes);

// Feature-based routes

// Integrations (Twilio/WhatsApp) - Default ON
if (config.integrations.enableTwilioWhatsapp) {
  app.use('/webhooks', integrationsRoutes);
}

// Premium Tourism
if (config.premiumTourism.enablePremiumTourism) {
  app.use('/api', premiumTourismRoutes);
}

// Public + admin routes
app.use('/api/public', publicRoutes);
app.use('/api/public', consultantLeadsRoutes);
app.use('/api/admin', consultantLeadsRoutes);
app.use('/api/admin/staff', adminStaffRoutes);
app.use('/api/admin/whatsapp', adminWhatsappRoutes);
app.use('/api/admin/operations', adminOperationsRoutes);
import communityHealthRoutes from './routes/community-health';
app.use('/api/admin/communities', communityHealthRoutes);
app.use('/api/admin', adminReferralRoutes);
app.use('/api/public', adminReferralRoutes);
import adminEmergencyRoutes from './routes/admin-emergency';
app.use('/api/admin/emergency-events', adminEmergencyRoutes);
app.use('/api/geo', geoRoutes);
// v1 rides routes deleted — see rides-v2.ts
app.use('/api/governance', governanceRoutes);
app.use('/api/auth', passengerAuthRoutes);
app.use('/api/auth', driverAuthRoutes);
app.use('/api/auth', guideAuthRoutes);
app.use('/api/auth', passwordResetRoutes);
app.use('/api/auth', phoneAuthRoutes);

// V2 routes
app.use('/api/v2/rides', ridesV2Routes);
app.use('/api/v2/drivers', driversV2Routes);
import driverCreditsPurchaseRoutes from './routes/driver-credits-purchase';
app.use('/api/v2/drivers', driverCreditsPurchaseRoutes);
import webhooksAsaasRoutes from './routes/webhooks-asaas';
app.use('/api/webhooks', webhooksAsaasRoutes);
import geoProxyRoutes from './routes/geo-proxy';
app.use('/api/geo-proxy', geoProxyRoutes);
app.use('/api/realtime', realtimeRoutes);
import rideTrackRoutes from './routes/ride-track';
app.use('/api/public/ride-track', rideTrackRoutes);

// Feature disabled handler
app.use((req, res, next) => {
  if (req.path.startsWith('/webhooks') && !config.integrations.enableTwilioWhatsapp) {
    return res.status(404).json({
      error: 'FEATURE_DISABLED',
      feature: 'TWILIO_WHATSAPP'
    });
  }
  
  next();
});

// Serve uploaded files (must be BEFORE 404 handler)
const { uploadsBaseDir } = getUploadsPaths();
app.use('/uploads', express.static(uploadsBaseDir));

// S3 presigned URL endpoint (fallback for files not found locally)
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
