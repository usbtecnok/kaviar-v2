import { useState, useEffect } from 'react';
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
  IconButton
} from '@mui/material';
import { CheckCircle, Cancel, Block, Visibility, Restore } from '@mui/icons-material';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function DriversManagement() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTab, setCurrentTab] = useState('pending');
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

  const handleStatusChange = async () => {
    try {
      const { driver, action, reason } = actionDialog;
      const token = localStorage.getItem('kaviar_admin_token');
      
      let endpoint = '';
      let method = 'POST';
      let body = {};

      // Mapear ações para endpoints reais do backend
      if (action === 'approved') {
        endpoint = `${API_BASE_URL}/api/admin/drivers/${driver.id}/approve`;
      } else if (action === 'rejected') {
        endpoint = `${API_BASE_URL}/api/admin/drivers/${driver.id}/reject`;
        body = { reason: reason || 'Rejeitado pelo administrador' };
      } else {
        setError('Ação não suportada');
        return;
      }

      const response = await fetch(endpoint, {
        method,
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

      <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Pendentes" value="pending" />
        <Tab label="Aprovados" value="approved" />
        <Tab label="Rejeitados" value="rejected" />
        <Tab label="Todos" value="" />
      </Tabs>

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
                <TableCell>{driver.community?.name || 'Não definido'}</TableCell>
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
                    {driver.status === 'pending' && (
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
                    {driver.status === 'rejected' && (
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
                    {driver.status === 'suspended' && (
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
