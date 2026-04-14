import { prisma } from '../lib/prisma';

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const CHECK_INTERVAL_MS = 60 * 1000;       // every 60s

export function startStaleDriverCleanupJob() {
  setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS);

      const count = await prisma.$executeRaw`
        UPDATE driver_status ds
        SET availability = 'offline'
        FROM drivers d
        LEFT JOIN driver_locations dl ON dl.driver_id = d.id
        WHERE ds.driver_id = d.id
          AND ds.availability = 'online'
          AND (dl.driver_id IS NULL OR dl.updated_at < ${cutoff})
      `;

      if (count > 0) {
        console.log(`[AUTO_OFFLINE] Marked ${count} stale drivers as offline (no location update in 5min)`);
      }
    } catch (error) {
      console.error('[AUTO_OFFLINE_ERROR]', error);
    }
  }, CHECK_INTERVAL_MS);

  console.log('[AUTO_OFFLINE_JOB] Started (interval: 60s, threshold: 5min)');
}
