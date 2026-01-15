import { useState, useEffect } from 'react';
import { Container, Card, CardContent, Grid, Typography, Alert } from '@mui/material';
import { Assessment, AttachMoney, Inventory, People } from '@mui/icons-material';
import { adminApi } from '../../../services/adminApi';
import DomainHeader from '../../../components/common/DomainHeader';
import PremiumTourismNav from '../../../components/admin/premium-tourism/PremiumTourismNav';

export default function TourReports() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminApi.getTourReportSummary();
      setSummary(data.summary || {});
    } catch (err) {
      setError('Erro ao carregar relatórios');
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 2 }}>
        <Typography>Carregando relatórios...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2 }}>
      <DomainHeader 
        domain="admin" 
        title="Relatórios Premium Tourism"
        breadcrumbs={["Premium/Turismo", "Relatórios"]}
        backUrl="/admin"
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <PremiumTourismNav />
        </Grid>

        <Grid item xs={12} md={9}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Assessment sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h4">{summary?.totalBookings || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total de Reservas
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <AttachMoney sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                  <Typography variant="h4">
                    R$ {Number(summary?.totalRevenue || 0).toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Receita Total
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Inventory sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
                  <Typography variant="h4">{summary?.activePackages || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pacotes Ativos
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <People sx={{ fontSize: 48, color: 'secondary.main', mb: 1 }} />
                  <Typography variant="h4">{summary?.activePartners || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Parceiros Ativos
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
}
