import React, { useEffect, useRef, useState } from 'react';
import { Box, Alert, Typography } from '@mui/material';

// Componente de mapa usando Leaflet (sem API key necessária)
const LeafletGeofenceMap = ({ 
  communities = [], 
  selectedCommunity = null,
  showGeofenceValidation = false,
  editMode = false,
  onGeofenceChange = null,
  showSearch = false,
  onCenterChange = null
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Carregar Leaflet dinamicamente
    const loadLeaflet = async () => {
      try {
        // Carregar CSS do Leaflet
        if (!document.querySelector('link[href*="leaflet"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        // Carregar JS do Leaflet
        if (!window.L) {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = () => initializeMap();
          document.head.appendChild(script);
        } else {
          initializeMap();
        }
      } catch (err) {
        setError('Erro ao carregar mapa: ' + err.message);
      }
    };

    const initializeMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      try {
        // Calcular centro inicial
        let center = [-22.9068, -43.1729]; // Rio de Janeiro default
        
        if (selectedCommunity?.centerLat && selectedCommunity?.centerLng) {
          center = [
            parseFloat(selectedCommunity.centerLat),
            parseFloat(selectedCommunity.centerLng)
          ];
        }

        // Criar mapa
        const map = window.L.map(mapRef.current, {
          center: center,
          zoom: 15,
          zoomControl: true
        });

        // Adicionar tiles do OpenStreetMap
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        mapInstanceRef.current = map;
        setIsLoaded(true);

        // Renderizar geofences após o mapa carregar
        setTimeout(() => {
          renderGeofences(map);
          // Invalidar tamanho para corrigir renderização em modal
          map.invalidateSize();
        }, 200);

      } catch (err) {
        setError('Erro ao inicializar mapa: ' + err.message);
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

  // Invalidar tamanho quando o modal abre (fix para renderização em Dialog)
  useEffect(() => {
    if (isLoaded && mapInstanceRef.current) {
      const timer = setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, selectedCommunity]);

  const renderGeofences = (map) => {
    if (!window.L || !communities.length) return;

    communities.forEach((community) => {
      const isSelected = selectedCommunity?.id === community.id;

      // Processar geometry (formato da API) ou geofence (formato legacy)
      let geometryData = null;
      
      if (community.geometry) {
        // Formato da API: {type: "Polygon", coordinates: [...]}
        geometryData = community.geometry;
      } else if (community.geofence) {
        // Formato legacy: {type: "polygon", path: [...]}
        try {
          const geofence = typeof community.geofence === 'string' 
            ? JSON.parse(community.geofence) 
            : community.geofence;
          
          if (geofence.type === 'polygon' && geofence.path) {
            // Converter para formato GeoJSON
            geometryData = {
              type: 'Polygon',
              coordinates: [geofence.path.map(p => [p.lng, p.lat])]
            };
          }
        } catch (error) {
          console.error(`Erro ao processar geofence legacy do bairro ${community.name}:`, error);
        }
      }

      // Renderizar polígono se existir
      if (geometryData && geometryData.type === 'Polygon') {
        try {
          // Converter coordenadas GeoJSON [lng, lat] para Leaflet [lat, lng]
          const latLngs = geometryData.coordinates[0].map(coord => [coord[1], coord[0]]);
          
          const polygon = window.L.polygon(latLngs, {
            color: isSelected ? '#1976D2' : '#388E3C',
            fillColor: isSelected ? '#2196F3' : '#4CAF50',
            fillOpacity: isSelected ? 0.3 : 0.2,
            weight: isSelected ? 3 : 2
          }).addTo(map);

          if (isSelected) {
            map.fitBounds(polygon.getBounds());
          }
        } catch (error) {
          console.error(`Erro ao renderizar polígono do bairro ${community.name}:`, error);
        }
      }

      // Renderizar círculo se não tem polígono
      else if (community.centerLat && community.centerLng && community.radiusMeters) {
        const circle = window.L.circle(
          [parseFloat(community.centerLat), parseFloat(community.centerLng)],
          {
            radius: community.radiusMeters,
            color: isSelected ? '#1976D2' : '#388E3C',
            fillColor: isSelected ? '#2196F3' : '#4CAF50',
            fillOpacity: isSelected ? 0.3 : 0.2,
            weight: isSelected ? 3 : 2
          }
        ).addTo(map);

        if (isSelected) {
          map.setView(circle.getLatLng(), 15);
        }
      }

      // Adicionar marcador do centro
      if (community.centerLat && community.centerLng) {
        window.L.marker([
          parseFloat(community.centerLat),
          parseFloat(community.centerLng)
        ]).addTo(map).bindPopup(community.name);
      }
    });
  };

  if (error) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Alert severity="error">
          <Typography variant="body2">
            ❌ {error}
          </Typography>
        </Alert>
      </Box>
    );
  }

  if (!isLoaded) {
    return (
      <Box sx={{ 
        height: 400, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 1
      }}>
        <Typography variant="body1">🗺️ Carregando mapa...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 400, width: '100%', position: 'relative' }}>
      <div 
        ref={mapRef} 
        style={{ 
          height: '100%', 
          width: '100%',
          borderRadius: '4px'
        }} 
      />
    </Box>
  );
};

export default LeafletGeofenceMap;
