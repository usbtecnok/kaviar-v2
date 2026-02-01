import { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Button,
  Chip,
  Alert
} from '@mui/material';
import { 
  People, 
  DirectionsCar, 
  LocationCity, 
  Tour,
  PendingActions,
  CheckCircle
} from '@mui/icons-material';

import { API_BASE_URL } from '../../config/api';

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/dashboard/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setDashboardData({ overview: data });
      } else {
        setError(data.error || 'Erro ao carregar dashboard');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Carregando dashboard...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const { overview, pending } = dashboardData;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Dashboard Administrativo
      </Typography>

      {/* Visão Geral */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Visão Geral
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <DirectionsCar sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {overview.drivers}
              </Typography>
              <Typography color="text.secondary">
                Motoristas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <People sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {overview.passengers}
              </Typography>
              <Typography color="text.secondary">
                Passageiros
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <LocationCity sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {overview.communities}
              </Typography>
              <Typography color="text.secondary">
                Bairros Totais
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                {overview.neighborhoodsByCity && (
                  <>
                    {overview.neighborhoodsByCity['Rio de Janeiro'] && (
                      <Chip 
                        label={`Rio: ${overview.neighborhoodsByCity['Rio de Janeiro']}`} 
                        size="small" 
                        color="primary"
                      />
                    )}
                    {overview.neighborhoodsByCity['São Paulo'] && (
                      <Chip 
                        label={`SP: ${overview.neighborhoodsByCity['São Paulo']}`} 
                        size="small" 
                        color="secondary"
                      />
                    )}
                  </>
                )}
                <Chip 
                  label={`${overview.activeCommunities} ativos`} 
                  size="small" 
                  color="success"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Tour sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {overview.guides}
              </Typography>
              <Typography color="text.secondary">
                Guias Turísticos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pendências */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Aprovações Pendentes
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: pending.drivers > 0 ? 'warning.light' : 'grey.100' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PendingActions sx={{ mr: 1 }} />
                <Typography variant="h6">Motoristas</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                {pending.drivers}
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Aguardando aprovação
              </Typography>
              <Button 
                variant="contained" 
                size="small"
                disabled={pending.drivers === 0}
                href="/admin/drivers?status=pending"
              >
                Revisar
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: pending.guides > 0 ? 'warning.light' : 'grey.100' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PendingActions sx={{ mr: 1 }} />
                <Typography variant="h6">Guias Turísticos</Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                {pending.guides}
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Aguardando aprovação
              </Typography>
              <Button 
                variant="contained" 
                size="small"
                disabled={pending.guides === 0}
                href="/admin/guides?status=pending"
              >
                Revisar
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Menu de Navegação */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Gerenciamento
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <Button
            variant="outlined"
            fullWidth
            sx={{ p: 2, textAlign: 'left' }}
            href="/admin/neighborhoods-by-city"
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Bairros
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gerenciar bairros e ativação
              </Typography>
            </Box>
          </Button>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Button
            variant="outlined"
            fullWidth
            sx={{ p: 2, textAlign: 'left' }}
            href="/admin/drivers"
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Motoristas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Aprovar e gerenciar motoristas
              </Typography>
            </Box>
          </Button>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Button
            variant="outlined"
            fullWidth
            sx={{ p: 2, textAlign: 'left' }}
            href="/admin/passengers"
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Passageiros
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Aprovar e gerenciar passageiros
              </Typography>
            </Box>
          </Button>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Button
            variant="outlined"
            fullWidth
            sx={{ p: 2, textAlign: 'left' }}
            href="/admin/guides"
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Guias Turísticos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Aprovar e gerenciar guias
              </Typography>
            </Box>
          </Button>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Button
            variant="outlined"
            fullWidth
            sx={{ p: 2, textAlign: 'left' }}
            href="/admin/elderly"
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Acompanhamento Ativo
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Contratos de cuidados para idosos
              </Typography>
            </Box>
          </Button>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Button
            variant="outlined"
            fullWidth
            sx={{ p: 2, textAlign: 'left' }}
            href="/admin/beta-monitor"
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Beta Monitor
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Checkpoints + logs + runbook operacional
              </Typography>
            </Box>
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
