import { useState, useEffect } from 'react';
import {
  Container, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, Box, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Snackbar, CircularProgress,
  IconButton, Tooltip, Card, CardContent, CardActions, useMediaQuery, useTheme
} from '@mui/material';
import { CheckCircle, Cancel, Visibility, Delete, DirectionsCar } from '@mui/icons-material';
import { adminApi } from '../../services/adminApi';
import api from '../../api/index';

const normType = (t) => String(t || "").trim().toUpperCase();
const isSuperAdmin = () => {
  const data = localStorage.getItem('kaviar_admin_data');
  return data ? JSON.parse(data)?.role === 'SUPER_ADMIN' : false;
};
const statusRank = (s) => { const v = String(s||"").toUpperCase(); return v==="VERIFIED"?3:v==="SUBMITTED"?2:v==="MISSING"?1:0; };
const uniqueByTypeBestStatus = (docs) => {
  const map = new Map();
  for (const d of docs || []) { const type = normType(d.type||d.docType||d.documentType); if (!type) continue; const prev = map.get(type); if (!prev || statusRank(d.status) > statusRank(prev.status)) map.set(type, d); }
  return Array.from(map.values());
};

const getVehicleSummary = (d) => {
  const parts = [d?.vehicle_color ?? d?.vehicleColor, d?.vehicle_model ?? d?.vehicleModel, d?.vehicle_plate ?? d?.vehiclePlate].filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
};

