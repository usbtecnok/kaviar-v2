import { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  DirectionsCar,
  People,
  TrendingUp,
  AttachMoney
} from '@mui/icons-material';
import Layout from '../../components/common/Layout';
import api from '../../api';

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      const response = await api.get('/api/v1/dashboard/overview');
      // Adaptar resposta do backend para formato esperado pelo frontend
      const backendData = response.data;
      setMetrics({
        rides_today: backendData.rides_today || 0,
        active_drivers: backendData.active_drivers || 0,
        acceptance_rate: backendData.acceptance_rate || 0,
        revenue_today: backendData.revenue_today || 0
      });
    } catch (err) {
      setError('Erro ao carregar métricas do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ title, value, icon, color = 'primary' }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="h2">
              {value || '0'}
            </Typography>
          </Box>
          <Box sx={{ color: `${color}.main` }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Layout title="Admin - Dashboard">
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Admin - Dashboard">
      <Typography variant="h4" gutterBottom>
        Dashboard Administrativo
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Corridas Hoje"
            value={metrics?.rides_today}
            icon={<DirectionsCar sx={{ fontSize: 40 }} />}
            color="primary"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Motoristas Ativos"
            value={metrics?.active_drivers}
            icon={<People sx={{ fontSize: 40 }} />}
            color="success"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Taxa de Aceite"
            value={metrics?.acceptance_rate ? `${metrics.acceptance_rate}%` : '0%'}
            icon={<TrendingUp sx={{ fontSize: 40 }} />}
            color="info"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Receita Hoje"
            value={metrics?.revenue_today ? `R$ ${metrics.revenue_today}` : 'R$ 0'}
            icon={<AttachMoney sx={{ fontSize: 40 }} />}
            color="warning"
          />
        </Grid>
      </Grid>
    </Layout>
  );
};

export default AdminDashboard;
