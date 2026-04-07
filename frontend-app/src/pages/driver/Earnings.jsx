import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Box,
  Chip,
  Divider,
  Grid
} from '@mui/material';
import {
  AttachMoney,
  DirectionsCar,
  TrendingUp,
  Star,
  AccessTime
} from '@mui/icons-material';
import Layout from '../../components/common/Layout';
import { useDriver } from '../../contexts/DriverContext';

const DriverEarnings = () => {
  const { driverEarnings } = useDriver();

  // Dados mockados para demonstração
  const mockEarningsHistory = [
    { id: 1, time: '14:30', passenger: 'Maria Silva', amount: 28.50, type: 'STANDARD_RIDE', rating: 5 },
    { id: 2, time: '13:15', passenger: 'João Santos', amount: 35.00, type: 'TOUR_GUIDE', rating: 5 },
    { id: 3, time: '12:00', passenger: 'Ana Costa', amount: 18.75, type: 'ELDERLY_ASSISTANCE', rating: 4 },
    { id: 4, time: '11:20', passenger: 'Pedro Lima', amount: 22.30, type: 'STANDARD_RIDE', rating: 5 },
    { id: 5, time: '10:45', passenger: 'Carla Souza', amount: 31.20, type: 'TOUR_GUIDE', rating: 5 }
  ];

  const getServiceTypeInfo = (type) => {
    switch (type) {
      case 'TOUR_GUIDE':
        return { label: '🧭 Guia Turístico', color: 'info' };
      case 'ELDERLY_ASSISTANCE':
        return { label: '🧓 Care', color: 'secondary' };
      default:
        return { label: '🚗 Normal', color: 'primary' };
    }
  };

  const averageRating = mockEarningsHistory.reduce((acc, ride) => acc + ride.rating, 0) / mockEarningsHistory.length;

  return (
    <Layout title="Ganhos do Motorista">
      <Typography variant="h4" gutterBottom>
        Seus Ganhos
      </Typography>

      {/* Resumo do dia */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AttachMoney sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h5" color="success.main">
                R$ {driverEarnings.totalToday.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total hoje
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <DirectionsCar sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h5" color="primary.main">
                {driverEarnings.ridesCompleted}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Corridas hoje
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Estatísticas */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Estatísticas do Dia
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <TrendingUp sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Média por corrida
                </Typography>
                <Typography variant="h6">
                  R$ {(driverEarnings.totalToday / driverEarnings.ridesCompleted).toFixed(2)}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Star sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Avaliação média
                </Typography>
                <Typography variant="h6">
                  {averageRating.toFixed(1)} ⭐
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={4}>
              <Box sx={{ textAlign: 'center' }}>
                <AccessTime sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Tempo online
                </Typography>
                <Typography variant="h6">
                  6h 30m
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Histórico de corridas */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Histórico de Corridas Hoje
          </Typography>
          
          <List>
            {mockEarningsHistory.map((ride, index) => {
              const serviceInfo = getServiceTypeInfo(ride.type);
              return (
                <Fragment key={ride.id}>
                  <ListItem>
                    <ListItemIcon>
                      <AttachMoney color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">
                            {ride.passenger}
                          </Typography>
                          <Chip 
                            label={serviceInfo.label} 
                            size="small" 
                            color={serviceInfo.color} 
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            {ride.time}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {[...Array(ride.rating)].map((_, i) => (
                              <Star key={i} sx={{ fontSize: 14, color: 'warning.main' }} />
                            ))}
                          </Box>
                        </Box>
                      }
                    />
                    <Typography variant="h6" color="success.main">
                      + R$ {ride.amount.toFixed(2)}
                    </Typography>
                  </ListItem>
                  {index < mockEarningsHistory.length - 1 && <Divider />}
                </Fragment>
              );
            })}
          </List>

          {driverEarnings.lastRide > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ 
                p: 2, 
                bgcolor: 'success.light', 
                borderRadius: 2,
                textAlign: 'center'
              }}>
                <Typography variant="body2" color="success.contrastText">
                  <strong>Última corrida finalizada:</strong>
                </Typography>
                <Typography variant="h6" color="success.contrastText">
                  + R$ {driverEarnings.lastRide.toFixed(2)}
                </Typography>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default DriverEarnings;
