import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polygon, Circle, DrawingManager, StandaloneSearchBox } from '@react-google-maps/api';
import { Box, Alert, Typography } from '@mui/material';

const GOOGLE_MAPS_LIBRARIES = ['geometry', 'drawing', 'places'];

const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

const defaultCenter = {
  lat: -22.9068,
  lng: -43.1729
};

const getMapCenter = (communities, selectedCommunity, isLoaded) => {
  if (!isLoaded || !window.google?.maps) return defaultCenter;
  
  if (selectedCommunity) {
    // Se tem geofence, calcular centro do polígono
    if (selectedCommunity.geofence) {
      try {
        const geofence = typeof selectedCommunity.geofence === 'string' 
          ? JSON.parse(selectedCommunity.geofence) 
          : selectedCommunity.geofence;
        
        if (geofence.type === 'polygon' && geofence.path?.length > 0) {
          const bounds = new window.google.maps.LatLngBounds();
          geofence.path.forEach(point => bounds.extend(point));
          return bounds.getCenter().toJSON();
        }
      } catch (error) {
        console.error('Erro ao calcular centro do polígono:', error);
      }
    }
    
    // Fallback para centerLat/centerLng
    if (selectedCommunity.centerLat && selectedCommunity.centerLng) {
      return {
        lat: parseFloat(selectedCommunity.centerLat),
        lng: parseFloat(selectedCommunity.centerLng)
      };
    }
  }
  
  return defaultCenter;
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false
};

