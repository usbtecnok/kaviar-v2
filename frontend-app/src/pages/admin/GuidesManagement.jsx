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
import { CheckCircle, Cancel, Block, Language } from '@mui/icons-material';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function GuidesManagement() {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTab, setCurrentTab] = useState('pending');
  const [actionDialog, setActionDialog] = useState({ 
    open: false, 
    guide: null, 
    action: null
  });

  useEffect(() => {
    fetchGuides(currentTab);
  }, [currentTab]);

  const fetchGuides = async (status) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/guides?status=${status}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setGuides(data.data);
      } else {
        setError(data.error || 'Erro ao carregar guias turísticos');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async () => {
    try {
      const { guide, action } = actionDialog;
      const token = localStorage.getItem('kaviar_admin_token');

      const response = await fetch(`${API_BASE_URL}/api/admin/guides/${guide.id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: action })
      });

      const data = await response.json();
      if (data.success) {
        fetchGuides(currentTab);
        setActionDialog({ open: false, guide: null, action: null });
      } else {
        setError(data.error || 'Erro ao alterar status do guia');
      }
    } catch (error) {
      setError('Erro de conexão');
    }
  };

  const openActionDialog = (guide, action) => {
    setActionDialog({ open: true, guide, action });
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
        Gerenciamento de Guias Turísticos
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
              <TableCell>Idiomas</TableCell>
              <TableCell>Também Motorista</TableCell>
              <TableCell>Cadastro</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {guides.map((guide) => (
              <TableRow key={guide.id}>
                <TableCell>{guide.name}</TableCell>
                <TableCell>{guide.email}</TableCell>
                <TableCell>{guide.community?.name || 'Não definido'}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusText(guide.status)}
                    color={getStatusColor(guide.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {guide.isBilingual && (
                      <Language sx={{ fontSize: 16, color: 'primary.main' }} />
                    )}
                    <Typography variant="body2">
                      {guide.languages?.join(', ') || 'Não informado'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {guide.alsoDriver ? (
                    <Chip label="Sim" color="info" size="small" />
                  ) : (
                    <Chip label="Não" color="default" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  {new Date(guide.createdAt).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {guide.status === 'pending' && (
                      <>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => openActionDialog(guide, 'approved')}
                          title="Aprovar"
                        >
                          <CheckCircle />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => openActionDialog(guide, 'rejected')}
                          title="Rejeitar"
                        >
                          <Cancel />
                        </IconButton>
                      </>
                    )}
                    {guide.status === 'approved' && (
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => openActionDialog(guide, 'suspended')}
                        title="Suspender"
                      >
                        <Block />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {guides.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">
            Nenhum guia turístico encontrado nesta categoria.
          </Typography>
        </Box>
      )}

      {/* Dialog de Ação */}
      <Dialog
        open={actionDialog.open}
        onClose={() => setActionDialog({ open: false, guide: null, action: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {getActionText(actionDialog.action)} Guia Turístico
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Tem certeza que deseja {getActionText(actionDialog.action).toLowerCase()} o guia turístico{' '}
            <strong>{actionDialog.guide?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setActionDialog({ open: false, guide: null, action: null })}
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
