import pg from 'pg';

// Pool PostgreSQL para rotas que ainda não estão em Prisma.
// IMPORTANTE: usar DATABASE_URL via Secrets Manager/ECS (já existe no prod).
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  // Não logar URL (segurança)
  throw new Error('DATABASE_URL is required');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
