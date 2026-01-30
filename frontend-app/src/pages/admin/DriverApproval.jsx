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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const normType = (t) => String(t || "").trim().toUpperCase();

const isSuperAdmin = () => {
  const data = localStorage.getItem('kaviar_admin_data');
  return data ? JSON.parse(data)?.role === 'SUPER_ADMIN' : false;
};

const statusRank = (s) => {
  const v = String(s || "").toUpperCase();
  if (v === "VERIFIED") return 3;
  if (v === "SUBMITTED") return 2;
  if (v === "MISSING") return 1;
  return 0;
};

const uniqueByTypeBestStatus = (docs) => {
  const map = new Map();
  for (const d of docs || []) {
    const type = normType(d.type || d.docType || d.documentType);
    if (!type) continue;
    const prev = map.get(type);
    if (!prev || statusRank(d.status) > statusRank(prev.status)) {
      map.set(type, d);
    }
  }
  return Array.from(map.values());
};

const getVehiclePlate = (d) => d?.vehicle_plate ?? d?.vehiclePlate ?? d?.vehicle?.plate ?? '-';
const getVehicleModel = (d) => d?.vehicle_model ?? d?.vehicleModel ?? d?.vehicle?.model ?? '-';
const getVehicleColor = (d) => d?.vehicle_color ?? d?.vehicleColor ?? d?.vehicle?.color ?? '-';

const getFamilyBonusLabel = (d) => {
  const accepted = d?.family_bonus_accepted ?? d?.familyBonusAccepted ?? d?.familyBonus?.accepted;
  const profile = d?.family_bonus_profile ?? d?.familyBonusProfile ?? d?.familyBonus?.profile;

  if (accepted === true) return "Aceito";
  if (profile != null && profile !== "") {
    if (typeof profile === "object") {
      return profile.name || profile.label || profile.type || JSON.stringify(profile);
    }
    return String(profile);
  }
  if (accepted === false) return "Não";
  return "-";
};

const renderFamilyBonus = (d) => {
  const label = getFamilyBonusLabel(d);
  if (label === "-") return "-";

  const isAccepted = (d?.family_bonus_accepted ?? d?.familyBonusAccepted) === true;

  return (
    <Chip
      size="small"
      label={label}
      color={isAccepted ? "success" : "default"}
      variant={isAccepted ? "filled" : "outlined"}
    />
  );
};

export default function DriverApproval() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverDocuments, setDriverDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, driverId: null });
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      const response = await adminApi.getDrivers();
      if (response.success) {
        // ✅ Backend entrega pronto, frontend só renderiza
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
      const data = error?.response?.data;
      const msg =
        (Array.isArray(data?.missingRequirements) && data.missingRequirements.length
          ? `Pendências: ${data.missingRequirements.join(', ')}`
          : null) ||
        data?.message ||
        data?.error ||
        error?.message ||
        'Erro ao aprovar motorista';
      setToast({ open: true, message: msg, severity: 'error' });
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

  const openDetails = async (driver) => {
    setSelectedDriver(driver);
    setDetailsOpen(true);
    setDriverDocuments([]);
    setDocumentsLoading(true);
    
    // Buscar documentos reais
    try {
      const response = await adminApi.getDriverDocuments(driver.id);
      if (response.success) {
        console.log('📄 Documentos carregados:', response.data);
        setDriverDocuments(response.data || []);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar documentos:', error);
      setDriverDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
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
              <TableCell>Placa</TableCell>
              <TableCell>Modelo</TableCell>
              <TableCell>Cor</TableCell>
              <TableCell>Bônus Familiar</TableCell>
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
                <TableCell>{getVehiclePlate(driver)}</TableCell>
                <TableCell>{getVehicleModel(driver)}</TableCell>
                <TableCell>{getVehicleColor(driver)}</TableCell>
                <TableCell>{renderFamilyBonus(driver)}</TableCell>
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
                    {isSuperAdmin() && driver.status === 'pending' && (
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
                    {isSuperAdmin() && (
                      <Button
                        size="small"
                        color="error"
                        startIcon={actionLoading === driver.id ? <CircularProgress size={16} /> : <Delete />}
                        onClick={() => openConfirmDialog('delete', driver.id)}
                        disabled={actionLoading === driver.id}
                      >
                        Excluir
                      </Button>
                    )}
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
                {documentsLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2" color="text.secondary">Carregando documentos...</Typography>
                  </Box>
                ) : driverDocuments.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                    {uniqueByTypeBestStatus(driverDocuments).map((doc) => (
                      <Box key={doc.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ minWidth: 150, fontWeight: 600 }}>
                          {doc.type}
                        </Typography>
                        <Chip 
                          label={doc.status} 
                          size="small" 
                          color={doc.status === 'VERIFIED' ? 'success' : doc.status === 'SUBMITTED' ? 'warning' : 'default'}
                        />
                        {(doc.file_url || doc.document_url) && (
                          <Button
                            variant="outlined"
                            size="small"
                            href={`${API_BASE_URL}${doc.file_url || doc.document_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Ver
                          </Button>
                        )}
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Nenhum documento enviado
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Veículo:</Typography>
                <Typography>Placa: {selectedDriver.vehiclePlate || 'Não informado'}</Typography>
                <Typography>Modelo: {selectedDriver.vehicleModel || 'Não informado'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mt: 2 }}>Bônus Familiar:</Typography>
                {(() => {
                  if (!selectedDriver.family_bonus_accepted) {
                    return <Typography variant="body2" color="text.secondary">Não declarado</Typography>;
                  }

                  const familyProfile = selectedDriver.family_bonus_profile || 'individual';
                  const bonusPercent = 50; // Default
                  const bonusAmount = (100 * bonusPercent) / 100;

                  return (
                    <Box sx={{ bgcolor: 'grey.100', p: 1.5, borderRadius: 1, mt: 1 }}>
                      <Typography variant="body2">
                        Perfil: <Chip label={familyProfile === 'familiar' ? 'Familiar' : 'Individual'} size="small" color={familyProfile === 'familiar' ? 'success' : 'info'} />
                      </Typography>
                      <Typography variant="body2">Percentual: {bonusPercent}%</Typography>
                      <Typography variant="body2">Crédito mensal: R$ {bonusAmount.toFixed(2)}</Typography>
                    </Box>
                  );
                })()}
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
