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

export default function AdminDriverDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadDriver();
  }, [id]);

  const loadDriver = async () => {
    try {
      const response = await api.get(`/api/admin/drivers/${id}`);
      if (response.data.success) {
        setDriver(response.data.data);
      }
    } catch (error) {
      setError('Erro ao carregar motorista');
    } finally {
      setLoading(false);
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
            <Typography variant="subtitle2" color="text.secondary">Certidão "Nada Consta"</Typography>
            {driver.certidao_nada_consta_url ? (
              <Button
                variant="outlined"
                size="small"
                href={driver.certidao_nada_consta_url}
                target="_blank"
                sx={{ mt: 1 }}
              >
                Visualizar Certidão
              </Button>
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
        </Grid>

        {driver.status === 'pending' && (
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
