import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Switch,
  Slider,
  Alert,
  List,
  ListItem,
  ListItemText,
  IconButton,
  FormControlLabel,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Delete, Add } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const KEY = 'passenger_favorites_matching';

export default function FeatureFlags() {
  const [flag, setFlag] = useState(null);
  const [allowlist, setAllowlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [newPassengerId, setNewPassengerId] = useState('');
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    checkPermissions();
    fetchFlag();
    fetchAllowlist();
  }, []);

  const checkPermissions = () => {
    const adminData = JSON.parse(localStorage.getItem('kaviar_admin_data') || '{}');
    const role = adminData.role || '';
    setCanEdit(role === 'SUPER_ADMIN' || role === 'OPERATOR');
  };

  const fetchFlag = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/feature-flags/${KEY}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setFlag(data.flag);
      }
    } catch (error) {
      console.error('Error fetching flag:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllowlist = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/feature-flags/${KEY}/allowlist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setAllowlist(data.allowlist);
      }
    } catch (error) {
      console.error('Error fetching allowlist:', error);
    }
  };

  const handleSave = async () => {
    if (!canEdit) {
      setMessage({ type: 'error', text: 'Acesso negado. Modo somente leitura.' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/feature-flags/${KEY}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: flag.enabled,
          rolloutPercentage: flag.rolloutPercentage,
        }),
      });

      const data = await response.json();

      if (response.status === 403) {
        setMessage({ type: 'error', text: 'Acesso negado. Modo somente leitura.' });
      } else if (data.success) {
        setMessage({ type: 'success', text: 'Configuração salva com sucesso.' });
        setFlag(data.flag);
      } else {
        setMessage({ type: 'error', text: 'Erro ao salvar. Tente novamente.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  const handleEmergencyDisable = async () => {
    if (!canEdit) {
      setMessage({ type: 'error', text: 'Acesso negado. Modo somente leitura.' });
      return;
    }

    if (!window.confirm('Desativar feature flag imediatamente?')) return;

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/feature-flags/${KEY}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: false,
          rolloutPercentage: 0,
        }),
      });

      const data = await response.json();

      if (response.status === 403) {
        setMessage({ type: 'error', text: 'Acesso negado. Modo somente leitura.' });
      } else if (data.success) {
        setMessage({ type: 'success', text: 'Feature flag desativada.' });
        setFlag(data.flag);
      } else {
        setMessage({ type: 'error', text: 'Erro ao desativar. Tente novamente.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao desativar. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddToAllowlist = async () => {
    if (!canEdit) {
      setMessage({ type: 'error', text: 'Acesso negado. Modo somente leitura.' });
      return;
    }

    if (!newPassengerId.trim()) {
      setMessage({ type: 'error', text: 'Passenger ID é obrigatório.' });
      return;
    }

    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/feature-flags/${KEY}/allowlist`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ passengerId: newPassengerId.trim() }),
      });

      const data = await response.json();

      if (response.status === 403) {
        setMessage({ type: 'error', text: 'Acesso negado. Modo somente leitura.' });
      } else if (response.status === 400) {
        setMessage({ type: 'error', text: data.error || 'Passenger já está na allowlist.' });
      } else if (data.success) {
        setMessage({ type: 'success', text: 'Passenger adicionado à allowlist.' });
        setNewPassengerId('');
        fetchAllowlist();
      } else {
        setMessage({ type: 'error', text: 'Erro ao adicionar. Tente novamente.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao adicionar. Tente novamente.' });
    }
  };

  const handleRemoveFromAllowlist = async (passengerId) => {
    if (!canEdit) {
      setMessage({ type: 'error', text: 'Acesso negado. Modo somente leitura.' });
      return;
    }

    if (!window.confirm(`Remover ${passengerId} da allowlist?`)) return;

    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(
        `${API_BASE_URL}/api/admin/feature-flags/${KEY}/allowlist/${passengerId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (response.status === 403) {
        setMessage({ type: 'error', text: 'Acesso negado. Modo somente leitura.' });
      } else if (response.status === 404) {
        setMessage({ type: 'error', text: 'Passenger não encontrado na allowlist.' });
      } else if (data.success) {
        setMessage({ type: 'success', text: 'Passenger removido da allowlist.' });
        fetchAllowlist();
      } else {
        setMessage({ type: 'error', text: 'Erro ao remover. Tente novamente.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao remover. Tente novamente.' });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!flag) {
    return (
      <Box p={3}>
        <Alert severity="error">Feature flag não encontrada.</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Feature Flags
      </Typography>

      {!canEdit && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Modo somente leitura. Você não tem permissão para editar.
        </Alert>
      )}

      {message.text && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      {/* Card A: Rollout */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Rollout — Passenger Favorites Matching
          </Typography>

          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={flag.enabled}
                  onChange={(e) => setFlag({ ...flag, enabled: e.target.checked })}
                  disabled={!canEdit}
                />
              }
              label={flag.enabled ? 'Ativado' : 'Desativado'}
            />
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography gutterBottom>
              Rollout Percentage: {flag.rolloutPercentage}%
            </Typography>
            <Slider
              value={flag.rolloutPercentage}
              onChange={(e, value) => setFlag({ ...flag, rolloutPercentage: value })}
              disabled={!canEdit}
              min={0}
              max={100}
              marks={[
                { value: 0, label: '0%' },
                { value: 25, label: '25%' },
                { value: 50, label: '50%' },
                { value: 75, label: '75%' },
                { value: 100, label: '100%' },
              ]}
              valueLabelDisplay="auto"
            />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Determinístico por passengerId
          </Typography>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!canEdit || saving}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={handleEmergencyDisable}
              disabled={!canEdit || saving}
            >
              Desativar (emergência)
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Atualizado em: {new Date(flag.updatedAt).toLocaleString('pt-BR')}
          </Typography>
        </CardContent>
      </Card>

      {/* Card B: Allowlist */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Allowlist — Passageiros Beta
          </Typography>

          <Typography variant="body2" color="text.secondary" gutterBottom>
            Allowlist tem prioridade sobre percentual.
          </Typography>

          <Typography variant="body2" sx={{ mt: 2, mb: 2 }}>
            Allowlist: {allowlist.length} passageiros
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <TextField
              size="small"
              placeholder="Passenger ID"
              value={newPassengerId}
              onChange={(e) => setNewPassengerId(e.target.value)}
              disabled={!canEdit}
              fullWidth
            />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAddToAllowlist}
              disabled={!canEdit}
            >
              Adicionar
            </Button>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {allowlist.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nenhum passenger na allowlist.
            </Typography>
          ) : (
            <List dense>
              {allowlist.map((entry) => (
                <ListItem
                  key={entry.id}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      onClick={() => handleRemoveFromAllowlist(entry.passengerId)}
                      disabled={!canEdit}
                    >
                      <Delete />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={entry.passengerId}
                    secondary={`Adicionado em: ${new Date(entry.createdAt).toLocaleString('pt-BR')}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
