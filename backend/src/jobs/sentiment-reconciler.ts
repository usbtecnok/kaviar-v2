import { CronJob } from 'cron';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { enqueueSentimentAnalysis } from '../services/sentiment-queue.service';

/**
 * Reconciler: Varre feedbacks sem análise e reenfileira (fallback)
 * Roda a cada N minutos (configurável via env)
 * 
 * SINGLE INSTANCE MODE:
 * - Usa advisory lock do PostgreSQL para garantir apenas 1 instância rodando
 * - Lock ID: 987654321 (arbitrário, único para sentiment reconciler)
 * - Se lock falhar, outra instância já está rodando (skip silencioso)
 */

const LOCK_ID = 987654321; // Advisory lock ID único

export const sentimentReconciler = new CronJob(
  `*/${config.sentiment.reconcilerIntervalMinutes} * * * *`, // Ex: */5 = a cada 5 min
  async () => {
    // Se flag desligada, não faz nada
    if (!config.sentiment.enabled) {
      return;
    }

    const startTime = Date.now();
    let lockAcquired = false;

    try {
      // Tentar adquirir advisory lock (non-blocking)
      const lockResult = await prisma.$queryRaw<[{ pg_try_advisory_lock: boolean }]>`
        SELECT pg_try_advisory_lock(${LOCK_ID})
      `;

      lockAcquired = lockResult[0]?.pg_try_advisory_lock || false;

      if (!lockAcquired) {
        // Outra instância já está rodando, skip silencioso
        console.log('[Sentiment Reconciler] Skipped (another instance running)');
        return;
      }

      // Buscar feedbacks sem análise (criados nas últimas 24h)
      const pending = await prisma.ride_feedbacks.findMany({
        where: {
          created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          ride_feedback_sentiment_analysis: null,
          comment: { not: null }, // Apenas feedbacks com comentário
        },
        select: { id: true },
        take: config.sentiment.reconcilerBatchSize,
        orderBy: { created_at: 'asc' },
      });

      // Reenfileirar
      let enqueued = 0;
      for (const feedback of pending) {
        await enqueueSentimentAnalysis(feedback.id);
        enqueued++;
      }

      const duration = Date.now() - startTime;

      // Telemetria (sem PII)
      console.log('[Sentiment Reconciler]', {
        timestamp: new Date().toISOString(),
        pending: pending.length,
        enqueued,
        duration_ms: duration,
        enabled: config.sentiment.enabled,
      });
    } catch (error) {
      console.error('[Sentiment Reconciler] Error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    } finally {
      // Liberar lock se foi adquirido
      if (lockAcquired) {
        try {
          await prisma.$queryRaw`SELECT pg_advisory_unlock(${LOCK_ID})`;
        } catch (unlockError) {
          console.error('[Sentiment Reconciler] Failed to release lock:', unlockError);
        }
      }
    }
  },
  null, // onComplete
  false, // start (não inicia automaticamente)
  'America/Sao_Paulo'
);

/**
 * Inicia o reconciler (chamar no app.ts)
 */
export function startSentimentReconciler() {
  if (config.sentiment.enabled) {
    sentimentReconciler.start();
    console.log('[Sentiment Reconciler] Started (interval: every %d minutes, single-instance mode)', config.sentiment.reconcilerIntervalMinutes);
  } else {
    console.log('[Sentiment Reconciler] Disabled (flag OFF)');
  }
}
