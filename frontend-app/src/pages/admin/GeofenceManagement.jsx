import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
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
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider
} from '@mui/material';
import { Map, Visibility, Edit, CheckCircle, Archive, Warning } from '@mui/icons-material';
import * as turf from '@turf/turf';
import GeofenceMap from '../../components/maps/GeofenceMap';
import { isLikelyInRioCity, fmtLatLng, canVerifyGeofence, geometryQuality } from '../../utils/geofence-governance';


// Funções de validação geométrica
const validateGeometry = (geofence) => {
  if (!geofence?.geometry) {
    return {
      hasFence: 'Não (sem dados)',
      centerInside: 'N/A',
      areaSize: 'N/A',
      isOutsideRJ: false
    };
  }

  const { geometry, centerLat, centerLng } = geofence;
  
  // Verificar se centro está no RJ (heurística básica)
  const lat = parseFloat(centerLat);
  const lng = parseFloat(centerLng);
  const isInRJ = lat >= -23.1 && lat <= -22.7 && lng >= -43.8 && lng <= -43.1;
  
  // Verificar tipo de geometria
  if (geometry.type === 'Point') {
    return {
      hasFence: 'Não (somente centro)',
      centerInside: 'N/A',
      areaSize: 'N/A',
      isOutsideRJ: !isInRJ
    };
  }

  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') {
    return {
      hasFence: 'Não (não suportado)',
      centerInside: 'N/A',
      areaSize: 'N/A',
      isOutsideRJ: !isInRJ
    };
  }

  // Para Polygon/MultiPolygon
  if (!isInRJ) {
    return {
      hasFence: 'Sim',
      centerInside: 'N/A',
      areaSize: 'N/A',
      isOutsideRJ: true
    };
  }

  try {
    // Verificar se centro está dentro do polígono
    const centerPoint = turf.point([lng, lat]);
    const polygon = turf.feature(geometry);
    const isInside = turf.booleanPointInPolygon(centerPoint, polygon);

    // Calcular área
    const area = turf.area(polygon);
    const areaKm2 = area / 1000000;
    
    let sizeClass;
    if (areaKm2 < 1) sizeClass = 'Pequena';
    else if (areaKm2 < 10) sizeClass = 'Média';
    else if (areaKm2 < 50) sizeClass = 'Grande';
    else sizeClass = 'Muito grande';

    return {
      hasFence: 'Sim',
      centerInside: isInside ? 'Sim' : 'Não',
      areaSize: `${areaKm2.toFixed(2)} km² (${sizeClass})`,
      isOutsideRJ: false
    };
  } catch (error) {
    console.error('Erro ao validar geometria:', error);
    return {
      hasFence: 'Sim',
      centerInside: 'N/A',
      areaSize: 'N/A',
      isOutsideRJ: false
    };
  }
};

