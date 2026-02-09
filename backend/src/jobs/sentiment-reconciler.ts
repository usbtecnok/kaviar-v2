import { CronJob } from 'cron';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { enqueueSentimentAnalysis } from '../services/sentiment-queue.service';

/**
 * Reconciler: Varre feedbacks sem análise e reenfileira (fallback)
 * Roda a cada N minutos (configurável via env)
 */
export const sentimentReconciler = new CronJob(
  `*/${config.sentiment.reconcilerIntervalMinutes} * * * *`, // Ex: */5 = a cada 5 min
  async () => {
    // Se flag desligada, não faz nada
    if (!config.sentiment.enabled) {
      return;
    }

    const startTime = Date.now();

    try {
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
    console.log('[Sentiment Reconciler] Started (interval: every %d minutes)', config.sentiment.reconcilerIntervalMinutes);
  } else {
    console.log('[Sentiment Reconciler] Disabled (flag OFF)');
  }
}
