import { useState, useEffect } from 'react';
import { Paper, Typography, Box, Chip, CircularProgress, Rating } from '@mui/material';
import api from '../../api/index';

export function PassengerReputationCard({ passengerId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/ratings/passenger/${passengerId}`)
      .then(r => setData(r.data?.summary || r.data?.data || r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [passengerId]);

  if (loading) return <Paper sx={{ p: 3, mt: 3 }}><CircularProgress size={24} /></Paper>;
  if (!data?.stats || data.stats.totalRatings === 0) return null;

  const { stats, recentRatings = [] } = data;
  const tagCounts = {};
  recentRatings.forEach(r => {
    if (r.tags) r.tags.split(',').forEach(t => { const tag = t.trim(); if (tag) tagCounts[tag] = (tagCounts[tag] || 0) + 1; });
  });
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const comments = recentRatings.filter(r => r.comment);

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>Avaliações do Passageiro</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, color: '#FFD700' }}>
          {stats.averageRating?.toFixed(1) || '—'}
        </Typography>
        <Box>
          <Rating value={stats.averageRating || 0} precision={0.1} readOnly size="small" />
          <Typography variant="body2" color="text.secondary">{stats.totalRatings} avaliação{stats.totalRatings !== 1 ? 'ões' : ''}</Typography>
        </Box>
      </Box>
      {topTags.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Tags frequentes</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {topTags.map(([tag, count]) => <Chip key={tag} label={`${tag} (${count})`} size="small" variant="outlined" />)}
          </Box>
        </Box>
      )}
      {comments.length > 0 && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Comentários recentes</Typography>
          {comments.slice(0, 3).map((r, i) => (
            <Box key={i} sx={{ mb: 1, p: 1, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1 }}>
              <Rating value={r.rating} size="small" readOnly />
              <Typography variant="body2" sx={{ color: '#ccc' }}>{r.comment}</Typography>
              <Typography variant="caption" color="text.secondary">{new Date(r.createdAt || r.created_at).toLocaleDateString('pt-BR')}</Typography>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
}