export default function GeofenceManagement() {
  const [communities, setCommunities] = useState([]);
  const [filteredCommunities, setFilteredCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros
  const [confidenceFilter, setConfidenceFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [hasGeometryFilter, setHasGeometryFilter] = useState('');
  const [duplicateFilter, setDuplicateFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  
  // Dialogs
  const [mapDialog, setMapDialog] = useState({ open: false, community: null, geofence: null });
  const [editDialog, setEditDialog] = useState({ open: false, community: null, geofence: null });
  const [duplicateDialog, setDuplicateDialog] = useState({ open: false, duplicates: [], selectedCanonical: null });
  const [archiveDialog, setArchiveDialog] = useState({ open: false, community: null });
  
  // Form data
  const [editForm, setEditForm] = useState({
    centerLat: '',
    centerLng: '',
    isVerified: false,
    reviewNotes: '',
    selectedCanonicalId: null
  });

  const [archiveForm, setArchiveForm] = useState({
    reason: ''
  });

  useEffect(() => {
    fetchCommunities();
  }, []);

  useEffect(() => {
    fetchCommunities();
  }, [showArchived]);

  useEffect(() => {
    applyFilters();
  }, [communities, confidenceFilter, verifiedFilter, hasGeometryFilter, duplicateFilter]);

  const fetchCommunities = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const url = showArchived 
        ? `${API_BASE_URL}/api/governance/admin/communities/with-duplicates?includeArchived=1`
        : `${API_BASE_URL}/api/governance/admin/communities/with-duplicates`;
      
      const response = await fetch(url, {
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
        setCommunities(data.data || []);
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

    if (duplicateFilter !== '') {
      const showDuplicates = duplicateFilter === 'true';
      filtered = filtered.filter(c => showDuplicates ? c.isDuplicate : !c.isDuplicate);
    }

    // Ordenação: duplicados primeiro, depois pendentes, depois por confidence
    filtered.sort((a, b) => {
      // Prioridade 1: Duplicados primeiro
      if (a.isDuplicate && !b.isDuplicate) return -1;
      if (!a.isDuplicate && b.isDuplicate) return 1;
      
      // Prioridade 2: Coordenadas fora do RJ
      const aOutsideRJ = a.geofenceData && !isLikelyInRioCity(
        parseFloat(a.geofenceData.centerLat), 
        parseFloat(a.geofenceData.centerLng)
      );
      const bOutsideRJ = b.geofenceData && !isLikelyInRioCity(
        parseFloat(b.geofenceData.centerLat), 
        parseFloat(b.geofenceData.centerLng)
      );
      
      if (aOutsideRJ && !bOutsideRJ) return -1;
      if (!aOutsideRJ && bOutsideRJ) return 1;
      
      // Prioridade 3: Pendentes (sem geofence) 
      const aHasGeofence = !!a.geofenceData;
      const bHasGeofence = !!b.geofenceData;
      
      if (!aHasGeofence && bHasGeofence) return -1;
      if (aHasGeofence && !bHasGeofence) return 1;
      
      // Prioridade 4: Por confidence (LOW primeiro)
      if (aHasGeofence && bHasGeofence) {
        const confidenceOrder = { 'LOW': 0, 'MED': 1, 'HIGH': 2 };
        const aOrder = confidenceOrder[a.geofenceData.confidence] || 3;
        const bOrder = confidenceOrder[b.geofenceData.confidence] || 3;
        
        if (aOrder !== bOrder) return aOrder - bOrder;
      }
      
      // Ordenação final por nome
      return a.name.localeCompare(b.name);
    });

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
      reviewNotes: geofence?.reviewNotes || '',
      selectedCanonicalId: community.isDuplicate ? community.canonicalId : null
    });
    setEditDialog({ open: true, community, geofence });
  };

  const handleSaveEdit = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const requestBody = {
        centerLat: parseFloat(editForm.centerLat),
        centerLng: parseFloat(editForm.centerLng),
        isVerified: editForm.isVerified,
        reviewNotes: editForm.reviewNotes
      };

      // Se é duplicado e está tentando verificar, incluir canonical ID
      if (editDialog.community.isDuplicate && editForm.isVerified) {
        requestBody.selectedCanonicalId = editForm.selectedCanonicalId;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/communities/${editDialog.community.id}/geofence-review`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      if (data.success) {
        setEditDialog({ open: false, community: null, geofence: null });
        fetchCommunities(); // Recarregar dados
        setError('');
      } else {
        if (data.validationFailed && data.duplicates) {
          // Mostrar dialog de duplicados
          setDuplicateDialog({
            open: true,
            duplicates: [editDialog.community, ...data.duplicates],
            selectedCanonical: editForm.selectedCanonicalId
          });
        }
        setError(data.error || 'Erro ao salvar alterações');
      }
    } catch (error) {
      setError('Erro ao salvar');
    }
  };

  const handleSelectCanonical = (canonicalId) => {
    setEditForm({ ...editForm, selectedCanonicalId: canonicalId });
    setDuplicateDialog({ open: false, duplicates: [], selectedCanonical: null });
  };

  const handleArchive = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/communities/${archiveDialog.community.id}/archive`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: archiveForm.reason
        })
      });

      const data = await response.json();
      if (data.success) {
        setArchiveDialog({ open: false, community: null });
        setArchiveForm({ reason: '' });
        fetchCommunities(); // Recarregar dados
        setError('');
      } else {
        setError(data.error || 'Erro ao arquivar');
      }
    } catch (error) {
      setError('Erro ao arquivar');
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

  const openNextPending = () => {
    // Encontrar próximo item pendente (sem geofence ou LOW confidence)
    const pending = filteredCommunities.find(c => 
      !c.geofenceData || 
      c.geofenceData.confidence === 'LOW' || 
      !c.geofenceData.isVerified
    );
    
    if (pending) {
      if (pending.geofenceData) {
        openEditDialog(pending);
      } else {
        openMapDialog(pending);
      }
    } else {
      setError('Nenhum item pendente encontrado');
      setTimeout(() => setError(''), 3000);
    }
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Revisão de Geofences
        </Typography>
        <Button
          variant="contained"
          color="warning"
          startIcon={<CheckCircle />}
          onClick={openNextPending}
        >
          Abrir próximo pendente
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Filtros</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                />
              }
              label="Mostrar arquivados"
            />
            
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

            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Duplicados</InputLabel>
              <Select
                value={duplicateFilter}
                onChange={(e) => setDuplicateFilter(e.target.value)}
                label="Duplicados"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="true">Apenas Duplicados</MenuItem>
                <MenuItem value="false">Sem Duplicados</MenuItem>
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
              <TableCell>Duplicado</TableCell>
              <TableCell>Validação RJ</TableCell>
              <TableCell>Confiança</TableCell>
              <TableCell>GeoJSON</TableCell>
              <TableCell>Verificado</TableCell>
              <TableCell>Atualizado</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCommunities.map((community) => {
              const isPending = !community.geofenceData || 
                               community.geofenceData.confidence === 'LOW' || 
                               !community.geofenceData.isVerified;
              
              const isOutsideRJ = community.geofenceData && !isLikelyInRioCity(
                parseFloat(community.geofenceData.centerLat), 
                parseFloat(community.geofenceData.centerLng)
              );

              // Verificar se pode ser verificado
              const canVerify = community.geofenceData ? canVerifyGeofence({
                isDuplicateName: community.isDuplicate,
                hasSelectedCanonical: !community.isDuplicate || community.isCanonical,
                centerLat: parseFloat(community.geofenceData.centerLat),
                centerLng: parseFloat(community.geofenceData.centerLng),
                geometryType: community.geofenceData.geojson ? 
                  JSON.parse(community.geofenceData.geojson).type : null,
                geofenceStatus: community.geofenceData.geojson ? 200 : 404
              }) : { ok: false, reason: 'Sem dados' };
              
              return (
              <TableRow key={community.id} sx={{ 
                backgroundColor: isOutsideRJ ? '#ffebee' : 
                                community.isDuplicate ? '#fff3e0' : 
                                !community.isActive ? '#f5f5f5' : 'inherit',
                opacity: !community.isActive ? 0.7 : 1
              }}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {community.name}
                    {isOutsideRJ && <Warning color="error" fontSize="small" />}
                    {!community.isActive && <Chip label="ARQUIVADO" color="default" size="small" />}
                  </Box>
                </TableCell>
                <TableCell>{getCommunityType(community.description)}</TableCell>
                <TableCell>
                  {community.isDuplicate ? (
                    <Box>
                      <Chip 
                        label={`DUPLICADO (${community.duplicateCount})`} 
                        color="warning" 
                        size="small" 
                      />
                      {community.isCanonical && (
                        <Chip 
                          label="CANÔNICO" 
                          color="success" 
                          size="small" 
                          sx={{ ml: 0.5 }}
                        />
                      )}
                    </Box>
                  ) : (
                    <Chip label="ÚNICO" color="default" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  {community.geofenceData ? (
                    isOutsideRJ ? (
                      <Chip label="FORA DO RJ" color="error" size="small" />
                    ) : (
                      <Chip label="OK" color="success" size="small" />
                    )
                  ) : (
                    <Chip label="N/A" color="default" size="small" />
                  )}
                </TableCell>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {community.geofenceData?.isVerified ? (
                      <Chip label="Verificado" color="success" size="small" />
                    ) : (
                      <Chip label="Pendente" color="warning" size="small" />
                    )}
                    {!canVerify.ok && (
                      <Warning color="error" fontSize="small" title={canVerify.reason} />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  {community.geofenceData?.updatedAt ? 
                    new Date(community.geofenceData.updatedAt).toLocaleDateString() : 
                    '-'
                  }
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
                    {(isOutsideRJ || (community.isDuplicate && !community.isCanonical)) && (
                      <Button
                        size="small"
                        startIcon={<Archive />}
                        color="warning"
                        onClick={() => setArchiveDialog({ open: true, community })}
                      >
                        Arquivar
                      </Button>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
              );
            })}
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

              {/* Indicadores de Validação Geométrica */}
              {(() => {
                const validation = validateGeometry(mapDialog.geofence);
                return (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                      <Chip 
                        label={`Cerca: ${validation.hasFence}`}
                        color={validation.hasFence === 'Sim' ? 'success' : 'default'}
                        size="small"
                      />
                      <Chip 
                        label={`Centro dentro: ${validation.centerInside}`}
                        color={validation.centerInside === 'Sim' ? 'success' : 
                               validation.centerInside === 'Não' ? 'error' : 'default'}
                        size="small"
                      />
                      <Chip 
                        label={`Tamanho: ${validation.areaSize}`}
                        color="info"
                        size="small"
                      />
                    </Box>
                    
                    {/* Alerta se centro estiver fora do polígono */}
                    {validation.centerInside === 'Não' && (
                      <Alert severity="warning" sx={{ mb: 1 }}>
                        ⚠️ Centro fora do polígono. Considere ajustar as coordenadas do centro.
                      </Alert>
                    )}
                    
                    {/* Alerta se local estiver fora do RJ */}
                    {validation.isOutsideRJ && (
                      <Alert severity="warning" sx={{ mb: 1 }}>
                        ⚠️ Local fora do RJ — revisar / refetch
                      </Alert>
                    )}
                  </Box>
                );
              })()}
              
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
          {editDialog.community?.isDuplicate && (
            <Chip 
              label={`DUPLICADO (${editDialog.community.duplicateCount})`} 
              color="warning" 
              size="small" 
              sx={{ ml: 1 }}
            />
          )}
        </DialogTitle>
        <DialogContent>
          {/* Alertas de Validação */}
          {editDialog.geofence && (() => {
            const lat = parseFloat(editForm.centerLat || editDialog.geofence.centerLat);
            const lng = parseFloat(editForm.centerLng || editDialog.geofence.centerLng);
            const isOutsideRJ = !isLikelyInRioCity(lat, lng);
            
            let geometryType = null;
            if (editDialog.geofence.geojson) {
              try {
                const geojson = JSON.parse(editDialog.geofence.geojson);
                geometryType = geojson.type;
              } catch (e) {}
            }

            const canVerify = canVerifyGeofence({
              isDuplicateName: editDialog.community.isDuplicate,
              hasSelectedCanonical: !editDialog.community.isDuplicate || 
                                   editForm.selectedCanonicalId === editDialog.community.id,
              centerLat: lat,
              centerLng: lng,
              geometryType,
              geofenceStatus: editDialog.geofence.geojson ? 200 : 404
            });

            return (
              <Box sx={{ mb: 2 }}>
                {isOutsideRJ && (
                  <Alert severity="error" sx={{ mb: 1 }}>
                    ⚠️ Coordenadas fora do RJ ({fmtLatLng(lat, lng)}). 
                    Este registro está incorreto/duplicado. Não verifique. Arquive ou corrija antes.
                  </Alert>
                )}
                
                {editDialog.community.isDuplicate && (
                  <Alert severity="warning" sx={{ mb: 1 }}>
                    🚧 Nome duplicado detectado. 
                    {editDialog.community.isCanonical ? 
                      'Este é o ID canônico sugerido.' : 
                      'Escolha o ID canônico antes de verificar.'
                    }
                  </Alert>
                )}

                {geometryQuality(geometryType) === 0 && (
                  <Alert severity="info" sx={{ mb: 1 }}>
                    ℹ️ Sem dados de cerca (SEM_DADOS). 
                    Para aparecer Polygon no mapa: buscar polígono → salvar geofence → UI renderiza Polygon.
                  </Alert>
                )}

                {!canVerify.ok && editForm.isVerified && (
                  <Alert severity="error" sx={{ mb: 1 }}>
                    ❌ Não é possível verificar: {canVerify.reason}
                  </Alert>
                )}
              </Box>
            );
          })()}

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
                  disabled={(() => {
                    if (!editDialog.geofence) return true;
                    
                    const lat = parseFloat(editForm.centerLat || editDialog.geofence.centerLat);
                    const lng = parseFloat(editForm.centerLng || editDialog.geofence.centerLng);
                    
                    let geometryType = null;
                    if (editDialog.geofence.geojson) {
                      try {
                        const geojson = JSON.parse(editDialog.geofence.geojson);
                        geometryType = geojson.type;
                      } catch (e) {}
                    }

                    const canVerify = canVerifyGeofence({
                      isDuplicateName: editDialog.community.isDuplicate,
                      hasSelectedCanonical: !editDialog.community.isDuplicate || 
                                           editForm.selectedCanonicalId === editDialog.community.id,
                      centerLat: lat,
                      centerLng: lng,
                      geometryType,
                      geofenceStatus: editDialog.geofence.geojson ? 200 : 404
                    });

                    return !canVerify.ok;
                  })()}
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

      {/* Dialog de Seleção de Canônico */}
      <Dialog open={duplicateDialog.open} onClose={() => setDuplicateDialog({ open: false, duplicates: [], selectedCanonical: null })} maxWidth="md" fullWidth>
        <DialogTitle>
          Selecionar ID Canônico
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Nome duplicado detectado. Selecione o ID canônico (preferência: Polygon/MultiPolygon) antes de verificar.
          </Alert>
          
          <List>
            {duplicateDialog.duplicates.map((duplicate, index) => (
              <React.Fragment key={duplicate.id}>
                <ListItemButton 
                  onClick={() => handleSelectCanonical(duplicate.id)}
                  selected={duplicate.id === duplicateDialog.selectedCanonical}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1">
                          {duplicate.name} (ID: {duplicate.id})
                        </Typography>
                        {duplicate.isCanonical && (
                          <Chip label="SUGERIDO" color="success" size="small" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2">
                          Centro: {fmtLatLng(duplicate.centerLat, duplicate.centerLng)}
                        </Typography>
                        <Typography variant="body2">
                          Status: {duplicate.geofenceData ? 
                            `${duplicate.geofenceData.confidence} - ${duplicate.geofenceData.geojson ? 'Com GeoJSON' : 'Sem GeoJSON'}` : 
                            'SEM_DADOS'
                          }
                        </Typography>
                      </Box>
                    }
                  />
                </ListItemButton>
                {index < duplicateDialog.duplicates.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDuplicateDialog({ open: false, duplicates: [], selectedCanonical: null })}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Arquivamento */}
      <Dialog open={archiveDialog.open} onClose={() => setArchiveDialog({ open: false, community: null })} maxWidth="sm" fullWidth>
        <DialogTitle>
          Arquivar Comunidade: {archiveDialog.community?.name}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Esta ação irá desativar a comunidade (isActive=false) sem deletar os dados.
          </Alert>
          
          <TextField
            label="Motivo do Arquivamento"
            multiline
            rows={3}
            value={archiveForm.reason}
            onChange={(e) => setArchiveForm({ reason: e.target.value })}
            fullWidth
            placeholder="Ex: Coordenadas fora do RJ, duplicado de ID xyz, etc."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveDialog({ open: false, community: null })}>
            Cancelar
          </Button>
          <Button onClick={handleArchive} variant="contained" color="warning">
            Arquivar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
