import { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Card, CardContent, Grid, Chip,
  CircularProgress, Alert, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Tooltip
} from '@mui/material';
import { Science, Info } from '@mui/icons-material';
import api from '../../api';

// Mapa de cores por status de maturidade
const STATUS_COLORS = {
  'Em formação':  { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' },
  'Emergindo':    { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' },
  'Operacional':  { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD' },
  'Forte':        { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
  'Maduro':       { bg: '#FEF9C3', color: '#713F12', border: '#FDE047' },
};

function StatusChip({ status }) {
  const s = STATUS_COLORS[status] ?? STATUS_COLORS['Em formação'];
  return (
    <Chip
      label={status}
      size="small"
      sx={{
        bgcolor: s.bg, color: s.color,
        border: `1px solid ${s.border}`,
        fontWeight: 600, fontSize: 11,
      }}
    />
  );
}

function ScoreBar({ score }) {
  const color = score >= 90 ? '#B8942E' : score >= 75 ? '#16A34A' : score >= 50 ? '#2563EB' : score >= 25 ? '#D97706' : '#9CA3AF';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ flex: 1, height: 6, bgcolor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ width: `${score}%`, height: '100%', bgcolor: color, borderRadius: 3, transition: 'width 0.4s' }} />
      </Box>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color, minWidth: 28 }}>{score}</Typography>
    </Box>
  );
}

const PERIOD_OPTIONS = [
  { value: 7,  label: 'Últimos 7 dias' },
  { value: 14, label: 'Últimos 14 dias' },
  { value: 30, label: 'Últimos 30 dias' },
  { value: 60, label: 'Últimos 60 dias' },
  { value: 90, label: 'Últimos 90 dias' },
];

