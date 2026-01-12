import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  Alert,
  CircularProgress,
  Paper
} from '@mui/material';
import api from '../../api';
import { API_ROUTES } from '../../api/routes';
import NeighborhoodsMap from '../../components/maps/NeighborhoodsMap';

export default function NeighborhoodsManagement() {
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCommunitiesLayer, setShowCommunitiesLayer] = useState(false);
  const [showNeighborhoodsLayer, setShowNeighborhoodsLayer] = useState(true);

  // Carregar neighborhoods
  const fetchNeighborhoods = async () => {
    try {
      const response = await api.get(API_ROUTES.NEIGHBORHOODS.LIST);
      const neighborhoodsData = response.data.data || [];
      
      // Carregar geofences para cada neighborhood
      const neighborhoodsWithGeofence = await Promise.all(
        neighborhoodsData.map(async (neighborhood) => {
          try {
            const geofenceResponse = await api.get(API_ROUTES.NEIGHBORHOODS.GEOFENCE(neighborhood.id));
            return {
              ...neighborhood,
              geofence: geofenceResponse.data.data
            };
          } catch (err) {
            console.warn(`Geofence não encontrado para ${neighborhood.name}`);
            return neighborhood;
          }
        })
      );
      
      setNeighborhoods(neighborhoodsWithGeofence);
    } catch (err) {
      setError('Erro ao carregar bairros');
      console.error('Erro ao carregar neighborhoods:', err);
    }
  };

  // Carregar communities (opcional)
  const fetchCommunities = async () => {
    try {
      const response = await api.get('/api/governance/communities');
      const communitiesData = response.data.data || [];
      
      const communitiesWithGeofence = await Promise.all(
        communitiesData.slice(0, 10).map(async (community) => {
          try {
            const geofenceResponse = await api.get(`/api/governance/communities/${community.id}/geofence`);
            return {
              ...community,
              geofence: geofenceResponse.data.data
            };
          } catch (err) {
            return community;
          }
        })
      );
      
      setCommunities(communitiesWithGeofence);
    } catch (err) {
      console.warn('Erro ao carregar communities:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchNeighborhoods(), fetchCommunities()]);
      setLoading(false);
    };
    
    loadData();
  }, []);

  const handleLayerToggle = (layer, enabled) => {
    if (layer === 'communities') {
      setShowCommunitiesLayer(enabled);
    } else if (layer === 'neighborhoods') {
      setShowNeighborhoodsLayer(enabled);
    }
  };

  const handleNeighborhoodSelect = async (neighborhood) => {
    console.log('🔍 [DEBUG] Neighborhood selecionado:', {
      id: neighborhood.id,
      name: neighborhood.name,
      hasGeofence: !!neighborhood.geofence,
      geofenceType: neighborhood.geofence?.geofenceType
    });
    
    // Fetch individual do geofence para garantir dados atualizados
    try {
      console.log(`🌐 [API] Buscando geofence para ${neighborhood.name} (${neighborhood.id})`);
      const geofenceResponse = await api.get(`/api/governance/neighborhoods/${neighborhood.id}/geofence`);
      
      const updatedNeighborhood = {
        ...neighborhood,
        geofence: geofenceResponse.data.data
      };
      
      console.log('✅ [API] Geofence carregado:', {
        success: geofenceResponse.data.success,
        geofenceType: geofenceResponse.data.data?.geofenceType,
        hasCoordinates: !!geofenceResponse.data.data?.coordinates
      });
      
      setSelectedNeighborhood(updatedNeighborhood);
    } catch (err) {
      console.error(`❌ [API] Erro ao carregar geofence para ${neighborhood.name}:`, err);
      setSelectedNeighborhood(neighborhood);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestão de Bairros
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 3 }}>
        {/* Lista de Neighborhoods */}
        <Paper sx={{ width: 400, maxHeight: 600, overflow: 'auto' }}>
          <Typography variant="h6" sx={{ p: 2, borderBottom: '1px solid #ddd' }}>
            Bairros ({neighborhoods.length})
          </Typography>
          
          <List>
            {neighborhoods.map((neighborhood) => (
              <ListItem key={neighborhood.id} disablePadding>
                <ListItemButton
                  selected={selectedNeighborhood?.id === neighborhood.id}
                  onClick={() => handleNeighborhoodSelect(neighborhood)}
                >
                  <ListItemText
                    primary={neighborhood.name}
                    secondary={
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Chip 
                          label={neighborhood.zone} 
                          size="small" 
                          color="primary" 
                        />
                        <Chip 
                          label={neighborhood.administrativeRegion} 
                          size="small" 
                          color="secondary" 
                        />
                        <Chip 
                          label={neighborhood.geofence ? 'Polygon' : 'Sem geofence'} 
                          size="small" 
                          color={neighborhood.geofence ? 'success' : 'error'}
                        />
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>

        {/* Mapa */}
        <Box sx={{ flex: 1 }}>
          <NeighborhoodsMap
            communities={communities}
            neighborhoods={neighborhoods}
            selectedNeighborhood={selectedNeighborhood}
            showCommunitiesLayer={showCommunitiesLayer}
            showNeighborhoodsLayer={showNeighborhoodsLayer}
            onLayerToggle={handleLayerToggle}
          />
          
          {selectedNeighborhood && (
            <Paper sx={{ mt: 2, p: 2 }}>
              <Typography variant="h6">
                {selectedNeighborhood.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Zona:</strong> {selectedNeighborhood.zone}<br />
                <strong>AP:</strong> {selectedNeighborhood.administrativeRegion}<br />
                <strong>Verificado:</strong> N/A<br />
                <strong>Fonte:</strong> {selectedNeighborhood.source}
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  );
}
