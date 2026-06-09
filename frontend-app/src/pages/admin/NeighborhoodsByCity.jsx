import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import { LocationCity, Map } from '@mui/icons-material';
import api from '../../api';

export default function NeighborhoodsByCity() {
  const navigate = useNavigate();
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cityStats, setCityStats] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await api.get('/api/governance/neighborhoods');

      if (!response.data.success) {
        setError(response.data.error || 'Erro ao carregar bairros');
        return;
      }

      const data = response.data.data || [];
      setNeighborhoods(data);

      // Calcular stats direto da resposta — zero chamadas individuais
      const stats = {};
      data.forEach(n => {
        if (!n.city) return;
        if (!stats[n.city]) {
          stats[n.city] = { total: 0, withGeofence: 0, matchLocal: 0, matchBairro: 0 };
        }
        stats[n.city].total++;
        if (n.has_geofence) stats[n.city].withGeofence++;
        if (n.area_type === 'FAVELA' || n.area_type === 'COMUNIDADE') {
          stats[n.city].matchLocal++;
        } else if (n.area_type === 'BAIRRO_OFICIAL') {
          stats[n.city].matchBairro++;
        }
      });
      setCityStats(stats);
    } catch (err) {
      console.error('❌ Fetch error:', err);
      if (err.response?.status === 401) {
        setError('Token ausente ou inválido. Faça login novamente.');
      } else {
        setError('Erro de conexão com o servidor: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Carregando cidades...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const cities = Object.keys(cityStats).sort();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 'bold' }}>
        🗺️ Gestão Territorial por Cidade
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Total: {neighborhoods.length} bairros em {cities.length} cidades
      </Typography>

      <Grid container spacing={3}>
        {cities.map(city => {
          const stats = cityStats[city];

          return (
            <Grid item xs={12} sm={6} md={4} key={city}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <LocationCity sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        {city}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {city === 'Rio de Janeiro' ? 'RJ' : city === 'São Paulo' ? 'SP' : ''}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {stats.total}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      bairros cadastrados
                    </Typography>
                    {stats.withGeofence > 0 && (
                      <Typography variant="caption" color="success.main">
                        {stats.withGeofence} com mapa
                      </Typography>
                    )}
                    {stats.withGeofence === 0 && (
                      <Typography variant="caption" color="warning.main">
                        ⚠️ Sem mapas cadastrados
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {stats.matchLocal > 0 && (
                      <Chip
                        label={`${stats.matchLocal} Match Local 7%`}
                        size="small"
                        color="success"
                      />
                    )}
                    {stats.matchBairro > 0 && (
                      <Chip
                        label={`${stats.matchBairro} Match Bairro 12%`}
                        size="small"
                        color="primary"
                      />
                    )}
                  </Box>

                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<Map />}
                    onClick={() => navigate(`/admin/neighborhoods?city=${encodeURIComponent(city)}`)}
                  >
                    Ver Bairros
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {cities.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            Nenhuma cidade cadastrada ainda
          </Typography>
        </Box>
      )}
    </Box>
  );
}
