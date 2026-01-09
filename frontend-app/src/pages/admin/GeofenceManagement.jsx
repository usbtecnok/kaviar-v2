import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel
} from '@mui/material';
import { Map, Visibility, Edit, CheckCircle } from '@mui/icons-material';
import GeofenceMap from '../../components/maps/GeofenceMap';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function GeofenceManagement() {
  const [communities, setCommunities] = useState([]);
  const [filteredCommunities, setFilteredCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros
  const [confidenceFilter, setConfidenceFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [hasGeometryFilter, setHasGeometryFilter] = useState('');
  
  // Dialogs
  const [mapDialog, setMapDialog] = useState({ open: false, community: null, geofence: null });
  const [editDialog, setEditDialog] = useState({ open: false, community: null, geofence: null });
  
  // Form data
  const [editForm, setEditForm] = useState({
    centerLat: '',
    centerLng: '',
    isVerified: false,
    reviewNotes: ''
  });

  useEffect(() => {
    fetchCommunities();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [communities, confidenceFilter, verifiedFilter, hasGeometryFilter]);

  const fetchCommunities = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/communities`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('kaviar_admin_token');
        window.location.href = '/admin/login';
        return;
      }

      const data = await response.json();
      if (data.success) {
        setCommunities(data.data);
      } else {
        setError(data.error || 'Erro ao carregar comunidades');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...communities];

    if (confidenceFilter) {
      filtered = filtered.filter(c => c.geofenceData?.confidence === confidenceFilter);
    }

    if (verifiedFilter !== '') {
      const isVerified = verifiedFilter === 'true';
      filtered = filtered.filter(c => c.geofenceData?.isVerified === isVerified);
    }

    if (hasGeometryFilter !== '') {
      const hasGeometry = hasGeometryFilter === 'true';
      filtered = filtered.filter(c => hasGeometry ? c.geofenceData?.geojson : !c.geofenceData?.geojson);
    }

    setFilteredCommunities(filtered);
  };

  const openMapDialog = async (community) => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/governance/communities/${community.id}/geofence`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMapDialog({ open: true, community, geofence: data.data });
      } else if (response.status === 404) {
        setMapDialog({ open: true, community, geofence: null });
      } else {
        setError('Erro ao carregar dados do geofence');
      }
    } catch (error) {
      setError('Erro ao carregar mapa');
    }
  };

  const openEditDialog = (community) => {
    const geofence = community.geofenceData;
    setEditForm({
      centerLat: geofence?.centerLat || '',
      centerLng: geofence?.centerLng || '',
      isVerified: geofence?.isVerified || false,
      reviewNotes: geofence?.reviewNotes || ''
    });
    setEditDialog({ open: true, community, geofence });
  };

  const handleSaveEdit = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/communities/${editDialog.community.id}/geofence-review`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          centerLat: parseFloat(editForm.centerLat),
          centerLng: parseFloat(editForm.centerLng),
          isVerified: editForm.isVerified,
          reviewNotes: editForm.reviewNotes
        })
      });

      const data = await response.json();
      if (data.success) {
        setEditDialog({ open: false, community: null, geofence: null });
        fetchCommunities(); // Recarregar dados
        setError('');
      } else {
        setError(data.error || 'Erro ao salvar alterações');
      }
    } catch (error) {
      setError('Erro ao salvar');
    }
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'HIGH': return 'success';
      case 'MED': return 'warning';
      case 'LOW': return 'error';
      default: return 'default';
    }
  };

  const getCommunityType = (description) => {
    if (description?.includes('Morro') || description?.includes('Comunidade')) {
      return 'Comunidade';
    }
    return 'Bairro';
  };

  const getParentNeighborhood = (description) => {
    if (description?.includes(' - ')) {
      const parts = description.split(' - ');
      if (parts.length >= 2 && parts[1] !== 'Rio de Janeiro') {
        return parts[1];
      }
    }
    return '-';
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Carregando geofences...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>
        Revisão de Geofences
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Filtros</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Confiança</InputLabel>
              <Select
                value={confidenceFilter}
                onChange={(e) => setConfidenceFilter(e.target.value)}
                label="Confiança"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="HIGH">HIGH</MenuItem>
                <MenuItem value="MED">MED</MenuItem>
                <MenuItem value="LOW">LOW</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Verificado</InputLabel>
              <Select
                value={verifiedFilter}
                onChange={(e) => setVerifiedFilter(e.target.value)}
                label="Verificado"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="true">Verificado</MenuItem>
                <MenuItem value="false">Pendente</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Geometria</InputLabel>
              <Select
                value={hasGeometryFilter}
                onChange={(e) => setHasGeometryFilter(e.target.value)}
                label="Geometria"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="true">Com GeoJSON</MenuItem>
                <MenuItem value="false">Sem GeoJSON</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Tabela */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Bairro Pai</TableCell>
              <TableCell>Confiança</TableCell>
              <TableCell>GeoJSON</TableCell>
              <TableCell>Verificado</TableCell>
              <TableCell>Atualizado</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCommunities.map((community) => (
              <TableRow key={community.id}>
                <TableCell>{community.name}</TableCell>
                <TableCell>{getCommunityType(community.description)}</TableCell>
                <TableCell>{getParentNeighborhood(community.description)}</TableCell>
                <TableCell>
                  {community.geofenceData ? (
                    <Chip 
                      label={community.geofenceData.confidence} 
                      color={getConfidenceColor(community.geofenceData.confidence)}
                      size="small"
                    />
                  ) : (
                    <Chip label="SEM DADOS" color="default" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  {community.geofenceData?.geojson ? 'Sim' : 'Não'}
                </TableCell>
                <TableCell>
                  {community.geofenceData?.isVerified ? (
                    <Chip label="Verificado" color="success" size="small" />
                  ) : (
                    <Chip label="Pendente" color="warning" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  {community.geofenceData?.updatedAt ? 
                    new Date(community.geofenceData.updatedAt).toLocaleDateString() : 
                    '-'
                  }
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => openMapDialog(community)}
                    >
                      Mapa
                    </Button>
                    {community.geofenceData && (
                      <Button
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => openEditDialog(community)}
                      >
                        Editar
                      </Button>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog do Mapa */}
      <Dialog open={mapDialog.open} onClose={() => setMapDialog({ open: false, community: null, geofence: null })} maxWidth="md" fullWidth>
        <DialogTitle>
          Mapa: {mapDialog.community?.name}
        </DialogTitle>
        <DialogContent>
          {mapDialog.geofence ? (
            <Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Centro:</strong> {mapDialog.geofence.centerLat}, {mapDialog.geofence.centerLng}
                <br />
                <strong>Confiança:</strong> {mapDialog.geofence.confidence}
                <br />
                <strong>Verificado:</strong> {mapDialog.geofence.isVerified ? 'Sim' : 'Não'}
                <br />
                <strong>Fonte:</strong> {mapDialog.geofence.source}
              </Typography>
              
              {mapDialog.geofence.geometry ? (
                <Box>
                  <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>
                    ✅ Geometria disponível ({mapDialog.geofence.geometry.type})
                  </Typography>
                  <Box sx={{ height: 400, width: '100%', bgcolor: 'grey.100', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <GeofenceMap
                      communities={[{
                        id: mapDialog.community.id,
                        name: mapDialog.community.name,
                        centerLat: parseFloat(mapDialog.geofence.centerLat),
                        centerLng: parseFloat(mapDialog.geofence.centerLng),
                        geofence: JSON.stringify(mapDialog.geofence.geometry)
                      }]}
                      selectedCommunity={{
                        id: mapDialog.community.id,
                        name: mapDialog.community.name,
                        centerLat: parseFloat(mapDialog.geofence.centerLat),
                        centerLng: parseFloat(mapDialog.geofence.centerLng),
                        geofence: JSON.stringify(mapDialog.geofence.geometry)
                      }}
                      showGeofenceValidation={false}
                      editMode={false}
                    />
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    ⚠️ Sem geometria disponível. Mostrando apenas ponto central.
                  </Alert>
                  <Box sx={{ height: 400, width: '100%', bgcolor: 'grey.100', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <GeofenceMap
                      communities={[{
                        id: mapDialog.community.id,
                        name: mapDialog.community.name,
                        centerLat: parseFloat(mapDialog.geofence.centerLat),
                        centerLng: parseFloat(mapDialog.geofence.centerLng)
                      }]}
                      selectedCommunity={{
                        id: mapDialog.community.id,
                        name: mapDialog.community.name,
                        centerLat: parseFloat(mapDialog.geofence.centerLat),
                        centerLng: parseFloat(mapDialog.geofence.centerLng)
                      }}
                      showGeofenceValidation={false}
                      editMode={false}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          ) : (
            <Alert severity="error">
              ❌ Nenhum dado de geofence encontrado para esta comunidade.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMapDialog({ open: false, community: null, geofence: null })}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Edição */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, community: null, geofence: null })} maxWidth="sm" fullWidth>
        <DialogTitle>
          Editar Geofence: {editDialog.community?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Latitude do Centro"
              type="number"
              value={editForm.centerLat}
              onChange={(e) => setEditForm({ ...editForm, centerLat: e.target.value })}
              inputProps={{ step: 0.000001 }}
              fullWidth
            />
            <TextField
              label="Longitude do Centro"
              type="number"
              value={editForm.centerLng}
              onChange={(e) => setEditForm({ ...editForm, centerLng: e.target.value })}
              inputProps={{ step: 0.000001 }}
              fullWidth
            />
            <TextField
              label="Notas de Revisão"
              multiline
              rows={3}
              value={editForm.reviewNotes}
              onChange={(e) => setEditForm({ ...editForm, reviewNotes: e.target.value })}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editForm.isVerified}
                  onChange={(e) => setEditForm({ ...editForm, isVerified: e.target.checked })}
                />
              }
              label="Marcar como Verificado"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, community: null, geofence: null })}>
            Cancelar
          </Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
