import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Typography, Box, Card, CardContent, Grid, Button, CircularProgress, Alert } from '@mui/material';
import { DirectionsCar, Explore, Handshake, Apartment, Description, PersonAdd } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

export default function ManagerHome() {
  const [metrics, setMetrics] = useState(null);
  const [territory, setTerritoryData] = useState(null);
  const [referral, setReferral] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const adminData = localStorage.getItem('kaviar_admin_data');
  const admin = adminData ? JSON.parse(adminData) : null;
  const token = localStorage.getItem('kaviar_admin_token');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const [metricsRes, territoryRes, referralRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/dashboard/metrics`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/dashboard/territory`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/operator/referrals`, { headers }),
      ]);

      if (metricsRes.status === 403) {
        setError('Sem território vinculado. Solicite acesso ao administrador.');
        return;
      }

      const metricsData = await metricsRes.json();
      const territoryData = await territoryRes.json();
      const referralData = await referralRes.json();

      if (metricsData.success !== false) setMetrics(metricsData.metrics || metricsData);
      if (territoryData.success) setTerritoryData(territoryData.data);
      if (referralData.success) setReferral(referralData.data);
    } catch { setError('Erro ao carregar dados do território'); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('kaviar_admin_token');
    localStorage.removeItem('kaviar_admin_data');
    window.location.href = '/admin/login';
  };

  if (loading) return (
    <Container maxWidth="lg" sx={{ mt: 6, textAlign: 'center' }}>
      <CircularProgress sx={{ color: '#B8942E' }} />
      <Typography sx={{ mt: 2, color: '#6B7280' }}>Carregando território...</Typography>
    </Container>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FAFAF8', pt: 2, pb: 6 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #E8E5DE', borderTop: '3px solid #B8942E' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              <span style={{ color: '#B8942E' }}>KAVIAR</span> Gestor Territorial
            </Typography>
            <Typography sx={{ color: '#6B7280', fontSize: 12 }}>{admin?.name || 'Gestor'} — acesso operacional do território</Typography>
          </Box>
          <Button onClick={handleLogout} variant="outlined" size="small" sx={{ borderColor: '#E8E5DE', color: '#6B7280', '&:hover': { borderColor: '#B8942E', color: '#B8942E' } }}>
            Sair
          </Button>
        </Box>

        {error && <Alert severity="warning" sx={{ mb: 3 }}>{error}</Alert>}

        {/* KPIs */}
        {metrics && (
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            {[
              { label: 'Motoristas', value: metrics.drivers?.total ?? 0 },
              { label: 'Online', value: metrics.drivers?.online ?? 0 },
              { label: 'Passageiros', value: metrics.passengers?.total ?? 0 },
              { label: 'Corridas', value: metrics.rides?.total ?? 0 },
            ].map(k => (
              <Grid item xs={6} sm={3} key={k.label}>
                <Card sx={{ bgcolor: '#fff', borderTop: '3px solid #B8942E', border: '1px solid #E8E5DE', borderRadius: 2 }}>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#1A1A1A' }}>{k.value}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>{k.label}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Territory metrics */}
        {territory && territory.total > 0 && (
          <Card sx={{ mb: 3, bgcolor: '#fff', border: '1px solid #E8E5DE', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 1 }}>Corridas por Território</Typography>
              <Grid container spacing={1}>
                {[
                  { label: 'Local', value: territory.local },
                  { label: 'Vizinho', value: territory.adjacent },
                  { label: 'Externo', value: territory.external },
                  { label: 'Retorno', value: territory.homebound },
                  { label: 'Total', value: territory.total },
                ].map(t => (
                  <Grid item xs key={t.label}>
                    <Box sx={{ textAlign: 'center', py: 1, bgcolor: '#FAFAF8', borderRadius: 1 }}>
                      <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#1A1A1A' }}>{t.value}</Typography>
                      <Typography sx={{ fontSize: 9, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>{t.label}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Referral quick stats */}
        {referral?.has_code && (
          <Card sx={{ mb: 3, bgcolor: '#fff', border: '1px solid #E8E5DE', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography sx={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Captação</Typography>
                <Typography sx={{ fontSize: 11, color: '#B8942E', fontFamily: 'monospace' }}>{referral.referral_code}</Typography>
              </Box>
              <Grid container spacing={1}>
                {[
                  { label: 'Indicados', value: referral.stats.total },
                  { label: 'Pendentes', value: referral.stats.pending },
                  { label: 'Aprovados', value: referral.stats.qualified },
                ].map(s => (
                  <Grid item xs={4} key={s.label}>
                    <Box sx={{ textAlign: 'center', py: 0.5 }}>
                      <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A' }}>{s.value}</Typography>
                      <Typography sx={{ fontSize: 9, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Modules */}
        <Typography sx={{ fontSize: 12, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 1.5, fontWeight: 600 }}>Módulos</Typography>
        <Grid container spacing={1.5} sx={{ mb: 4 }}>
          {[
            { Icon: DirectionsCar, title: 'Motoristas', desc: 'Motoristas do território', to: '/admin/drivers' },
            { Icon: Explore, title: 'Corridas', desc: 'Corridas do território', to: '/admin/rides' },
            { Icon: PersonAdd, title: 'Indicações', desc: 'Link de captação e indicados', to: '/admin' },
            { Icon: Handshake, title: 'Parceiros', desc: 'Parceiros territoriais', to: '/admin/territorial-partners' },
            { Icon: Apartment, title: 'Associações', desc: 'Operadores e associações locais', to: '/admin/local-operators' },
            { Icon: Description, title: 'Meu Contrato', desc: 'Perfil e termos', to: '/admin/meu-contrato' },
          ].map(c => (
            <Grid item xs={12} sm={6} md={4} key={c.title}>
              <Card component={Link} to={c.to} sx={{ bgcolor: '#fff', border: '1px solid #E8E5DE', borderRadius: 2, textDecoration: 'none', display: 'block', '&:hover': { borderColor: '#B8942E', transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(184,148,46,0.1)' }, transition: 'all 0.2s' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, px: 2 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: 'rgba(184,148,46,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <c.Icon sx={{ fontSize: 18, color: '#B8942E' }} />
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#1A1A1A', fontWeight: 600, fontSize: 13 }}>{c.title}</Typography>
                    <Typography sx={{ color: '#6B7280', fontSize: 11 }}>{c.desc}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', pt: 2, borderTop: '1px solid #E8E5DE' }}>
          <Typography sx={{ color: '#9CA3AF', fontSize: 10 }}>
            KAVIAR é produto da USB Tecnok Manutenção e Instalação de Computadores Ltda — CNPJ 07.710.691/0001-66
          </Typography>
          <Typography sx={{ color: '#D1D5DB', fontSize: 9, mt: 0.5 }}>
            Gestor Territorial — acesso operacional restrito ao território vinculado
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
