import { useState, useEffect } from 'react';
import { Paper, Typography, Box, Chip, CircularProgress, Rating } from '@mui/material';
import { Star } from '@mui/icons-material';
import api from '../../api/index';

export function DriverReputationCard({ driverId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/ratings/driver/${driverId}`)
      .then(r => {
        const d = r.data?.summary || r.data?.data || r.data;
        setData(d);
      })
      .catch((err) => { console.warn('[DriverReputationCard] Error:', err?.message); })
      .finally(() => setLoading(false));
  }, [driverId]);

  if (loading) return <Paper sx={{ p: 3, mt: 3 }}><CircularProgress size={24} /></Paper>;
  if (!data?.stats) return null;

  const { stats, recentRatings = [] } = data;

  // Aggregate tags from recent ratings
  const tagCounts = {};
  recentRatings.forEach(r => {
    if (r.tags) r.tags.split(',').forEach(t => { const tag = t.trim(); if (tag) tagCounts[tag] = (tagCounts[tag] || 0) + 1; });
  });
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const comments = recentRatings.filter(r => r.comment);

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>Avaliações</Typography>

      {/* Stats */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h3" fontWeight="800" color="primary.main">
            {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
          </Typography>
          <Rating value={stats.averageRating} precision={0.1} readOnly size="small" />
          <Typography variant="caption" color="text.secondary" display="block">
            {stats.totalRatings} avaliação{stats.totalRatings !== 1 ? 'ões' : ''}
          </Typography>
        </Box>
      </Box>

      {/* Tags */}
      {topTags.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Qualidades mais marcadas
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {topTags.map(([tag, count]) => (
              <Chip
                key={tag}
                label={`${tag} (${count})`}
                size="small"
                icon={<Star sx={{ fontSize: 14 }} />}
                sx={{ bgcolor: 'rgba(255, 215, 0, 0.15)', borderColor: 'rgba(255, 215, 0, 0.4)', color: '#b8960c' }}
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Comments */}
      {comments.length > 0 && (
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Comentários recentes
          </Typography>
          {comments.slice(0, 3).map((r, i) => (
            <Box key={i} sx={{ py: 1, borderBottom: i < comments.length - 1 ? '1px solid #eee' : 'none' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Rating value={r.rating} readOnly size="small" />
                <Typography variant="caption" color="text.secondary">
                  {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                "{r.comment}"
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {stats.totalRatings === 0 && (
        <Typography variant="body2" color="text.secondary">Nenhuma avaliação ainda.</Typography>
      )}
    </Paper>
  );
}
