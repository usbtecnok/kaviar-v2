import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { LocationOn, MyLocation } from '@mui/icons-material';
import GeofenceMap from '../components/maps/GeofenceMap';
import api from '../api';

const RequestRide = () => {
  const [communities, setCommunities] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectingLocation, setSelectingLocation] = useState(null); // 'pickup' ou 'dropoff'
  
  // Fallback confirmation states
  const [showFallbackModal, setShowFallbackModal] = useState(false);
  const [fallbackData, setFallbackData] = useState(null);

  useEffect(() => {
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    try {
      const response = await api.get('/api/governance/communities');
      setCommunities(response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar bairros:', error);
      setError('Erro ao carregar bairros disponíveis');
    }
  };

  const handleCommunityChange = (event) => {
    const communityId = event.target.value;
    setSelectedCommunity(communityId);
    
    // Limpar localizações ao trocar de bairro
    setPickupLocation(null);
    setDropoffLocation(null);
    setPickupAddress('');
    setDropoffAddress('');
    setError('');
  };

  const handleLocationSelect = (location) => {
    if (selectingLocation === 'pickup') {
      setPickupLocation(location);
      setPickupAddress(`${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
      setSelectingLocation(null);
    } else if (selectingLocation === 'dropoff') {
      setDropoffLocation(location);
      setDropoffAddress(`${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
      setSelectingLocation(null);
    }
  };

  const handleRequestRide = async () => {
    if (!selectedCommunity || !pickupLocation || !dropoffLocation) {
      setError('Preencha bairro, ponto de partida e destino');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const rideData = {
        communityId: selectedCommunity,
        pickup: {
          lat: pickupLocation.lat,
          lng: pickupLocation.lng,
          address: pickupAddress
        },
        dropoff: {
          lat: dropoffLocation.lat,
          lng: dropoffLocation.lng,
          address: dropoffAddress
        }
      };

      const response = await api.post('/api/governance/ride/request', rideData);
      
      if (response.data.success) {
        alert('Corrida solicitada com sucesso!');
        // Reset form
        setSelectedCommunity('');
        setPickupLocation(null);
        setDropoffLocation(null);
        setPickupAddress('');
        setDropoffAddress('');
      }
    } catch (error) {
      console.error('Erro ao solicitar corrida:', error);
      
      // Handle fallback confirmation (HTTP 202)
      if (error.response?.status === 202 && error.response?.data?.requiresConfirmation) {
        setFallbackData(error.response.data);
        setShowFallbackModal(true);
        return;
      }
      
      // Handle geofence error from backend
      if (error.response?.status === 403) {
        setError('Você está fora da área atendida');
      } else {
        setError(error.response?.data?.error || 'Erro ao solicitar corrida');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFallbackConfirm = async () => {
    if (!fallbackData?.confirmationToken) return;
    
    setLoading(true);
    try {
      const rideData = {
        communityId: selectedCommunity,
        pickup: {
          lat: pickupLocation.lat,
          lng: pickupLocation.lng,
          address: pickupAddress
        },
        dropoff: {
          lat: dropoffLocation.lat,
          lng: dropoffLocation.lng,
          address: dropoffAddress
        },
        confirmationToken: fallbackData.confirmationToken
      };

      const response = await api.post('/api/governance/ride/request', rideData);
      
      if (response.data.success) {
        alert('Corrida solicitada com motorista de fora da área!');
        setShowFallbackModal(false);
        setFallbackData(null);
        // Reset form
        setSelectedCommunity('');
        setPickupLocation(null);
        setDropoffLocation(null);
        setPickupAddress('');
        setDropoffAddress('');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao confirmar corrida');
    } finally {
      setLoading(false);
    }
  };

  const handleFallbackCancel = () => {
    setShowFallbackModal(false);
    setFallbackData(null);
  };

  const selectedCommunityData = communities.find(c => c.id === selectedCommunity);

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Typography variant="h4" gutterBottom>
        🚗 Solicitar Corrida
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            1. Selecione o Bairro
          </Typography>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Bairro</InputLabel>
            <Select
              value={selectedCommunity}
              onChange={handleCommunityChange}
              label="Bairro"
            >
              {communities.map(community => (
                <MenuItem key={community.id} value={community.id}>
                  {community.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedCommunityData && (
            <Alert severity="info" sx={{ mb: 2 }}>
              📍 Área de atendimento: {selectedCommunityData.name}
              <br />
              Clique no mapa para selecionar pontos dentro da área destacada.
            </Alert>
          )}
        </CardContent>
      </Card>

      {selectedCommunity && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              2. Selecione Localizações no Mapa
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Button
                variant={selectingLocation === 'pickup' ? 'contained' : 'outlined'}
                startIcon={<MyLocation />}
                onClick={() => setSelectingLocation('pickup')}
                color="success"
              >
                Ponto de Partida
              </Button>
              
              <Button
                variant={selectingLocation === 'dropoff' ? 'contained' : 'outlined'}
                startIcon={<LocationOn />}
                onClick={() => setSelectingLocation('dropoff')}
                color="error"
              >
                Destino
              </Button>
            </Box>

            <GeofenceMap
              communities={[selectedCommunityData]}
              selectedCommunity={selectedCommunityData}
              pickupLocation={pickupLocation}
              dropoffLocation={dropoffLocation}
              onLocationSelect={handleLocationSelect}
              showGeofenceValidation={true}
            />

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Ponto de Partida"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: <MyLocation color="success" sx={{ mr: 1 }} />
                }}
              />
              
              <TextField
                label="Destino"
                value={dropoffAddress}
                onChange={(e) => setDropoffAddress(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: <LocationOn color="error" sx={{ mr: 1 }} />
                }}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {pickupLocation && dropoffLocation && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              3. Confirmar Corrida
            </Typography>
            
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleRequestRide}
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? 'Solicitando...' : 'Solicitar Corrida'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Fallback Confirmation Modal */}
      <Dialog open={showFallbackModal} onClose={handleFallbackCancel}>
        <DialogTitle>Sem motoristas na sua área</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Não encontramos motoristas disponíveis na sua área no momento.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Motoristas na área: {fallbackData?.fallbackInfo?.driversInFence || 0}
            <br />
            Motoristas fora da área: {fallbackData?.fallbackInfo?.driversOutOfFence || 0}
          </Typography>
          <Typography variant="body1" sx={{ mt: 2 }}>
            Deseja aceitar um motorista de fora da sua área?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFallbackCancel}>
            Cancelar
          </Button>
          <Button 
            onClick={handleFallbackConfirm} 
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Confirmando...' : 'Aceitar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RequestRide;
