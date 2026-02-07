import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableRow, 
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Grid,
  Button,
  Breadcrumbs,
  Link
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';

export default function NeighborhoodsManagement() {
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);
  const [geofence, setGeofence] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedCity = searchParams.get('city') || 'Rio de Janeiro';

  useEffect(() => {
    fetchNeighborhoods();
  }, []);

  const fetchNeighborhoods = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/governance/neighborhoods`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      console.log('Neighborhoods API response:', data);
      
      if (data.success) {
        const neighborhoodsData = data.data || [];
        setNeighborhoods(neighborhoodsData);
      } else {
        setError(data.error || 'Erro ao carregar bairros');
      }
    } catch (err) {
      console.error('Error fetching neighborhoods:', err);
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectNeighborhood = async (neighborhood) => {
    setSelectedNeighborhood(neighborhood);
    setGeofence(null);
    
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/governance/neighborhoods/${neighborhood.id}/geofence`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success && data.data && data.data.coordinates) {
        setGeofence(data.data.coordinates);
      } else {
        // Marcar como "sem geometria" para mostrar mensagem
        setGeofence('NO_GEOMETRY');
      }
    } catch (err) {
      console.error('Erro ao carregar geofence:', err);
      setGeofence('NO_GEOMETRY');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Carregando bairros...</Typography>
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

  const filteredNeighborhoods = neighborhoods.filter(n => n.city === selectedCity);
  
  console.log('🔍 Debug Neighborhoods:', {
    total: neighborhoods.length,
    selectedCity,
    filtered: filteredNeighborhoods.length,
    cities: [...new Set(neighborhoods.map(n => n.city))]
  });

  const getMatchType = (neighborhood) => {
    if (neighborhood.area_type === 'FAVELA' || neighborhood.area_type === 'COMUNIDADE') {
      return { label: 'Match Local 7%', color: 'success' };
    } else if (neighborhood.area_type === 'BAIRRO_OFICIAL') {
      return { label: 'Match Bairro 12%', color: 'primary' };
    }
    return { label: 'Externo 20%', color: 'warning' };
  };

  const cityCounts = neighborhoods.reduce((acc, n) => {
    acc[n.city] = (acc[n.city] || 0) + 1;
    return acc;
  }, {});

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin/neighborhoods-by-city')}
          sx={{ mb: 2 }}
        >
          Voltar para Cidades
        </Button>
        
        <Breadcrumbs>
          <Link 
            underline="hover" 
            color="inherit" 
            onClick={() => navigate('/admin/neighborhoods-by-city')}
            sx={{ cursor: 'pointer' }}
          >
            Cidades
          </Link>
          <Typography color="text.primary">{selectedCity}</Typography>
        </Breadcrumbs>
      </Box>

      <Typography variant="h4" gutterBottom>
        🗺️ {selectedCity}
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {filteredNeighborhoods.length} bairros cadastrados
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Nome</strong></TableCell>
                  <TableCell><strong>Match Territorial</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredNeighborhoods.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        Nenhum bairro encontrado para {selectedCity}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNeighborhoods.map((neighborhood) => {
                    const matchInfo = getMatchType(neighborhood);
                    return (
                    <TableRow 
                      key={neighborhood.id} 
                      hover
                      onClick={() => handleSelectNeighborhood(neighborhood)}
                      sx={{ 
                        cursor: 'pointer',
                        bgcolor: selectedNeighborhood?.id === neighborhood.id ? 'action.selected' : 'inherit'
                      }}
                    >
                      <TableCell>{neighborhood.name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={matchInfo.label} 
                          size="small" 
                          color={matchInfo.color}
                        />
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 600, display: 'flex', flexDirection: 'column' }}>
            {selectedNeighborhood ? (
              <>
                <Typography variant="h6" gutterBottom>
                  {selectedNeighborhood.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                  {selectedCity}
                </Typography>
                {geofence === 'NO_GEOMETRY' ? (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100%',
                    textAlign: 'center',
                    p: 3
                  }}>
                    <Typography variant="h6" color="warning.main" gutterBottom>
                      ⚠️ Geometria não cadastrada
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Este bairro ainda não possui polígono de geofencing cadastrado.
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedCity === 'São Paulo' 
                        ? 'Os bairros de São Paulo estão aguardando importação de dados oficiais.'
                        : 'Entre em contato com o administrador para cadastrar a geometria.'}
                    </Typography>
                  </Box>
                ) : geofence ? (
                  <Box sx={{ height: 500, border: '1px solid #ddd', borderRadius: 1 }}>
                    <iframe
                      srcDoc={`
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                          <style>body { margin: 0; } #map { height: 100vh; }</style>
                        </head>
                        <body>
                          <div id="map"></div>
                          <script>
                            const map = L.map('map').setView([-22.9068, -43.1729], 11);
                            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                              attribution: '© OpenStreetMap'
                            }).addTo(map);
                            
                            const geojson = ${JSON.stringify(geofence)};
                            const layer = L.geoJSON(geojson, {
                              style: { color: '#2196f3', weight: 2, fillOpacity: 0.2 }
                            }).addTo(map);
                            map.fitBounds(layer.getBounds());
                          </script>
                        </body>
                        </html>
                      `}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      title="Mapa do bairro"
                    />
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <CircularProgress />
                  </Box>
                )}
              </>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography color="text.secondary">
                  Selecione um bairro para ver o mapa
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {neighborhoods.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Nenhum bairro cadastrado no sistema.
        </Alert>
      )}
    </Box>
  );
}
