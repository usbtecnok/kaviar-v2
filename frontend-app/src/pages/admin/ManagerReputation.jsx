import { useState, useEffect } from 'react';
import { Box, Container, Typography, Card, CardContent, Grid, Chip, Alert, CircularProgress, Button, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { Star, Warning, Download, EmojiEvents } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';
import { downloadCsv } from '../../utils/exportCsv';

const GOLD = '#B8942E';

export default function ManagerReputation() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const token = localStorage.getItem('kaviar_admin_token');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/manager/drivers/reputation`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.success) setData(d.data); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Container maxWidth="md" sx={{ mt: 6, textAlign: 'center' }}><CircularProgress sx={{ color: GOLD }} /></Container>;

  const summary = data?.summary || { total: 0, online: 0, avg_rating: 0, alerts: 0, highlights: 0, inactive: 0 };
  const allDrivers = data?.drivers || [];

  const filtered = filter === 'all' ? allDrivers : filter === 'active' ? allDrivers.filter(d => !d.inactive && d.availability === 'online') : filter === 'inactive' ? allDrivers.filter(d => d.inactive) : filter === 'highlight' ? allDrivers.filter(d => d.highlight) : filter === 'attention' ? allDrivers.filter(d => d.attention) : allDrivers;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FAFAF8', pt: 2, pb: 6 }}>
      <Container maxWidth="md">
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          <span style={{ color: GOLD }}>⭐</span> Reputação — Motoristas do Território
        </Typography>
        <Typography sx={{ color: '#6B7280', fontSize: 12, mb: 2 }}>Visão somente leitura • Dados atualizados em tempo real</Typography>

        {/* KPIs */}
        <Grid container spacing={1} sx={{ mb: 2.5 }}>
          {[
            { label: 'Total', value: summary.total, color: '#374151' },
            { label: 'Online', value: summary.online, color: '#059669' },
            { label: 'Inativos', value: summary.inactive, color: '#6B7280' },
            { label: 'Média', value: summary.avg_rating ? `${summary.avg_rating}⭐` : '—', color: GOLD },
            { label: 'Destaques', value: summary.highlights, color: '#7C3AED' },
            { label: 'Atenção', value: summary.alerts, color: '#DC2626' },
          ].map(k => (
            <Grid item xs={4} sm={2} key={k.label}>
              <Card sx={{ bgcolor: '#fff', borderTop: `3px solid ${k.color}`, border: '1px solid #E8E5DE', borderRadius: 2 }}>
                <CardContent sx={{ textAlign: 'center', py: 1, px: 1, '&:last-child': { pb: 1 } }}>
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color: k.color }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 9, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>{k.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Filters + CSV */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <ToggleButtonGroup size="small" exclusive value={filter} onChange={(_, v) => v && setFilter(v)}>
            <ToggleButton value="all" sx={{ textTransform: 'none', fontSize: 11 }}>Todos ({allDrivers.length})</ToggleButton>
            <ToggleButton value="active" sx={{ textTransform: 'none', fontSize: 11 }}>Ativos</ToggleButton>
            <ToggleButton value="inactive" sx={{ textTransform: 'none', fontSize: 11 }}>Inativos</ToggleButton>
            <ToggleButton value="highlight" sx={{ textTransform: 'none', fontSize: 11 }}>⭐ Destaques</ToggleButton>
            <ToggleButton value="attention" sx={{ textTransform: 'none', fontSize: 11 }}>⚠️ Atenção</ToggleButton>
          </ToggleButtonGroup>
          {allDrivers.length > 0 && <Button size="small" startIcon={<Download />} onClick={() => {
            const headers = ['Nome', 'Bairro', 'Veículo', 'Média', 'Avaliações', 'Corridas', 'Badges', 'Status', 'Destaque', 'Atenção', 'Inativo'];
            const rows = allDrivers.map(d => [d.name, d.neighborhood||'', d.vehicle||'', d.avg_rating?.toFixed(1)||'—', d.total_ratings, d.rides_completed, d.badges_count, d.availability, d.highlight?'Sim':'', d.attention?'Sim':'', d.inactive?'Sim':'']);
            downloadCsv(headers, rows, `kaviar-reputacao-${new Date().toISOString().split('T')[0]}.csv`);
          }} sx={{ color: '#6B7280', textTransform: 'none' }} variant="outlined">CSV</Button>}
        </Box>

        {/* Driver list */}
        {filtered.length > 0 ? (
          <Card sx={{ bgcolor: '#fff', border: '1px solid #E8E5DE', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              {filtered.map(d => (
                <Box key={d.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid #F3F4F6' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {d.highlight && <EmojiEvents sx={{ fontSize: 14, color: '#7C3AED' }} />}
                      {d.attention && <Warning sx={{ fontSize: 14, color: '#DC2626' }} />}
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{d.name}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 11, color: '#6B7280' }}>
                      {d.neighborhood || '—'}{d.vehicle ? ` • ${d.vehicle}` : ''} • {d.rides_completed} corridas{d.badges_count > 0 ? ` • ${d.badges_count} badges` : ''}
                    </Typography>
                    {d.attention && d.neg_tags.length > 0 && <Typography sx={{ fontSize: 10, color: '#DC2626', mt: 0.3 }}>Tags: {d.neg_tags.join(', ')}</Typography>}
                    {d.inactive && <Typography sx={{ fontSize: 10, color: '#6B7280', mt: 0.3 }}>Inativo há mais de 30 dias</Typography>}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexShrink: 0 }}>
                    {d.avg_rating !== null && <Chip label={`★${d.avg_rating.toFixed(1)}`} size="small" sx={{ bgcolor: d.attention ? '#FEF2F2' : d.highlight ? '#F5F3FF' : 'rgba(16,185,129,0.1)', color: d.attention ? '#DC2626' : d.highlight ? '#7C3AED' : '#059669', fontSize: 10, height: 20, fontWeight: 700 }} />}
                    <Chip label={d.inactive ? 'Inativo' : d.availability === 'online' ? 'Online' : 'Offline'} size="small" sx={{ bgcolor: d.inactive ? '#F3F4F6' : d.availability === 'online' ? 'rgba(16,185,129,0.1)' : '#F3F4F6', color: d.inactive ? '#6B7280' : d.availability === 'online' ? '#059669' : '#9CA3AF', fontSize: 9, height: 18 }} />
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        ) : <Alert severity="info">Nenhum motorista encontrado com este filtro.</Alert>}

        {/* Disclaimer */}
        <Alert severity="warning" icon={false} sx={{ mt: 3, bgcolor: 'rgba(184,148,46,0.06)', border: '1px solid #E8E5DE', '& .MuiAlert-message': { color: '#6B7280', fontSize: 11 } }}>
          Visualização somente leitura. Ações de aprovação, suspensão ou bloqueio de motoristas são exclusivas da central KAVIAR/USB Tecnok.
        </Alert>
      </Container>
    </Box>
  );
}