const statusMap = { pending: { label: 'Pendente', color: 'warning' }, approved: { label: 'Aprovado', color: 'success' }, suspended: { label: 'Suspenso', color: 'error' }, rejected: { label: 'Rejeitado', color: 'error' } };
const getStatus = (s) => statusMap[s] || { label: s, color: 'default' };

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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => { loadDrivers(); }, []);

  const loadDrivers = async () => {
    try {
      const response = await adminApi.getDrivers();
      if (response.success) setDrivers(response.data);
    } catch { setError('Erro ao carregar motoristas'); }
    finally { setLoading(false); }
  };

  const handleAction = async (action, driverId) => {
    try {
      setActionLoading(driverId);
      if (action === 'approve') { await adminApi.approveDriver(driverId); setToast({ open: true, message: 'Motorista aprovado com sucesso', severity: 'success' }); }
      else if (action === 'reject') { await adminApi.rejectDriver(driverId); setToast({ open: true, message: 'Motorista rejeitado', severity: 'info' }); }
      else if (action === 'delete') { await adminApi.deleteDriver(driverId); setToast({ open: true, message: 'Motorista excluído', severity: 'success' }); }
      loadDrivers();
    } catch (error) {
      const data = error?.response?.data;
      const msg = (Array.isArray(data?.missingRequirements) && data.missingRequirements.length ? `Pendências: ${data.missingRequirements.join(', ')}` : null) || data?.message || data?.error || 'Erro na operação';
      setToast({ open: true, message: msg, severity: 'error' });
    } finally { setActionLoading(null); setConfirmDialog({ open: false, action: null, driverId: null }); }
  };

  const openDetails = async (driver) => {
    setSelectedDriver(driver);
    setDetailsOpen(true);
    setDriverDocuments([]);
    setDocumentsLoading(true);
    try {
      const response = await adminApi.getDriverDocuments(driver.id);
      if (response.success) setDriverDocuments(response.data || []);
    } catch { setDriverDocuments([]); }
    finally { setDocumentsLoading(false); }
  };

  const ActionButtons = ({ driver, compact }) => {
    const isLoading = actionLoading === driver.id;
    const isPending = driver.status === 'pending';
    const superAdmin = isSuperAdmin();
    if (compact) {
      return (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Ver detalhes"><IconButton size="small" onClick={() => openDetails(driver)} disabled={isLoading}><Visibility fontSize="small" /></IconButton></Tooltip>
          {superAdmin && isPending && <>
            <Tooltip title="Aprovar"><IconButton size="small" color="success" onClick={() => setConfirmDialog({ open: true, action: 'approve', driverId: driver.id })} disabled={isLoading}>{isLoading ? <CircularProgress size={18} /> : <CheckCircle fontSize="small" />}</IconButton></Tooltip>
            <Tooltip title="Rejeitar"><IconButton size="small" color="error" onClick={() => setConfirmDialog({ open: true, action: 'reject', driverId: driver.id })} disabled={isLoading}><Cancel fontSize="small" /></IconButton></Tooltip>
          </>}
          {superAdmin && <Tooltip title="Excluir"><IconButton size="small" color="error" onClick={() => setConfirmDialog({ open: true, action: 'delete', driverId: driver.id })} disabled={isLoading}><Delete fontSize="small" /></IconButton></Tooltip>}
        </Box>
      );
    }
    return (
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button size="small" variant="outlined" startIcon={<Visibility />} onClick={() => openDetails(driver)} disabled={isLoading}>Ver</Button>
        {superAdmin && isPending && <>
          <Button size="small" variant="contained" color="success" startIcon={isLoading ? <CircularProgress size={16} /> : <CheckCircle />} onClick={() => setConfirmDialog({ open: true, action: 'approve', driverId: driver.id })} disabled={isLoading}>Aprovar</Button>
          <Button size="small" variant="outlined" color="error" startIcon={<Cancel />} onClick={() => setConfirmDialog({ open: true, action: 'reject', driverId: driver.id })} disabled={isLoading}>Rejeitar</Button>
        </>}
        {superAdmin && <IconButton size="small" color="error" onClick={() => setConfirmDialog({ open: true, action: 'delete', driverId: driver.id })} disabled={isLoading}><Delete fontSize="small" /></IconButton>}
      </Box>
    );
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>Aprovação de Motoristas</Typography>
        <Chip label={`${drivers.length} motorista${drivers.length !== 1 ? 's' : ''}`} variant="outlined" />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Desktop: tabela limpa */}
      {!isMobile ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' } }}>
                <TableCell>Nome</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Cadastro</TableCell>
                <TableCell>Veículo</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {drivers.map((driver) => {
                const st = getStatus(driver.status);
                return (
                  <TableRow key={driver.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 220 }}>{driver.name}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 220, display: 'block' }}>{driver.email}</Typography>
                    </TableCell>
                    <TableCell><Chip label={st.label} color={st.color} size="small" /></TableCell>
                    <TableCell><Typography variant="body2">{new Date(driver.createdAt).toLocaleDateString('pt-BR')}</Typography></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <DirectionsCar fontSize="small" sx={{ color: 'text.disabled' }} />
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>{getVehicleSummary(driver)}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right"><ActionButtons driver={driver} compact /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        /* Mobile: cards */
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {drivers.map((driver) => {
            const st = getStatus(driver.status);
            return (
              <Card key={driver.id} variant="outlined">
                <CardContent sx={{ pb: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight={700} noWrap>{driver.name}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{driver.email}</Typography>
                    </Box>
                    <Chip label={st.label} color={st.color} size="small" sx={{ ml: 1, flexShrink: 0 }} />
                  </Box>
                  <Box display="flex" gap={2} flexWrap="wrap">
                    <Typography variant="caption" color="text.secondary">{new Date(driver.createdAt).toLocaleDateString('pt-BR')}</Typography>
                    <Typography variant="caption" color="text.secondary">🚗 {getVehicleSummary(driver)}</Typography>
                  </Box>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 1.5 }}>
                  <ActionButtons driver={driver} />
                </CardActions>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Dialog de Detalhes */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Detalhes do Motorista</DialogTitle>
        <DialogContent>
          {selectedDriver && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Nome</Typography><Typography>{selectedDriver.name}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Email</Typography><Typography>{selectedDriver.email}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Telefone</Typography><Typography>{selectedDriver.phone || '—'}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Status</Typography><Box mt={0.5}><Chip label={getStatus(selectedDriver.status).label} color={getStatus(selectedDriver.status).color} size="small" /></Box></Grid>
              <Grid item xs={4}><Typography variant="caption" color="text.secondary">Placa</Typography><Typography>{selectedDriver.vehicle_plate ?? selectedDriver.vehiclePlate ?? '—'}</Typography></Grid>
              <Grid item xs={4}><Typography variant="caption" color="text.secondary">Modelo</Typography><Typography>{selectedDriver.vehicle_model ?? selectedDriver.vehicleModel ?? '—'}</Typography></Grid>
              <Grid item xs={4}><Typography variant="caption" color="text.secondary">Cor</Typography><Typography>{selectedDriver.vehicle_color ?? selectedDriver.vehicleColor ?? '—'}</Typography></Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Bônus Familiar</Typography>
                <Typography>{(selectedDriver.family_bonus_accepted === true) ? `Aceito — ${selectedDriver.family_bonus_profile || 'individual'}` : 'Não declarado'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Documentos</Typography>
                {documentsLoading ? (
                  <Box display="flex" alignItems="center" gap={1}><CircularProgress size={20} /><Typography variant="body2" color="text.secondary">Carregando...</Typography></Box>
                ) : driverDocuments.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {uniqueByTypeBestStatus(driverDocuments).map((doc) => (
                      <Box key={doc.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ minWidth: 120 }}>{doc.type}</Typography>
                        <Chip label={doc.status} size="small" color={doc.status === 'VERIFIED' ? 'success' : doc.status === 'SUBMITTED' ? 'warning' : 'default'} />
                        {(doc.file_url || doc.document_url) && (
                          <Button size="small" onClick={async () => {
                            const key = (doc.file_url || doc.document_url).replace(/^\//, '');
                            try { const { data } = await api.get(`/api/admin/presign?key=${encodeURIComponent(key)}`); if (data.success && data.url) window.open(data.url, '_blank', 'noopener,noreferrer'); }
                            catch { alert('Erro ao abrir documento'); }
                          }}>Ver</Button>
                        )}
                      </Box>
                    ))}
                  </Box>
                ) : <Typography variant="body2" color="text.secondary">Nenhum documento enviado</Typography>}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDetailsOpen(false)}>Fechar</Button></DialogActions>
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
          <Button onClick={() => setConfirmDialog({ open: false, action: null, driverId: null })}>Cancelar</Button>
          <Button onClick={() => { const { action, driverId } = confirmDialog; handleAction(action, driverId); }} color={confirmDialog.action === 'delete' ? 'error' : 'primary'} variant="contained" disabled={actionLoading !== null}>
            {actionLoading !== null ? <CircularProgress size={20} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast.severity} onClose={() => setToast({ ...toast, open: false })}>{toast.message}</Alert>
      </Snackbar>
    </Container>
  );
}
