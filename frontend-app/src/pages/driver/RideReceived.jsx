import { useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Alert
} from '@mui/material';
import { ArrowBack, DirectionsCar } from '@mui/icons-material';
import Layout from '../../components/common/Layout';
import DriverRideCard from '../../components/common/DriverRideCard';
import { useDriver } from '../../context/DriverContext';
import { useNavigate } from 'react-router-dom';

const RideReceived = () => {
  const { driverStatus, currentRide } = useDriver();
  const navigate = useNavigate();

  useEffect(() => {
    // Se não há corrida recebida, redirecionar para home
    if (driverStatus !== 'ride_received' && driverStatus !== 'on_trip') {
      navigate('/motorista/home');
    }
  }, [driverStatus, navigate]);

  if (driverStatus === 'offline' || driverStatus === 'online') {
    return (
      <Layout title="Corrida Recebida">
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <DirectionsCar sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Nenhuma corrida recebida
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Você precisa estar online para receber solicitações de corrida.
            </Typography>
            <Button 
              variant="contained" 
              href="/motorista/home"
              startIcon={<ArrowBack />}
            >
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout title="Corrida Recebida">
      <Typography variant="h4" gutterBottom>
        {driverStatus === 'ride_received' ? 'Nova Corrida!' : 'Corrida em Andamento'}
      </Typography>

      {driverStatus === 'ride_received' && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Atenção:</strong> Você tem tempo limitado para responder a esta solicitação.
          </Typography>
        </Alert>
      )}

      <DriverRideCard />

      {/* Informações adicionais */}
      {currentRide && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Detalhes da Solicitação
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>ID da Corrida:</strong> #{currentRide.id}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Recebida em:</strong> {currentRide.receivedAt?.toLocaleTimeString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Distância:</strong> {currentRide.distance}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Tempo estimado:</strong> {currentRide.eta}
              </Typography>
            </Box>

            {driverStatus === 'on_trip' && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Corrida em andamento. Mantenha contato com o passageiro e dirija com segurança.
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Botão voltar */}
      <Button 
        variant="outlined" 
        href="/motorista"
        startIcon={<ArrowBack />}
        sx={{ mb: 2 }}
      >
        Voltar ao Dashboard
      </Button>
    </Layout>
  );
};

export default RideReceived;
