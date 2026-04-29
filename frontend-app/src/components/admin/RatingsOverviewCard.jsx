import { useState, useEffect } from 'react';
import { Paper, Typography, Box, Chip, CircularProgress, Rating, Divider } from '@mui/material';
import { API_BASE_URL } from '../../config/api';

export function RatingsOverviewCard() {
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

  if (loading) return <Paper sx={{ p: 3 }}><CircularProgress size={24} /></Paper>;
  if (!data) return null;

  const negTags = (data.topNegativeTags || []).slice(0, 5);
  const attentionDrivers = (data.attentionDrivers || []).slice(0, 3);

  return (
    <Paper sx={{ p: 3, bgcolor: '#1a1a1a', border: '1px solid #333' }}>
      <Typography variant="h6" sx={{ color: '#FFD700', mb: 2 }}>⭐ Qualidade das Avaliações</Typography>
      <Box sx={{ display: 'flex', gap: 4, mb: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Motoristas</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" sx={{ color: '#FFD700', fontWeight: 700 }}>{data.driverAvg?.toFixed(1) || '—'}</Typography>
            <Rating value={data.driverAvg || 0} precision={0.1} readOnly size="small" />
          </Box>
          <Typography variant="caption" color="text.secondary">{data.driverTotal || 0} avaliações</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Passageiros</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" sx={{ color: '#FFD700', fontWeight: 700 }}>{data.passengerAvg?.toFixed(1) || '—'}</Typography>
            <Rating value={data.passengerAvg || 0} precision={0.1} readOnly size="small" />
          </Box>
          <Typography variant="caption" color="text.secondary">{data.passengerTotal || 0} avaliações</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Total</Typography>
          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>{data.totalRatings || 0}</Typography>
        </Box>
      </Box>
      {negTags.length > 0 && (
        <>
          <Divider sx={{ borderColor: '#333', my: 1 }} />
          <Typography variant="caption" color="text.secondary">Tags negativas frequentes</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
            {negTags.map(t => <Chip key={t.tag} label={`${t.tag} (${t.count})`} size="small" sx={{ bgcolor: '#3a1a1a', color: '#f44336', borderColor: '#f44336' }} variant="outlined" />)}
          </Box>
        </>
      )}
      {attentionDrivers.length > 0 && (
        <>
          <Divider sx={{ borderColor: '#333', my: 1 }} />
          <Typography variant="caption" color="text.secondary">⚠️ Motoristas com atenção</Typography>
          {attentionDrivers.map(d => (
            <Box key={d.id} sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography variant="body2" sx={{ color: '#ccc' }}>{d.name}</Typography>
              <Typography variant="body2" sx={{ color: '#f44336' }}>{d.negCount}× negativa · média {d.avgScore?.toFixed(1)}</Typography>
            </Box>
          ))}
        </>
      )}
    </Paper>
  );
}
