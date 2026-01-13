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
  Alert,
  Tabs,
  Tab,
  IconButton
} from '@mui/material';
import { CheckCircle, Cancel, Block, Visibility, Restore } from '@mui/icons-material';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function PassengersManagement() {
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTab, setCurrentTab] = useState('active');
  const [actionDialog, setActionDialog] = useState({ 
    open: false, 
    passenger: null, 
    action: null
  });

  useEffect(() => {
    fetchPassengers(currentTab);
  }, [currentTab]);

  const fetchPassengers = async (status) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/passengers?status=${status}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setPassengers(data.data);
      } else {
        setError(data.error || 'Erro ao carregar passageiros');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async () => {
    try {
      const { passenger, action } = actionDialog;
      const token = localStorage.getItem('kaviar_admin_token');

      const response = await fetch(`${API_BASE_URL}/api/admin/passengers/${passenger.id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: action })
      });

      const data = await response.json();
      if (data.success) {
        fetchPassengers(currentTab);
        setActionDialog({ open: false, passenger: null, action: null });
      } else {
        setError(data.error || 'Erro ao alterar status do passageiro');
      }
    } catch (error) {
      setError('Erro de conexão');
    }
  };

  const openActionDialog = (passenger, action) => {
    setActionDialog({ open: true, passenger, action });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'suspended': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'ACTIVE': return 'Ativo';
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
        Gerenciamento de Passageiros
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Ativos" value="active" />
        <Tab label="Suspensos" value="suspended" />
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
              <TableCell>Cadastro</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {passengers.map((passenger) => (
              <TableRow key={passenger.id}>
                <TableCell>{passenger.name}</TableCell>
                <TableCell>{passenger.email}</TableCell>
                <TableCell>{passenger.community?.name || 'Não definido'}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusText(passenger.status)}
                    color={getStatusColor(passenger.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(passenger.createdAt).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {passenger.status === 'ACTIVE' && (
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => openActionDialog(passenger, 'suspended')}
                        title="Suspender"
                      >
                        <Block />
                      </IconButton>
                    )}
                    {passenger.status === 'suspended' && (
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => openActionDialog(passenger, 'ACTIVE')}
                        title="Reativar"
                      >
                        <Restore />
                      </IconButton>
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

      {passengers.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">
            Nenhum passageiro encontrado nesta categoria.
          </Typography>
        </Box>
      )}

      {/* Dialog de Ação */}
      <Dialog
        open={actionDialog.open}
        onClose={() => setActionDialog({ open: false, passenger: null, action: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {getActionText(actionDialog.action)} Passageiro
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Tem certeza que deseja {String(getActionText(actionDialog.action) ?? '').toLowerCase()} o passageiro{' '}
            <strong>{actionDialog.passenger?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setActionDialog({ open: false, passenger: null, action: null })}
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
