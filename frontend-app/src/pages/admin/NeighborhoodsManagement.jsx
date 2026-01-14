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
  Chip
} from '@mui/material';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function NeighborhoodsManagement() {
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Nome</strong></TableCell>
              <TableCell><strong>Zona</strong></TableCell>
              <TableCell><strong>ID</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {neighborhoods.map((neighborhood) => (
              <TableRow key={neighborhood.id} hover>
                <TableCell>{neighborhood.name}</TableCell>
                <TableCell>
                  <Chip 
                    label={neighborhood.zone || 'N/A'} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {neighborhood.id}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {neighborhoods.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Nenhum bairro cadastrado no sistema.
        </Alert>
      )}
    </Box>
  );
}
