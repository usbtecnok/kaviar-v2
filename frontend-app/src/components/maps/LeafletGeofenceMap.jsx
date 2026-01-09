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
        console.log('🗺️ [MAP DIAGNOSTIC] Iniciando carregamento do Leaflet...');
        
        // Carregar CSS do Leaflet
        if (!document.querySelector('link[href*="leaflet"]')) {
          console.log('🗺️ [MAP DIAGNOSTIC] Carregando Leaflet CSS...');
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          link.onload = () => console.log('✅ [MAP DIAGNOSTIC] Leaflet CSS carregado');
          link.onerror = () => console.error('❌ [MAP DIAGNOSTIC] Erro ao carregar Leaflet CSS');
          document.head.appendChild(link);
        }

        // Carregar JS do Leaflet
        if (!window.L) {
          console.log('🗺️ [MAP DIAGNOSTIC] Carregando Leaflet JS...');
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = () => {
            console.log('✅ [MAP DIAGNOSTIC] Leaflet JS carregado');
            initializeMap();
          };
          script.onerror = () => {
            console.error('❌ [MAP DIAGNOSTIC] Erro ao carregar Leaflet JS');
            setError('Erro ao carregar Leaflet JS');
          };
          document.head.appendChild(script);
        } else {
          console.log('✅ [MAP DIAGNOSTIC] Leaflet já disponível');
          initializeMap();
        }
      } catch (err) {
        console.error('❌ [MAP DIAGNOSTIC] Erro geral:', err);
        setError('Erro ao carregar mapa: ' + err.message);
      }
    };

    const initializeMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      try {
        console.log('🗺️ [MAP DIAGNOSTIC] Inicializando mapa Leaflet...');
        
        // Calcular centro inicial
        let center = [-22.9068, -43.1729]; // Rio de Janeiro default
        
        if (selectedCommunity?.centerLat && selectedCommunity?.centerLng) {
          center = [
            parseFloat(selectedCommunity.centerLat),
            parseFloat(selectedCommunity.centerLng)
          ];
          console.log('📍 [MAP DIAGNOSTIC] Centro da community:', center);
        }

        // Criar mapa
        const map = window.L.map(mapRef.current, {
          center: center,
          zoom: 15,
          zoomControl: true
        });

        console.log('🗺️ [MAP DIAGNOSTIC] Adicionando tiles OpenStreetMap...');
        
        // Adicionar tiles do OpenStreetMap
        const tileLayer = window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        });
        
        tileLayer.on('loading', () => console.log('🔄 [MAP DIAGNOSTIC] Carregando tiles...'));
        tileLayer.on('load', () => console.log('✅ [MAP DIAGNOSTIC] Tiles carregados com sucesso'));
        tileLayer.on('tileerror', (e) => {
          console.error('❌ [MAP DIAGNOSTIC] Erro no tile:', e.tile.src, 'Status:', e.tile.status || 'unknown');
          console.error('❌ [MAP DIAGNOSTIC] Possível bloqueio CSP ou rate limit (403/429)');
        });
        tileLayer.on('tileload', (e) => {
          console.log('🟢 [MAP DIAGNOSTIC] Tile carregado:', e.url);
        });
        
        tileLayer.addTo(map);

        mapInstanceRef.current = map;
        setIsLoaded(true);
        
        console.log('✅ [MAP DIAGNOSTIC] Mapa inicializado com sucesso');

        // Renderizar geofences após o mapa carregar
        setTimeout(() => {
          console.log('🔍 [MAP DIAGNOSTIC] Renderizando geofences...');
          renderGeofences(map);
          // Invalidar tamanho para corrigir renderização em modal
          map.invalidateSize();
          console.log('🔄 [MAP DIAGNOSTIC] invalidateSize() executado');
        }, 200);

      } catch (err) {
        console.error('❌ [MAP DIAGNOSTIC] Erro ao inicializar mapa:', err);
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

    console.log('🔍 [MAP DIAGNOSTIC] Renderizando geofences para', communities.length, 'communities');

    communities.forEach((community) => {
      const isSelected = selectedCommunity?.id === community.id;

      // Processar geometry (formato da API) ou geofence (formato legacy)
      let geometryData = null;
      
      if (community.geometry) {
        // Formato da API: {type: "Polygon", coordinates: [...]}
        console.log('📐 [MAP DIAGNOSTIC] Geometry encontrada:', typeof community.geometry, community.geometry.type);
        geometryData = community.geometry;
      } else if (community.geofence) {
        // Formato legacy: {type: "polygon", path: [...]}
        try {
          const geofence = typeof community.geofence === 'string' 
            ? JSON.parse(community.geofence) 
            : community.geofence;
          
          console.log('📐 [MAP DIAGNOSTIC] Geofence legacy:', typeof community.geofence, geofence.type);
          
          if (geofence.type === 'polygon' && geofence.path) {
            // Converter para formato GeoJSON
            geometryData = {
              type: 'Polygon',
              coordinates: [geofence.path.map(p => [p.lng, p.lat])]
            };
          }
        } catch (error) {
          console.error(`❌ [MAP DIAGNOSTIC] Erro ao processar geofence legacy do bairro ${community.name}:`, error);
        }
      }

      // Renderizar polígono se existir
      if (geometryData && geometryData.type === 'Polygon') {
        try {
          // Converter coordenadas GeoJSON [lng, lat] para Leaflet [lat, lng]
          const latLngs = geometryData.coordinates[0].map(coord => [coord[1], coord[0]]);
          
          console.log('🗺️ [MAP DIAGNOSTIC] Criando polígono com', latLngs.length, 'pontos');
          
          const polygon = window.L.polygon(latLngs, {
            color: isSelected ? '#1976D2' : '#388E3C',
            fillColor: isSelected ? '#2196F3' : '#4CAF50',
            fillOpacity: isSelected ? 0.3 : 0.2,
            weight: isSelected ? 3 : 2
          }).addTo(map);

          if (isSelected) {
            const bounds = polygon.getBounds();
            console.log('📏 [MAP DIAGNOSTIC] FitBounds executado:', bounds.toString());
            map.fitBounds(bounds, { padding: [20, 20] });
          }
        } catch (error) {
          console.error(`❌ [MAP DIAGNOSTIC] Erro ao renderizar polígono do bairro ${community.name}:`, error);
        }
      }

      // Renderizar círculo se não tem polígono
      else if (community.centerLat && community.centerLng && community.radiusMeters) {
        console.log('⭕ [MAP DIAGNOSTIC] Renderizando círculo para', community.name);
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
    <Box sx={{ height: 420, width: '100%', position: 'relative' }}>
      <div 
        ref={mapRef} 
        style={{ 
          height: '420px', 
          width: '100%',
          borderRadius: '4px',
          minHeight: '420px'
        }} 
      />
      {/* Container height diagnostic */}
      {mapRef.current && (
        <div style={{ display: 'none' }}>
          {console.log('📏 [MAP DIAGNOSTIC] Container height:', mapRef.current.offsetHeight, 'px')}
        </div>
      )}
    </Box>
  );
};

export default LeafletGeofenceMap;
