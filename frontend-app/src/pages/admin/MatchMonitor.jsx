import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp,
  LocationOn,
  AttachMoney,
  Refresh
} from '@mui/icons-material';

import { API_BASE_URL } from '../../config/api';

export default function MatchMonitor() {
  const [config, setConfig] = useState({
    match_local_percent: 7.00,
    match_bairro_percent: 12.00,
    match_externo_percent: 20.00
  });
  const [stats, setStats] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchMatches, 5000); // Atualizar a cada 5s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchConfig(), fetchStats(), fetchMatches()]);
    setLoading(false);
  };

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/match/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/match/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchMatches = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/match/monitor`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setMatches(data);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setMessage('');
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/match/config`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          matchLocalPercent: config.match_local_percent,
          matchBairroPercent: config.match_bairro_percent,
          matchExternoPercent: config.match_externo_percent
        })
      });

      if (response.ok) {
        setMessage('Configuração atualizada com sucesso!');
        await fetchStats();
      } else {
        setMessage('Erro ao atualizar configuração');
      }
    } catch (error) {
      setMessage('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  const getMatchColor = (type) => {
    switch (type) {
      case 'LOCAL': return 'success';
      case 'BAIRRO': return 'primary';
      case 'EXTERNO': return 'warning';
      default: return 'default';
    }
  };

  const getMatchLabel = (type) => {
    switch (type) {
      case 'LOCAL': return '🏘️ Match Local';
      case 'BAIRRO': return '🗺️ Match Bairro';
      case 'EXTERNO': return '🌍 Externo';
      default: return type;
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Carregando monitor...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        🎯 Monitor de Match Territorial
      </Typography>

      {message && (
        <Alert severity={message.includes('sucesso') ? 'success' : 'error'} sx={{ mb: 3 }}>
          {message}
        </Alert>
      )}

      {/* Configuração de Porcentagens */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            ⚙️ Configuração de Retenção (Blindagem Anti-Inflação)
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Match Local (Favela/Comunidade)"
                type="number"
                value={config.match_local_percent}
                onChange={(e) => setConfig({ ...config, match_local_percent: parseFloat(e.target.value) })}
                InputProps={{ endAdornment: '%' }}
                helperText="Motorista e passageiro na mesma célula (< 2km)"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Match Bairro (Oficial)"
                type="number"
                value={config.match_bairro_percent}
                onChange={(e) => setConfig({ ...config, match_bairro_percent: parseFloat(e.target.value) })}
                InputProps={{ endAdornment: '%' }}
                helperText="Ambos no mesmo bairro oficial mapeado"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Match Externo"
                type="number"
                value={config.match_externo_percent}
                onChange={(e) => setConfig({ ...config, match_externo_percent: parseFloat(e.target.value) })}
                InputProps={{ endAdornment: '%' }}
                helperText="Corridas fora do território"
              />
            </Grid>
          </Grid>
          <Button
            variant="contained"
            onClick={handleSaveConfig}
            disabled={saving}
            sx={{ mt: 2 }}
          >
            {saving ? 'Salvando...' : 'Salvar Configuração'}
          </Button>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((stat) => (
          <Grid item xs={12} md={4} key={stat.matchType}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Chip 
                  label={getMatchLabel(stat.matchType)} 
                  color={getMatchColor(stat.matchType)}
                  sx={{ mb: 2 }}
                />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {stat.count}
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 1 }}>
                  Corridas
                </Typography>
                <Typography variant="h6" color="success.main">
                  R$ {stat.totalPlatformFee?.toFixed(2) || '0.00'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Taxa média: {stat.avgPlatformPercent?.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Monitor em Tempo Real */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              📡 Matches em Tempo Real (Últimos 50)
            </Typography>
            <Button
              startIcon={<Refresh />}
              onClick={fetchMatches}
              size="small"
            >
              Atualizar
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Motorista</TableCell>
                  <TableCell>Passageiro</TableCell>
                  <TableCell>Bairro</TableCell>
                  <TableCell align="right">Valor Corrida</TableCell>
                  <TableCell align="right">Taxa %</TableCell>
                  <TableCell align="right">Retenção R$</TableCell>
                  <TableCell>Data/Hora</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {matches.map((match) => (
                  <TableRow key={match.id}>
                    <TableCell>
                      <Chip 
                        label={getMatchLabel(match.match_type)} 
                        color={getMatchColor(match.match_type)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{match.driver_name}</TableCell>
                    <TableCell>{match.passenger_name}</TableCell>
                    <TableCell>{match.neighborhood_name || '-'}</TableCell>
                    <TableCell align="right">R$ {match.trip_value_brl?.toFixed(2)}</TableCell>
                    <TableCell align="right">{match.platform_percent}%</TableCell>
                    <TableCell align="right">
                      <Typography color="success.main" fontWeight="bold">
                        R$ {match.platform_fee_brl?.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {new Date(match.created_at).toLocaleString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {matches.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                Nenhum match registrado ainda
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
