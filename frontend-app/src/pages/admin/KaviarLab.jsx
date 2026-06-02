import { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Card, CardContent, Grid, Chip,
  CircularProgress, Alert, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Tooltip
} from '@mui/material';
import { Science, TrendingUp, TrendingDown, Circle } from '@mui/icons-material';
import api from '../../api';

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
      sx={{ bgcolor: s.bg, color: s.color, border: `1px solid ${s.border}`, fontWeight: 600, fontSize: 11 }}
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

  const total = data.length;
  const maduro = data.filter(d => d.maturity_status === 'Maduro').length;
  const forte = data.filter(d => d.maturity_status === 'Forte').length;
  const operacional = data.filter(d => d.maturity_status === 'Operacional').length;
  const avgScore = total > 0 ? Math.round(data.reduce((s, d) => s + d.maturity_score, 0) / total) : 0;

  const sorted = [...data].sort((a, b) => b.maturity_score - a.maturity_score);
  const top3 = sorted.slice(0, 3);
  const bottom3 = sorted.slice(-3).reverse();

  return (
    <Container maxWidth="xl" sx={{ mt: 3, pb: 6 }}>

      {/* === BLOCO EXPLICATIVO PREMIUM === */}
      <Box sx={{
        mb: 4, p: 3.5, borderRadius: 3,
        bgcolor: '#0D0D0D', border: '1px solid #B8942E',
        background: 'linear-gradient(135deg, #0D0D0D 0%, #1A1A1A 100%)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Science sx={{ color: '#B8942E', fontSize: 30 }} />
          <Typography sx={{ fontWeight: 700, fontSize: 20, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
            KAVIAR Lab — Inteligência Territorial
          </Typography>
          <Chip label="v1 · Experimental" size="small" sx={{ bgcolor: 'rgba(184,148,46,0.15)', color: '#B8942E', fontWeight: 700, fontSize: 10 }} />
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography sx={{ color: '#B8942E', fontWeight: 700, fontSize: 13, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              O que é o KAVIAR Lab
            </Typography>
            <Typography sx={{ color: '#E5E5E5', fontSize: 13, lineHeight: 1.7 }}>
              O KAVIAR Lab é o centro de inteligência territorial da plataforma KAVIAR. Ele analisa dados
              reais e agregados da operação para medir o grau de maturidade de cada bairro, comunidade ou
              território de mobilidade comunitária. Todos os dados são agregados — nenhuma informação individual é exposta.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography sx={{ color: '#B8942E', fontWeight: 700, fontSize: 13, mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Score de Maturidade Territorial
            </Typography>
            <Typography sx={{ color: '#E5E5E5', fontSize: 13, lineHeight: 1.7 }}>
              O Score de Maturidade Territorial é um índice de 0 a 100 que combina densidade de motoristas,
              volume de corridas locais, rapidez de aceite, taxa de não cancelamento, avaliação média e
              presença de operadores/parceiros no território. Quanto maior o score, mais maduro e autossuficiente é o território.
            </Typography>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid rgba(184,148,46,0.2)' }}>
          <Typography sx={{ color: '#9CA3AF', fontSize: 11, lineHeight: 1.6 }}>
            ⚠️ Metodologia experimental v1 — os pesos dos critérios serão calibrados conforme a operação gerar dados
            suficientes. Esta frente tem potencial científico e institucional e poderá evoluir para relatórios formais,
            exportações e snapshots históricos em fases futuras.
          </Typography>
        </Box>
      </Box>

      {/* === KPI CARDS PREMIUM === */}
      <Grid container spacing={2} sx={{ mb: 3 }} alignItems="stretch">
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ pb: '12px !important' }}>
              <FormControl fullWidth size="small" sx={{
                '& .MuiOutlinedInput-root': { color: '#E5E5E5', '& fieldset': { borderColor: '#3A3A3A' }, '&:hover fieldset': { borderColor: '#B8942E' } },
                '& .MuiInputLabel-root': { color: '#9CA3AF' },
                '& .MuiSelect-icon': { color: '#9CA3AF' },
              }}>
                <InputLabel>Período</InputLabel>
                <Select value={days} label="Período" onChange={e => setDays(Number(e.target.value))}
                  MenuProps={{ PaperProps: { sx: { bgcolor: '#1A1A1A', color: '#E5E5E5' } } }}>
                  {PERIOD_OPTIONS.map(o => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {meta && (
                <Typography sx={{ fontSize: 11, color: '#6B7280', mt: 1 }}>
                  {total} território{total !== 1 ? 's' : ''} analisado{total !== 1 ? 's' : ''}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        {[
          { label: 'Score Médio', value: avgScore, sub: 'todos os territórios' },
          { label: 'Maduro + Forte', value: maduro + forte, sub: `${operacional} operacional` },
          { label: 'Total Territórios', value: total, sub: 'no escopo do período' },
        ].map(k => (
          <Grid item xs={12} sm={6} md={3} key={k.label}>
            <Card sx={{ bgcolor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 2, height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', pb: '12px !important' }}>
                <Typography sx={{ fontWeight: 800, fontSize: 32, color: '#B8942E', lineHeight: 1.2 }}>{k.value}</Typography>
                <Typography sx={{ fontWeight: 600, fontSize: 13, color: '#E5E5E5', mt: 0.5 }}>{k.label}</Typography>
                <Typography sx={{ fontSize: 11, color: '#6B7280' }}>{k.sub}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* === DESTAQUES: TOP 3 + ATENÇÃO === */}
      {!loading && data.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2.5, bgcolor: '#0D0D0D', border: '1px solid #1E3A1E', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUp sx={{ color: '#16A34A', fontSize: 20 }} />
                <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#16A34A' }}>
                  Territórios Mais Maduros
                </Typography>
              </Box>
              {top3.map((t, i) => (
                <Box key={t.neighborhood_id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: i < 2 ? 1.5 : 0 }}>
                  <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#B8942E', minWidth: 22 }}>
                    {i + 1}º
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#E5E5E5' }}>{t.neighborhood}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#6B7280' }}>{t.city}</Typography>
                  </Box>
                  <StatusChip status={t.maturity_status} />
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#16A34A', minWidth: 30, textAlign: 'right' }}>
                    {t.maturity_score}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2.5, bgcolor: '#0D0D0D', border: '1px solid #3A1E1E', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingDown sx={{ color: '#DC2626', fontSize: 20 }} />
                <Typography sx={{ fontWeight: 700, fontSize: 14, color: '#DC2626' }}>
                  Territórios Cadastrados que Precisam de Atenção
                </Typography>
              </Box>
              {bottom3.map((t, i) => (
                <Box key={t.neighborhood_id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: i < 2 ? 1.5 : 0 }}>
                  <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#6B7280', minWidth: 22 }}>
                    {i + 1}º
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#E5E5E5' }}>{t.neighborhood}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#6B7280' }}>{t.city}</Typography>
                  </Box>
                  <StatusChip status={t.maturity_status} />
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#DC2626', minWidth: 30, textAlign: 'right' }}>
                    {t.maturity_score}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Grid>
        </Grid>
      )}

      {/* === LEGENDA SIMPLIFICADA === */}
      {!loading && data.length > 0 && (
        <Box sx={{ mb: 3, p: 2, bgcolor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 2 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#E5E5E5', mb: 1.5 }}>
            Como interpretar o Score
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {[
              { color: '#16A34A', label: 'Score ≥ 75', desc: 'Território com sinais fortes de maturidade operacional' },
              { color: '#D97706', label: 'Score 25–74', desc: 'Território em desenvolvimento, precisa crescer' },
              { color: '#9CA3AF', label: 'Score < 25', desc: 'Precisa de mais motoristas, corridas ou consistência' },
            ].map(l => (
              <Box key={l.label} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Circle sx={{ color: l.color, fontSize: 10, mt: 0.4 }} />
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: l.color }}>{l.label}</Typography>
                  <Typography sx={{ fontSize: 11, color: '#9CA3AF' }}>{l.desc}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#B8942E' }} />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && !error && data.length === 0 && (
        <Alert severity="info">Nenhum bairro com dados no período selecionado.</Alert>
      )}

      {/* === TABELA PRINCIPAL === */}
      {!loading && data.length > 0 && (
        <TableContainer component={Paper} sx={{ bgcolor: '#0D0D0D', border: '1px solid #2A2A2A', borderRadius: 2, boxShadow: 'none' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#1A1A1A' }}>
                {[
                  'Bairro', 'Cidade', 'Território', 'Status',
                  'Score', 'Mot. aprov.', 'Mot. online', 'Passageiros',
                  'Corridas', 'Locais', 'Externas', 'Canceladas',
                  'T. aceite', 'Avaliação', 'Operador', 'Parceiro',
                ].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 600, fontSize: 11, color: '#B8942E', whiteSpace: 'nowrap', borderBottom: '1px solid #2A2A2A' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.neighborhood_id} sx={{ '&:hover': { bgcolor: 'rgba(184,148,46,0.05)' } }}>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12, color: '#E5E5E5', borderBottom: '1px solid #1A1A1A' }}>{row.neighborhood}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: '#9CA3AF', borderBottom: '1px solid #1A1A1A' }}>{row.city}</TableCell>
                  <TableCell sx={{ fontSize: 11, color: '#9CA3AF', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderBottom: '1px solid #1A1A1A' }}>
                    <Tooltip title={row.territory} placement="top"><span>{row.territory}</span></Tooltip>
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #1A1A1A' }}><StatusChip status={row.maturity_status} /></TableCell>
                  <TableCell sx={{ minWidth: 90, borderBottom: '1px solid #1A1A1A' }}><ScoreBar score={row.maturity_score} /></TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center', color: '#E5E5E5', borderBottom: '1px solid #1A1A1A' }}>{row.drivers_approved}</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center', color: '#E5E5E5', borderBottom: '1px solid #1A1A1A' }}>{row.drivers_online}</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center', color: '#E5E5E5', borderBottom: '1px solid #1A1A1A' }}>{row.passengers_total}</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center', color: '#E5E5E5', borderBottom: '1px solid #1A1A1A' }}>{row.rides_total}</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center', color: '#E5E5E5', borderBottom: '1px solid #1A1A1A' }}>{row.rides_local}</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center', color: '#E5E5E5', borderBottom: '1px solid #1A1A1A' }}>{row.rides_external}</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center', color: '#E5E5E5', borderBottom: '1px solid #1A1A1A' }}>{row.rides_canceled}</TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center', color: '#E5E5E5', borderBottom: '1px solid #1A1A1A' }}>
                    {row.avg_accept_min != null ? `${row.avg_accept_min} min` : '—'}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center', color: '#E5E5E5', borderBottom: '1px solid #1A1A1A' }}>
                    {row.avg_rating != null ? row.avg_rating.toFixed(1) : '—'}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center', color: '#E5E5E5', borderBottom: '1px solid #1A1A1A' }}>
                    {row.has_operator ? '✓' : '—'}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, textAlign: 'center', color: '#E5E5E5', borderBottom: '1px solid #1A1A1A' }}>
                    {row.has_partner ? '✓' : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* === LEGENDA DE CRITÉRIOS (DETALHADA) === */}
      {!loading && data.length > 0 && (
        <Box sx={{ mt: 3, p: 2.5, bgcolor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 2 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#B8942E', mb: 1.5 }}>
            Critérios do Score — Metodologia v1 (experimental)
          </Typography>
          <Grid container spacing={1}>
            {[
              { pts: '25 pts', desc: 'Densidade de motoristas aprovados (satura em 5)' },
              { pts: '20 pts', desc: 'Taxa de corridas locais (dentro do território)' },
              { pts: '20 pts', desc: 'Rapidez de aceite (satura em 0 min, zera em 10 min)' },
              { pts: '15 pts', desc: 'Taxa de não-cancelamento' },
              { pts: '10 pts', desc: 'Avaliação média (mín. 3 avaliações)' },
              { pts: '5 pts',  desc: 'Presença de operador territorial ativo' },
              { pts: '5 pts',  desc: 'Presença de parceiro territorial ativo' },
            ].map(c => (
              <Grid item xs={12} sm={6} md={4} key={c.pts + c.desc}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <Chip label={c.pts} size="small" sx={{ bgcolor: 'rgba(184,148,46,0.15)', color: '#B8942E', fontWeight: 700, fontSize: 10, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.5 }}>{c.desc}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
          <Typography sx={{ fontSize: 10, color: '#6B7280', mt: 1.5 }}>
            Os pesos são experimentais e serão ajustados conforme a operação real gerar dados suficientes para calibração.
            Dados agregados por bairro — nenhuma informação individual é exposta.
          </Typography>
        </Box>
      )}
    </Container>
  );
}
