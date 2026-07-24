import { dispatcherService } from '../services/dispatcher.service';
import { withSchedulerLock } from '../lib/scheduler-lock';

const LOCK_KEY = 'kaviar:offer_timeout_job';

// Job que roda a cada 5 segundos para verificar ofertas expiradas.
// O advisory lock garante que apenas uma instância executa por vez.
export function startOfferTimeoutJob() {
  setInterval(async () => {
    try {
      await withSchedulerLock(LOCK_KEY, async () => {
        await dispatcherService.checkExpiredOffers();
      });
    } catch (error) {
      console.error('[OFFER_TIMEOUT_JOB_ERROR]', error);
    }
  }, 5000);

  console.log('[OFFER_TIMEOUT_JOB] Started (interval: 5s)');
}
