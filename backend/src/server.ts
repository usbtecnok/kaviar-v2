import app from './app';
import { config } from './config';
import { prisma } from './lib/prisma';
import { startOfferTimeoutJob } from './jobs/offer-timeout.job';

async function startServer() {
  try {
    const PORT = Number(process.env.PORT || 3003);

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`KAVIAR Backend running on port ${PORT} [${config.nodeEnv}] commit=${process.env.GIT_COMMIT || 'unknown'}`);
    });

    // Start offer timeout job (SPEC_RIDE_FLOW_V1)
    startOfferTimeoutJob();

    // One-time migrations (idempotent)
    prisma.$executeRawUnsafe(`
      INSERT INTO feature_flags (key, enabled, rollout_percentage, updated_at, created_at)
      VALUES ('passenger_favorites_matching', true, 100, NOW(), NOW())
      ON CONFLICT (key) DO UPDATE SET enabled = true, rollout_percentage = 100, updated_at = NOW()
    `).then(() => console.log('✅ Feature flag: passenger_favorites_matching enabled'))
      .catch((e: any) => console.warn('⚠️ Feature flag migration skipped:', e.message));

    prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id SERIAL PRIMARY KEY,
        admin_id TEXT NOT NULL,
        admin_email TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        old_value JSONB,
        new_value JSONB,
        reason TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `).then(() => console.log('✅ admin_audit_logs table ready'))
      .catch((e: any) => console.warn('⚠️ admin_audit_logs migration skipped:', e.message));

    prisma.$executeRawUnsafe(`
      ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS admin_email TEXT;
      ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
    `).catch(() => {});

    prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS admin_login_history (
        id SERIAL PRIMARY KEY,
        admin_id TEXT,
        email TEXT NOT NULL,
        success BOOLEAN NOT NULL,
        fail_reason TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `).then(() => console.log('✅ admin_login_history table ready'))
      .catch((e: any) => console.warn('⚠️ admin_login_history migration skipped:', e.message));

    prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_audit_admin_id ON admin_audit_logs(admin_id);
      CREATE INDEX IF NOT EXISTS idx_audit_created_at ON admin_audit_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_entity ON admin_audit_logs(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_login_email ON admin_login_history(email);
      CREATE INDEX IF NOT EXISTS idx_login_created_at ON admin_login_history(created_at);
    `).catch(() => {});

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
