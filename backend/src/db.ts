import pg from 'pg';

// Pool PostgreSQL para rotas que ainda não estão em Prisma.
// IMPORTANTE: usar DATABASE_URL via Secrets Manager/ECS (já existe no prod).
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  // Não logar URL (segurança)
  throw new Error('DATABASE_URL is required');
}

// Remove sslmode=require da connection string pois vamos configurar SSL manualmente
const connectionString = process.env.DATABASE_URL.replace(/[?&]sslmode=require/, '');

const isLocalDb = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

export const pool = new Pool({
  connectionString,
  ...(isLocalDb ? {} : { ssl: { rejectUnauthorized: false } })
});
