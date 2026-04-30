import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Typography, Box, Paper, Chip, CircularProgress, Rating, Divider, Grid, Button } from '@mui/material';
import { API_BASE_URL } from '../../../config/api';

const gold = '#C8A84E';
const cardBg = '#0D0D1A';
const metricBg = '#080814';

function Metric({ label, value, stars, subtitle }) {
  return (
    <Paper sx={{ bgcolor: metricBg, border: '1px solid #1A1A2E', borderRadius: 2, p: 3, textAlign: 'center', flex: 1, minWidth: 160 }} elevation={0}>
      <Typography sx={{ color: '#8888A0', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10, mb: 1 }}>{label}</Typography>
      <Typography variant="h3" sx={{ color: gold, fontWeight: 800, lineHeight: 1.2 }}>{value}</Typography>
      {stars != null && <Rating value={stars} precision={0.1} readOnly size="small" sx={{ mt: 0.5, '& .MuiRating-iconFilled': { color: gold } }} />}
      {subtitle && <Typography sx={{ color: '#555570', fontSize: 12, mt: 0.5 }}>{subtitle}</Typography>}
    </Paper>
  );
}

function AttentionList({ title, icon, items, linkPrefix }) {
  if (!items?.length) return null;
  return (
    <Paper sx={{ bgcolor: cardBg, border: '1px solid #1A1A2E', borderRadius: 2, p: 3 }} elevation={0}>
      <Typography sx={{ color: '#FFA726', fontWeight: 600, mb: 2, fontSize: 14 }}>{icon} {title}</Typography>
      {items.map(d => (
        <Box key={d.id} sx={{ py: 1.5, borderBottom: '1px solid #1A1A2E', '&:last-child': { borderBottom: 'none' } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography sx={{ color: '#F5F5F5', fontWeight: 600, fontSize: 14 }}>{d.name}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label={`${d.negCount}× negativa`} size="small" sx={{ bgcolor: 'rgba(244,67,54,0.1)', color: '#ef5350', fontSize: 11, height: 22 }} />
              <Typography sx={{ color: '#8888A0', fontSize: 12 }}>média {d.avgScore?.toFixed(1)}</Typography>
              {linkPrefix && <Chip label="Ver" size="small" component={Link} to={`${linkPrefix}/${d.id}`} clickable sx={{ bgcolor: `${gold}15`, color: gold, fontSize: 11, height: 22, textDecoration: 'none' }} />}
            </Box>
          </Box>
          {d.tags?.length > 0 && (
            <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {d.tags.map(t => <Chip key={t} label={t} size="small" variant="outlined" sx={{ height: 18, fontSize: 10, color: '#8888A0', borderColor: '#2A2A45' }} />)}
            </Box>
          )}
          {d.lastComment && <Typography sx={{ color: '#555570', fontStyle: 'italic', fontSize: 12, mt: 0.5 }}>"{d.lastComment.length > 100 ? d.lastComment.substring(0, 100) + '…' : d.lastComment}"</Typography>}
        </Box>
      ))}
    </Paper>
  );
}

export default function RatingsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('kaviar_admin_token');
    if (!token) { setLoading(false); return; }
    fetch(`${API_BASE_URL}/api/admin/ratings/overview`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Container sx={{ py: 6, textAlign: 'center' }}><CircularProgress sx={{ color: gold }} /></Container>;
  if (!data) return <Container sx={{ py: 6 }}><Typography color="error">Erro ao carregar avaliações</Typography></Container>;

  const negTags = (data.topNegativeTags || []).slice(0, 10);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontSize: 11, color: '#6B6045', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.3 }}>Gestão</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: gold }}>⭐ Avaliações e Reputação</Typography>
      </Box>

      {/* Métricas */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <Metric label="Motoristas" value={data.driverAvg?.toFixed(1) || '—'} stars={data.driverAvg} subtitle={`${data.driverTotal || 0} avaliações`} />
        <Metric label="Passageiros" value={data.passengerAvg?.toFixed(1) || '—'} stars={data.passengerAvg} subtitle={`${data.passengerTotal || 0} avaliações`} />
        <Metric label="Total" value={data.totalRatings || 0} subtitle="avaliações registradas" />
      </Box>

      {/* Tags negativas */}
      {negTags.length > 0 && (
        <Paper sx={{ bgcolor: cardBg, border: '1px solid #1A1A2E', borderRadius: 2, p: 3, mb: 4 }} elevation={0}>
          <Typography sx={{ color: '#ef5350', fontWeight: 600, mb: 2, fontSize: 14 }}>🏷️ Tags negativas frequentes</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {negTags.map(t => (
              <Chip key={t.tag} label={`${t.tag} (${t.count})`} size="small"
                sx={{ bgcolor: 'rgba(244,67,54,0.08)', color: '#ef5350', border: '1px solid rgba(244,67,54,0.2)', fontWeight: 500 }} />
            ))}
          </Box>
        </Paper>
      )}

      {/* Atenção */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <AttentionList title="Motoristas com atenção" icon="🚗" items={data.attentionDrivers?.filter(d => d.negCount > 0)} linkPrefix="/admin/drivers" />
        </Grid>
        <Grid item xs={12} md={6}>
          <AttentionList title="Passageiros com atenção" icon="👤" items={data.attentionPassengers?.filter(p => p.negCount > 0)} linkPrefix="/admin/passengers" />
        </Grid>
      </Grid>
    </Container>
  );
}
