import app from './app';
import { config } from './config';
import { prisma } from './lib/prisma';
import { startOfferTimeoutJob } from './jobs/offer-timeout.job';

async function startServer() {
  try {
    const PORT = Number(process.env.PORT || 3003);

    // FATAL: Prevent DEV simulation flags in production
    if (process.env.NODE_ENV === 'production') {
      const devFlags = [
        'DEV_AUTO_ACCEPT',
        'DEV_AUTO_RELEASE',
        'DEV_ACCEPT_PROB',
        'DEV_REJECT_PROB',
        'DEV_IGNORE_PROB',
        'DEV_RELEASE_MIN_MS',
        'DEV_RELEASE_MAX_MS',
        'DEV_GEOFENCE_BOOST',
        'DEV_TIME_SCALE'
      ];
      
      const foundDevFlags = devFlags.filter(flag => process.env[flag] === 'true' || (process.env[flag] && process.env[flag] !== '0' && process.env[flag] !== 'false'));
      
      if (foundDevFlags.length > 0) {
        console.error(`❌ FATAL: DEV simulation flags detected in production: ${foundDevFlags.join(', ')}`);
        console.error('❌ FATAL: Remove these flags from ECS Task Definition immediately');
        process.exit(1);
      }
    }

    // Log database host (without password)
    const dbUrl = process.env.DATABASE_URL || '';
    const dbHost = dbUrl.match(/@([^:\/]+)/)?.[1] || 'unknown';
    const dbPort = dbUrl.match(/:(\d+)\//)?.[1] || '5432';
    console.log(`🗄️  Database: ${dbHost}:${dbPort}`);
    console.log(`📊 Environment: ${config.nodeEnv}`);
    
    // DEV simulation flags
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔧 DEV_AUTO_ACCEPT: ${process.env.DEV_AUTO_ACCEPT || 'false'}`);
      console.log(`🔧 DEV_AUTO_RELEASE: ${process.env.DEV_AUTO_RELEASE || 'false'}`);
      console.log(`🔧 DEV_ACCEPT_PROB: ${process.env.DEV_ACCEPT_PROB || '0'}`);
      console.log(`🔧 DEV_REJECT_PROB: ${process.env.DEV_REJECT_PROB || '0'}`);
      console.log(`🔧 DEV_IGNORE_PROB: ${process.env.DEV_IGNORE_PROB || '0'}`);
      console.log(`🔧 DEV_RELEASE_MIN_MS: ${process.env.DEV_RELEASE_MIN_MS || '0'}`);
      console.log(`🔧 DEV_RELEASE_MAX_MS: ${process.env.DEV_RELEASE_MAX_MS || '0'}`);
      console.log(`🔧 DEV_GEOFENCE_BOOST: ${process.env.DEV_GEOFENCE_BOOST || '0'}`);
      console.log(`🔧 DEV_TIME_SCALE: ${process.env.DEV_TIME_SCALE || '1'}`);
    }

    // Start server FIRST (não bloqueia no DB)
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 KAVIAR Backend running on port ${PORT}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔗 Git Commit: ${process.env.GIT_COMMIT || process.env.RENDER_GIT_COMMIT || 'unknown'}`);
    });

    // Start offer timeout job (SPEC_RIDE_FLOW_V1)
    startOfferTimeoutJob();

    // Test database connection (non-blocking startup)
    try {
      await Promise.race([
        prisma.$connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('DB connection timeout')), 10000)
        )
      ]);
      console.log('✅ Database connected successfully');
    } catch (dbError) {
      console.error('⚠️  Database connection failed (server still running):', dbError);
      // Não faz exit - deixa server rodar para health check responder
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
