import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, LoadScript, Marker, Polygon, Circle } from '@react-google-maps/api';
import { Box, Alert, Typography } from '@mui/material';

const GOOGLE_MAPS_LIBRARIES = ['geometry'];

const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

const defaultCenter = {
  lat: -22.9068,
  lng: -43.1729
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
  showGeofenceValidation = false 
}) => {
  const [map, setMap] = useState(null);
  const [isOutsideGeofence, setIsOutsideGeofence] = useState(false);
  const geometryRef = useRef(null);

  const onLoad = useCallback((map) => {
    setMap(map);
    // Aguardar carregamento da geometry library
    if (window.google && window.google.maps && window.google.maps.geometry) {
      geometryRef.current = window.google.maps.geometry;
    }
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Validar se ponto está dentro do polígono
  const validateLocation = useCallback((location, community) => {
    if (!geometryRef.current || !community?.geofence) return true;

    try {
      const geofence = typeof community.geofence === 'string' 
        ? JSON.parse(community.geofence) 
        : community.geofence;

      if (geofence.type !== 'polygon' || !geofence.path) return true;

      const polygon = new window.google.maps.Polygon({
        paths: geofence.path
      });

      const point = new window.google.maps.LatLng(location.lat, location.lng);
      const isInside = geometryRef.current.poly.containsLocation(point, polygon);
      
      return isInside;
    } catch (error) {
      console.error('Erro na validação de geofence:', error);
      return true; // Em caso de erro, permitir
    }
  }, []);

  const handleMapClick = useCallback((event) => {
    if (!onLocationSelect) return;

    const location = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };

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
  }, [onLocationSelect, selectedCommunity, showGeofenceValidation, validateLocation]);

  // Renderizar polígonos/círculos dos bairros
  const renderGeofences = () => {
    if (!communities.length) return null;

    return communities.map((community) => {
      const isSelected = selectedCommunity?.id === community.id;

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

  return (
    <Box>
      {isOutsideGeofence && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            📍 Fora do bairro atendido. Selecione um local dentro da área destacada.
          </Typography>
        </Alert>
      )}
      
      <LoadScript
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
        libraries={GOOGLE_MAPS_LIBRARIES}
      >
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={defaultCenter}
          zoom={15}
          onLoad={onLoad}
          onUnmount={onUnmount}
          onClick={handleMapClick}
          options={mapOptions}
        >
          {renderGeofences()}
          
          {pickupLocation && (
            <Marker
              position={pickupLocation}
              icon={{
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="8" fill="#4CAF50"/>
                    <circle cx="12" cy="12" r="3" fill="white"/>
                  </svg>
                `),
                scaledSize: window.google?.maps ? new window.google.maps.Size(24, 24) : undefined
              }}
              title="Ponto de Partida"
            />
          )}
          
          {dropoffLocation && (
            <Marker
              position={dropoffLocation}
              icon={{
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="8" fill="#F44336"/>
                    <circle cx="12" cy="12" r="3" fill="white"/>
                  </svg>
                `),
                scaledSize: window.google?.maps ? new window.google.maps.Size(24, 24) : undefined
              }}
              title="Destino"
            />
          )}
        </GoogleMap>
      </LoadScript>
    </Box>
  );
};

export default GeofenceMap;
