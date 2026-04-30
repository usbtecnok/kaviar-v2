import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Button,
  Chip,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { 
  People, 
  DirectionsCar, 
  LocationCity, 
  Tour,
  PendingActions,
  CheckCircle,
  Home,
  MyLocation,
  NearMe,
  PublicOff
} from '@mui/icons-material';

import { API_BASE_URL } from '../../config/api';

const gold = '#b8960c';
const fmt = (v, prefix = '') => v == null ? '—' : `${prefix}${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: prefix === 'R$\u00a0' ? 2 : 0, maximumFractionDigits: prefix === 'R$\u00a0' ? 2 : 1 })}`;

function OpsCard({ label, value, sub, color }) {
  return (
    <Card sx={{ bgcolor: '#111217', border: '1px solid #222', height: '100%' }}>
      <CardContent sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="h5" fontWeight="800" sx={{ color: color || '#E8E3D5' }}>{value}</Typography>
        <Typography variant="caption" sx={{ color: '#aaa', display: 'block', mt: 0.5 }}>{label}</Typography>
        {sub && <Typography variant="caption" sx={{ color: '#666', fontSize: 10 }}>{sub}</Typography>}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [territoryData, setTerritoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [opsPeriod, setOpsPeriod] = useState('today');
  const [opsData, setOpsData] = useState(null);
  const [opsLoading, setOpsLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchTerritoryData();
  }, []);

  useEffect(() => {
    fetchOpsData(opsPeriod);
  }, [opsPeriod]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/dashboard/overview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) setDashboardData(data);
      else setError(data.error || 'Erro ao carregar dashboard');
    } catch (error) {
      setError('Erro de conexão');
    } finally { setLoading(false); }
  };

  const fetchTerritoryData = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/dashboard/territory`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setTerritoryData(data.data);
    } catch {}
  };

  const fetchOpsData = async (period) => {
    setOpsLoading(true);
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const res = await fetch(`${API_BASE_URL}/api/admin/dashboard/operations?period=${period}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) setOpsData(json.data);
    } catch {}
    finally { setOpsLoading(false); }
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

  const overview = dashboardData;
  const pending = dashboardData.pending;

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
                component={Link} to="/admin/drivers?status=pending"
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
                component={Link} to="/admin/guides?status=pending"
              >
                Revisar
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Operação Territorial */}
      {territoryData && territoryData.total > 0 && (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Operação Territorial
          </Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Home sx={{ color: '#2e7d32', mb: 0.5 }} />
                  <Typography variant="h5" fontWeight="800">{territoryData.homebound}</Typography>
                  <Typography variant="caption" color="text.secondary">Retorno casa</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography sx={{ fontSize: 20, mb: 0.5 }}>💰</Typography>
                  <Typography variant="h5" fontWeight="800" color="#b8960c">{territoryData.homeboundReduced}</Typography>
                  <Typography variant="caption" color="text.secondary">Taxa reduzida</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <MyLocation sx={{ color: 'primary.main', mb: 0.5 }} />
                  <Typography variant="h5" fontWeight="800">{territoryData.local}</Typography>
                  <Typography variant="caption" color="text.secondary">Mesma região</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <NearMe sx={{ color: 'warning.main', mb: 0.5 }} />
                  <Typography variant="h5" fontWeight="800">{territoryData.adjacent}</Typography>
                  <Typography variant="caption" color="text.secondary">Bairro vizinho</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <PublicOff sx={{ color: 'text.secondary', mb: 0.5 }} />
                  <Typography variant="h5" fontWeight="800">{territoryData.external}</Typography>
                  <Typography variant="caption" color="text.secondary">Fora território</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <DirectionsCar sx={{ color: 'success.main', mb: 0.5 }} />
                  <Typography variant="h5" fontWeight="800">{territoryData.total}</Typography>
                  <Typography variant="caption" color="text.secondary">Total corridas</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {/* Operações */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6" sx={{ color: gold, fontWeight: 700 }}>⚡ Operações</Typography>
          <ToggleButtonGroup
            value={opsPeriod}
            exclusive
            onChange={(_, v) => v && setOpsPeriod(v)}
            size="small"
            sx={{ '& .MuiToggleButton-root': { color: '#aaa', borderColor: '#333', px: 2 }, '& .Mui-selected': { color: gold, borderColor: gold, bgcolor: '#1a1500 !important' } }}
          >
            <ToggleButton value="today">Hoje</ToggleButton>
            <ToggleButton value="7d">7 dias</ToggleButton>
            <ToggleButton value="30d">30 dias</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {opsLoading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress sx={{ color: gold }} /></Box>
        ) : opsData ? (
          <>
            {/* Corridas */}
            <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>Corridas</Typography>
            <Grid container spacing={1.5} sx={{ mt: 0.5, mb: 2 }}>
              {[
                { label: 'Concluídas', value: fmt(opsData.rides?.completed), color: '#4caf50' },
                { label: 'Canceladas', value: fmt(opsData.rides?.canceled), color: '#ef5350' },
                { label: 'Sem motorista', value: fmt(opsData.rides?.no_driver), color: '#ff9800' },
                { label: 'Com espera', value: fmt(opsData.rides?.with_wait), color: gold },
                { label: 'Com ajuste', value: fmt(opsData.rides?.with_adjustment), color: '#90caf9' },
                { label: 'Ajustes aceitos', value: fmt(opsData.rides?.adjustments_accepted), color: '#ce93d8' },
              ].map(c => (
                <Grid item xs={6} sm={4} md={2} key={c.label}>
                  <OpsCard label={c.label} value={c.value} color={c.color} />
                </Grid>
              ))}
            </Grid>

            {/* Financeiro */}
            <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>Financeiro</Typography>
            <Grid container spacing={1.5} sx={{ mt: 0.5, mb: 2 }}>
              {[
                { label: 'Valor bruto', value: fmt(opsData.financials?.gross_total, 'R$\u00a0'), color: '#4caf50' },
                { label: 'Créditos consumidos', value: fmt(opsData.financials?.credits_consumed), color: gold },
                { label: 'Receita em créditos', value: fmt(opsData.financials?.platform_revenue_credits, 'R$\u00a0'), color: '#ce93d8', sub: 'créditos × R$2' },
                { label: 'Wait charge est.', value: fmt(opsData.financials?.wait_charge_estimated, 'R$\u00a0'), color: '#ff9800', sub: 'sem ajuste motorista' },
              ].map(c => (
                <Grid item xs={6} sm={3} key={c.label}>
                  <OpsCard label={c.label} value={c.value} color={c.color} sub={c.sub} />
                </Grid>
              ))}
            </Grid>

            {/* Espera */}
            <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>Espera</Typography>
            <Grid container spacing={1.5} sx={{ mt: 0.5, mb: 2 }}>
              {[
                { label: 'Espera média', value: opsData.wait?.avg_minutes != null ? `${fmt(opsData.wait.avg_minutes)} min` : '—', color: gold },
                { label: 'Espera total', value: opsData.wait?.total_minutes != null ? `${fmt(opsData.wait.total_minutes)} min` : '—', color: '#90caf9' },
              ].map(c => (
                <Grid item xs={6} sm={3} key={c.label}>
                  <OpsCard label={c.label} value={c.value} color={c.color} />
                </Grid>
              ))}
            </Grid>

            {/* Território */}
            <Typography variant="caption" sx={{ color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>Território (período)</Typography>
            <Grid container spacing={1.5} sx={{ mt: 0.5, mb: 2 }}>
              {[
                { label: 'Local', value: fmt(opsData.territory?.local), color: '#4caf50' },
                { label: 'Adjacent', value: fmt(opsData.territory?.adjacent), color: '#ff9800' },
                { label: 'External', value: fmt(opsData.territory?.external), color: '#aaa' },
              ].map(c => (
                <Grid item xs={4} sm={2} key={c.label}>
                  <OpsCard label={c.label} value={c.value} color={c.color} />
                </Grid>
              ))}
            </Grid>

            {/* Rankings */}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card sx={{ bgcolor: '#111217', border: '1px solid #222' }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: gold, mb: 1 }}>🏘️ Top Bairros (origem)</Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: '#666', borderColor: '#222', py: 0.5 }}>#</TableCell>
                          <TableCell sx={{ color: '#666', borderColor: '#222', py: 0.5 }}>Bairro</TableCell>
                          <TableCell align="right" sx={{ color: '#666', borderColor: '#222', py: 0.5 }}>Corridas</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(opsData.top_neighborhoods || []).slice(0, 8).map((n, i) => (
                          <TableRow key={n.name}>
                            <TableCell sx={{ color: '#555', borderColor: '#1a1a1a', py: 0.5 }}>{i + 1}</TableCell>
                            <TableCell sx={{ color: '#ddd', borderColor: '#1a1a1a', py: 0.5 }}>{n.name}</TableCell>
                            <TableCell align="right" sx={{ color: gold, fontWeight: 700, borderColor: '#1a1a1a', py: 0.5 }}>{n.rides}</TableCell>
                          </TableRow>
                        ))}
                        {(!opsData.top_neighborhoods?.length) && (
                          <TableRow><TableCell colSpan={3} sx={{ color: '#555', borderColor: '#1a1a1a', textAlign: 'center' }}>—</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card sx={{ bgcolor: '#111217', border: '1px solid #222' }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: gold, mb: 1 }}>🚗 Top Motoristas</Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: '#666', borderColor: '#222', py: 0.5 }}>Motorista</TableCell>
                          <TableCell align="right" sx={{ color: '#666', borderColor: '#222', py: 0.5 }}>Corridas</TableCell>
                          <TableCell align="right" sx={{ color: '#666', borderColor: '#222', py: 0.5 }}>Créditos</TableCell>
                          <TableCell align="right" sx={{ color: '#666', borderColor: '#222', py: 0.5 }}>Espera</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(opsData.top_drivers || []).slice(0, 8).map((d) => (
                          <TableRow key={d.name}>
                            <TableCell sx={{ color: '#ddd', borderColor: '#1a1a1a', py: 0.5 }}>{d.name}</TableCell>
                            <TableCell align="right" sx={{ color: gold, fontWeight: 700, borderColor: '#1a1a1a', py: 0.5 }}>{d.rides}</TableCell>
                            <TableCell align="right" sx={{ color: '#90caf9', borderColor: '#1a1a1a', py: 0.5 }}>{d.credits}</TableCell>
                            <TableCell align="right" sx={{ color: '#aaa', borderColor: '#1a1a1a', py: 0.5 }}>{d.wait_min > 0 ? `${d.wait_min}m` : '—'}</TableCell>
                          </TableRow>
                        ))}
                        {(!opsData.top_drivers?.length) && (
                          <TableRow><TableCell colSpan={4} sx={{ color: '#555', borderColor: '#1a1a1a', textAlign: 'center' }}>—</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        ) : (
          <Typography sx={{ color: '#555' }}>Sem dados disponíveis.</Typography>
        )}
      </Box>

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
            component={Link} to="/admin/neighborhoods-by-city"
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
            component={Link} to="/admin/drivers"
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
            component={Link} to="/admin/passengers"
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Passageiros
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gerenciar passageiros
              </Typography>
            </Box>
          </Button>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Button
            variant="outlined"
            fullWidth
            sx={{ p: 2, textAlign: 'left' }}
            component={Link} to="/admin/guides"
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
            component={Link} to="/admin/elderly"
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
            component={Link} to="/admin/rides/audit"
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Audit Logs
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Histórico de ações administrativas
              </Typography>
            </Box>
          </Button>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Button
            variant="outlined"
            fullWidth
            sx={{ p: 2, textAlign: 'left' }}
            component={Link} to="/admin/beta-monitor"
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Beta Monitor
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Checkpoints e runbooks operacionais
              </Typography>
            </Box>
          </Button>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Button
            variant="outlined"
            fullWidth
            sx={{ p: 2, textAlign: 'left' }}
            component={Link} to="/admin/match-monitor"
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Match Monitor
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Monitorar matches em tempo real
              </Typography>
            </Box>
          </Button>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Button
            variant="outlined"
            fullWidth
            sx={{ p: 2, textAlign: 'left' }}
            component={Link} to="/admin/feature-flags"
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Feature Flags
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Controle de features e allowlists
              </Typography>
            </Box>
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
