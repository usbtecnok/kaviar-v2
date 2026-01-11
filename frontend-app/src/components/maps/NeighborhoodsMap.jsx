import React, { useEffect, useRef, useState } from 'react';
import { Box, Alert, Typography, FormControlLabel, Switch } from '@mui/material';

// Componente de mapa com suporte a Communities + Neighborhoods
const NeighborhoodsMap = ({ 
  communities = [], 
  neighborhoods = [],
  selectedCommunity = null,
  selectedNeighborhood = null,
  showCommunitiesLayer = true,
  showNeighborhoodsLayer = false,
  onLayerToggle = null
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        if (!document.querySelector('link[href*="leaflet"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        if (!window.L) {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = () => initializeMap();
          script.onerror = () => setError('Erro ao carregar Leaflet');
          document.head.appendChild(script);
        } else {
          initializeMap();
        }
      } catch (err) {
        setError('Erro ao inicializar mapa');
      }
    };

    const initializeMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      try {
        const map = window.L.map(mapRef.current).setView([-22.9068, -43.1729], 11);
        
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        mapInstanceRef.current = map;
        setIsLoaded(true);
      } catch (err) {
        setError('Erro ao criar mapa');
      }
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Renderizar Communities
  useEffect(() => {
    if (!isLoaded || !showCommunitiesLayer || !communities.length) return;

    communities.forEach(community => {
      if (community.geofence?.coordinates) {
        try {
          const coords = community.geofence.coordinates[0].map(coord => [coord[1], coord[0]]);
          window.L.polygon(coords, {
            color: '#2196F3',
            fillColor: '#2196F3',
            fillOpacity: 0.2,
            weight: 2
          }).addTo(mapInstanceRef.current)
            .bindPopup(`<b>Community:</b> ${community.name}`);
        } catch (err) {
          console.warn('Erro ao renderizar community:', community.name, err);
        }
      }
    });
  }, [isLoaded, showCommunitiesLayer, communities]);

  // Renderizar Neighborhoods
  useEffect(() => {
    if (!isLoaded || !showNeighborhoodsLayer || !neighborhoods.length) return;

    neighborhoods.forEach(neighborhood => {
      if (neighborhood.geofence?.coordinates) {
        try {
          const coords = neighborhood.geofence.coordinates[0].map(coord => [coord[1], coord[0]]);
          window.L.polygon(coords, {
            color: '#4CAF50',
            fillColor: '#4CAF50',
            fillOpacity: 0.3,
            weight: 2
          }).addTo(mapInstanceRef.current)
            .bindPopup(`<b>Bairro:</b> ${neighborhood.name}<br><b>Zona:</b> ${neighborhood.zone}`);
        } catch (err) {
          console.warn('Erro ao renderizar neighborhood:', neighborhood.name, err);
        }
      }
    });
  }, [isLoaded, showNeighborhoodsLayer, neighborhoods]);

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Controles de Camadas */}
      <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={showCommunitiesLayer}
              onChange={(e) => onLayerToggle?.('communities', e.target.checked)}
            />
          }
          label="Communities"
        />
        <FormControlLabel
          control={
            <Switch
              checked={showNeighborhoodsLayer}
              onChange={(e) => onLayerToggle?.('neighborhoods', e.target.checked)}
            />
          }
          label="Bairros"
        />
      </Box>

      {/* Mapa */}
      <Box
        ref={mapRef}
        sx={{
          height: 500,
          width: '100%',
          border: '1px solid #ddd',
          borderRadius: 1
        }}
      />

      {!isLoaded && (
        <Typography variant="body2" sx={{ p: 2, textAlign: 'center' }}>
          Carregando mapa...
        </Typography>
      )}
    </Box>
  );
};

export default NeighborhoodsMap;
