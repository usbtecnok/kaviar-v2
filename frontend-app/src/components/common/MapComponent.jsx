import { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';

const libraries = ['places'];

const MapComponent = ({ 
  pickup, 
  destination, 
  onPickupChange, 
  onDestinationChange,
  showDirections = false 
}) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: libraries
  });

  const [map, setMap] = useState(null);
  const [directions, setDirections] = useState(null);

  const mapContainerStyle = {
    width: '100%',
    height: '300px'
  };

  const center = {
    lat: -22.9068, // Rio de Janeiro default
    lng: -43.1729
  };

  const onLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Calcular rota quando tiver origem e destino
  useEffect(() => {
    if (pickup && destination && showDirections && isLoaded && window.google?.maps) {
      const directionsService = new window.google.maps.DirectionsService();
      
      directionsService.route(
        {
          origin: pickup,
          destination: destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
          }
        }
      );
    }
  }, [pickup, destination, showDirections, isLoaded]);

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
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: '400px' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>🗺️ Carregando mapa...</Typography>
      </Box>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={12}
      onLoad={onLoad}
      onUnmount={onUnmount}
    >
      {pickup && (
        <Marker
          position={pickup}
            icon={{
              url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
            }}
          />
        )}
        
        {destination && (
          <Marker
            position={destination}
            icon={{
              url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
            }}
          />
        )}
        
        {directions && showDirections && (
          <DirectionsRenderer directions={directions} />
        )}
      </GoogleMap>
  );
};

export default MapComponent;
