import { useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import Layout from '../../components/common/Layout';
import RideStatusCard from '../../components/common/RideStatusCard';
import { useRide } from '../../context/RideContext';
import { useNavigate } from 'react-router-dom';
import { normalizeStatusForDisplay, getStatusLabel } from '../../utils/statusMapping';

const RideStatus = () => {
  const { rideStatus, currentRide } = useRide();
  const navigate = useNavigate();

  // Normalize status for backward compatibility
  const displayStatus = normalizeStatusForDisplay(rideStatus);
  const statusLabel = getStatusLabel(displayStatus);

  useEffect(() => {
    // Se não há corrida ativa, redirecionar para home
    if (rideStatus === 'idle') {
      navigate('/passageiro/home');
    }
  }, [rideStatus, navigate]);

  if (rideStatus === 'idle' || !currentRide) {
    return (
      <Layout title="Status da Corrida">
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              Nenhuma corrida ativa
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Você não possui corridas em andamento no momento.
            </Typography>
            <Button 
              variant="contained" 
              href="/passageiro/home"
              startIcon={<ArrowBack />}
            >
              Solicitar Nova Corrida
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout title="Status da Corrida">
      <Typography variant="h4" gutterBottom>
        Acompanhar Corrida
      </Typography>

      <RideStatusCard />

      {/* Informações adicionais */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Detalhes da Viagem
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>ID da Corrida:</strong> #{currentRide.id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Solicitada em:</strong> {currentRide.requestTime?.toLocaleTimeString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Duração estimada:</strong> {currentRide.estimatedDuration}
            </Typography>
          </Box>

          {rideStatus === 'completed' && (
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Button 
                variant="contained" 
                color="primary"
                href="/passageiro/rating"
                size="large"
              >
                Avaliar esta Corrida
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Botão voltar */}
      <Button 
        variant="outlined" 
        href="/passageiro"
        startIcon={<ArrowBack />}
        sx={{ mb: 2 }}
      >
        Voltar ao Dashboard
      </Button>
    </Layout>
  );
};

export default RideStatus;
