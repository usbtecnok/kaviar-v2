import { useState, useEffect } from 'react';
import { Paper, Typography, Box, Chip, CircularProgress, Rating, Divider } from '@mui/material';
import { API_BASE_URL } from '../../config/api';
import { Link } from 'react-router-dom';

const gold = '#FFD700';
const cardBg = '#111217';
const metricBg = '#0D0D12';

function MetricBox({ label, value, subtitle, stars }) {
  return (
    <Box sx={{ flex: 1, minWidth: 140, bgcolor: metricBg, borderRadius: 2, p: 2.5, border: '1px solid #222', textAlign: 'center' }}>
      <Typography variant="caption" sx={{ color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>{label}</Typography>
      <Typography variant="h4" sx={{ color: gold, fontWeight: 700, mt: 0.5, lineHeight: 1.2 }}>{value}</Typography>
      {stars != null && <Rating value={stars} precision={0.1} readOnly size="small" sx={{ mt: 0.5, '& .MuiRating-iconFilled': { color: gold } }} />}
      <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 0.5 }}>{subtitle}</Typography>
    </Box>
  );
}

export function RatingsOverviewCard({ compact, linkTo }) {
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

  if (loading) return <Paper sx={{ p: 4, bgcolor: cardBg, border: `1px solid ${gold}22` }}><CircularProgress size={24} sx={{ color: gold }} /></Paper>;
  if (!data) return null;

  const negTags = (data.topNegativeTags || []).slice(0, 5);
  const attentionDrivers = (data.attentionDrivers || []).filter(d => d.negCount > 0);

  if (compact) {
    return (
      <Paper sx={{ p: 3, bgcolor: cardBg, border: `1px solid ${gold}33`, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: gold, fontWeight: 700, letterSpacing: 0.3 }}>⭐ Avaliações</Typography>
          {linkTo && <Chip label="Ver tudo →" size="small" component={Link} to={linkTo} clickable sx={{ bgcolor: `${gold}15`, color: gold, fontSize: 11, textDecoration: 'none' }} />}
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <MetricBox label="Motoristas" value={data.driverAvg?.toFixed(1) || '—'} stars={data.driverAvg} subtitle={`${data.driverTotal || 0}`} />
          <MetricBox label="Passageiros" value={data.passengerAvg?.toFixed(1) || '—'} stars={data.passengerAvg} subtitle={`${data.passengerTotal || 0}`} />
          <MetricBox label="Alertas" value={attentionDrivers.length} subtitle="motoristas" />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3.5, bgcolor: cardBg, border: `1px solid ${gold}33`, borderRadius: 2, boxShadow: `0 4px 20px ${gold}08` }}>
      <Typography variant="h6" sx={{ color: gold, fontWeight: 700, mb: 2.5, letterSpacing: 0.3 }}>
        ⭐ Qualidade das Avaliações
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <MetricBox label="Motoristas" value={data.driverAvg?.toFixed(1) || '—'} stars={data.driverAvg} subtitle={`${data.driverTotal || 0} avaliações`} />
        <MetricBox label="Passageiros" value={data.passengerAvg?.toFixed(1) || '—'} stars={data.passengerAvg} subtitle={`${data.passengerTotal || 0} avaliações`} />
        <MetricBox label="Total" value={data.totalRatings || 0} subtitle="avaliações" />
      </Box>

      {negTags.length > 0 && (
        <>
          <Divider sx={{ borderColor: '#222', mb: 2 }} />
          <Typography variant="body2" sx={{ color: '#888', mb: 1, fontWeight: 600 }}>Tags negativas frequentes</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {negTags.map(t => (
              <Chip key={t.tag} label={`${t.tag} (${t.count})`} size="small"
                sx={{ bgcolor: 'rgba(244,67,54,0.08)', color: '#ef5350', border: '1px solid rgba(244,67,54,0.2)', fontWeight: 500 }} />
            ))}
          </Box>
        </>
      )}

      {attentionDrivers.length > 0 && (
        <>
          <Divider sx={{ borderColor: '#222', mb: 2 }} />
          <Box sx={{ bgcolor: 'rgba(255,152,0,0.06)', border: '1px solid rgba(255,152,0,0.15)', borderRadius: 1.5, p: 2 }}>
            <Typography variant="body2" sx={{ color: '#FFA726', fontWeight: 700, mb: 1.5 }}>⚠️ Motoristas com atenção</Typography>
            {attentionDrivers.slice(0, 5).map(d => (
              <Box key={d.id} sx={{ py: 1.2, borderBottom: '1px solid rgba(255,255,255,0.04)', '&:last-child': { borderBottom: 'none' } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#ddd', fontWeight: 500 }}>{d.name}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Chip label={`${d.negCount}× negativa`} size="small" sx={{ bgcolor: 'rgba(244,67,54,0.1)', color: '#ef5350', fontSize: 11, height: 22 }} />
                    <Typography variant="body2" sx={{ color: '#888', fontSize: 12 }}>média {d.avgScore?.toFixed(1)}</Typography>
                    <Chip label="Ver detalhes" size="small" component={Link} to={`/admin/drivers/${d.id}`} clickable
                      sx={{ bgcolor: 'rgba(255,215,0,0.08)', color: gold, fontSize: 11, height: 22, textDecoration: 'none' }} />
                  </Box>
                </Box>
                {d.tags?.length > 0 && (
                  <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {d.tags.map(t => <Chip key={t} label={t} size="small" sx={{ height: 18, fontSize: 10, color: '#999', borderColor: '#333' }} variant="outlined" />)}
                  </Box>
                )}
                {d.lastComment && (
                  <Typography variant="caption" sx={{ color: '#777', fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                    "{d.lastComment.length > 80 ? d.lastComment.substring(0, 80) + '…' : d.lastComment}"
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </>
      )}
    </Paper>
  );
}

