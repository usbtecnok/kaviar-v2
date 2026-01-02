import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Switch,
  FormControlLabel,
  Box,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import { Add, Edit } from '@mui/icons-material';
import Layout from '../../components/common/Layout';
import api from '../../api';

const CommunityManagement = () => {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    try {
      const response = await api.get('/api/v1/communities');
      // Adaptar resposta para formato esperado
      const communities = response.data.map(community => ({
        ...community,
        services: {
          standard_ride: true,
          tour_guide: community.tour_guide_enabled || false,
          care: community.elderly_assistance_enabled || false
        }
      }));
      setCommunities(communities);
    } catch (err) {
      setError('Erro ao carregar comunidades');
    } finally {
      setLoading(false);
    }
  };

  const toggleCommunityStatus = async (communityId, isActive) => {
    try {
      await api.patch(`/api/admin/communities/${communityId}`, {
        is_active: !isActive
      });
      fetchCommunities(); // Recarregar lista
    } catch (err) {
      setError('Erro ao atualizar status da comunidade');
    }
  };

  const toggleService = async (communityId, serviceType, enabled) => {
    try {
      await api.patch(`/api/admin/communities/${communityId}/services`, {
        service_type: serviceType,
        enabled: !enabled
      });
      fetchCommunities(); // Recarregar lista
    } catch (err) {
      setError('Erro ao atualizar serviço');
    }
  };

  if (loading) {
    return (
      <Layout title="Admin - Comunidades">
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Admin - Gestão de Comunidades">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Gestão de Comunidades
        </Typography>
        <Button variant="contained" startIcon={<Add />}>
          Nova Comunidade
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Corrida Normal</TableCell>
                  <TableCell>Guia Turístico</TableCell>
                  <TableCell>Care</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {communities.map((community) => (
                  <TableRow key={community.id}>
                    <TableCell>{community.name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={community.type} 
                        size="small"
                        color={community.type === 'RESIDENTIAL' ? 'primary' : 'secondary'}
                      />
                    </TableCell>
                    <TableCell>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={community.is_active}
                            onChange={() => toggleCommunityStatus(community.id, community.is_active)}
                          />
                        }
                        label={community.is_active ? 'Ativa' : 'Inativa'}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={community.services?.standard_ride || true}
                        onChange={() => toggleService(community.id, 'STANDARD_RIDE', community.services?.standard_ride)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={community.services?.tour_guide || false}
                        onChange={() => toggleService(community.id, 'TOUR_GUIDE', community.services?.tour_guide)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={community.services?.care || false}
                        onChange={() => toggleService(community.id, 'ELDERLY_ASSISTANCE', community.services?.care)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<Edit />}>
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default CommunityManagement;
