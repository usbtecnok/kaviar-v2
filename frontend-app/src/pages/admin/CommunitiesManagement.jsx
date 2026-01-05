import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Switch,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { LocationCity, Warning, CheckCircle, Block } from '@mui/icons-material';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export default function CommunitiesManagement() {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, community: null });

  useEffect(() => {
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/admin/communities`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setCommunities(data.data);
      } else {
        setError(data.error || 'Erro ao carregar bairros');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (community) => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/admin/communities/${community.id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        fetchCommunities(); // Recarregar lista
        setConfirmDialog({ open: false, community: null });
      } else {
        setError(data.error || 'Erro ao alterar status do bairro');
      }
    } catch (error) {
      setError('Erro de conexão');
    }
  };

  const openConfirmDialog = (community) => {
    setConfirmDialog({ open: true, community });
  };

  const getStatusColor = (isActive, canActivate) => {
    if (isActive) return 'success';
    if (canActivate) return 'warning';
    return 'error';
  };

  const getStatusText = (isActive, canActivate) => {
    if (isActive) return 'Ativo';
    if (canActivate) return 'Inativo';
    return 'Bloqueado';
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Carregando bairros...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Gerenciamento de Bairros
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {communities.map((community) => (
          <Grid item xs={12} md={6} lg={4} key={community.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <LocationCity sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {community.name}
                  </Typography>
                </Box>

                <Chip
                  label={getStatusText(community.isActive, community.stats.canActivate)}
                  color={getStatusColor(community.isActive, community.stats.canActivate)}
                  sx={{ mb: 2 }}
                />

                {/* Estatísticas */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Motoristas ativos: <strong>{community.stats.activeDrivers}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Motoristas premium: <strong>{community.stats.premiumDrivers}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Passageiros: <strong>{community.stats.activePassengers}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Guias turísticos: <strong>{community.stats.activeGuides}</strong>
                  </Typography>
                </Box>

                {/* Critério de ativação */}
                <Box sx={{ mb: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Critério mínimo: {community.stats.minRequired} motoristas
                  </Typography>
                  {!community.stats.canActivate && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <Warning sx={{ fontSize: 16, color: 'warning.main', mr: 0.5 }} />
                      <Typography variant="caption" color="warning.main">
                        Não pode ativar: poucos motoristas
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Controles */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2">
                    {community.isActive ? 'Desativar' : 'Ativar'} bairro
                  </Typography>
                  <Switch
                    checked={community.isActive}
                    onChange={() => openConfirmDialog(community)}
                    disabled={!community.isActive && !community.stats.canActivate}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Dialog de Confirmação */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, community: null })}
      >
        <DialogTitle>
          Confirmar alteração
        </DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja {confirmDialog.community?.isActive ? 'desativar' : 'ativar'} o bairro{' '}
            <strong>{confirmDialog.community?.name}</strong>?
          </Typography>
          {confirmDialog.community && !confirmDialog.community.isActive && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Este bairro será ativado e ficará disponível para operação.
            </Alert>
          )}
          {confirmDialog.community?.isActive && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Este bairro será desativado e não receberá novas corridas.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, community: null })}>
            Cancelar
          </Button>
          <Button
            onClick={() => handleToggleStatus(confirmDialog.community)}
            variant="contained"
            color={confirmDialog.community?.isActive ? 'warning' : 'primary'}
          >
            {confirmDialog.community?.isActive ? 'Desativar' : 'Ativar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
