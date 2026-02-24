import { useState, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';
import { logger } from '../lib/logger';

const GPS_INTERVAL = parseInt(import.meta.env.VITE_GPS_INTERVAL_MS);

export function useGPS(enabled) {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) return;

    logger.log('GPS_START', 'Starting GPS watch');

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setLocation(loc);
        setError(null);
        logger.log('GPS_UPDATE', 'Location updated', loc);
      },
      (err) => {
        setError(err.message);
        logger.log('GPS_ERROR', 'Geolocation error', { error: err.message });
      },
      { enableHighAccuracy: true }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      logger.log('GPS_STOP', 'GPS watch stopped');
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !location) return;

    const interval = setInterval(() => {
      logger.log('GPS_SEND', 'Sending location to backend', location);
      apiClient.post('/api/v2/drivers/me/location', location)
        .catch(err => logger.log('GPS_SEND_ERROR', 'Failed to send location', { error: err.message }));
    }, GPS_INTERVAL);

    return () => clearInterval(interval);
  }, [enabled, location]);

  return { location, error };
}
