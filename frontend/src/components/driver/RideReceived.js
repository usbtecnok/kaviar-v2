import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from 'react-query';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  Chip,
  Divider,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  LocationOn,
  MyLocation,
  AttachMoney,
  Timer,
  Person
} from '@mui/icons-material';
import { specialServicesAPI } from '../../services/api';

/**
 * TELA DE CORRIDA RECEBIDA
 * 
 * Motorista vê detalhes da corrida e decide aceitar/recusar.
 * Só mostra corridas para as quais está habilitado (backend valida).
 */
function RideReceived() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const {
    rideId,
    serviceType = 'STANDARD_RIDE',
    pickup,
    destination,
    passengerName,
    estimatedEarnings,
    communityBonus = false
  } = location.state || {};

  const [timeLeft, setTimeLeft] = useState(30); // 30 segundos para aceitar

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Tempo esgotado - recusar automaticamente
      handleDecline();
    }
  }, [timeLeft]);

  // Aceitar corrida
  const acceptRideMutation = useMutation(
    () => specialServicesAPI.recordAcceptance(rideId, 'current-driver-id'),
    {
      onSuccess: () => {
        navigate('/driver/ride-active', {
          state: {
            rideId,
            serviceType,
            pickup,
            destination,
            passengerName
          }
        });
      }
    }
  );

  // Recusar corrida
  const handleDecline = () => {
    navigate('/driver');
  };

  const handleAccept = () => {
    acceptRideMutation.mutate();
  };

  // Configuração do serviço
  const serviceConfig = {
    'STANDARD_RIDE': {
      name: 'Corrida Padrão',
      color: 'default',
      description: 'Corrida comum'
    },
    'COMMUNITY_RIDE': {
      name: 'Corrida Comunitária',
      color: 'primary',
      description: 'Corrida na sua comunidade'
    },
    'TOUR_GUIDE': {
      name: 'Guia Turístico',
      color: 'info',
      description: 'Você será o guia local'
    },
    'ELDERLY_ASSISTANCE': {
      name: 'Assistência a Idosos',
      color: 'secondary',
      description: 'Atendimento especializado'
    },
    'SPECIAL_ASSISTANCE': {
      name: 'Assistência Especial',
      color: 'warning',
      description: 'Cuidado especial necessário'
    },
    'COMMUNITY_SERVICE': {
      name: 'Serviço Comunitário',
      color: 'success',
      description: 'Apoio à comunidade'
    }
  };

  const currentService = serviceConfig[serviceType] || serviceConfig['STANDARD_RIDE'];

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
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
            <Typography variant="body2" color="text.secondary">
              {currentService.description}
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Passageiro */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              <Person sx={{ verticalAlign: 'middle', mr: 1 }} />
              Passageiro
            </Typography>
            <Typography variant="body1">
              {passengerName || 'Nome não informado'}
            </Typography>
          </Box>

          {/* Origem */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              <MyLocation sx={{ verticalAlign: 'middle', mr: 1 }} />
              Origem
            </Typography>
            <Typography variant="body1">
              {pickup || 'Endereço não informado'}
            </Typography>
          </Box>

          {/* Destino */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              <LocationOn sx={{ verticalAlign: 'middle', mr: 1 }} />
              Destino
            </Typography>
            <Typography variant="body1">
              {destination || 'Endereço não informado'}
            </Typography>
          </Box>

          {/* Ganhos Estimados */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              <AttachMoney sx={{ verticalAlign: 'middle', mr: 1 }} />
              Ganhos Estimados
            </Typography>
            <Typography variant="h6" color="success.main">
              R$ {estimatedEarnings?.toFixed(2) || '0,00'}
            </Typography>
            
            {communityBonus && (
              <Chip 
                label="+ Bônus Comunitário"
                color="success"
                size="small"
                sx={{ mt: 1 }}
              />
            )}
          </Box>

          {/* Avisos para serviços especiais */}
          {serviceType === 'ELDERLY_ASSISTANCE' && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Atenção:</strong> Passageiro idoso. Tenha paciência e ofereça ajuda se necessário.
              </Typography>
            </Alert>
          )}

          {serviceType === 'SPECIAL_ASSISTANCE' && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Cuidado especial:</strong> Passageiro com necessidades especiais. Seja atencioso e prestativo.
              </Typography>
            </Alert>
          )}

          {serviceType === 'TOUR_GUIDE' && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Guia turístico:</strong> Compartilhe conhecimentos sobre a região e pontos de interesse.
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="outlined"
          fullWidth
          onClick={handleDecline}
          disabled={acceptRideMutation.isLoading}
        >
          Recusar
        </Button>
        
        <Button
          variant="contained"
          fullWidth
          onClick={handleAccept}
          disabled={acceptRideMutation.isLoading}
          sx={{ 
            bgcolor: 'success.main',
            '&:hover': { bgcolor: 'success.dark' }
          }}
        >
          {acceptRideMutation.isLoading ? 'Aceitando...' : 'Aceitar'}
        </Button>
      </Box>
    </Container>
  );
}

export default RideReceived;
