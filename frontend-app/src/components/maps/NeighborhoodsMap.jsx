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

    // Limpar camadas anteriores de communities
    mapInstanceRef.current.eachLayer((layer) => {
      if (layer.options && layer.options.isCommunity) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });

    communities.forEach(community => {
      if (community.geofence?.coordinates) {
        try {
          const coords = community.geofence.coordinates[0].map(coord => [coord[1], coord[0]]);
          window.L.polygon(coords, {
            color: '#2196F3',
            fillColor: '#2196F3',
            fillOpacity: 0.2,
            weight: 2,
            isCommunity: true
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

    // Limpar camadas anteriores
    mapInstanceRef.current.eachLayer((layer) => {
      if (layer.options && layer.options.isNeighborhood) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });

    neighborhoods.forEach(neighborhood => {
      if (neighborhood.geofence?.coordinates) {
        try {
          // Parse robusto de coordinates
          let coordinates;
          if (typeof neighborhood.geofence.coordinates === 'string') {
            coordinates = JSON.parse(neighborhood.geofence.coordinates);
          } else if (neighborhood.geofence.coordinates.type === 'Polygon') {
            // É um objeto GeoJSON completo
            coordinates = neighborhood.geofence.coordinates.coordinates;
          } else {
            // É array direto
            coordinates = neighborhood.geofence.coordinates;
          }
          
          const coords = coordinates[0].map(coord => [coord[1], coord[0]]);
          const isSelected = selectedNeighborhood?.id === neighborhood.id;
          const isFallback = neighborhood.geofence.source === 'fallback' || neighborhood.geofence.geofence_type === 'circle';
          
          console.log(`🗺️ [MAP] Renderizando ${neighborhood.name}:`, {
            isSelected,
            coordsLength: coords.length,
            geofenceType: neighborhood.geofence.geofence_type,
            isFallback
          });
          
          const polygon = window.L.polygon(coords, {
            color: isSelected ? '#FF5722' : (isFallback ? '#FFA726' : '#4CAF50'),
            fillColor: isSelected ? '#FF5722' : (isFallback ? '#FFA726' : '#4CAF50'),
            fillOpacity: isSelected ? 0.6 : (isFallback ? 0.2 : 0.3),
            weight: isSelected ? 3 : 2,
            dashArray: isFallback ? '5, 5' : null,
            isNeighborhood: true
          }).addTo(mapInstanceRef.current)
            .bindPopup(`<b>Bairro:</b> ${neighborhood.name}<br><b>Zona:</b> ${neighborhood.zone}${isFallback ? '<br><span style="color: orange;">⚠️ Geofence aproximada (800m)</span>' : ''}`);
          
          // Se selecionado, fazer zoom para o bairro
          if (isSelected) {
            console.log(`🎯 [MAP] Fazendo zoom para ${neighborhood.name}`);
            mapInstanceRef.current.fitBounds(polygon.getBounds(), { padding: [20, 20] });
          }
        } catch (err) {
          console.error(`❌ [MAP] Erro ao renderizar neighborhood ${neighborhood.name}:`, err);
        }
      }
    });
  }, [isLoaded, showNeighborhoodsLayer, neighborhoods, selectedNeighborhood]);

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
