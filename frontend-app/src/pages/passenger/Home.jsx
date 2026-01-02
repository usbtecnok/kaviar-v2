import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Divider
} from '@mui/material';
import {
  MyLocation,
  LocationOn,
  DirectionsCar,
  Warning
} from '@mui/icons-material';
import Layout from '../../components/common/Layout';
import AddressAutocomplete from '../../components/common/AddressAutocomplete';
import MapComponent from '../../components/common/MapComponent';
import RideStatusCard from '../../components/common/RideStatusCard';
import { FadeInCard, premiumButtonStyles } from '../../components/common/Animations';
import { useNavigate } from 'react-router-dom';
import { useRide } from '../../context/RideContext';

const PassengerHome = () => {
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [serviceType, setServiceType] = useState('STANDARD_RIDE');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { rideStatus, requestRide } = useRide();

  const serviceOptions = [
    { value: 'STANDARD_RIDE', label: 'Corrida Normal', description: 'Transporte padrão', icon: '🚗' },
    { value: 'TOUR_GUIDE', label: 'Guia Turístico', description: 'Motorista como guia local', icon: '🧭' },
    { value: 'ELDERLY_ASSISTANCE', label: 'Care / Acompanhamento', description: 'Atendimento especializado', icon: '🧓' }
  ];

  const handleRequestRide = () => {
    if (!pickup || !destination) {
      setError('Preencha origem e destino');
      return;
    }

    setError('');
    requestRide({
      origin: pickup,
      destination: destination,
      serviceType: serviceType,
      pickupCoords,
      destinationCoords
    });

    // Navegar para status da corrida
    setTimeout(() => {
      navigate('/passageiro/status');
    }, 1000);
  };

  const handlePanicButton = () => {
    alert('Alerta de emergência enviado! Ajuda está a caminho.');
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setPickupCoords(coords);
          setPickup(`${coords.lat}, ${coords.lng}`);
        },
        () => {
          setError('Erro ao obter localização atual');
        }
      );
    }
  };

  const selectedService = serviceOptions.find(s => s.value === serviceType);

  return (
    <Layout title="Passageiro - Solicitar Corrida">
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        Solicitar Corrida
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Status da corrida ativa */}
      {rideStatus !== 'idle' && <RideStatusCard />}

      <FadeInCard>
        <Card sx={{ 
          mb: 3,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': rideStatus === 'idle' ? {
            boxShadow: '0 8px 25px rgba(0,0,0,0.12)'
          } : {}
        }}>
          <CardContent sx={{ p: 3 }}>
            {/* Origem */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
                  📍 Onde você está?
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={getCurrentLocation}
                  disabled={rideStatus !== 'idle'}
                  sx={{ 
                    ...premiumButtonStyles,
                    minWidth: 'auto',
                    px: 2
                  }}
                >
                  Localização Atual
                </Button>
              </Box>
              <AddressAutocomplete
                label="Endereço de origem"
                placeholder="Digite seu endereço atual"
                value={pickup}
                onChange={setPickup}
                onPlaceSelect={(place) => {
                  setPickup(place.address);
                  setPickupCoords({ lat: place.lat, lng: place.lng });
                }}
                icon={<MyLocation sx={{ color: 'primary.main' }} />}
                disabled={rideStatus !== 'idle'}
              />
            </Box>

            {/* Destino */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                🎯 Para onde vamos?
              </Typography>
              <AddressAutocomplete
                label="Endereço de destino"
                placeholder="Digite para onde você quer ir"
                value={destination}
                onChange={setDestination}
                onPlaceSelect={(place) => {
                  setDestination(place.address);
                  setDestinationCoords({ lat: place.lat, lng: place.lng });
                }}
                icon={<LocationOn sx={{ color: 'error.main' }} />}
                disabled={rideStatus !== 'idle'}
              />
            </Box>

            {/* Mapa */}
            {(pickupCoords || destinationCoords) && (
              <Box sx={{ mb: 3 }}>
                <MapComponent
                  pickup={pickupCoords}
                  destination={destinationCoords}
                  showDirections={!!(pickupCoords && destinationCoords)}
                />
              </Box>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Tipo de Serviço */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                ✨ Escolha seu serviço
              </Typography>
              <FormControl fullWidth disabled={rideStatus !== 'idle'}>
                <InputLabel>Tipo de Serviço</InputLabel>
                <Select
                  value={serviceType}
                  label="Tipo de Serviço"
                  onChange={(e) => setServiceType(e.target.value)}
                >
                  {serviceOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {option.icon} {option.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Serviço Selecionado */}
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Chip 
                label={`${selectedService?.icon} ${selectedService?.label}`}
                color={serviceType === 'STANDARD_RIDE' ? 'default' : 'primary'}
                size="large"
                sx={{ 
                  fontWeight: 600,
                  fontSize: '1rem',
                  py: 1
                }}
              />
            </Box>

            {/* Botão Solicitar */}
            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={rideStatus === 'requesting' ? null : <DirectionsCar />}
              onClick={handleRequestRide}
              disabled={rideStatus !== 'idle' || !pickup || !destination}
              sx={{ 
                ...premiumButtonStyles,
                mb: 2,
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                background: rideStatus === 'idle' 
                  ? 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)'
                  : undefined
              }}
            >
              {rideStatus === 'requesting' ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1, color: 'white' }} />
                  Buscando motorista KAVIAR...
                </>
              ) : (
                'Solicitar Corrida KAVIAR'
              )}
            </Button>
          </CardContent>
        </Card>
      </FadeInCard>

      {/* Botão de Pânico */}
      <FadeInCard delay={200}>
        <Card>
          <CardContent>
            <Button
              variant="contained"
              color="error"
              fullWidth
              size="large"
              startIcon={<Warning />}
              onClick={handlePanicButton}
              sx={{ 
                py: 2,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)'
              }}
            >
              BOTÃO DE EMERGÊNCIA
            </Button>
            <Typography variant="caption" display="block" textAlign="center" mt={1} color="text.secondary">
              Use apenas em situações de emergência real
            </Typography>
          </CardContent>
        </Card>
      </FadeInCard>
    </Layout>
  );
};

export default PassengerHome;
