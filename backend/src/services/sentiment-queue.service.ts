import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { config } from '../config';

const sqs = new SQSClient({ region: process.env.AWS_REGION || 'us-east-2' });

/**
 * Enfileira feedback para análise de sentimento (best-effort, non-blocking)
 * @param feedbackId - ID do feedback a ser analisado
 */
export async function enqueueSentimentAnalysis(feedbackId: string): Promise<void> {
  // Se flag desligada, não faz nada
  if (!config.sentiment.enabled) {
    return;
  }

  // Se queue URL não configurada, não faz nada
  if (!config.sentiment.sqsQueueUrl) {
    console.warn('[Sentiment] Queue URL not configured, skipping enqueue');
    return;
  }

  try {
    await sqs.send(new SendMessageCommand({
      QueueUrl: config.sentiment.sqsQueueUrl,
      MessageBody: JSON.stringify({ rideFeedbackId: feedbackId }),
    }));

    console.log(`[Sentiment] Enqueued feedback: ${feedbackId}`);
  } catch (error) {
    // Best-effort: log error mas não propaga (reconciler vai pegar)
    console.error('[Sentiment] Failed to enqueue (non-blocking):', {
      feedbackId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