export default function KaviarLab() {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(`/api/admin/lab/territorial-maturity?days=${days}`)
      .then(res => {
        if (res.data.success) {
          setData(res.data.data);
          setMeta(res.data.meta);
        } else {
          setError('Erro ao carregar dados do KAVIAR Lab.');
        }
      })
      .catch(() => setError('Erro ao carregar dados do KAVIAR Lab.'))
      .finally(() => setLoading(false));
  }, [days]);

  // KPIs resumidos
  const total = data.length;
  const maduro = data.filter(d => d.maturity_status === 'Maduro').length;
  const forte = data.filter(d => d.maturity_status === 'Forte').length;
  const operacional = data.filter(d => d.maturity_status === 'Operacional').length;
  const avgScore = total > 0 ? Math.round(data.reduce((s, d) => s + d.maturity_score, 0) / total) : 0;

  return (
    <Container maxWidth="xl" sx={{ mt: 3, pb: 6 }}>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Science sx={{ color: '#B8942E', fontSize: 28 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.3px' }}>
            KAVIAR Lab — Inteligência Territorial
          </Typography>
          <Chip label="Fase 0 · Beta" size="small" sx={{ bgcolor: 'rgba(184,148,46,0.1)', color: '#B8942E', fontWeight: 600, fontSize: 10 }} />
        </Box>
        <Typography sx={{ color: '#6B7280', fontSize: 13 }}>
          Score de Maturidade Territorial por bairro · Métricas agregadas · Somente leitura
        </Typography>
      </Box>

      {/* Nota metodológica */}
      <Alert
        icon={<Info sx={{ fontSize: 18 }} />}
        severity="info"
        sx={{ mb: 3, fontSize: 12, '& .MuiAlert-message': { lineHeight: 1.6 } }}
      >
        <strong>Metodologia v1 — experimental.</strong> O Score de Maturidade Territorial mede a maturidade
        operacional de cada bairro com base em dados reais da plataforma.{' '}
        Os pesos dos critérios são experimentais e serão calibrados após observação dos dados reais de operação.
        Esta frente tem potencial científico e institucional — os dados são agregados por território e
        nenhuma informação individual é exposta. Snapshots históricos e exportações entrarão em fase futura.
      </Alert>

      {/* Filtro de período + KPIs */}
      <Grid container spacing={2} sx={{ mb: 3 }} alignItems="stretch">
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid #E8E5DE', borderTop: '3px solid #B8942E', borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ pb: '12px !important' }}>
              <FormControl fullWidth size="small">
                <InputLabel>Período</InputLabel>
                <Select value={days} label="Período" onChange={e => setDays(Number(e.target.value))}>
                  {PERIOD_OPTIONS.map(o => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {meta && (
                <Typography sx={{ fontSize: 11, color: '#9CA3AF', mt: 1 }}>
                  {total} território{total !== 1 ? 's' : ''} · Score médio: {avgScore}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        {[
          { label: 'Score médio', value: avgScore, sub: 'todos os bairros' },
          { label: 'Maduro + Forte', value: maduro + forte, sub: `${operacional} operacional` },
          { label: 'Total de bairros', value: total, sub: 'no escopo' },
        ].map(k => (
          <Grid item xs={12} sm={6} md={3} key={k.label}>
            <Card sx={{ border: '1px solid #E8E5DE', borderTop: '3px solid #B8942E', borderRadius: 2, height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', pb: '12px !important' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#B8942E' }}>{k.value}</Typography>
                <Typography sx={{ fontWeight: 600, fontSize: 13, color: '#1A1A1A' }}>{k.label}</Typography>
                <Typography sx={{ fontSize: 11, color: '#9CA3AF' }}>{k.sub}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#B8942E' }} />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && !error && data.length === 0 && (
        <Alert severity="info">Nenhum bairro com dados no período selecionado.</Alert>
      )}

      {/* Tabela principal */}
      {!loading && data.length > 0 && (
        <TableContainer component={Paper} sx={{ border: '1px solid #E8E5DE', borderRadius: 2, boxShadow: 'none' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#FAFAF8' }}>
                {[
                  'Bairro', 'Cidade', 'Território', 'Status',
                  'Score', 'Mot. aprov.', 'Mot. online', 'Passageiros',
                  'Corridas', 'Locais', 'Externas', 'Canceladas',
                  'T. aceite', 'Avaliação', 'Operador', 'Parceiro',
                ].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 600, fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.neighborhood_id} hover sx={{ '&:hover': { bgcolor: 'rgba(184,148,46,0.03)' } }}>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{row.neighborhood}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: '#6B7280' }}>{row.city}</TableCell>
                  <TableCell sx={{ fontSize: 11, color: '#6B7280', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={row.territory} placement="top">
                      <span>{row.territory}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell><StatusChip status={row.maturity_status} /></TableCell>
                  <TableCell sx={{ minWidth: 90 }}><ScoreBar score={row.maturity_score} /></TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center' }}>{row.drivers_approved}</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center' }}>{row.drivers_online}</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center' }}>{row.passengers_total}</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center' }}>{row.rides_total}</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center' }}>{row.rides_local}</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center' }}>{row.rides_external}</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center' }}>{row.rides_canceled}</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center' }}>
                    {row.avg_accept_min != null ? `${row.avg_accept_min} min` : '—'}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center' }}>
                    {row.avg_rating != null ? row.avg_rating.toFixed(1) : '—'}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center' }}>
                    {row.has_operator ? '✓' : '—'}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center' }}>
                    {row.has_partner ? '✓' : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Legenda metodológica */}
      {!loading && data.length > 0 && (
        <Box sx={{ mt: 3, p: 2, bgcolor: '#FAFAF8', border: '1px solid #E8E5DE', borderRadius: 2 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#6B7280', mb: 1 }}>
            Critérios do Score de Maturidade Territorial — Metodologia v1 (experimental)
          </Typography>
          <Grid container spacing={1}>
            {[
              { pts: '25 pts', desc: 'Densidade de motoristas aprovados (satura em 5 motoristas)' },
              { pts: '20 pts', desc: 'Taxa de corridas locais (dentro do próprio território)' },
              { pts: '20 pts', desc: 'Rapidez de aceite (satura em 0 min, zera em 10 min)' },
              { pts: '15 pts', desc: 'Taxa de não-cancelamento' },
              { pts: '10 pts', desc: 'Avaliação média (mínimo 3 avaliações para contabilizar)' },
              { pts: '5 pts',  desc: 'Presença de operador territorial ativo' },
              { pts: '5 pts',  desc: 'Presença de parceiro territorial ativo' },
            ].map(c => (
              <Grid item xs={12} sm={6} md={4} key={c.pts}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <Chip label={c.pts} size="small" sx={{ bgcolor: 'rgba(184,148,46,0.1)', color: '#B8942E', fontWeight: 700, fontSize: 10, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>{c.desc}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
          <Typography sx={{ fontSize: 10, color: '#9CA3AF', mt: 1.5 }}>
            Os pesos são experimentais e serão ajustados conforme a operação real gerar dados suficientes para calibração.
            Esta metodologia tem potencial científico/institucional e poderá evoluir para relatórios formais em fase futura.
            Todos os dados exibidos são agregados por bairro — nenhuma informação individual é exposta.
          </Typography>
        </Box>
      )}
    </Container>
  );
}
