import { Box, Card, CardContent, Typography, Button, LinearProgress, Avatar, Chip, Alert } from "@mui/material";
import { DirectionsCar, Phone, Message, CheckCircle, Cancel, Navigation, AccessTime } from "@mui/icons-material";
import { useDriver } from "../../context/DriverContext";
import { FadeInCard, premiumButtonStyles, SuccessAnimation } from "./Animations";
import { StatusCardSkeleton } from "./SkeletonLoaders";

const DriverRideCard = () => {
  const { driverStatus, currentRide, acceptRide, declineRide, completeRide, driverEarnings } = useDriver();

  const getStatusInfo = () => {
    switch (driverStatus) {
      case 'offline':
        return {
          title: 'Você está offline',
          subtitle: 'Ative-se para começar a receber corridas',
          color: 'error',
          showProgress: false
        };
      case 'online':
        return {
          title: 'Você está online',
          subtitle: 'Aguardando novas solicitações...',
          color: 'success',
          showProgress: true,
          showSkeleton: true
        };
      case 'ride_received':
        return {
          title: 'Nova corrida disponível!',
          subtitle: 'Aceite ou recuse esta solicitação',
          color: 'warning',
          showProgress: false
        };
      case 'on_trip':
        return {
          title: 'Viagem em andamento',
          subtitle: 'Levando passageiro ao destino com segurança',
          color: 'primary',
          showProgress: true
        };
      case 'completed':
        return {
          title: 'Viagem finalizada com sucesso!',
          subtitle: 'Parabéns pelo excelente atendimento',
          color: 'success',
          showProgress: false,
          showSuccess: true
        };
      default:
        return null;
    }
  };

  const getServiceTypeInfo = (serviceType) => {
    switch (serviceType) {
      case 'TOUR_GUIDE':
        return { label: '🧭 Guia Turístico', color: 'info' };
      case 'ELDERLY_ASSISTANCE':
        return { label: '🧓 Atendimento Care', color: 'secondary' };
      default:
        return { label: '🚗 Corrida Normal', color: 'primary' };
    }
  };

  const statusInfo = getStatusInfo();
  if (!statusInfo) return null;

  // Mostrar skeleton durante espera online
  if (statusInfo.showSkeleton && driverStatus === 'online') {
    return <StatusCardSkeleton />;
  }

  return (
    <FadeInCard>
      <Card sx={{ 
        mb: 3,
        background: statusInfo.showSuccess 
          ? 'linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%)'
          : driverStatus === 'ride_received'
          ? 'linear-gradient(135deg, #fff3e0 0%, #fef7ed 100%)'
          : 'background.paper',
        border: statusInfo.showSuccess ? '2px solid' : '1px solid',
        borderColor: statusInfo.showSuccess ? 'success.main' : 
                    driverStatus === 'ride_received' ? 'warning.main' : 'divider',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {statusInfo.showSuccess ? (
              <SuccessAnimation show={true}>
                <CheckCircle className="success-icon" sx={{ mr: 2, color: 'success.main', fontSize: 28 }} />
              </SuccessAnimation>
            ) : (
              <DirectionsCar sx={{ mr: 2, color: `${statusInfo.color}.main` }} />
            )}
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" color={`${statusInfo.color}.main`} sx={{ fontWeight: 600 }}>
                {statusInfo.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {statusInfo.subtitle}
              </Typography>
            </Box>
            {currentRide && (
              <Chip 
                label={`R$ ${currentRide.price}`} 
                color={statusInfo.color} 
                variant="filled"
                sx={{ 
                  fontWeight: 600,
                  fontSize: '0.875rem'
                }}
              />
            )}
          </Box>

          {statusInfo.showProgress && (
            <LinearProgress 
              sx={{ 
                mb: 2, 
                borderRadius: 2,
                height: 6,
                backgroundColor: 'rgba(0,0,0,0.08)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 2
                }
              }} 
              color={statusInfo.color}
            />
          )}

          {/* Informações da corrida recebida */}
          {driverStatus === 'ride_received' && currentRide && (
            <Box sx={{ mb: 3 }}>
              <Alert 
                severity="warning" 
                sx={{ 
                  mb: 2,
                  '& .MuiAlert-icon': {
                    fontSize: '1.2rem'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTime sx={{ fontSize: 16 }} />
                  <Typography variant="body2" fontWeight={500}>
                    Tempo para responder: 30 segundos
                  </Typography>
                </Box>
              </Alert>

              {/* Informações do passageiro */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                p: 2.5, 
                bgcolor: 'rgba(255,255,255,0.9)', 
                borderRadius: 3,
                border: '2px solid',
                borderColor: 'warning.light',
                mb: 2,
                transition: 'all 0.2s ease'
              }}>
                <Avatar sx={{ 
                  mr: 2, 
                  bgcolor: 'primary.main',
                  width: 48,
                  height: 48,
                  fontSize: '1.5rem'
                }}>
                  {currentRide.passengerPhoto}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
                    {currentRide.passengerName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Passageiro • Solicitou agora
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h6" color="success.main" fontWeight={700}>
                    R$ {currentRide.price}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    {currentRide.distance} • {currentRide.eta}
                  </Typography>
                </Box>
              </Box>

              {/* Detalhes da viagem */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                  <strong>📍 Origem:</strong> {currentRide.origin}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
                  <strong>🎯 Destino:</strong> {currentRide.destination}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  {(() => {
                    const serviceInfo = getServiceTypeInfo(currentRide.serviceType);
                    return (
                      <Chip 
                        label={serviceInfo.label} 
                        size="small" 
                        color={serviceInfo.color}
                        sx={{ fontWeight: 500 }}
                      />
                    );
                  })()}
                </Box>
              </Box>

              {/* Botões de ação */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button 
                  variant="outlined" 
                  color="error" 
                  startIcon={<Cancel />}
                  onClick={declineRide}
                  sx={{ 
                    ...premiumButtonStyles,
                    flex: 1,
                    py: 1.5,
                    fontWeight: 600
                  }}
                >
                  Recusar
                </Button>
                <Button 
                  variant="contained" 
                  color="success" 
                  startIcon={<CheckCircle />}
                  onClick={acceptRide}
                  sx={{ 
                    ...premiumButtonStyles,
                    flex: 2,
                    py: 1.5,
                    fontWeight: 600,
                    fontSize: '1rem'
                  }}
                >
                  Aceitar Corrida
                </Button>
              </Box>
            </Box>
          )}

          {/* Corrida em andamento */}
          {driverStatus === 'on_trip' && currentRide && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                p: 2.5, 
                background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', 
                borderRadius: 3,
                mb: 2,
                color: 'white',
                boxShadow: '0 4px 20px rgba(25, 118, 210, 0.3)'
              }}>
                <Avatar sx={{ 
                  mr: 2, 
                  bgcolor: 'rgba(255,255,255,0.2)',
                  width: 48,
                  height: 48,
                  fontSize: '1.5rem'
                }}>
                  {currentRide.passengerPhoto}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
                    {currentRide.passengerName}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Destino: {currentRide.destination}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button 
                    size="small" 
                    startIcon={<Phone />} 
                    variant="outlined" 
                    sx={{ 
                      color: 'white', 
                      borderColor: 'rgba(255,255,255,0.5)',
                      '&:hover': {
                        borderColor: 'white',
                        backgroundColor: 'rgba(255,255,255,0.1)'
                      }
                    }}
                  >
                    Ligar
                  </Button>
                  <Button 
                    size="small" 
                    startIcon={<Message />} 
                    variant="outlined" 
                    sx={{ 
                      color: 'white', 
                      borderColor: 'rgba(255,255,255,0.5)',
                      '&:hover': {
                        borderColor: 'white',
                        backgroundColor: 'rgba(255,255,255,0.1)'
                      }
                    }}
                  >
                    Chat
                  </Button>
                </Box>
              </Box>

              <Button 
                variant="contained" 
                color="success" 
                startIcon={<Navigation />}
                onClick={completeRide}
                fullWidth
                size="large"
                sx={{ 
                  ...premiumButtonStyles,
                  py: 1.5,
                  fontWeight: 600,
                  fontSize: '1rem'
                }}
              >
                Finalizar Viagem
              </Button>
            </Box>
          )}

          {/* Corrida finalizada */}
          {driverStatus === 'completed' && currentRide && (
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <SuccessAnimation show={true}>
                <CheckCircle className="success-icon" sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              </SuccessAnimation>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Viagem finalizada com sucesso!
              </Typography>
              <Box sx={{ 
                p: 3, 
                background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)', 
                borderRadius: 3, 
                mb: 2,
                color: 'white',
                boxShadow: '0 8px 25px rgba(76, 175, 80, 0.3)'
              }}>
                <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
                  + R$ {driverEarnings.lastRide}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Ganho desta viagem
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
                Total hoje: R$ {driverEarnings.totalToday.toFixed(2)} • {driverEarnings.ridesCompleted} viagens
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </FadeInCard>
  );
};

export default DriverRideCard;
