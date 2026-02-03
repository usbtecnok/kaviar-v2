import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Alert
} from '@mui/material';
import { Trophy, TrendingUp, Users, Award, Target, TrendingDown } from 'lucide-react';


export default function NeighborhoodStatsCard({ driverId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!driverId) return;

    fetch(`${API_BASE_URL}/api/drivers/${driverId}/neighborhood-stats?period=month`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.data);
        } else {
          setError(data.error || 'Erro ao carregar estatísticas');
        }
        setLoading(false);
      })
      .catch(err => {
        setError('Erro ao conectar com servidor');
        setLoading(false);
      });
  }, [driverId]);

  if (loading) {
    return (
      <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ color: 'white' }} />
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info">
            {error || 'Configure seu bairro para ver o ranking'}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getRankBadge = (rank) => {
    if (!rank) return null;
    if (rank === 1) return { emoji: '🥇', color: '#FFD700', bg: '#FFF9E6' };
    if (rank === 2) return { emoji: '🥈', color: '#C0C0C0', bg: '#F5F5F5' };
    if (rank === 3) return { emoji: '🥉', color: '#CD7F32', bg: '#FFF4E6' };
    if (rank <= 10) return { emoji: '🔥', color: '#FF4444', bg: '#FFE6E6' };
    return { emoji: '⭐', color: '#667eea', bg: '#E8EAFF' };
  };

  const badge = getRankBadge(stats.driverRank);

  return (
    <Card sx={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      mb: 3
    }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Trophy size={24} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {stats.neighborhood}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                Comunidade Kaviar
              </Typography>
            </Box>
          </Box>
          
          {badge && stats.driverRank && (
            <Box sx={{ 
              bgcolor: badge.bg, 
              color: badge.color,
              px: 2, 
              py: 1, 
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <span style={{ fontSize: '24px' }}>{badge.emoji}</span>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
                  #{stats.driverRank}
                </Typography>
                {stats.driverPercentile && (
                  <Typography variant="caption" sx={{ fontSize: '10px' }}>
                    Top {stats.driverPercentile}%
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </Box>

        {/* Stats Grid */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Box sx={{ 
              bgcolor: 'rgba(255,255,255,0.15)', 
              borderRadius: 2, 
              p: 2,
              backdropFilter: 'blur(10px)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Users size={16} />
                <Typography variant="caption">Motoristas Ativos</Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {stats.activeDrivers}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={6}>
            <Box sx={{ 
              bgcolor: 'rgba(255,255,255,0.15)', 
              borderRadius: 2, 
              p: 2,
              backdropFilter: 'blur(10px)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingUp size={16} />
                <Typography variant="caption">Economia Total</Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {formatCurrency(stats.totalSavings)}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Top Drivers */}
        {stats.topDrivers && stats.topDrivers.length > 0 && (
          <Box sx={{ 
            bgcolor: 'rgba(255,255,255,0.15)', 
            borderRadius: 2, 
            p: 2,
            backdropFilter: 'blur(10px)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Award size={18} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Top Motoristas do Mês
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {stats.topDrivers.map((driver, index) => {
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <Box 
                    key={index}
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      pb: 1.5,
                      borderBottom: index < stats.topDrivers.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <span style={{ fontSize: '20px' }}>{medals[index]}</span>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {driver.name}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          {driver.tripsCount} corridas
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {formatCurrency(driver.savings)}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        economizados
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* Motivational Message */}
        {stats.driverRank && (
          <Box sx={{ 
            mt: 2, 
            bgcolor: 'rgba(255,255,255,0.2)', 
            borderRadius: 2, 
            p: 1.5,
            textAlign: 'center'
          }}>
            {stats.driverRank <= 3 ? (
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                🎉 Você está no pódio! Continue dominando {stats.neighborhood}!
              </Typography>
            ) : (
              <Typography variant="body2">
                💪 Continue assim! Fique na sua cerca e suba no ranking!
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
