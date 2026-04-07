import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Box,
  Grid,
  Button,
  Chip,
  Alert
} from '@mui/material';
import DirectionsCar from '@mui/icons-material/DirectionsCar';
import AccountBalanceWallet from '@mui/icons-material/AccountBalanceWallet';
import LocationCity from '@mui/icons-material/LocationCity';
import WarningAmber from '@mui/icons-material/WarningAmber';
import PowerSettingsNew from '@mui/icons-material/PowerSettingsNew';
import Layout from '../../components/common/Layout';
import DriverRideCard from '../../components/common/DriverRideCard';
import FamilyBonusCard from '../../components/driver/FamilyBonusCard';
import NeighborhoodStatsCard from '../../components/driver/NeighborhoodStatsCard';
import FenceStatusCard from '../../components/driver/FenceStatusCard';
import { useDriver } from '../../contexts/DriverContext';

const DriverHome = () => {
  const { driverStatus, driverEarnings, goOnline, goOffline, finishRideAndGoOnline } = useDriver();
  const [error, setError] = useState('');

  const handleToggleAvailability = () => {
    setError('');
    try {
      if (driverStatus === 'offline') {
        goOnline();
      } else if (driverStatus === 'online') {
        goOffline();
      }
    } catch (err) {
      setError('Erro ao alterar disponibilidade');
    }
  };

  const handlePanicButton = () => {
    alert('Alerta de emergência enviado! Ajuda está a caminho.');
  };

  const getAvailabilityInfo = () => {
    switch (driverStatus) {
      case 'offline':
        return {
          status: 'OFFLINE',
          color: 'error',
          message: 'Você não está recebendo corridas',
          canToggle: true
        };
      case 'online':
        return {
          status: 'ONLINE',
          color: 'success',
          message: 'Aguardando solicitações de corrida',
          canToggle: true
        };
      case 'ride_received':
        return {
          status: 'CORRIDA RECEBIDA',
          color: 'warning',
          message: 'Responda à solicitação abaixo',
          canToggle: false
        };
      case 'on_trip':
        return {
          status: 'EM VIAGEM',
          color: 'primary',
          message: 'Corrida em andamento',
          canToggle: false
        };
      case 'completed':
        return {
          status: 'CORRIDA FINALIZADA',
          color: 'success',
          message: 'Corrida concluída com sucesso',
          canToggle: false
        };
      default:
        return {
          status: 'DESCONHECIDO',
          color: 'default',
          message: 'Status não identificado',
          canToggle: false
        };
    }
  };

  const availabilityInfo = getAvailabilityInfo();

  return (
    <Layout title="Motorista - Home">
      <Typography variant="h4" gutterBottom>
        Olá, Motorista KAVIAR!
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Status de Disponibilidade */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <DirectionsCar 
            sx={{ 
              fontSize: 64, 
              color: `${availabilityInfo.color}.main`,
              mb: 2
            }} 
          />
          
          <Typography variant="h5" gutterBottom color={`${availabilityInfo.color}.main`}>
            {availabilityInfo.status}
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {availabilityInfo.message}
          </Typography>
          
          {availabilityInfo.canToggle && (
            <FormControlLabel
              control={
                <Switch
                  checked={driverStatus === 'online'}
                  onChange={handleToggleAvailability}
                  size="large"
                  color={driverStatus === 'online' ? 'success' : 'primary'}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PowerSettingsNew />
                  {driverStatus === 'online' ? 'Ficar Offline' : 'Ficar Online'}
                </Box>
              }
              sx={{ mt: 2 }}
            />
          )}

          {driverStatus === 'completed' && (
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={finishRideAndGoOnline}
              sx={{ mt: 2 }}
            >
              Voltar para Online
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Card de status da corrida */}
      <DriverRideCard />

      {/* 🆕 RANKING DO BAIRRO */}
      <NeighborhoodStatsCard driverId={localStorage.getItem('kaviar_driver_id')} />

      {/* 🆕 STATUS DA CERCA */}
      <FenceStatusCard driverId={localStorage.getItem('kaviar_driver_id')} />

      {/* Bônus Familiar */}
      <FamilyBonusCard />

      {/* Resumo Rápido */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AccountBalanceWallet sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6">
                R$ {driverEarnings.totalToday.toFixed(2)}
              </Typography>
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
              <Typography variant="h6">
                {driverEarnings.ridesCompleted}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Corridas hoje
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Serviços Habilitados */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Serviços Habilitados
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label="🚗 Corrida Normal" color="primary" />
            <Chip label="🧭 Guia Turístico" color="info" />
            <Chip label="🧓 Care" color="secondary" />
          </Box>
        </CardContent>
      </Card>

      {/* Botão de Pânico */}
      <Card>
        <CardContent>
          <Button
            variant="contained"
            color="error"
            fullWidth
            size="large"
            startIcon={<WarningAmber />}
            onClick={handlePanicButton}
            sx={{ py: 2 }}
          >
            BOTÃO DE PÂNICO
          </Button>
          <Typography variant="caption" display="block" textAlign="center" mt={1}>
            Use apenas em emergências reais
          </Typography>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default DriverHome;
