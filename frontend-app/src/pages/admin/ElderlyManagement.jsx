import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Pagination,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import { 
  Add, 
  Visibility, 
  Edit, 
  PlayArrow, 
  Pause, 
  Cancel,
  ElderlyCare,
  Info
} from '@mui/icons-material';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function ElderlyManagement() {
  const [contracts, setContracts] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros e paginação
  const [filters, setFilters] = useState({
    communityId: '',
    status: '',
    activeOnly: false
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  });

  // Dialogs
  const [statusDialog, setStatusDialog] = useState({
    open: false,
    contract: null,
    newStatus: '',
    reason: ''
  });

  const [detailDialog, setDetailDialog] = useState({
    open: false,
    contract: null
  });

  useEffect(() => {
    fetchCommunities();
    fetchContracts();
  }, [filters, pagination.page]);

  const fetchCommunities = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/communities`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCommunities(data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar bairros:', error);
    }
  };

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('kaviar_admin_token');
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString()
      });
      
      if (filters.communityId) params.append('communityId', filters.communityId);
      if (filters.status) params.append('status', filters.status);
      if (filters.activeOnly) params.append('activeOnly', 'true');

      const response = await fetch(`${API_BASE_URL}/api/admin/elderly/contracts?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setContracts(data.data.contracts);
        setPagination(prev => ({
          ...prev,
          total: data.data.pagination.total,
          totalPages: data.data.pagination.totalPages
        }));
      } else {
        setError(data.error || 'Erro ao carregar contratos');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/elderly/contracts/${statusDialog.contract.id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: statusDialog.newStatus,
          reason: statusDialog.reason
        })
      });

      const data = await response.json();
      if (data.success) {
        fetchContracts();
        setStatusDialog({ open: false, contract: null, newStatus: '', reason: '' });
      } else {
        setError(data.error || 'Erro ao alterar status');
      }
    } catch (error) {
      setError('Erro de conexão');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'warning';
      case 'CANCELLED': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'ACTIVE': return 'Ativo';
      case 'INACTIVE': return 'Inativo';
      case 'CANCELLED': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header com informação do serviço */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <ElderlyCare sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              Acompanhamento Ativo
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Info sx={{ fontSize: 16, color: 'info.main', mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Acompanhamento completo da saída à volta com suporte total.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Filtros</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Bairro</InputLabel>
                <Select
                  value={filters.communityId}
                  onChange={(e) => setFilters(prev => ({ ...prev, communityId: e.target.value }))}
                  label="Bairro"
                >
                  <MenuItem value="">Todos os bairros</MenuItem>
                  {communities.map(community => (
                    <MenuItem key={community.id} value={community.id}>
                      {community.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  label="Status"
                >
                  <MenuItem value="">Todos os status</MenuItem>
                  <MenuItem value="ACTIVE">Ativo</MenuItem>
                  <MenuItem value="INACTIVE">Inativo</MenuItem>
                  <MenuItem value="CANCELLED">Cancelado</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => alert('Criar contrato - Implementar na próxima iteração')}
                sx={{ height: 40 }}
              >
                Novo Contrato
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Lista de Contratos */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Idoso</TableCell>
              <TableCell>Bairro</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Tipo de Serviço</TableCell>
              <TableCell>Início</TableCell>
              <TableCell>Fim</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.id}>
                <TableCell>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {contract.elderlyProfile?.passenger?.name || 'Nome não disponível'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {contract.elderlyProfile?.careLevel === 'basic' ? 'Cuidado Básico' :
                       contract.elderlyProfile?.careLevel === 'intensive' ? 'Cuidado Intensivo' :
                       contract.elderlyProfile?.careLevel === 'medical' ? 'Cuidado Médico' : 
                       'Não definido'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{contract.community?.name || 'Não definido'}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusText(contract.status)}
                    color={getStatusColor(contract.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    Acompanhamento Ativo
                  </Typography>
                </TableCell>
                <TableCell>
                  {new Date(contract.startsAt).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  {contract.endsAt ? 
                    new Date(contract.endsAt).toLocaleDateString('pt-BR') : 
                    'Indefinido'
                  }
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={() => setDetailDialog({ open: true, contract })}
                      title="Ver detalhes"
                    >
                      <Visibility />
                    </IconButton>
                    
                    {contract.status === 'ACTIVE' && (
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => setStatusDialog({ 
                          open: true, 
                          contract, 
                          newStatus: 'INACTIVE', 
                          reason: '' 
                        })}
                        title="Desativar"
                      >
                        <Pause />
                      </IconButton>
                    )}
                    
                    {contract.status === 'INACTIVE' && (
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => setStatusDialog({ 
                          open: true, 
                          contract, 
                          newStatus: 'ACTIVE', 
                          reason: '' 
                        })}
                        title="Ativar"
                      >
                        <PlayArrow />
                      </IconButton>
                    )}
                    
                    {contract.status !== 'CANCELLED' && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setStatusDialog({ 
                          open: true, 
                          contract, 
                          newStatus: 'CANCELLED', 
                          reason: '' 
                        })}
                        title="Cancelar"
                      >
                        <Cancel />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {contracts.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <ElderlyCare sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
          <Typography color="text.secondary" variant="h6">
            Nenhum contrato de acompanhamento encontrado
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Use os filtros acima ou crie um novo contrato
          </Typography>
        </Box>
      )}

      {/* Paginação */}
      {pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={pagination.totalPages}
            page={pagination.page}
            onChange={(e, page) => setPagination(prev => ({ ...prev, page }))}
            color="primary"
          />
        </Box>
      )}

      {/* Dialog de Mudança de Status */}
      <Dialog
        open={statusDialog.open}
        onClose={() => setStatusDialog({ open: false, contract: null, newStatus: '', reason: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Alterar Status do Contrato
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Alterar status do contrato de <strong>{statusDialog.contract?.elderlyProfile?.passenger?.name}</strong> para{' '}
            <strong>{getStatusText(statusDialog.newStatus)}</strong>?
          </Typography>
          
          <TextField
            fullWidth
            label="Motivo da alteração"
            multiline
            rows={3}
            value={statusDialog.reason}
            onChange={(e) => setStatusDialog(prev => ({ ...prev, reason: e.target.value }))}
            sx={{ mt: 2 }}
            placeholder="Descreva o motivo da alteração do status..."
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setStatusDialog({ open: false, contract: null, newStatus: '', reason: '' })}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleStatusChange}
            variant="contained"
            color={statusDialog.newStatus === 'ACTIVE' ? 'success' : 
                   statusDialog.newStatus === 'INACTIVE' ? 'warning' : 'error'}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Detalhes */}
      <Dialog
        open={detailDialog.open}
        onClose={() => setDetailDialog({ open: false, contract: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detalhes do Contrato de Acompanhamento
        </DialogTitle>
        <DialogContent>
          {detailDialog.contract && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Idoso
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {detailDialog.contract.elderlyProfile?.passenger?.name}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Bairro
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {detailDialog.contract.community?.name}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={getStatusText(detailDialog.contract.status)}
                  color={getStatusColor(detailDialog.contract.status)}
                  sx={{ mb: 2 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Nível de Cuidado
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {detailDialog.contract.elderlyProfile?.careLevel === 'basic' ? 'Básico' :
                   detailDialog.contract.elderlyProfile?.careLevel === 'intensive' ? 'Intensivo' :
                   detailDialog.contract.elderlyProfile?.careLevel === 'medical' ? 'Médico' : 
                   'Não definido'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Data de Início
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {new Date(detailDialog.contract.startsAt).toLocaleDateString('pt-BR')}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Data de Fim
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {detailDialog.contract.endsAt ? 
                    new Date(detailDialog.contract.endsAt).toLocaleDateString('pt-BR') : 
                    'Contrato indefinido'
                  }
                </Typography>
              </Grid>
              
              {detailDialog.contract.notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Observações
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    bgcolor: 'grey.100', 
                    p: 2, 
                    borderRadius: 1,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {detailDialog.contract.notes}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog({ open: false, contract: null })}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
