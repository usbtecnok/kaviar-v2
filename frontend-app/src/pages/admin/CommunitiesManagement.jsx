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
  TextField,
  FormControlLabel
} from '@mui/material';
import { Map, Visibility, LocationCity } from '@mui/icons-material';
import GeofenceMap from '../../components/maps/GeofenceMap';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function CommunitiesManagement() {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ open: false, community: null });
  const [mapDialog, setMapDialog] = useState({ open: false, community: null });
  const [createDialog, setCreateDialog] = useState({ open: false });
  const [newCommunity, setNewCommunity] = useState({ name: '', isActive: true });
  const [editMode, setEditMode] = useState(false);
  const [editedGeofence, setEditedGeofence] = useState(null);
  const [saving, setSaving] = useState(false);
  const [centerMode, setCenterMode] = useState(false);
  const [centerCandidate, setCenterCandidate] = useState(null);

  useEffect(() => {
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/communities`, {
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

  const createCommunity = async () => {
    if (!newCommunity.name.trim()) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/communities`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newCommunity.name.trim(),
          isActive: newCommunity.isActive
        })
      });

      const data = await response.json();
      if (data.success) {
        const created = data?.data;
        if (!created?.id) {
          throw new Error("Create community: resposta sem data.id");
        }

        await fetchCommunities();
        setCreateDialog({ open: false });
        setNewCommunity({ name: '', isActive: true });
        
        // Auto-abrir mapa do bairro recém-criado com guard
        setTimeout(() => {
          if (created.id) {
            openMapDialog(created);
          }
        }, 500);
      } else {
        setError(data.message || 'Erro ao criar bairro');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (community) => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/communities/${community.id}/toggle`, {
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

  const openMapDialog = (community) => {
    setMapDialog({ open: true, community });
  };

  const closeMapDialog = () => {
    setMapDialog({ open: false, community: null });
    setEditMode(false);
    setEditedGeofence(null);
    setCenterMode(false);
    setCenterCandidate(null);
  };

  const handleGeofenceChange = (geofence) => {
    setEditedGeofence(geofence);
  };

  const handleCenterChange = (center) => {
    setCenterCandidate(center);
  };

  const saveGeofence = async () => {
    if (!mapDialog.community) return;

    setSaving(true);
    try {
      const payload = {};
      
      if (editedGeofence !== null) {
        payload.geofence = editedGeofence;
      }
      
      if (centerCandidate) {
        payload.centerLat = centerCandidate.lat;
        payload.centerLng = centerCandidate.lng;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/communities/${mapDialog.community.id}/geofence`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Erro ao salvar');

      const data = await response.json();
      
      // Atualizar lista de comunidades
      fetchCommunities();
      
      // Fechar modal
      closeMapDialog();
      
      setError('');
    } catch (err) {
      setError('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const clearGeofence = () => {
    setEditedGeofence(null);
  };

  const clearCenter = () => {
    setCenterCandidate(null);
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Gerenciamento de Bairros
        </Typography>
        <Button
          variant="contained"
          startIcon={<LocationCity />}
          onClick={() => setCreateDialog({ open: true })}
        >
          Criar novo bairro
        </Button>
      </Box>

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
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Botão Ver no Mapa */}
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Map />}
                    onClick={() => openMapDialog(community)}
                    fullWidth
                  >
                    Ver no Mapa
                  </Button>

                  {/* Switch de Ativação */}
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

      {/* Dialog do Mapa */}
      <Dialog
        open={mapDialog.open}
        onClose={closeMapDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Map sx={{ mr: 1 }} />
              Mapa do Bairro: {mapDialog.community?.name}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={editMode}
                    onChange={(e) => setEditMode(e.target.checked)}
                  />
                }
                label="Editar"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={centerMode}
                    onChange={(e) => setCenterMode(e.target.checked)}
                  />
                }
                label="Centro"
              />
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {editMode && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                🖊️ Modo edição ativo. Use as ferramentas do mapa para desenhar ou editar o polígono.
              </Typography>
            </Alert>
          )}

          {centerMode && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                📍 Modo centro ativo. Clique no mapa para definir o centro do bairro.
              </Typography>
            </Alert>
          )}
          
          {mapDialog.community ? (
            <Box sx={{ height: 400, width: '100%' }}>
              <GeofenceMap
                communities={[mapDialog.community]}
                selectedCommunity={mapDialog.community}
                showGeofenceValidation={false}
                editMode={editMode}
                onGeofenceChange={handleGeofenceChange}
                showSearch={true}
                onCenterChange={centerMode ? handleCenterChange : null}
              />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          {editMode || centerMode ? (
            <>
              {editMode && (
                <Button onClick={clearGeofence} color="warning">
                  Limpar Polígono
                </Button>
              )}
              {centerMode && (
                <Button onClick={clearCenter} color="warning">
                  Limpar Centro
                </Button>
              )}
              <Button onClick={closeMapDialog}>
                Cancelar
              </Button>
              <Button 
                onClick={saveGeofence} 
                variant="contained"
                disabled={saving || (!editedGeofence && !centerCandidate)}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </>
          ) : (
            <Button onClick={closeMapDialog}>
              Fechar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Create Community Dialog */}
      <Dialog open={createDialog.open} onClose={() => setCreateDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>Criar Novo Bairro</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nome do Bairro"
            fullWidth
            variant="outlined"
            value={newCommunity.name}
            onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={newCommunity.isActive}
                onChange={(e) => setNewCommunity({ ...newCommunity, isActive: e.target.checked })}
              />
            }
            label="Ativo"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog({ open: false })}>
            Cancelar
          </Button>
          <Button 
            onClick={createCommunity} 
            variant="contained"
            disabled={saving || !newCommunity.name.trim()}
          >
            {saving ? 'Criando...' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
