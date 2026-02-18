import { dispatcherService } from '../services/dispatcher.service';

// Job simples que roda a cada 5 segundos para verificar ofertas expiradas
export function startOfferTimeoutJob() {
  setInterval(async () => {
    try {
      await dispatcherService.checkExpiredOffers();
    } catch (error) {
      console.error('[OFFER_TIMEOUT_JOB_ERROR]', error);
    }
  }, 5000); // 5 segundos

  console.log('[OFFER_TIMEOUT_JOB] Started (interval: 5s)');
}
