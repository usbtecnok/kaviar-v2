import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Cancel, ArrowBack } from '@mui/icons-material';
import api from '../../api/index';
import { VirtualFenceCenterCard } from '../../components/admin/VirtualFenceCenterCard';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const isSuperAdmin = () => {
  const data = localStorage.getItem('kaviar_admin_data');
  return data ? JSON.parse(data)?.role === 'SUPER_ADMIN' : false;
};

// Resolve document URL (handles absolute vs relative paths)
const resolveDocUrl = (url) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url; // Already absolute
  if (url.startsWith('/uploads/')) return `${API_BASE_URL}${url}`; // Relative path
  if (url.startsWith('certidoes/')) return `${API_BASE_URL}/uploads/${url}`; // S3 key
  return url;
};

// Component for document image with fallback
const DocumentImage = ({ url, alt }) => {
  const [error, setError] = useState(false);
  
  if (error || !url) {
    return (
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1, textAlign: 'center' }}>
        <Typography variant="body2" color="warning.dark">
          ⚠️ Documento não disponível
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Enviado antes da migração S3. Solicite novo upload.
        </Typography>
      </Box>
    );
  }
  
  return (
    <img 
      src={resolveDocUrl(url)} 
      alt={alt}
      onError={() => setError(true)}
      style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }}
    />
  );
};

export default function AdminDriverDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadDriver();
    loadDocuments();
  }, [id]);

  const loadDriver = async () => {
    try {
      const response = await api.get(`/api/admin/drivers/${id}`);
      if (response.data.success) {
        const driverData = response.data.data;
        console.log('[Admin] Driver loaded:', {
          id: driverData.id,
          vehicle_color: driverData.vehicle_color,
          vehicle_plate: driverData.vehicle_plate,
          vehicle_model: driverData.vehicle_model,
          family_bonus_accepted: driverData.family_bonus_accepted,
          family_bonus_profile: driverData.family_bonus_profile
        });
        setDriver(driverData);
      } else {
        setError(response.data.error || 'Motorista não encontrado');
      }
    } catch (error) {
      console.error('Erro ao carregar motorista:', error);
      setError(error.response?.data?.error || 'Motorista não encontrado');
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      // Buscar documentos de driver_documents (validação)
      const response = await api.get(`/api/admin/drivers/${id}/documents`);
      if (response.data.success) {
        setDocuments(response.data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
      // Não bloqueia a tela se documentos falharem
    }
  };

  const handleApprove = async () => {
    try {
      setError('');
      const response = await api.post(`/api/admin/drivers/${id}/approve`);
      if (response.data.success) {
        setSuccess('Motorista aprovado com sucesso!');
        setTimeout(() => navigate('/admin/motoristas'), 2000);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao aprovar motorista');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError('Motivo da rejeição é obrigatório');
      return;
    }

    try {
      setError('');
      const response = await api.post(`/api/admin/drivers/${id}/reject`, {
        reason: rejectReason
      });
      if (response.data.success) {
        setSuccess('Motorista rejeitado');
        setTimeout(() => navigate('/admin/motoristas'), 2000);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao rejeitar motorista');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!driver) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">Motorista não encontrado</Alert>
      </Container>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'approved': return 'Aprovado';
      case 'rejected': return 'Rejeitado';
      default: return status;
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/admin/motoristas')}
        sx={{ mb: 2 }}
      >
        Voltar
      </Button>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5">
            Detalhes do Motorista
          </Typography>
          <Chip 
            label={getStatusLabel(driver.status)} 
            color={getStatusColor(driver.status)}
          />
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">Nome</Typography>
            <Typography variant="body1">{driver.name}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">Email</Typography>
            <Typography variant="body1">{driver.email}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">Telefone</Typography>
            <Typography variant="body1">{driver.phone || 'Não informado'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">Status</Typography>
            <Typography variant="body1">{getStatusLabel(driver.status)}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">Chave PIX</Typography>
            <Typography variant="body1">{driver.pix_key || 'Não informado'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">Tipo de Chave</Typography>
            <Typography variant="body1">{driver.pix_key_type || 'Não informado'}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Documentos</Typography>
            {documents.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {documents.map((doc) => (
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
                        Ver Documento
                      </Button>
                    )}
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nenhum documento enviado
              </Typography>
            )}
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary">Certidão "Nada Consta" (Legacy)</Typography>
            {driver.certidao_nada_consta_url ? (
              <Box sx={{ mt: 1 }}>
                <DocumentImage url={driver.certidao_nada_consta_url} alt="Certidão Nada Consta" />
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">Não enviado</Typography>
            )}
          </Grid>

          {driver.rejected_reason && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="error">Motivo da Rejeição</Typography>
              <Typography variant="body1">{driver.rejected_reason}</Typography>
            </Grid>
          )}

          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Veículo</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="text.secondary">Placa</Typography>
                <Typography variant="body1">{driver.vehicle_plate || 'Não informado'}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="text.secondary">Modelo</Typography>
                <Typography variant="body1">{driver.vehicle_model || 'Não informado'}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="text.secondary">Cor</Typography>
                <Typography variant="body1">{driver.vehicle_color || 'Não informado'}</Typography>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Bônus Familiar</Typography>
            {(() => {
              // Converter para boolean (pode vir como string do DB)
              const isFamilyBonusAccepted = driver.family_bonus_accepted === true || driver.family_bonus_accepted === 't' || driver.family_bonus_accepted === 'true';
              
              if (!isFamilyBonusAccepted) {
                return (
                  <Typography variant="body2" color="text.secondary">
                    Não declarado
                  </Typography>
                );
              }

              const familyProfile = driver.family_bonus_profile || 'individual';
              const bonusPercent = 50; // Default
              const bonusAmount = (100 * bonusPercent) / 100;
              const acceptedAt = driver.approved_at || driver.created_at;

              return (
                <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Perfil:</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Chip 
                        label={familyProfile === 'familiar' ? 'Familiar' : 'Individual'} 
                        color={familyProfile === 'familiar' ? 'success' : 'info'}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Percentual:</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">{bonusPercent}%</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Crédito mensal:</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" fontWeight="bold">R$ {bonusAmount.toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        Declarado em: {acceptedAt ? new Date(acceptedAt).toLocaleDateString('pt-BR') : '—'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              );
            })()}
          </Grid>
        </Grid>

        {isSuperAdmin() && driver.status === 'pending' && (
          <Box display="flex" gap={2} mt={4}>
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
              onClick={handleApprove}
              fullWidth
            >
              Aprovar Motorista
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<Cancel />}
              onClick={() => setRejectDialogOpen(true)}
              fullWidth
            >
              Rejeitar Motorista
            </Button>
          </Box>
        )}
      </Paper>

      {/* Virtual Fence Center Card */}
      <Box sx={{ mt: 3 }}>
        <VirtualFenceCenterCard driverId={id} />
      </Box>

      {/* Dialog de rejeição */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)}>
        <DialogTitle>Rejeitar Motorista</DialogTitle>
        <DialogContent>
          <TextField
            label="Motivo da Rejeição"
            multiline
            rows={4}
            fullWidth
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            required
            sx={{ mt: 2 }}
            helperText="Obrigatório"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleReject} 
            color="error" 
            variant="contained"
            disabled={!rejectReason.trim()}
          >
            Confirmar Rejeição
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
