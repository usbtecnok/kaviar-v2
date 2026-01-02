import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  DirectionsCar,
  Person,
  Phone,
  Cancel
} from '@mui/icons-material';
import Layout from '../../components/common/Layout';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api';

const RideStatus = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [rideData, setRideData] = useState(location.state?.rideData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!rideData) {
      navigate('/passenger');
      return;
    }

    // Polling para atualizar status da corrida
    const interval = setInterval(() => {
      fetchRideStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [rideData, navigate]);

  const fetchRideStatus = async () => {
    try {
      const response = await api.get(`/api/rides/${rideData.ride_id}/status`);
      setRideData(response.data.data);
    } catch (err) {
      console.error('Erro ao atualizar status da corrida');
    }
  };

  const handleCancelRide = async () => {
    setLoading(true);
    try {
      await api.post(`/api/rides/${rideData.ride_id}/cancel`);
      navigate('/passenger');
    } catch (err) {
      setError('Erro ao cancelar corrida');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      'pending': { label: 'Procurando motorista...', color: 'warning', progress: 25 },
      'accepted': { label: 'Motorista a caminho', color: 'info', progress: 50 },
      'in_progress': { label: 'Em andamento', color: 'primary', progress: 75 },
      'completed': { label: 'Concluída', color: 'success', progress: 100 },
      'cancelled': { label: 'Cancelada', color: 'error', progress: 0 }
    };
    return statusMap[status] || statusMap['pending'];
  };

  if (!rideData) {
    return null;
  }

  const statusInfo = getStatusInfo(rideData.status);

  return (
    <Layout title="Status da Corrida">
      <Typography variant="h4" gutterBottom>
        Status da Corrida
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Status Progress */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Chip 
              label={statusInfo.label}
              color={statusInfo.color}
              size="large"
            />
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={statusInfo.progress}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </CardContent>
      </Card>

      {/* Detalhes da Corrida */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Detalhes da Corrida
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Origem
            </Typography>
            <Typography variant="body1">
              {rideData.pickup_address}
            </Typography>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Destino
            </Typography>
            <Typography variant="body1">
              {rideData.destination_address}
            </Typography>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Tipo de Serviço
            </Typography>
            <Chip 
              label={rideData.service_type_label || 'Corrida Normal'}
              size="small"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Informações do Motorista */}
      {rideData.driver && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <DirectionsCar sx={{ verticalAlign: 'middle', mr: 1 }} />
              Seu Motorista
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Person sx={{ mr: 1 }} />
              <Typography variant="body1">
                {rideData.driver.name}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <DirectionsCar sx={{ mr: 1 }} />
              <Typography variant="body1">
                {rideData.driver.vehicle} - {rideData.driver.plate}
              </Typography>
            </Box>
            
            <Button
              variant="outlined"
              startIcon={<Phone />}
              fullWidth
              href={`tel:${rideData.driver.phone}`}
            >
              Ligar para o Motorista
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      {rideData.status === 'pending' && (
        <Button
          variant="outlined"
          color="error"
          fullWidth
          startIcon={<Cancel />}
          onClick={handleCancelRide}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Cancelar Corrida'}
        </Button>
      )}

      {rideData.status === 'completed' && (
        <Button
          variant="contained"
          fullWidth
          onClick={() => navigate('/passenger/rate', { state: { rideData } })}
        >
          Avaliar Corrida
        </Button>
      )}
    </Layout>
  );
};

export default RideStatus;
