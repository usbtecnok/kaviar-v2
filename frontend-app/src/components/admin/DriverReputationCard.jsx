import { useState, useEffect } from 'react';
import { Paper, Typography, Box, Chip, CircularProgress, Rating, Divider } from '@mui/material';
import { Star } from '@mui/icons-material';
import api from '../../api/index';

const gold = '#FFD700';

// Mapeamento de tags → categorias operacionais
const TAG_CATEGORIES = {
  'Atrasou': 'Atraso / demora',
  'Demorou muito': 'Atraso / demora',
  'Dirigiu mal': 'Direção / segurança',
  'Rota ruim': 'Direção / segurança',
  'Veículo sujo': 'Veículo / limpeza',
  'Carro sujo': 'Veículo / limpeza',
  'Foi grosseiro': 'Cordialidade',
  'Comunicação ruim': 'Comunicação',
  'Não encontrei o motorista': 'Localização',
  'Local difícil sem orientação': 'Localização',
  'Mudou destino sem avisar': 'Comunicação',
  'Cancelou após chegada': 'Cancelamento',
  'Outro': 'Outro',
};
const ALL_CATEGORIES = ['Atraso / demora', 'Cordialidade', 'Direção / segurança', 'Veículo / limpeza', 'Comunicação', 'Localização', 'Cancelamento', 'Outro'];

export function DriverReputationCard({ driverId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/ratings/driver/${driverId}`)
      .then(r => setData(r.data?.summary || r.data?.data || r.data))
      .catch((err) => { console.warn('[DriverReputationCard]', err?.message); })
      .finally(() => setLoading(false));
  }, [driverId]);

  if (loading) return <Paper sx={{ p: 3, mt: 3, bgcolor: '#111217', border: '1px solid #222' }}><CircularProgress size={24} sx={{ color: gold }} /></Paper>;
  if (!data?.stats) return null;

  const { stats, recentRatings = [] } = data;

  // Aggregate tags
  const tagCounts = {};
  recentRatings.forEach(r => {
    if (r.tags) r.tags.split(',').forEach(t => { const tag = t.trim(); if (tag) tagCounts[tag] = (tagCounts[tag] || 0) + 1; });
  });
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Diagnóstico por categoria (apenas avaliações negativas)
  const catCounts = {};
  ALL_CATEGORIES.forEach(c => { catCounts[c] = 0; });
  recentRatings.filter(r => r.rating <= 3).forEach(r => {
    if (r.tags) r.tags.split(',').forEach(t => {
      const cat = TAG_CATEGORIES[t.trim()];
      if (cat) catCounts[cat]++;
    });
  });
  const hasNegativeData = Object.values(catCounts).some(v => v > 0);

  // Comentários negativos
  const negComments = recentRatings.filter(r => r.rating <= 3 && r.comment);

  // Comentários positivos
  const posComments = recentRatings.filter(r => r.rating >= 4 && r.comment);

  return (
    <Paper sx={{ p: 3, mt: 3, bgcolor: '#111217', border: '1px solid #222', borderRadius: 2 }}>
      <Typography variant="h6" sx={{ color: gold, fontWeight: 700, mb: 2 }}>Reputação e Avaliações</Typography>

      {/* Stats */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h3" sx={{ fontWeight: 700, color: gold }}>{stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}</Typography>
          <Rating value={stats.averageRating || 0} precision={0.1} readOnly size="small" sx={{ '& .MuiRating-iconFilled': { color: gold } }} />
          <Typography variant="caption" sx={{ color: '#888', display: 'block' }}>{stats.totalRatings} avaliação{stats.totalRatings !== 1 ? 'ões' : ''}</Typography>
        </Box>
        {stats.ratingDistribution && (
          <Box sx={{ flex: 1 }}>
            {[5, 4, 3, 2, 1].map(n => {
              const count = stats.ratingDistribution[n] || 0;
              const pct = stats.totalRatings > 0 ? (count / stats.totalRatings) * 100 : 0;
              return (
                <Box key={n} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                  <Typography variant="caption" sx={{ color: '#888', width: 12, textAlign: 'right' }}>{n}</Typography>
                  <Box sx={{ flex: 1, height: 6, bgcolor: '#222', borderRadius: 3, overflow: 'hidden' }}>
                    <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: n >= 4 ? gold : n === 3 ? '#FFA726' : '#ef5350', borderRadius: 3 }} />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#666', width: 16, fontSize: 10 }}>{count}</Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Tags frequentes */}
      {topTags.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ color: '#888', mb: 1, fontWeight: 600 }}>Tags frequentes</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {topTags.map(([tag, count]) => (
              <Chip key={tag} label={`${tag} (${count})`} size="small" icon={<Star sx={{ fontSize: 12 }} />}
                sx={{ bgcolor: 'rgba(255,215,0,0.08)', borderColor: 'rgba(255,215,0,0.2)', color: '#b8960c', fontSize: 11 }} variant="outlined" />
            ))}
          </Box>
        </Box>
      )}

      {/* Diagnóstico por categoria */}
      <Divider sx={{ borderColor: '#222', my: 2 }} />
      <Typography variant="body2" sx={{ color: '#888', mb: 1.5, fontWeight: 600 }}>Pontos de atenção</Typography>
      {hasNegativeData ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {ALL_CATEGORIES.map(cat => {
            const count = catCounts[cat];
            if (count === 0) return null;
            return (
              <Chip key={cat} label={`${cat}: ${count}`} size="small"
                sx={{ bgcolor: 'rgba(244,67,54,0.08)', color: '#ef5350', border: '1px solid rgba(244,67,54,0.2)', fontWeight: 500 }} />
            );
          })}
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: '#555', fontStyle: 'italic', mb: 2 }}>
          {stats.totalRatings < 5 ? 'Ainda não há dados suficientes para diagnóstico confiável.' : 'Nenhum ponto de atenção identificado.'}
        </Typography>
      )}

      {/* Comentários negativos */}
      {negComments.length > 0 && (
        <>
          <Typography variant="body2" sx={{ color: '#888', mb: 1, fontWeight: 600 }}>Comentários negativos</Typography>
          {negComments.slice(0, 3).map((r, i) => (
            <Box key={i} sx={{ mb: 1, p: 1.5, bgcolor: 'rgba(244,67,54,0.04)', borderRadius: 1, border: '1px solid rgba(244,67,54,0.1)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Rating value={r.rating} readOnly size="small" />
                <Typography variant="caption" sx={{ color: '#666' }}>{new Date(r.createdAt || r.created_at).toLocaleDateString('pt-BR')}</Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#ccc', fontStyle: 'italic' }}>"{r.comment}"</Typography>
            </Box>
          ))}
        </>
      )}

      {/* Comentários positivos */}
      {posComments.length > 0 && (
        <>
          <Typography variant="body2" sx={{ color: '#888', mb: 1, mt: 2, fontWeight: 600 }}>Comentários recentes</Typography>
          {posComments.slice(0, 3).map((r, i) => (
            <Box key={i} sx={{ mb: 1, p: 1.5, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Rating value={r.rating} readOnly size="small" sx={{ '& .MuiRating-iconFilled': { color: gold } }} />
                <Typography variant="caption" sx={{ color: '#666' }}>{new Date(r.createdAt || r.created_at).toLocaleDateString('pt-BR')}</Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#aaa', fontStyle: 'italic' }}>"{r.comment}"</Typography>
            </Box>
          ))}
        </>
      )}

      {stats.totalRatings === 0 && (
        <Typography variant="body2" sx={{ color: '#555' }}>Nenhuma avaliação ainda.</Typography>
      )}
    </Paper>
  );
}
