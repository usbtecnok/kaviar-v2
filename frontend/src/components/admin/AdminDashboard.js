import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  Alert,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Dashboard,
  LocationCity,
  People,
  AttachMoney,
  Assessment,
  Warning,
  TrendingUp
} from '@mui/icons-material';
import { dashboardAPI, alertsAPI } from '../../services/api';

/**
 * DASHBOARD ADMINISTRATIVO
 * 
 * Visão geral do sistema com KPIs e alertas.
 * Dados vêm diretamente do backend.
 */
function AdminDashboard() {
  const navigate = useNavigate();

  // Buscar dados do dashboard
  const { data: dashboardData, isLoading } = useQuery(
    'admin-dashboard',
    dashboardAPI.getOverview,
    {
      select: (response) => response.data
    }
  );

  // Buscar alertas ativos
  const { data: activeAlerts } = useQuery(
    'active-alerts',
    alertsAPI.getActive,
    {
      select: (response) => response.data.alerts || []
    }
  );

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <LinearProgress />
      </Container>
    );
  }

  // KPIs principais (dados do backend)
  const kpis = [
    {
      title: 'Corridas Hoje',
      value: dashboardData?.rides_today || 0,
      icon: <Dashboard />,
      color: 'primary.main'
    },
    {
      title: 'Comunidades Ativas',
      value: dashboardData?.active_communities || 0,
      icon: <LocationCity />,
      color: 'success.main'
    },
    {
      title: 'Motoristas Online',
      value: dashboardData?.drivers_online || 0,
      icon: <People />,
      color: 'info.main'
    },
    {
      title: 'Receita Hoje',
      value: `R$ ${dashboardData?.revenue_today?.toFixed(2) || '0,00'}`,
      icon: <AttachMoney />,
      color: 'warning.main'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard Administrativo
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Visão geral do sistema Kaviar
        </Typography>
      </Box>

      {/* Alertas Ativos */}
      {activeAlerts && activeAlerts.length > 0 && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            <Button size="small" onClick={() => navigate('/admin/alerts')}>
              Ver Todos
            </Button>
          }
        >
          <Typography variant="subtitle2" gutterBottom>
            {activeAlerts.length} alerta(s) ativo(s)
          </Typography>
          {activeAlerts.slice(0, 2).map((alert, index) => (
            <Typography key={index} variant="body2">
              • {alert.message}
            </Typography>
          ))}
        </Alert>
      )}

      {/* KPIs Principais */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpis.map((kpi, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ color: kpi.color, mb: 2 }}>
                  {React.cloneElement(kpi.icon, { sx: { fontSize: 40 } })}
                </Box>
                <Typography variant="h5" gutterBottom>
                  {kpi.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {kpi.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ROI por Comunidade */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <TrendingUp sx={{ verticalAlign: 'middle', mr: 1 }} />
            ROI por Comunidade (Top 5)
          </Typography>
          
          <Grid container spacing={2}>
            {dashboardData?.top_communities?.map((community, index) => (
              <Grid item xs={12} sm={6} md={4} key={community.id}>
                <Box sx={{ p: 2, border: 1, borderColor: 'grey.200', borderRadius: 1 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    {community.name}
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {community.roi}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {community.rides_count} corridas
                  </Typography>
                </Box>
              </Grid>
            )) || (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Dados não disponíveis
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Navegação Rápida */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/communities')}>
            <CardContent sx={{ textAlign: 'center' }}>
              <LocationCity sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6">Comunidades</Typography>
              <Typography variant="body2" color="text.secondary">
                Gerenciar comunidades
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/community-changes')}>
            <CardContent sx={{ textAlign: 'center' }}>
              <People sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
              <Typography variant="h6">Mudanças</Typography>
              <Typography variant="body2" color="text.secondary">
                Aprovar mudanças de comunidade
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/incentives')}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AttachMoney sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
              <Typography variant="h6">Incentivos</Typography>
              <Typography variant="body2" color="text.secondary">
                Configurar bônus
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => navigate('/admin/reports')}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Assessment sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
              <Typography variant="h6">Relatórios</Typography>
              <Typography variant="body2" color="text.secondary">
                Baixar relatórios
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

export default AdminDashboard;
