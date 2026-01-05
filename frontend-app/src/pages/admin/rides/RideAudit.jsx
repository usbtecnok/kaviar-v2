import { useState, useEffect } from 'react';
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  CircularProgress,
  Alert,
  Avatar
} from '@mui/material';
import {
  Security,
  Person,
  Cancel,
  CheckCircle,
  Edit,
  Search
} from '@mui/icons-material';

const actionIcons = {
  cancel: <Cancel color="error" />,
  force_complete: <CheckCircle color="success" />,
  status_update: <Edit color="primary" />,
  reassign_driver: <Person color="info" />
};

const actionColors = {
  cancel: 'error',
  force_complete: 'success',
  status_update: 'primary',
  reassign_driver: 'info'
};

const actionLabels = {
  cancel: 'Cancelamento',
  force_complete: 'Finalização Forçada',
  status_update: 'Correção de Status',
  reassign_driver: 'Reatribuição'
};

export default function RideAudit() {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Filtros
  const [filters, setFilters] = useState({
    rideId: '',
    adminId: '',
    action: '',
    dateFrom: '',
    dateTo: ''
  });

  const loadAuditLogs = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });

      const response = await fetch(`${API_BASE_URL}/api/admin/rides/audit?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setAuditLogs(data.data);
        setPagination(prev => ({ ...prev, ...data.pagination }));
      } else {
        setError(data.error || 'Erro ao carregar logs de auditoria');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [pagination.page, filters]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getAdminInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          <Security sx={{ fontSize: 32, mr: 1, verticalAlign: 'middle' }} />
          Auditoria de Corridas
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Registro completo de todas as ações administrativas
        </Typography>
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filtros de Auditoria
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            <TextField
              size="small"
              label="ID da Corrida"
              placeholder="Digite o ID..."
              value={filters.rideId}
              onChange={(e) => handleFilterChange('rideId', e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />

            <TextField
              size="small"
              label="Admin Responsável"
              placeholder="Nome do admin..."
              value={filters.adminId}
              onChange={(e) => handleFilterChange('adminId', e.target.value)}
            />

            <FormControl size="small">
              <InputLabel>Tipo de Ação</InputLabel>
              <Select
                value={filters.action}
                label="Tipo de Ação"
                onChange={(e) => handleFilterChange('action', e.target.value)}
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="cancel">Cancelamento</MenuItem>
                <MenuItem value="force_complete">Finalização Forçada</MenuItem>
                <MenuItem value="status_update">Correção de Status</MenuItem>
                <MenuItem value="reassign_driver">Reatribuição</MenuItem>
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
          </Box>
        </CardContent>
      </Card>

      {/* Logs de Auditoria */}
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
                  <TableCell>Data/Hora</TableCell>
                  <TableCell>Corrida</TableCell>
                  <TableCell>Ação</TableCell>
                  <TableCell>Admin Responsável</TableCell>
                  <TableCell>Motivo</TableCell>
                  <TableCell>Detalhes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDateTime(log.createdAt)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        #{log.rideId?.slice(-8) || 'N/A'}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {actionIcons[log.action]}
                        <Chip
                          label={actionLabels[log.action] || log.action}
                          color={actionColors[log.action] || 'default'}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                          {getAdminInitials(log.adminName || 'Admin')}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {log.adminName || 'Admin'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {log.adminRole || 'ADMIN'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200 }}>
                        {log.reason || 'Sem motivo informado'}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      {log.oldValue && log.newValue ? (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            De: {log.oldValue}
                          </Typography>
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            Para: {log.newValue}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {auditLogs.length === 0 && !loading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Nenhum log de auditoria encontrado
              </Typography>
            </Box>
          )}

          {/* Paginação */}
          {pagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={pagination.totalPages}
                page={pagination.page}
                onChange={(_, page) => setPagination(prev => ({ ...prev, page }))}
                color="primary"
              />
            </Box>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
            Mostrando {auditLogs.length} de {pagination.total} registros de auditoria
          </Typography>
        </>
      )}
    </Container>
  );
}
