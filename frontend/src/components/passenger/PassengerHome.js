import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  Avatar
} from '@mui/material';
import {
  DirectionsCar,
  Tour,
  Elderly,
  Accessible,
  Handyman,
  Emergency
} from '@mui/icons-material';

/**
 * TELA HOME DO PASSAGEIRO
 * 
 * Exibe opções de serviço baseadas no backend.
 * Cada botão cria corrida com service_type específico.
 */
function PassengerHome() {
  const navigate = useNavigate();

  // Tipos de serviço disponíveis (vem do backend)
  const serviceTypes = [
    {
      type: 'COMMUNITY_RIDE',
      title: 'Corrida na Comunidade',
      description: 'Motorista da sua região',
      icon: <DirectionsCar />,
      color: '#2E7D32'
    },
    {
      type: 'TOUR_GUIDE',
      title: 'Guia Turístico Local',
      description: 'Conheça a região com um local',
      icon: <Tour />,
      color: '#1976D2'
    },
    {
      type: 'ELDERLY_ASSISTANCE',
      title: 'Transporte para Idosos',
      description: 'Atendimento especializado',
      icon: <Elderly />,
      color: '#7B1FA2'
    },
    {
      type: 'SPECIAL_ASSISTANCE',
      title: 'Acompanhamento Especial',
      description: 'Assistência personalizada',
      icon: <Accessible />,
      color: '#F57C00'
    },
    {
      type: 'COMMUNITY_SERVICE',
      title: 'Serviço Comunitário',
      description: 'Apoio à comunidade local',
      icon: <Handyman />,
      color: '#388E3C'
    }
  ];

  const handleServiceSelect = (serviceType) => {
    // Navegar para tela de pedido com tipo de serviço
    navigate('/passenger/ride-request', { 
      state: { serviceType } 
    });
  };

  const handleEmergency = () => {
    // Criar corrida de emergência imediatamente
    navigate('/passenger/ride-request', { 
      state: { 
        serviceType: 'STANDARD_RIDE',
        isEmergency: true 
      } 
    });
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Olá! Como podemos ajudar?
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Escolha o tipo de serviço que você precisa
        </Typography>
      </Box>

      {/* Serviços Disponíveis */}
      <Grid container spacing={3}>
        {serviceTypes.map((service) => (
          <Grid item xs={12} sm={6} md={4} key={service.type}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3
                }
              }}
              onClick={() => handleServiceSelect(service.type)}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Avatar 
                  sx={{ 
                    bgcolor: service.color,
                    width: 56,
                    height: 56,
                    mx: 'auto',
                    mb: 2
                  }}
                >
                  {service.icon}
                </Avatar>
                <Typography variant="h6" gutterBottom>
                  {service.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {service.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Botão de Emergência */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          variant="contained"
          color="error"
          size="large"
          startIcon={<Emergency />}
          onClick={handleEmergency}
          sx={{ 
            minWidth: 200,
            py: 2,
            fontSize: '1.1rem'
          }}
        >
          EMERGÊNCIA
        </Button>
      </Box>

      {/* Navegação */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/passenger/profile')}
        >
          Meu Perfil
        </Button>
      </Box>
    </Container>
  );
}

export default PassengerHome;
