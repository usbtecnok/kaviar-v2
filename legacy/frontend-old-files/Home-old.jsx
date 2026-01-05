import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Box,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  DirectionsCar,
  AccountBalanceWallet,
  LocationCity,
  Warning
} from '@mui/icons-material';
import Layout from '../../components/common/Layout';
import api from '../../api';

const DriverHome = () => {
  const [driverStatus, setDriverStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchDriverStatus();
  }, []);

  const fetchDriverStatus = async () => {
    try {
      // Usar endpoint existente e adaptar resposta
      const response = await api.get('/health');
      // Mock de dados do motorista baseado na conectividade
      setDriverStatus({
        name: 'Motorista Demo',
        is_available: false,
        earnings_today: 125.50,
        community_name: 'Comunidade Demo',
        can_tour_guide: true,
        can_elderly_assistance: false,
        current_location: null
      });
    } catch (err) {
      setError('Erro ao carregar status do motorista');
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async () => {
    setUpdating(true);
    try {
      // Usar endpoint real de disponibilidade
      await api.post('/api/v1/drivers/availability', {
        is_available: !driverStatus.is_available
      });
      
      // Atualizar estado local
      setDriverStatus(prev => ({
        ...prev,
        is_available: !prev.is_available
      }));
    } catch (err) {
      setError('Erro ao atualizar disponibilidade');
    } finally {
      setUpdating(false);
    }
  };

  const handlePanicButton = async () => {
    try {
      await api.post('/api/messages/panic', {
        user_type: 'driver',
        location: driverStatus.current_location,
        message: 'Alerta de emergência acionado pelo motorista'
      });
      alert('Alerta de emergência enviado! Ajuda está a caminho.');
    } catch (err) {
      setError('Erro ao enviar alerta de emergência');
    }
  };

  if (loading) {
    return (
      <Layout title="Motorista">
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Motorista - Home">
      <Typography variant="h4" gutterBottom>
        Olá, {driverStatus?.name || 'Motorista'}!
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
              color: driverStatus?.is_available ? 'success.main' : 'grey.400',
              mb: 2
            }} 
          />
          
          <Typography variant="h5" gutterBottom>
            {driverStatus?.is_available ? 'Você está DISPONÍVEL' : 'Você está OFFLINE'}
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={driverStatus?.is_available || false}
                onChange={toggleAvailability}
                disabled={updating}
                size="large"
              />
            }
            label={driverStatus?.is_available ? 'Disponível para corridas' : 'Ficar disponível'}
            sx={{ mt: 2 }}
          />
        </CardContent>
      </Card>

      {/* Resumo Rápido */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AccountBalanceWallet sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6">
                R$ {driverStatus?.earnings_today?.toFixed(2) || '0,00'}
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
                {driverStatus?.community_name || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sua comunidade
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
            <Chip label="Corrida Normal" color="primary" />
            {driverStatus?.can_tour_guide && (
              <Chip label="🧭 Guia Turístico" color="info" />
            )}
            {driverStatus?.can_elderly_assistance && (
              <Chip label="🧓 Care" color="secondary" />
            )}
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
            startIcon={<Warning />}
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
