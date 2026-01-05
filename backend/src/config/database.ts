import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['info', 'warn', 'error'], // Remover 'query' para reduzir logs
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // Configuração específica para Neon PostgreSQL
  __internal: {
    engine: {
      connectTimeout: 60000, // 60 segundos
      pool: {
        timeout: 60000,
        idleTimeout: 300000, // 5 minutos
        maxConnections: 10,
        minConnections: 2
      }
    }
  }
} as any); // Bypass TypeScript error for Prisma config

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;
