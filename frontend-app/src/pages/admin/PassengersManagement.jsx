import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
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
  IconButton,
  TextField,
  Button,
  InputAdornment
} from '@mui/material';
import { Visibility, Search } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';


export default function PassengersManagement() {
  const navigate = useNavigate();
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    fetchPassengers();
  }, [page]);

  const fetchPassengers = async (searchOverride) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const q = searchOverride !== undefined ? searchOverride : search;
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (q) params.set('search', q);

      const response = await fetch(`${API_BASE_URL}/api/admin/passengers?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPassengers(data.data);
        setPagination(data.pagination || { total: 0, totalPages: 1 });
      } else {
        setError(data.error || 'Erro ao carregar passageiros');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchPassengers(search);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestão de Passageiros
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Buscar por nome, email ou telefone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{ minWidth: 250, flex: 1, maxWidth: 400, bgcolor: '#fff', borderRadius: 1, '& .MuiOutlinedInput-root': { color: '#111827' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db' }, '& input::placeholder': { color: '#6b7280', opacity: 1 } }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ color: '#6b7280' }} /></InputAdornment>
          }}
        />
        <Button variant="contained" size="small" onClick={handleSearch}>Buscar</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Nome</strong></TableCell>
                <TableCell><strong>Email</strong></TableCell>
                <TableCell><strong>Telefone</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Ações</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {passengers.map((passenger) => (
                <TableRow key={passenger.id} hover>
                  <TableCell>{passenger.name}</TableCell>
                  <TableCell>{passenger.email}</TableCell>
                  <TableCell>{passenger.phone || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={passenger.status || 'active'} 
                      size="small" 
                      color={passenger.status === 'active' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      size="small" 
                      onClick={() => navigate(`/admin/passengers/${passenger.id}`)}
                      title="Ver detalhes"
                    >
                      <Visibility />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {!loading && passengers.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Nenhum passageiro encontrado.
        </Alert>
      )}

      {!loading && pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 2 }}>
          <Button size="small" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Anterior
          </Button>
          <Typography variant="body2">
            Página {page} de {pagination.totalPages} ({pagination.total} passageiros)
          </Typography>
          <Button size="small" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
            Próxima
          </Button>
        </Box>
      )}
    </Box>
  );
}
