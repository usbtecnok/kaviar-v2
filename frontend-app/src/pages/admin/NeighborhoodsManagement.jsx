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
  Grid
} from '@mui/material';
import NeighborhoodsMap from '../../components/maps/NeighborhoodsMap';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function NeighborhoodsManagement() {
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);
  const [geofence, setGeofence] = useState(null);

  useEffect(() => {
    fetchNeighborhoods();
  }, []);

  const fetchNeighborhoods = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/governance/neighborhoods`);
      const data = await response.json();
      
      if (data.success) {
        setNeighborhoods(data.data);
      } else {
        setError(data.error || 'Erro ao carregar bairros');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectNeighborhood = async (neighborhood) => {
    setSelectedNeighborhood(neighborhood);
    setGeofence(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/governance/neighborhoods/${neighborhood.id}/geofence`);
      const data = await response.json();
      
      if (data.success && data.data.geometry) {
        setGeofence(data.data.geometry);
      }
    } catch (err) {
      console.error('Erro ao carregar geofence:', err);
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestão de Bairros
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Total de bairros cadastrados: {neighborhoods.length}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ width: '100%', overflow: 'hidden' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Nome</strong></TableCell>
                  <TableCell><strong>Zona</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {neighborhoods.map((neighborhood) => (
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
                        label={neighborhood.zone || 'N/A'} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: 600 }}>
            {selectedNeighborhood ? (
              <>
                <Typography variant="h6" gutterBottom>
                  {selectedNeighborhood.name}
                </Typography>
                {geofence ? (
                  <NeighborhoodsMap geofence={geofence} />
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
