import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Alert, ToggleButton, ToggleButtonGroup, Chip, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';

const GOLD = '#B8942E';

export default function ManagerWomenCoverage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);

  const token = localStorage.getItem('kaviar_admin_token');

  const fetchData = async (period) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/manager/women-coverage?days=${period}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.error || 'Erro ao carregar dados.');
    } catch { setError('Erro de conexão.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(days); }, [days]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FAFAF8', pt: 2, pb: 6 }}>
      <Box sx={{ maxWidth: 900, mx: 'auto', px: 2 }}>
        <Button component={Link} to="/admin" size="small" sx={{ color: '#6B7280', mb: 2 }}>← Voltar ao painel</Button>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1A1A1A' }}>
            <span style={{ color: GOLD }}>KAVIAR</span> para Mulheres
          </Typography>
          <Typography sx={{ color: '#6B7280', fontSize: 13, mt: 0.5 }}>Indicadores de cobertura e atendimento no seu território</Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3, fontSize: 12 }}>
          Dados agregados e somente leitura. Informações individuais de passageiras e motoristas não são exibidas. Valores "{'< 3'}" protegem a privacidade quando há poucas motoristas no bairro.
        </Alert>

        <Box sx={{ mb: 3 }}>
          <ToggleButtonGroup value={days} exclusive onChange={(_, v) => { if (v) setDays(v); }} size="small">
            <ToggleButton value={7} sx={{ textTransform: 'none' }}>7 dias</ToggleButton>
            <ToggleButton value={30} sx={{ textTransform: 'none' }}>30 dias</ToggleButton>
            <ToggleButton value={90} sx={{ textTransform: 'none' }}>90 dias</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {loading && <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress sx={{ color: GOLD }} /></Box>}
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {!loading && data && <>
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            {[
              { label: 'Aptas para preferência', value: data.totals.drivers_matching_ready_display },
              { label: 'Elegíveis', value: data.totals.drivers_eligible_display },
              { label: 'Participantes', value: data.totals.drivers_opt_in_display },
              { label: 'Corridas com preferência', value: data.totals.rides_with_preference },
              { label: 'Concluídas', value: data.totals.rides_completed },
              { label: 'Sem motorista', value: data.totals.rides_no_driver },
              { label: 'Taxa de atendimento', value: `${data.totals.attendance_rate}%` },
            ].map(k => (
              <Grid item xs={6} sm={4} md key={k.label}>
                <Card sx={{ bgcolor: '#fff', borderTop: `3px solid ${GOLD}`, border: '1px solid #E8E5DE', borderRadius: 2 }}>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#1A1A1A' }}>{k.value}</Typography>
                    <Typography sx={{ fontSize: 10, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>{k.label}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {data.by_neighborhood.length > 0 ? (
            <TableContainer component={Paper} sx={{ border: '1px solid #E8E5DE' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#FAFAF8' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Bairro</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Aptas</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Corridas</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Concluídas</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Sem motorista</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.by_neighborhood.map(row => (
                    <TableRow key={row.neighborhood_id}>
                      <TableCell sx={{ fontWeight: 600 }}>{row.neighborhood}</TableCell>
                      <TableCell>{row.drivers_matching_ready_suppressed ? <Chip label="< 3" size="small" sx={{ fontSize: 10 }} /> : row.drivers_matching_ready_display}</TableCell>
                      <TableCell>{row.rides_with_preference}</TableCell>
                      <TableCell>{row.rides_completed}</TableCell>
                      <TableCell>{row.rides_no_driver}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">Nenhum dado disponível para o período selecionado no seu território.</Alert>
          )}

          <Typography sx={{ mt: 3, fontSize: 11, color: '#9CA3AF' }}>
            Taxa de atendimento = corridas completadas ÷ (completadas + sem motorista) × 100. Não inclui cancelamentos.
          </Typography>
        </>}
      </Box>
    </Box>
  );
}
