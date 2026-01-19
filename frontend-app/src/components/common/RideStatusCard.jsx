import { Box, Card, CardContent, Typography, Button, LinearProgress, Avatar, Chip } from "@mui/material";
import { DirectionsCar, Star, Phone, Message, Cancel, CheckCircle } from "@mui/icons-material";
import { useRide } from "../../context/RideContext";
import { FadeInCard, premiumButtonStyles, SuccessAnimation } from "./Animations";
import { RideCardSkeleton } from "./SkeletonLoaders";
import { normalizeStatusForDisplay, getStatusLabel, getStatusColor } from "../../utils/statusMapping";

const RideStatusCard = ({ showActions = true }) => {
  const { rideStatus, currentRide, cancelRide } = useRide();

  // Normalize status for backward compatibility
  const displayStatus = normalizeStatusForDisplay(rideStatus);

  const getStatusInfo = () => {
    switch (displayStatus) {
      case 'requesting':
        return {
          title: 'Buscando motorista KAVIAR...',
          subtitle: 'Encontrando o melhor motorista para você',
          color: 'primary',
          showProgress: true,
          showSkeleton: true
        };
      case 'accepted':
      case 'driver_assigned':
        return {
          title: 'Motorista encontrado!',
          subtitle: `${currentRide?.driver?.name} está a caminho`,
          color: 'success',
          showProgress: false
        };
      case 'started':
      case 'in_progress':
      case 'on_trip':
        return {
          title: 'Viagem em andamento',
          subtitle: 'Tenha uma excelente viagem!',
          color: 'info',
          showProgress: true
        };
      case 'completed':
        return {
          title: 'Viagem finalizada com sucesso',
          subtitle: 'Obrigado por viajar com a KAVIAR',
          color: 'success',
          showProgress: false,
          showSuccess: true
        };
      default:
        return null;
    }
  };

  const statusInfo = getStatusInfo();
  if (!statusInfo || !currentRide) return null;

  // Mostrar skeleton durante busca
  if (statusInfo.showSkeleton) {
    return <RideCardSkeleton />;
  }

  return (
    <FadeInCard>
      <Card sx={{ 
        mb: 3,
        background: statusInfo.color === 'success' 
          ? 'linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%)'
          : 'background.paper',
        border: statusInfo.showSuccess ? '2px solid' : '1px solid',
        borderColor: statusInfo.showSuccess ? 'success.main' : 'divider',
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
            <Chip 
              label={`R$ ${currentRide.price}`} 
              color={statusInfo.color} 
              variant="outlined"
              sx={{ 
                fontWeight: 600,
                fontSize: '0.875rem'
              }}
            />
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

          {/* Informações da corrida */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              <strong>📍 Origem:</strong> {currentRide.origin}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>🎯 Destino:</strong> {currentRide.destination}
            </Typography>
            {currentRide.serviceType === 'TOUR_GUIDE' && (
              <Chip 
                label="🧭 Guia Turístico" 
                size="small" 
                color="info" 
                sx={{ mt: 1, fontWeight: 500 }} 
              />
            )}
          </Box>

          {/* Informações do motorista */}
          {currentRide.driver && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              p: 2.5, 
              bgcolor: 'rgba(255,255,255,0.8)', 
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
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
                {currentRide.driver.photo}
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
                  {currentRide.driver.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Star sx={{ fontSize: 16, color: 'warning.main' }} />
                  <Typography variant="body2" fontWeight={500}>
                    {currentRide.driver.rating}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  🚗 {currentRide.driver.vehicleModel || currentRide.driver.car}
                  {currentRide.driver.vehicleColor ? ` ${currentRide.driver.vehicleColor}` : ''}
                  {' — Placa '}{currentRide.driver.vehiclePlate || currentRide.driver.plate}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Chega em {currentRide.driver.eta}
                </Typography>
              </Box>
              {showActions && rideStatus !== 'completed' && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button 
                    size="small" 
                    startIcon={<Phone />} 
                    variant="outlined"
                    sx={{ 
                      ...premiumButtonStyles,
                      minWidth: 'auto',
                      px: 1.5
                    }}
                  >
                    Ligar
                  </Button>
                  <Button 
                    size="small" 
                    startIcon={<Message />} 
                    variant="outlined"
                    sx={{ 
                      ...premiumButtonStyles,
                      minWidth: 'auto',
                      px: 1.5
                    }}
                  >
                    Chat
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {/* Ações */}
          {showActions && rideStatus === 'requesting' && (
            <Button 
              variant="outlined" 
              color="error" 
              startIcon={<Cancel />}
              onClick={cancelRide}
              fullWidth
              sx={{ 
                ...premiumButtonStyles,
                py: 1.5,
                fontWeight: 600
              }}
            >
              Cancelar Solicitação
            </Button>
          )}

          {showActions && rideStatus === 'completed' && (
            <Button 
              variant="contained" 
              color="primary"
              href="/passageiro/rating"
              fullWidth
              sx={{ 
                ...premiumButtonStyles,
                mt: 1,
                py: 1.5,
                fontWeight: 600,
                fontSize: '1rem'
              }}
            >
              Avaliar sua Experiência
            </Button>
          )}
        </CardContent>
      </Card>
    </FadeInCard>
  );
};

export default RideStatusCard;
