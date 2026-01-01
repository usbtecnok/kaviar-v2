import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  Switch,
  FormControlLabel,
  Grid,
  Chip,
  Alert
} from '@mui/material';
import {
  DirectionsCar,
  AccountBalanceWallet,
  LocationCity,
  Notifications
} from '@mui/icons-material';
import { dashboardAPI, specialServicesAPI } from '../../services/api';

/**
 * TELA HOME DO MOTORISTA
 * 
 * Status de disponibilidade e navegação principal.
 * Dados vêm diretamente do backend.
 */
function DriverHome() {
  const navigate = useNavigate();
  const [isAvailable, setIsAvailable] = useState(false);

  // Buscar dados do dashboard
  const { data: dashboardData } = useQuery(
    'driver-dashboard',
    dashboardAPI.getOverview,
    {
      select: (response) => response.data
    }
  );

  // Buscar habilitações do motorista
  const { data: driverServices } = useQuery(
    'driver-services',
    () => specialServicesAPI.getDriverHistory('current-driver-id', 1),
    {
      select: (response) => response.data
    }
  );

  const handleAvailabilityToggle = () => {
    setIsAvailable(!isAvailable);
    
    if (!isAvailable) {
      // Simular recebimento de corrida após ficar disponível
      setTimeout(() => {
        navigate('/driver/ride-received', {
          state: {
            rideId: 'example-ride-id',
            serviceType: 'COMMUNITY_RIDE',
            pickup: 'Rua das Flores, 123',
            destination: 'Shopping Center',
            passengerName: 'Maria Silva',
            estimatedEarnings: 28.50
          }
        });
      }, 3000);
    }
  };

  // Serviços habilitados (viria do backend)
  const enabledServices = [
    { type: 'COMMUNITY_RIDE', name: 'Corridas Comunitárias', enabled: true },
    { type: 'TOUR_GUIDE', name: 'Guia Turístico', enabled: true },
    { type: 'ELDERLY_ASSISTANCE', name: 'Assistência Idosos', enabled: false },
    { type: 'SPECIAL_ASSISTANCE', name: 'Assistência Especial', enabled: false },
    { type: 'COMMUNITY_SERVICE', name: 'Serviço Comunitário', enabled: true }
  ];

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Olá, Motorista!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {isAvailable ? 'Você está disponível para corridas' : 'Você está offline'}
        </Typography>
      </Box>

      {/* Status de Disponibilidade */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <DirectionsCar 
            sx={{ 
              fontSize: 64, 
              color: isAvailable ? 'success.main' : 'grey.400',
              mb: 2 
            }} 
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={isAvailable}
                onChange={handleAvailabilityToggle}
                size="large"
              />
            }
            label={
              <Typography variant="h6">
                {isAvailable ? 'Disponível' : 'Ficar Disponível'}
              </Typography>
            }
            sx={{ mb: 2 }}
          />
          
          {isAvailable && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Aguardando corridas da sua comunidade...
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Serviços Habilitados */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Seus Serviços Habilitados
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {enabledServices.map((service) => (
              <Chip
                key={service.type}
                label={service.name}
                color={service.enabled ? 'primary' : 'default'}
                variant={service.enabled ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            Você receberá apenas corridas dos serviços habilitados
          </Typography>
        </CardContent>
      </Card>

      {/* Resumo Rápido */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AccountBalanceWallet sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6">R$ 245,80</Typography>
              <Typography variant="body2" color="text.secondary">
                Ganhos hoje
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <LocationCity sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6">Copacabana</Typography>
              <Typography variant="body2" color="text.secondary">
                Sua comunidade
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Navegação */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<AccountBalanceWallet />}
            onClick={() => navigate('/driver/earnings')}
          >
            Ver Ganhos
          </Button>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<LocationCity />}
            onClick={() => navigate('/driver/profile')}
          >
            Minha Comunidade
          </Button>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<Notifications />}
          >
            Notificações
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
}

export default DriverHome;
