import React, { useState, useEffect, useRef } from 'react';
import { Box, Card, CardContent, Typography, Chip, Alert } from '@mui/material';
import { CheckCircle, LocationOn, Map, Info } from '@mui/icons-material';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

/**
 * Cards 1-3: GPS + Território + Cobertura
 * Feature Flag: passenger_territory_cards_v1 (default OFF)
 * Debounce: >=15s ou >100m entre capturas
 */
export default function TerritoryCards({ passengerId, featureFlags = {} }) {
  const [gpsData, setGpsData] = useState(null);
  const [territoryData, setTerritoryData] = useState(null);
  const [coverageData, setCoverageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const lastCaptureRef = useRef({ timestamp: 0, lat: 0, lng: 0 });

  // Feature flag check
  const isEnabled = featureFlags.passenger_territory_cards_v1 === true;

  useEffect(() => {
    if (!isEnabled || !passengerId) return;

    const captureGPS = () => {
      if (!navigator.geolocation) {
        setError('GPS não disponível neste dispositivo');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude: lat, longitude: lng, accuracy } = position.coords;
          const now = Date.now();
          const last = lastCaptureRef.current;

          // Debounce: >=15s ou >100m
          const timeDiff = (now - last.timestamp) / 1000;
          const distance = calculateDistance(lat, lng, last.lat, last.lng);

          if (timeDiff < 15 && distance < 100) {
            console.log('[TerritoryCards] Debounce: aguardando 15s ou 100m');
            return;
          }

          lastCaptureRef.current = { timestamp: now, lat, lng };
          setLoading(true);
          setError(null);

          try {
            // Card 1: GPS Capturado
            setGpsData({ lat, lng, accuracy, timestamp: new Date() });

            // Card 2: Território Resolvido
            const territoryRes = await axios.get(`${API_BASE}/public/territory/resolution-history`, {
              params: { passengerId, limit: 1 }
            });
            setTerritoryData(territoryRes.data.data);

            // Card 3: Regras de Cobertura (exemplo com driverId fictício)
            // Em produção, usar driverId real da corrida
            const coverageRes = await axios.get(`${API_BASE}/public/territory/coverage-check`, {
              params: {
                driverId: 'drv_example',
                pickupLat: lat,
                pickupLng: lng,
                dropoffLat: lat + 0.01,
                dropoffLng: lng + 0.01
              }
            });
            setCoverageData(coverageRes.data.data);
          } catch (err) {
            console.error('[TerritoryCards] Error:', err);
            setError('Erro ao capturar dados territoriais');
          } finally {
            setLoading(false);
          }
        },
        (err) => {
          console.error('[TerritoryCards] GPS error:', err);
          setError('Erro ao acessar GPS');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    captureGPS();
    const interval = setInterval(captureGPS, 30000); // Tentar a cada 30s (debounce interno)

    return () => clearInterval(interval);
  }, [isEnabled, passengerId]);

  if (!isEnabled) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      {error && <Alert severity="error">{error}</Alert>}

      {/* Card 1: GPS Capturado */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <LocationOn color="primary" />
            <Typography variant="h6">GPS Capturado</Typography>
            {gpsData && <CheckCircle color="success" fontSize="small" />}
          </Box>
          {gpsData ? (
            <>
              <Typography variant="body2" color="text.secondary">
                Lat: {gpsData.lat.toFixed(6)}, Lng: {gpsData.lng.toFixed(6)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Precisão: {gpsData.accuracy?.toFixed(0)}m | {gpsData.timestamp.toLocaleTimeString()}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {loading ? 'Capturando localização...' : 'Aguardando GPS...'}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Card 2: Território Resolvido */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Map color="primary" />
            <Typography variant="h6">Território Resolvido</Typography>
            {territoryData?.currentTerritory && <CheckCircle color="success" fontSize="small" />}
          </Box>
          {territoryData?.currentTerritory ? (
            <>
              <Typography variant="body2">
                <strong>Comunidade:</strong> {territoryData.currentTerritory.communityName || 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Bairro:</strong> {territoryData.currentTerritory.neighborhoodName || 'N/A'}
              </Typography>
              {territoryData.resolutionHistory?.[0] && (
                <Chip
                  label={territoryData.resolutionHistory[0].method}
                  size="small"
                  color={territoryData.resolutionHistory[0].method === 'GEOFENCE' ? 'success' : 'warning'}
                  sx={{ mt: 1 }}
                />
              )}
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {loading ? 'Resolvendo território...' : 'Território não resolvido'}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Card 3: Regras de Cobertura */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Info color="primary" />
            <Typography variant="h6">Regras de Cobertura</Typography>
          </Box>
          {coverageData ? (
            <>
              <Typography variant="body2">
                <strong>Tipo de Match:</strong> {coverageData.matchType}
              </Typography>
              <Typography variant="body2">
                <strong>Taxa:</strong> {coverageData.feePercentage}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {coverageData.reason}
              </Typography>
              <Chip
                label={coverageData.covered ? 'Coberto' : 'Fora de Cobertura'}
                size="small"
                color={coverageData.covered ? 'success' : 'error'}
                sx={{ mt: 1 }}
              />
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {loading ? 'Verificando cobertura...' : 'Aguardando dados...'}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

// Helper: Haversine distance
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
