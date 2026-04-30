import { useState, useEffect } from 'react';
import { Box, Grid, Card, CardContent, Typography, CircularProgress, ToggleButton, ToggleButtonGroup, Table, TableBody, TableCell, TableHead, TableRow, Button } from '@mui/material';
import { API_BASE_URL } from '../../config/api';

const gold = '#C9A227';
const goldBorder = 'rgba(201,162,39,0.20)';
const cardBg = 'linear-gradient(145deg, #15120A 0%, #0E0C07 100%)';
const sectionLabel = { color: '#6B6045', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10, fontWeight: 600 };
const cell = { borderColor: 'rgba(201,162,39,0.08)', py: 1, color: '#A7A7A7', fontSize: 13 };

function OCard({ label, value, accent, large }) {
  return (
    <Card sx={{ background: cardBg, border: `1px solid ${goldBorder}`, borderRadius: 2, height: '100%', boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
      <CardContent sx={{ textAlign: 'center', py: 2, px: 1.5 }}>
        <Typography sx={{ fontSize: large ? 28 : 22, fontWeight: 800, color: accent || '#F5F1E8', lineHeight: 1.1, letterSpacing: '-0.5px' }}>{value ?? '—'}</Typography>
        <Typography sx={{ color: '#6B6045', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', mt: 0.8 }}>{label}</Typography>
      </CardContent>
    </Card>
  );
}

export default function ExecutiveOperations() {
  const [period, setPeriod] = useState('today');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem('kaviar_admin_token');
    fetch(`${API_BASE_URL}/api/admin/dashboard/operations?period=${period}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(j => { if (j.success) setData(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const fmt = (v, prefix = '') => v == null ? '—' : `${prefix}${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: prefix ? 2 : 0, maximumFractionDigits: prefix ? 2 : 1 })}`;

  return (
    <Box sx={{ bgcolor: '#050505', minHeight: '100vh', p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Button href="/admin" size="small" sx={{ color: '#6B6045', fontSize: 11, textTransform: 'none', p: 0, mb: 1, '&:hover': { color: gold } }}>
            ← Dashboard
          </Button>
          <Typography sx={{ fontSize: 11, color: '#6B6045', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.3 }}>Painel Executivo</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: gold, letterSpacing: '-0.5px' }}>⚡ Operações</Typography>
        </Box>
        <ToggleButtonGroup value={period} exclusive onChange={(_, v) => v && setPeriod(v)} size="small" sx={{
          bgcolor: '#0E0C07', border: `1px solid ${goldBorder}`, borderRadius: 2, p: 0.3,
          '& .MuiToggleButton-root': { color: '#6B6045', border: 'none', px: 2.5, py: 0.7, fontSize: 12, fontWeight: 600, borderRadius: '6px !important', textTransform: 'none' },
          '& .Mui-selected': { color: '#0E0C07', bgcolor: `${gold} !important`, fontWeight: 700 },
        }}>
          <ToggleButton value="today">Hoje</ToggleButton>
          <ToggleButton value="7d">7 dias</ToggleButton>
          <ToggleButton value="30d">30 dias</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress sx={{ color: gold }} /></Box>
      ) : data ? (<>

        {/* Corridas */}
        <Typography sx={{ ...sectionLabel, mb: 1 }}>Corridas</Typography>
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          {[
            { label: 'Concluídas', value: data.rides?.completed, accent: '#7CB87A' },
            { label: 'Canceladas', value: data.rides?.canceled, accent: '#C0675A' },
            { label: 'Sem motorista', value: data.rides?.no_driver, accent: '#A7A7A7' },
            { label: 'Com espera', value: data.rides?.with_wait, accent: gold },
            { label: 'Com ajuste', value: data.rides?.with_adjustment, accent: '#F5F1E8' },
            { label: 'Ajustes aceitos', value: data.rides?.adjustments_accepted, accent: '#F5F1E8' },
          ].map(c => <Grid item xs={6} sm={4} md={2} key={c.label}><OCard {...c} /></Grid>)}
        </Grid>

        {/* Financeiro */}
        <Typography sx={{ ...sectionLabel, mb: 1 }}>Financeiro</Typography>
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          {[
            { label: 'Valor bruto', value: fmt(data.financials?.gross_total, 'R$\u00a0'), accent: '#7CB87A', large: true },
            { label: 'Créditos consumidos', value: data.financials?.credits_consumed, accent: gold, large: true },
            { label: 'Receita em créditos', value: fmt(data.financials?.platform_revenue_credits, 'R$\u00a0'), accent: '#F5F1E8', large: true },
            { label: 'Wait charge est.', value: fmt(data.financials?.wait_charge_estimated, 'R$\u00a0'), accent: '#A7A7A7', large: true },
          ].map(c => <Grid item xs={6} sm={3} key={c.label}><OCard {...c} /></Grid>)}
        </Grid>

        {/* Espera + Território */}
        <Typography sx={{ ...sectionLabel, mb: 1 }}>Espera · Território</Typography>
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          {[
            { label: 'Espera média', value: data.wait?.avg_minutes != null ? `${data.wait.avg_minutes} min` : '—', accent: gold },
            { label: 'Espera total', value: data.wait?.total_minutes != null ? `${data.wait.total_minutes} min` : '—', accent: '#F5F1E8' },
            { label: 'Local', value: data.territory?.local, accent: '#7CB87A' },
            { label: 'Adjacent', value: data.territory?.adjacent, accent: '#A7A7A7' },
            { label: 'External', value: data.territory?.external, accent: '#6B6045' },
          ].map(c => <Grid item xs={4} sm={2} key={c.label}><OCard {...c} /></Grid>)}
        </Grid>

        {/* Rankings completos */}
        <Grid container spacing={2}>
          {[
            {
              title: 'Top Bairros', all: data.top_neighborhoods || [],
              cols: ['#', 'Bairro', 'Corridas'], aligns: ['left', 'left', 'right'], accentCol: 2,
              render: (n, i) => [i + 1, n.name, n.rides],
            },
            {
              title: 'Top Motoristas', all: data.top_drivers || [],
              cols: ['Motorista', 'Corridas', 'Créditos', 'Espera'], aligns: ['left', 'right', 'right', 'right'], accentCol: 1,
              render: (d) => [d.name, d.rides, d.credits, d.wait_min > 0 ? `${d.wait_min}m` : '—'],
            },
          ].map(({ title, all, cols, aligns, accentCol, render }) => (
            <Grid item xs={12} md={6} key={title}>
              <Card sx={{ background: cardBg, border: `1px solid ${goldBorder}`, borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
                <CardContent>
                  <Typography sx={{ color: gold, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>{title}</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { borderColor: 'rgba(201,162,39,0.12)' } }}>
                        {cols.map((c, i) => (
                          <TableCell key={c} align={aligns[i]} sx={{ color: '#6B6045', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', py: 0.8, fontWeight: 600 }}>{c}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {all.length ? all.map((row, ri) => {
                        const vals = render(row, ri);
                        return (
                          <TableRow key={ri} sx={{ '&:hover': { bgcolor: 'rgba(201,162,39,0.04)' }, '& td': { borderColor: 'rgba(201,162,39,0.06)' } }}>
                            {vals.map((v, vi) => (
                              <TableCell key={vi} align={aligns[vi]} sx={{ ...cell, color: vi === accentCol ? gold : vi === 0 ? '#F5F1E8' : '#A7A7A7', fontWeight: vi === accentCol ? 700 : 400 }}>{v}</TableCell>
                            ))}
                          </TableRow>
                        );
                      }) : (
                        <TableRow><TableCell colSpan={cols.length} sx={{ ...cell, textAlign: 'center' }}>—</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </>) : null}
    </Box>
  );
}

