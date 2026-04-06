import { useState, useEffect } from 'react';
import { Container, Typography, Box, Card, CardContent, Grid, Chip, CircularProgress, Alert, LinearProgress } from '@mui/material';
import { People, Phone, CheckCircle, DirectionsCar, TrendingUp } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

export default function LeadPerformance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/admin/consultant-leads/performance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error);
    } catch { setError('Erro ao carregar dados'); }
    finally { setLoading(false); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (error) return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
  if (!data) return null;

  const { staff, unassigned, totalLeads } = data;

  const FunnelBar = ({ value, max, color }) => (
    <LinearProgress
      variant="determinate"
      value={max > 0 ? (value / max) * 100 : 0}
      sx={{ height: 8, borderRadius: 4, bgcolor: '#f0f0f0', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 } }}
    />
  );

  const Metric = ({ icon, label, value, color = '#333' }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      {icon}
      <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>{label}</Typography>
      <Typography variant="body1" fontWeight={700} color={color}>{value}</Typography>
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>Performance de Leads</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Funil de conversão por funcionário — {totalLeads} leads ativos, {unassigned} sem atribuição
      </Typography>

      <Grid container spacing={3}>
        {staff.map((s) => (
          <Grid item xs={12} sm={6} md={4} key={s.id}>
            <Card variant="outlined" sx={{ height: '100%', borderRadius: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>{s.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.email}</Typography>
                  </Box>
                  {s.regions && (
                    <Chip label={s.regions} size="small" color="primary" variant="outlined" />
                  )}
                </Box>

                <Metric icon={<People fontSize="small" color="action" />} label="Leads atribuídos" value={s.total} />
                <FunnelBar value={s.total} max={s.total} color="#90caf9" />

                <Box sx={{ mt: 1.5 }} />
                <Metric icon={<Phone fontSize="small" sx={{ color: '#ff9800' }} />} label="Contatados" value={s.contacted} color="#ff9800" />
                <FunnelBar value={s.contacted} max={s.total} color="#ff9800" />

                <Box sx={{ mt: 1.5 }} />
                <Metric icon={<CheckCircle fontSize="small" sx={{ color: '#4caf50' }} />} label="Aprovados" value={s.approved} color="#4caf50" />
                <FunnelBar value={s.approved} max={s.total} color="#4caf50" />

                <Box sx={{ mt: 1.5 }} />
                <Metric icon={<DirectionsCar fontSize="small" sx={{ color: '#2196f3' }} />} label="Ativados (1ª corrida)" value={s.activated} color="#2196f3" />
                <FunnelBar value={s.activated} max={s.total} color="#2196f3" />

                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <TrendingUp fontSize="small" color={s.conversionRate > 0 ? 'success' : 'disabled'} />
                  <Typography variant="h6" fontWeight={800} color={s.conversionRate > 0 ? 'success.main' : 'text.disabled'}>
                    {s.conversionRate}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">taxa de conversão</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {unassigned > 0 && (
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined" sx={{ height: '100%', borderRadius: 3, borderColor: '#ff9800', bgcolor: '#fff8e1' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography variant="h3" fontWeight={800} color="warning.main">{unassigned}</Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>Leads sem atribuição</Typography>
                <Typography variant="caption" color="text.secondary">Precisam de funcionário responsável</Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}
