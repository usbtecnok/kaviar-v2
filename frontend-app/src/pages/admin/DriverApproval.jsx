import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Box,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Snackbar,
  CircularProgress
} from '@mui/material';
import { CheckCircle, Cancel, Visibility, Delete } from '@mui/icons-material';
import { adminApi } from '../../services/adminApi';

export default function DriverApproval() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, driverId: null });
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      // ✅ CORREÇÃO: adminApi já adiciona /api/admin
      const response = await adminApi.getDrivers();
      if (response.success) {
        setDrivers(response.data);
      }
    } catch (error) {
      setError('Erro ao carregar motoristas');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (driverId) => {
    try {
      setActionLoading(driverId);
      await adminApi.approveDriver(driverId);
      setToast({ open: true, message: 'Motorista aprovado com sucesso', severity: 'success' });
      loadDrivers();
    } catch (error) {
      setToast({ open: true, message: 'Erro ao aprovar motorista', severity: 'error' });
    } finally {
      setActionLoading(null);
      setConfirmDialog({ open: false, action: null, driverId: null });
    }
  };

  const handleReject = async (driverId) => {
    try {
      setActionLoading(driverId);
      await adminApi.rejectDriver(driverId);
      setToast({ open: true, message: 'Motorista rejeitado', severity: 'info' });
      loadDrivers();
    } catch (error) {
      setToast({ open: true, message: 'Erro ao rejeitar motorista', severity: 'error' });
    } finally {
      setActionLoading(null);
      setConfirmDialog({ open: false, action: null, driverId: null });
    }
  };

  const handleDelete = async (driverId) => {
    try {
      setActionLoading(driverId);
      await adminApi.deleteDriver(driverId);
      setToast({ open: true, message: 'Motorista excluído', severity: 'success' });
      loadDrivers();
    } catch (error) {
      setToast({ open: true, message: 'Erro ao excluir motorista', severity: 'error' });
    } finally {
      setActionLoading(null);
      setConfirmDialog({ open: false, action: null, driverId: null });
    }
  };

  const openConfirmDialog = (action, driverId) => {
    setConfirmDialog({ open: true, action, driverId });
  };

  const executeAction = () => {
    const { action, driverId } = confirmDialog;
    if (action === 'approve') handleApprove(driverId);
    else if (action === 'reject') handleReject(driverId);
    else if (action === 'delete') handleDelete(driverId);
  };

  const openDetails = (driver) => {
    setSelectedDriver(driver);
    setDetailsOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'suspended': return 'error';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'approved': return 'Aprovado';
      case 'suspended': return 'Suspenso';
      case 'rejected': return 'Rejeitado';
      default: return status;
    }
  };

  if (loading) return <Typography>Carregando...</Typography>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Aprovação de Motoristas
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Data Cadastro</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {drivers.map((driver) => (
              <TableRow key={driver.id}>
                <TableCell>{driver.name}</TableCell>
                <TableCell>{driver.email}</TableCell>
                <TableCell>
                  <Chip 
                    label={getStatusLabel(driver.status)} 
                    color={getStatusColor(driver.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(driver.createdAt).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => openDetails(driver)}
                      disabled={actionLoading === driver.id}
                    >
                      Ver
                    </Button>
                    {driver.status === 'pending' && (
                      <>
                        <Button
                          size="small"
                          color="success"
                          startIcon={actionLoading === driver.id ? <CircularProgress size={16} /> : <CheckCircle />}
                          onClick={() => openConfirmDialog('approve', driver.id)}
                          disabled={actionLoading === driver.id}
                        >
                          Aprovar
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={actionLoading === driver.id ? <CircularProgress size={16} /> : <Cancel />}
                          onClick={() => openConfirmDialog('reject', driver.id)}
                          disabled={actionLoading === driver.id}
                        >
                          Rejeitar
                        </Button>
                      </>
                    )}
                    <Button
                      size="small"
                      color="error"
                      startIcon={actionLoading === driver.id ? <CircularProgress size={16} /> : <Delete />}
                      onClick={() => openConfirmDialog('delete', driver.id)}
                      disabled={actionLoading === driver.id}
                    >
                      Excluir
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de Detalhes */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Detalhes do Motorista</DialogTitle>
        <DialogContent>
          {selectedDriver && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Nome:</Typography>
                <Typography>{selectedDriver.name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Email:</Typography>
                <Typography>{selectedDriver.email}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Telefone:</Typography>
                <Typography>{selectedDriver.phone || 'Não informado'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Status:</Typography>
                <Chip 
                  label={getStatusLabel(selectedDriver.status)} 
                  color={getStatusColor(selectedDriver.status)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Documentos:</Typography>
                <Typography>CPF: {selectedDriver.documentCpf || 'Não enviado'}</Typography>
                <Typography>RG: {selectedDriver.documentRg || 'Não enviado'}</Typography>
                <Typography>CNH: {selectedDriver.documentCnh || 'Não enviado'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Veículo:</Typography>
                <Typography>Placa: {selectedDriver.vehiclePlate || 'Não informado'}</Typography>
                <Typography>Modelo: {selectedDriver.vehicleModel || 'Não informado'}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Confirmação */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, action: null, driverId: null })}>
        <DialogTitle>Confirmar Ação</DialogTitle>
        <DialogContent>
          <Typography>
            {confirmDialog.action === 'approve' && 'Deseja aprovar este motorista?'}
            {confirmDialog.action === 'reject' && 'Deseja rejeitar este motorista?'}
            {confirmDialog.action === 'delete' && 'Deseja excluir este motorista? Esta ação não pode ser desfeita.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, action: null, driverId: null })}>
            Cancelar
          </Button>
          <Button 
            onClick={executeAction} 
            color={confirmDialog.action === 'delete' ? 'error' : 'primary'}
            disabled={actionLoading !== null}
          >
            {actionLoading !== null ? <CircularProgress size={20} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
