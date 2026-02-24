import { useState, useEffect } from 'react';
import { auth } from '../lib/auth';
import { logger } from '../lib/logger';

const REALTIME_URL = import.meta.env.VITE_REALTIME_URL;

export function useRealtimeOffers(enabled) {
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    if (!enabled) return;

    const token = auth.getToken();
    logger.log('SSE_CONNECT', 'Connecting to realtime channel');

    const es = new EventSource(`${REALTIME_URL}/api/realtime/driver`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    es.addEventListener('offer', (e) => {
      const offer = JSON.parse(e.data);
      logger.log('SSE_OFFER_RECEIVED', 'New offer received', { offerId: offer.id });
      setOffers(prev => [...prev, offer]);
    });

    es.onerror = () => {
      logger.log('SSE_ERROR', 'SSE connection error');
    };

    return () => {
      es.close();
      logger.log('SSE_DISCONNECT', 'Disconnected from realtime channel');
    };
  }, [enabled]);

  const removeOffer = (offerId) => {
    setOffers(prev => prev.filter(o => o.id !== offerId));
  };

  return { offers, removeOffer };
}
