import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tabs,
  Tab,
  IconButton,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { CheckCircle, Cancel, Block, Visibility, Restore } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { MatchSimulatorCard } from '../../components/admin/MatchSimulatorCard';


const isSuperAdmin = () => {
  const data = localStorage.getItem('kaviar_admin_data');
  return data ? JSON.parse(data)?.role === 'SUPER_ADMIN' : false;
};

export default function DriversManagement() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTab, setCurrentTab] = useState('approved');
  const [neighborhoodMetrics, setNeighborhoodMetrics] = useState([]);
  const [showMetrics, setShowMetrics] = useState(false);
  const [actionDialog, setActionDialog] = useState({ 
    open: false, 
    driver: null, 
    action: null, 
    reason: '' 
  });

  useEffect(() => {
    fetchDrivers(currentTab);
  }, [currentTab]);

  const fetchDrivers = async (status) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/drivers${status ? `?status=${status}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        // ✅ Backend entrega pronto
        setDrivers(data.data);
      } else {
        setError(data.error || 'Erro ao carregar motoristas');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const fetchNeighborhoodMetrics = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/drivers/metrics/by-neighborhood`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setNeighborhoodMetrics(data.data);
        setShowMetrics(true);
      }
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    }
  };

  const handleStatusChange = async () => {
    try {
      const { driver, action, reason } = actionDialog;
      const token = localStorage.getItem('kaviar_admin_token');
      
      let endpoint = '';
      let body = {};

      // ✅ MODO KAVIAR: apenas muda status
      if (action === 'approved') {
        endpoint = `${API_BASE_URL}/api/admin/drivers/${driver.id}/approve`;
      } else if (action === 'rejected') {
        endpoint = `${API_BASE_URL}/api/admin/drivers/${driver.id}/reject`;
        body = { reason: reason || 'Rejeitado pelo administrador' };
      } else if (action === 'suspended') {
        endpoint = `${API_BASE_URL}/api/admin/drivers/${driver.id}/suspend`;
        body = { reason: reason || 'Suspenso pelo administrador' };
      } else {
        setError('Ação não suportada');
        return;
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (data.success) {
        fetchDrivers(currentTab);
        setActionDialog({ open: false, driver: null, action: null, reason: '' });
      } else {
        setError(data.error || 'Erro ao alterar status do motorista');
      }
    } catch (error) {
      setError('Erro de conexão');
    }
  };

  const openActionDialog = (driver, action) => {
    setActionDialog({ open: true, driver, action, reason: '' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      case 'suspended': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Aprovado';
      case 'pending': return 'Pendente';
      case 'rejected': return 'Rejeitado';
      case 'suspended': return 'Suspenso';
      default: return status;
    }
  };

  const getActionText = (action) => {
    switch (action) {
      case 'approved': return 'Aprovar';
      case 'rejected': return 'Rejeitar';
      case 'suspended': return 'Suspender';
      default: return action;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Gerenciamento de Motoristas
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Match Simulator Card (T2 MVP) */}
      <MatchSimulatorCard />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
          <Tab label="Aprovados" value="approved" />
          <Tab label="Pendentes" value="pending" />
          <Tab label="Rejeitados" value="rejected" />
          <Tab label="Todos" value="" />
        </Tabs>
        
        <Button 
          variant="outlined" 
          onClick={fetchNeighborhoodMetrics}
          size="small"
        >
          {showMetrics ? 'Ocultar Métricas' : 'Ver Métricas por Bairro'}
        </Button>
      </Box>

      {showMetrics && neighborhoodMetrics.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Motoristas por Bairro</Typography>
          <Grid container spacing={2}>
            {neighborhoodMetrics.map(metric => (
              <Grid item xs={12} sm={6} md={4} key={metric.neighborhoodId}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {metric.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Chip label={`Total: ${metric.total}`} size="small" />
                      <Chip label={`Aprovados: ${metric.approved}`} size="small" color="success" />
                      <Chip label={`Pendentes: ${metric.pending}`} size="small" color="warning" />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Bairro</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Premium</TableCell>
              <TableCell>Cadastro</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {drivers.map((driver) => (
              <TableRow key={driver.id}>
                <TableCell>{driver.name}</TableCell>
                <TableCell>{driver.email}</TableCell>
                <TableCell>{driver.neighborhoods?.name || 'Não definido'}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusText(driver.status)}
                    color={getStatusColor(driver.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {driver.isPremium ? (
                    <Chip label="Premium" color="secondary" size="small" />
                  ) : (
                    <Chip label="Comum" color="default" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  {new Date(driver.createdAt).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {isSuperAdmin() && driver.status === 'pending' && (
                      <>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => openActionDialog(driver, 'approved')}
                          title="Aprovar"
                        >
                          <CheckCircle />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => openActionDialog(driver, 'rejected')}
                          title="Rejeitar"
                        >
                          <Cancel />
                        </IconButton>
                      </>
                    )}
                    {isSuperAdmin() && driver.status === 'rejected' && (
                      <>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => openActionDialog(driver, 'approved')}
                          title="Aprovar (reverter)"
                        >
                          <CheckCircle />
                        </IconButton>
                      </>
                    )}
                    {isSuperAdmin() && driver.status === 'suspended' && (
                      <>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => openActionDialog(driver, 'approved')}
                          title="Reativar"
                        >
                          <Restore />
                        </IconButton>
                      </>
                    )}
                    <IconButton
                      size="small"
                      color="info"
                      title="Ver detalhes"
                      onClick={() => navigate(`/admin/drivers/${driver.id}`)}
                    >
                      <Visibility />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {drivers.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">
            Nenhum motorista encontrado nesta categoria.
          </Typography>
        </Box>
      )}

      {/* Dialog de Ação */}
      <Dialog
        open={actionDialog.open}
        onClose={() => setActionDialog({ open: false, driver: null, action: null, reason: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {getActionText(actionDialog.action)} Motorista
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Tem certeza que deseja {String(getActionText(actionDialog.action) ?? '').toLowerCase()} o motorista{' '}
            <strong>{actionDialog.driver?.name}</strong>?
          </Typography>
          
          {actionDialog.action === 'rejected' && (
            <TextField
              fullWidth
              label="Motivo da rejeição"
              multiline
              rows={3}
              value={actionDialog.reason}
              onChange={(e) => setActionDialog(prev => ({ ...prev, reason: e.target.value }))}
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setActionDialog({ open: false, driver: null, action: null, reason: '' })}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleStatusChange}
            variant="contained"
            color={actionDialog.action === 'approved' ? 'success' : 'error'}
          >
            {getActionText(actionDialog.action)}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
