import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Divider,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  LocationOn,
  MyLocation,
  AttachMoney,
  Timer,
  Person,
  Diamond
} from '@mui/icons-material';
import Layout from '../../components/common/Layout';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api';

const RideReceived = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const rideData = location.state?.rideData;

  useEffect(() => {
    if (!rideData) {
      navigate('/driver');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleDecline(); // Auto-recusar quando tempo acabar
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [rideData, navigate]);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await api.post(`/api/rides/${rideData.ride_id}/accept`);
      navigate('/driver/ride-active', { state: { rideData } });
    } catch (err) {
      setError('Erro ao aceitar corrida');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    navigate('/driver');
  };

  if (!rideData) {
    return null;
  }

  const serviceConfig = {
    'STANDARD_RIDE': { name: 'Corrida Normal', color: 'default' },
    'TOUR_GUIDE': { name: '🧭 Guia Turístico', color: 'info' },
    'ELDERLY_ASSISTANCE': { name: '🧓 Care', color: 'secondary' }
  };

  const currentService = serviceConfig[rideData.service_type] || serviceConfig['STANDARD_RIDE'];

  return (
    <Layout title="Nova Corrida">
      {/* Timer */}
      <Card sx={{ mb: 3, bgcolor: 'warning.light' }}>
        <CardContent sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="h6" gutterBottom>
            <Timer sx={{ verticalAlign: 'middle', mr: 1 }} />
            {timeLeft}s para responder
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={(30 - timeLeft) / 30 * 100}
            sx={{ mt: 1 }}
          />
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Detalhes da Corrida */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {/* Tipo de Serviço */}
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Chip 
              label={currentService.name}
              color={currentService.color}
              size="large"
              sx={{ mb: 1 }}
            />
            
            {/* Badge de Bônus */}
            {rideData.has_first_accept_bonus && (
              <Box sx={{ mt: 2 }}>
                <Chip
                  icon={<Diamond />}
                  label="💎 Bônus disponível"
                  size="small"
                  sx={{
                    backgroundColor: '#1976d2',
                    color: 'white',
                    '& .MuiChip-icon': { color: '#ffd700' }
                  }}
                />
              </Box>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Passageiro */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              <Person sx={{ verticalAlign: 'middle', mr: 1 }} />
              Passageiro
            </Typography>
            <Typography variant="body1">
              {rideData.passenger_name || 'Nome não informado'}
            </Typography>
          </Box>

          {/* Origem */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              <MyLocation sx={{ verticalAlign: 'middle', mr: 1 }} />
              Origem
            </Typography>
            <Typography variant="body1">
              {rideData.pickup_address}
            </Typography>
          </Box>

          {/* Destino */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              <LocationOn sx={{ verticalAlign: 'middle', mr: 1 }} />
              Destino
            </Typography>
            <Typography variant="body1">
              {rideData.destination_address}
            </Typography>
          </Box>

          {/* Ganhos Estimados */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              <AttachMoney sx={{ verticalAlign: 'middle', mr: 1 }} />
              Ganhos Estimados
            </Typography>
            <Typography variant="h6" color="success.main">
              R$ {rideData.estimated_earnings?.toFixed(2) || '0,00'}
            </Typography>
            
            {rideData.has_first_accept_bonus && (
              <Typography variant="body2" color="primary.main">
                + Bônus de aceite imediato
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="outlined"
          fullWidth
          onClick={handleDecline}
          disabled={loading}
        >
          Recusar
        </Button>
        
        <Button
          variant="contained"
          fullWidth
          onClick={handleAccept}
          disabled={loading}
        >
          Aceitar Corrida
        </Button>
      </Box>
    </Layout>
  );
};

export default RideReceived;
