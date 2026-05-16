import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowBack, Edit, Save, Cancel } from '@mui/icons-material';
import { PassengerFavoritesCard } from '../../components/admin/PassengerFavoritesCard';


export default function PassengerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [passenger, setPassenger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    loadPassenger();
  }, [id]);

  const loadPassenger = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/passengers/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        const p = data.passenger || data.data;
        setPassenger(p);
        setForm({ name: p.name || '', email: p.email || '', phone: p.phone || '' });
      } else {
        setError(data.error || 'Passageiro não encontrado');
      }
    } catch (err) {
      setError('Erro ao carregar dados do passageiro');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = () => {
    setForm({ name: passenger.name || '', email: passenger.email || '', phone: passenger.phone || '' });
    setReason('');
    setSaveError('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveError('');
  };

  const handleSave = () => {
    setSaveError('');
    if (!reason.trim()) {
      setSaveError('Motivo da alteração é obrigatório');
      return;
    }
    if (form.name === passenger.name && form.email === passenger.email && form.phone === (passenger.phone || '')) {
      setSaveError('Nenhuma alteração detectada');
      return;
    }
    setConfirmOpen(true);
  };

  const confirmSave = async () => {
    setConfirmOpen(false);
    setSaving(true);
    setSaveError('');
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const body = { reason: reason.trim() };
      if (form.name !== passenger.name) body.name = form.name;
      if (form.email !== passenger.email) body.email = form.email;
      if (form.phone !== (passenger.phone || '')) body.phone = form.phone;

      const response = await fetch(`${API_BASE_URL}/api/admin/passengers/${id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (data.success) {
        setPassenger(data.data);
        setEditing(false);
      } else {
        setSaveError(data.error || 'Erro ao salvar');
      }
    } catch (err) {
      setSaveError('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Container sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Container>;
  }

  if (error || !passenger) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Passageiro não encontrado'}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin/passengers')}>Voltar</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/admin/passengers')} sx={{ mb: 2 }}>
        Voltar
      </Button>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">Detalhes do Passageiro</Typography>
          {!editing && (
            <Button startIcon={<Edit />} variant="outlined" size="small" onClick={startEdit}>Editar</Button>
          )}
        </Box>

        {editing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}>
            <TextField label="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} size="small" fullWidth />
            <TextField label="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} size="small" fullWidth helperText="Alterar email pode afetar o login do passageiro." />
            <TextField label="Telefone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} size="small" fullWidth />
            <TextField label="Motivo da alteração *" value={reason} onChange={e => setReason(e.target.value)} size="small" fullWidth multiline rows={2} />
            {saveError && <Alert severity="error" sx={{ py: 0.5 }}>{saveError}</Alert>}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button startIcon={<Save />} variant="contained" size="small" onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button startIcon={<Cancel />} variant="outlined" size="small" onClick={cancelEdit} disabled={saving}>Cancelar</Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1"><strong>Nome:</strong> {passenger.name}</Typography>
            <Typography variant="body1"><strong>Email:</strong> {passenger.email}</Typography>
            <Typography variant="body1"><strong>Telefone:</strong> {passenger.phone || 'N/A'}</Typography>
            <Typography variant="body1"><strong>ID:</strong> {passenger.id}</Typography>
          </Box>
        )}
      </Paper>

      <Box sx={{ mt: 3 }}>
        <PassengerFavoritesCard passengerId={id} />
      </Box>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmar alteração</DialogTitle>
        <DialogContent>
          <Typography>Confirmar alteração dos dados do passageiro?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Motivo: {reason}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={confirmSave}>Confirmar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