const GeofenceMap = ({ 
  communities = [], 
  selectedCommunity = null,
  pickupLocation = null,
  dropoffLocation = null,
  onLocationSelect = null,
  showGeofenceValidation = false,
  editMode = false,
  onGeofenceChange = null,
  showSearch = false,
  onCenterChange = null
}) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const [map, setMap] = useState(null);
  const [isOutsideGeofence, setIsOutsideGeofence] = useState(false);
  const [editedPath, setEditedPath] = useState(null);
  const [drawingManager, setDrawingManager] = useState(null);
  const [centerCandidate, setCenterCandidate] = useState(null);
  const [searchBox, setSearchBox] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const geometryRef = useRef(null);

  // Log seguro da API key
  console.log("MAPS KEY:", !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

  // Calcular centro quando Maps carrega ou comunidade muda
  useEffect(() => {
    if (!isLoaded || !window.google?.maps) return;
    
    const center = getMapCenter(communities, selectedCommunity, isLoaded);
    setMapCenter(center);
  }, [isLoaded, communities, selectedCommunity]);

  const onLoad = useCallback((map) => {
    if (!isLoaded || !window.google?.maps) return;
    
    setMap(map);
    // Aguardar carregamento da geometry library
    if (window.google.maps.geometry) {
      geometryRef.current = window.google.maps.geometry;
    }
  }, [isLoaded]);

  const onSearchBoxLoad = useCallback((searchBox) => {
    setSearchBox(searchBox);
  }, []);

  const onPlacesChanged = useCallback(() => {
    if (searchBox && map) {
      const places = searchBox.getPlaces();
      if (places.length > 0) {
        const place = places[0];
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        
        map.panTo(location);
        map.setZoom(16);
      }
    }
  }, [searchBox, map]);

  const onDrawingManagerLoad = useCallback((drawingManager) => {
    if (!isLoaded || !window.google?.maps) return;
    setDrawingManager(drawingManager);
  }, [isLoaded]);

  const onPolygonComplete = useCallback((polygon) => {
    if (!isLoaded || !window.google?.maps) return;
    
    // Capturar path do polígono desenhado
    const path = polygon.getPath().getArray().map(point => ({
      lat: point.lat(),
      lng: point.lng()
    }));
    
    setEditedPath(path);
    
    // Remover o polígono temporário do mapa
    polygon.setMap(null);
    
    // Desabilitar drawing mode
    if (drawingManager) {
      drawingManager.setDrawingMode(null);
    }
    
    // Notificar mudança
    if (onGeofenceChange) {
      onGeofenceChange({ type: 'polygon', path });
    }
  }, [isLoaded, drawingManager, onGeofenceChange]);

  const onPolygonEdit = useCallback((polygon) => {
    if (!isLoaded || !window.google?.maps) return;
    
    // Capturar path editado
    const path = polygon.getPath().getArray().map(point => ({
      lat: point.lat(),
      lng: point.lng()
    }));
    
    setEditedPath(path);
    
    // Notificar mudança
    if (onGeofenceChange) {
      onGeofenceChange({ type: 'polygon', path });
    }
  }, [isLoaded, onGeofenceChange]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Validar se ponto está dentro do geofence
  const validateLocation = useCallback((location, community) => {
    if (!isLoaded || !window.google?.maps || !geometryRef.current || !community) return true;

    try {
      // Priorizar polígono se existir
      if (community.geofence) {
        const geofence = typeof community.geofence === 'string' 
          ? JSON.parse(community.geofence) 
          : community.geofence;

        if (geofence.type === 'polygon' && geofence.path) {
          const polygon = new window.google.maps.Polygon({
            paths: geofence.path
          });
          const point = new window.google.maps.LatLng(location.lat, location.lng);
          return geometryRef.current.poly.containsLocation(point, polygon);
        }
      }

      // Fallback para círculo
      if (community.centerLat && community.centerLng && community.radiusMeters) {
        const center = new window.google.maps.LatLng(
          parseFloat(community.centerLat),
          parseFloat(community.centerLng)
        );
        const point = new window.google.maps.LatLng(location.lat, location.lng);
        const distance = window.google.maps.geometry.spherical.computeDistanceBetween(center, point);
        return distance <= community.radiusMeters;
      }

      return true; // Se não tem geofence, permitir
    } catch (error) {
      console.error('Erro na validação de geofence:', error);
      return true; // Em caso de erro, permitir
    }
  }, [isLoaded]);

  const handleMapClick = useCallback((event) => {
    if (!isLoaded || !window.google?.maps) return;
    
    const location = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };

    // Se está definindo centro, capturar clique
    if (editMode && onCenterChange) {
      setCenterCandidate(location);
      return;
    }

    // Lógica original de seleção de localização
    if (!onLocationSelect) return;

    // Validar geofence se necessário
    if (showGeofenceValidation && selectedCommunity) {
      const isValid = validateLocation(location, selectedCommunity);
      setIsOutsideGeofence(!isValid);
      
      if (!isValid) {
        return; // Bloquear seleção fora do polígono
      }
    }

    setIsOutsideGeofence(false);
    onLocationSelect(location);
  }, [isLoaded, onLocationSelect, selectedCommunity, showGeofenceValidation, validateLocation, editMode, onCenterChange]);

  // Renderizar polígonos/círculos dos bairros
  const renderGeofences = () => {
    if (!communities.length) return null;

    return communities.map((community) => {
      const isSelected = selectedCommunity?.id === community.id;

      // Se está em modo edição e tem path editado, usar o editado
      if (editMode && isSelected && editedPath) {
        return (
          <Polygon
            key={`${community.id}-edited`}
            paths={editedPath}
            editable={true}
            draggable={true}
            onMouseUp={(e) => onPolygonEdit(e.overlay)}
            options={{
              fillColor: '#FF9800',
              fillOpacity: 0.4,
              strokeColor: '#F57C00',
              strokeOpacity: 1,
              strokeWeight: 3
            }}
          />
        );
      }

      // Se tem geofence JSON (polígono)
      if (community.geofence) {
        try {
          const geofence = typeof community.geofence === 'string' 
            ? JSON.parse(community.geofence) 
            : community.geofence;

          if (geofence.type === 'polygon' && geofence.path) {
            return (
              <Polygon
                key={community.id}
                paths={geofence.path}
                editable={editMode && isSelected}
                draggable={editMode && isSelected}
                onMouseUp={editMode && isSelected ? (e) => onPolygonEdit(e.overlay) : undefined}
                options={{
                  fillColor: isSelected ? '#2196F3' : '#4CAF50',
                  fillOpacity: isSelected ? 0.3 : 0.2,
                  strokeColor: isSelected ? '#1976D2' : '#388E3C',
                  strokeOpacity: 1,
                  strokeWeight: editMode && isSelected ? 3 : 2
                }}
              />
            );
          }
        } catch (error) {
          console.error(`Erro ao renderizar polígono do bairro ${community.name}:`, error);
        }
      }

      // Se tem coordenadas de círculo (fallback)
      if (community.centerLat && community.centerLng && community.radiusMeters) {
        return (
          <Circle
            key={community.id}
            center={{
              lat: parseFloat(community.centerLat),
              lng: parseFloat(community.centerLng)
            }}
            radius={community.radiusMeters}
            options={{
              fillColor: isSelected ? '#2196F3' : '#4CAF50',
              fillOpacity: isSelected ? 0.3 : 0.2,
              strokeColor: isSelected ? '#1976D2' : '#388E3C',
              strokeOpacity: 1,
              strokeWeight: 2
            }}
          />
        );
      }

      return null;
    });
  };

  // Renderizar placeholders de carregamento
  if (loadError) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Alert severity="error">
          <Typography variant="body2">
            ❌ Erro ao carregar mapa: {loadError.message}
          </Typography>
        </Alert>
      </Box>
    );
  }

  if (!isLoaded) {
    return (
      <Box sx={{ p: 2, textAlign: 'center', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body1">🗺️ Carregando mapa...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {isOutsideGeofence && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            📍 Fora do bairro atendido. Selecione um local dentro da área destacada.
          </Typography>
        </Alert>
      )}

      {showSearch && (
        <Box sx={{ mb: 2 }}>
          <StandaloneSearchBox
            onLoad={onSearchBoxLoad}
            onPlacesChanged={onPlacesChanged}
          >
            <input
              type="text"
              placeholder="Buscar bairro ou endereço..."
              style={{
                boxSizing: 'border-box',
                border: '1px solid transparent',
                width: '100%',
                height: '40px',
                padding: '0 12px',
                borderRadius: '3px',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                fontSize: '14px',
                outline: 'none',
                textOverflow: 'ellipses'
              }}
            />
          </StandaloneSearchBox>
        </Box>
      )}
      
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={15}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        options={mapOptions}
      >
        {editMode && isLoaded && window.google?.maps && (
          <DrawingManager
            onLoad={onDrawingManagerLoad}
            onPolygonComplete={onPolygonComplete}
            options={{
              drawingControl: true,
              drawingControlOptions: {
                position: window.google.maps.ControlPosition.TOP_CENTER,
                drawingModes: [window.google.maps.drawing.OverlayType.POLYGON]
              },
              polygonOptions: {
                fillColor: '#FF9800',
                fillOpacity: 0.4,
                strokeColor: '#F57C00',
                strokeOpacity: 1,
                strokeWeight: 3,
                editable: true,
                draggable: true
              }
            }}
          />
        )}

        {renderGeofences()}
        
        {/* Centro candidato */}
        {centerCandidate && isLoaded && window.google?.maps && (
          <Marker
            position={centerCandidate}
            icon={{
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="8" fill="#FF9800"/>
                  <circle cx="12" cy="12" r="3" fill="white"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(24, 24)
            }}
            title="Centro do Bairro"
          />
        )}

        {/* Centro atual */}
        {selectedCommunity?.centerLat && selectedCommunity?.centerLng && !centerCandidate && isLoaded && window.google?.maps && (
          <Marker
            position={{
              lat: parseFloat(selectedCommunity.centerLat),
              lng: parseFloat(selectedCommunity.centerLng)
            }}
            icon={{
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="8" fill="#2196F3"/>
                  <circle cx="12" cy="12" r="3" fill="white"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(24, 24)
            }}
            title="Centro do Bairro"
          />
        )}
        
        {pickupLocation && isLoaded && window.google?.maps && (
          <Marker
            position={pickupLocation}
            icon={{
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="8" fill="#4CAF50"/>
                  <circle cx="12" cy="12" r="3" fill="white"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(24, 24)
            }}
            title="Ponto de Partida"
          />
        )}
        
        {dropoffLocation && isLoaded && window.google?.maps && (
          <Marker
            position={dropoffLocation}
            icon={{
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="8" fill="#F44336"/>
                  <circle cx="12" cy="12" r="3" fill="white"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(24, 24)
            }}
            title="Destino"
          />
        )}
      </GoogleMap>
    </Box>
  );
};

export default GeofenceMap;
