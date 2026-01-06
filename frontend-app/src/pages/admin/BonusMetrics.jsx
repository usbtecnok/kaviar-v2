import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material';
import {
  TrendingUp,
  AttachMoney,
  Speed,
  Diamond
} from '@mui/icons-material';
import Layout from '../../components/common/Layout';
import api from '../../api';

const BonusMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [communities, setCommunities] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCommunities();
    fetchMetrics();
  }, [selectedPeriod, selectedCommunity]);

  const fetchCommunities = async () => {
    try {
      const response = await api.get('/api/admin/communities');
      setCommunities(response.data.data);
    } catch (err) {
      console.error('Erro ao carregar comunidades');
    }
  };

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        period: selectedPeriod.toString()
      });
      
      if (selectedCommunity) {
        params.append('community_id', selectedCommunity);
      }

      const response = await api.get(`/api/analytics/bonus-roi-summary?${params}`);
      setMetrics(response.data.data);
    } catch (err) {
      setError('Erro ao carregar métricas de bônus');
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ title, value, subtitle, icon, color = 'primary' }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h5" component="h2">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color: `${color}.main` }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Layout title="Admin - Métricas de Bônus">
      <Typography variant="h4" gutterBottom>
        Métricas do Bônus de Aceite Imediato
      </Typography>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Período</InputLabel>
                <Select
                  value={selectedPeriod}
                  label="Período"
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                >
                  <MenuItem value={7}>Últimos 7 dias</MenuItem>
                  <MenuItem value={30}>Últimos 30 dias</MenuItem>
                  <MenuItem value={90}>Últimos 90 dias</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Comunidade</InputLabel>
                <Select
                  value={selectedCommunity}
                  label="Comunidade"
                  onChange={(e) => setSelectedCommunity(e.target.value)}
                >
                  <MenuItem value="">Todos os bairros</MenuItem>
                  {communities.map((community) => (
                    <MenuItem key={community.id} value={community.id}>
                      {community.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : metrics && (
        <>
          {/* Cards de Métricas */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Corridas com Bônus"
                value={metrics.summary?.rides_with_bonus || 0}
                icon={<Diamond sx={{ fontSize: 40 }} />}
                color="primary"
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Tempo Médio (Com Bônus)"
                value={`${metrics.summary?.avg_time_bonus || 0}s`}
                icon={<Speed sx={{ fontSize: 40 }} />}
                color="success"
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Tempo Médio (Sem Bônus)"
                value={`${metrics.summary?.avg_time_regular || 0}s`}
                icon={<Speed sx={{ fontSize: 40 }} />}
                color="warning"
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <MetricCard
                title="Custo Total"
                value={`R$ ${metrics.summary?.total_bonus_cost || 0}`}
                icon={<AttachMoney sx={{ fontSize: 40 }} />}
                color="error"
              />
            </Grid>
          </Grid>

          {/* Análise de Impacto */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Análise de Impacto
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">
                      {metrics.summary?.improvement_percentage || 0}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Redução no Tempo de Aceite
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary.main">
                      {((metrics.summary?.avg_time_regular || 0) - (metrics.summary?.avg_time_bonus || 0)).toFixed(1)}s
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Segundos Economizados
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="info.main">
                      R$ {((metrics.summary?.total_bonus_cost || 0) / (metrics.summary?.rides_with_bonus || 1)).toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Custo Médio por Corrida
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Status do A/B Test */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status do A/B Test
              </Typography>
              
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Grupo</TableCell>
                      <TableCell align="right">Corridas</TableCell>
                      <TableCell align="right">Tempo Médio</TableCell>
                      <TableCell align="right">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <Chip label="Grupo A (Com Bônus)" color="primary" />
                      </TableCell>
                      <TableCell align="right">
                        {metrics.summary?.rides_with_bonus || 0}
                      </TableCell>
                      <TableCell align="right">
                        {metrics.summary?.avg_time_bonus || 0}s
                      </TableCell>
                      <TableCell align="right">
                        <Chip label="Ativo" color="success" size="small" />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Chip label="Grupo B (Sem Bônus)" color="default" />
                      </TableCell>
                      <TableCell align="right">
                        {metrics.summary?.rides_without_bonus || 0}
                      </TableCell>
                      <TableCell align="right">
                        {metrics.summary?.avg_time_regular || 0}s
                      </TableCell>
                      <TableCell align="right">
                        <Chip label="Controle" color="default" size="small" />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}
    </Layout>
  );
};

export default BonusMetrics;
