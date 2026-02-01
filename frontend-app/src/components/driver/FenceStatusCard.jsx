import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Alert
} from '@mui/material';
import { Target, TrendingUp, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://kaviar-backend-prod.us-east-1.elasticbeanstalk.com';

export default function FenceStatusCard({ driverId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driverId) return;

    fetch(`${API_BASE_URL}/api/drivers/${driverId}/dashboard?period=month`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [driverId]);

  if (loading || !stats) {
    return null;
  }

  const { matchBreakdown, fenceStatus } = stats;
  
  const insidePercent = matchBreakdown?.insideFence || 0;
  const partialPercent = matchBreakdown?.partialMatch || 0;
  const outsidePercent = matchBreakdown?.outsideFence || 0;

  const getStatusColor = () => {
    if (insidePercent >= 70) return 'success';
    if (insidePercent >= 50) return 'warning';
    return 'error';
  };

  const getStatusMessage = () => {
    if (insidePercent >= 70) {
      return '✅ Excelente! Você está otimizando suas corridas.';
    }
    if (insidePercent >= 50) {
      return '⚠️ Bom, mas pode melhorar. Fique mais na sua cerca!';
    }
    return '❌ Atenção! Muitas corridas fora da cerca. Economize mais!';
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Target size={24} color="#667eea" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Status da Cerca
          </Typography>
        </Box>

        <Alert severity={getStatusColor()} sx={{ mb: 3 }}>
          {getStatusMessage()}
        </Alert>

        {/* Inside Fence */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Dentro da Cerca (7%)
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
              {insidePercent}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={insidePercent} 
            sx={{ 
              height: 8, 
              borderRadius: 1,
              bgcolor: '#E8F5E9',
              '& .MuiLinearProgress-bar': {
                bgcolor: '#4CAF50'
              }
            }}
          />
        </Box>

        {/* Partial Match */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Cidade Vizinha (12%)
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.main' }}>
              {partialPercent}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={partialPercent} 
            sx={{ 
              height: 8, 
              borderRadius: 1,
              bgcolor: '#FFF3E0',
              '& .MuiLinearProgress-bar': {
                bgcolor: '#FF9800'
              }
            }}
          />
        </Box>

        {/* Outside Fence */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Fora da Região (20%)
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>
              {outsidePercent}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={outsidePercent} 
            sx={{ 
              height: 8, 
              borderRadius: 1,
              bgcolor: '#FFEBEE',
              '& .MuiLinearProgress-bar': {
                bgcolor: '#F44336'
              }
            }}
          />
        </Box>

        {/* Tips */}
        <Box sx={{ 
          mt: 3, 
          p: 2, 
          bgcolor: '#F5F5FF', 
          borderRadius: 2,
          borderLeft: '4px solid #667eea'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <TrendingUp size={20} color="#667eea" />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#667eea', mb: 0.5 }}>
                💡 Dica para Economizar
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Fique mais tempo na sua cerca e aceite corridas próximas. 
                Você paga apenas 7% vs 25% do Uber!
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
