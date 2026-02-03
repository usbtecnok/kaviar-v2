import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../../config/api';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Chip, 
  Button, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Pagination,
  CircularProgress,
  Alert
} from '@mui/material';
import { Visibility, Search } from '@mui/icons-material';

const statusColors = {
  requested: 'warning',
  accepted: 'info',
  arrived: 'primary',
  started: 'secondary',
  completed: 'success',
  paid: 'success',
  cancelled_by_user: 'error',
  cancelled_by_driver: 'error',
  cancelled_by_admin: 'error'
};

const rideTypes = {
  normal: 'Normal',
  combo: 'Combo',
  comunidade: 'Bairro'
};

export default function RideList() {
  
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Filtros
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });

  const loadRides = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      
      if (!token) {
        localStorage.removeItem('kaviar_admin_token');
        localStorage.removeItem('kaviar_admin_data');
        window.location.href = '/admin/login';
        return;
      }
      
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.type && { type: filters.type }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.search && { search: filters.search })
      });

      const response = await fetch(`${API_BASE_URL}/api/admin/rides?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('kaviar_admin_token');
        localStorage.removeItem('kaviar_admin_data');
        window.location.href = '/admin/login';
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        setRides(data.data || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0
        }));
      } else {
        setError(data.error || 'Erro ao carregar corridas');
      }
    } catch (error) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRides();
  }, [pagination.page, filters]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Gestão de Corridas
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Controle operacional completo das corridas
        </Typography>
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filtros
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            <FormControl size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="requested">Solicitada</MenuItem>
                <MenuItem value="accepted">Aceita</MenuItem>
                <MenuItem value="arrived">Chegou</MenuItem>
                <MenuItem value="started">Iniciada</MenuItem>
                <MenuItem value="completed">Concluída</MenuItem>
                <MenuItem value="paid">Paga</MenuItem>
                <MenuItem value="cancelled_by_user">Cancelada (Usuário)</MenuItem>
                <MenuItem value="cancelled_by_driver">Cancelada (Motorista)</MenuItem>
                <MenuItem value="cancelled_by_admin">Cancelada (Admin)</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small">
              <InputLabel>Tipo</InputLabel>
              <Select
                value={filters.type}
                label="Tipo"
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="combo">Combo</MenuItem>
                <MenuItem value="comunidade">Bairro</MenuItem>
              </Select>
            </FormControl>

            <TextField
              size="small"
              label="Data Inicial"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              size="small"
              label="Data Final"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              size="small"
              label="Buscar"
              placeholder="Passageiro, motorista, origem..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Lista de Corridas */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Passageiro</TableCell>
                  <TableCell>Motorista</TableCell>
                  <TableCell>Rota</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Data/Hora</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rides.map((ride) => (
                  <TableRow key={ride.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {ride.id.slice(-8)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {ride.passenger?.name || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ride.passenger?.phone || ''}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {ride.driver?.name || 'Não atribuído'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ride.driver?.phone || ''}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {ride.origin}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          → {ride.destination}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={rideTypes[ride.type] || 'Normal'} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(ride.price)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={ride.status} 
                        color={statusColors[ride.status] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDateTime(ride.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => navigate(`/admin/rides/${ride.id}`)}
                      >
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Paginação */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={pagination.totalPages}
              page={pagination.page}
              onChange={(_, page) => setPagination(prev => ({ ...prev, page }))}
              color="primary"
            />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
            Mostrando {rides.length} de {pagination.total} corridas
          </Typography>
        </>
      )}
    </Container>
  );
}
