import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

export default function DriverDocuments() {
  const [formData, setFormData] = useState({
    documentCpf: '',
    documentRg: '',
    documentCnh: '',
    vehiclePlate: '',
    vehicleModel: '',
    communityId: ''
  });
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    try {
      const response = await api.get('/api/governance/communities');
      if (response.data.success) {
        setCommunities(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar comunidades:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Assumindo que o ID do motorista vem do contexto de auth
      const driverId = 'current-driver-id'; // Implementar com contexto real
      
      const response = await api.put(`/governance/driver/${driverId}/documents`, formData);
      
      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/motorista/status');
        }, 2000);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao enviar documentos');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h5" color="success.main" gutterBottom>
              Documentos Enviados com Sucesso!
            </Typography>
            <Typography variant="body1">
              Seus documentos foram enviados para análise. Você será notificado sobre o status da aprovação.
            </Typography>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Envio de Documentos - Motorista
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 4, textAlign: 'center' }}>
          Para ser aprovado como motorista, envie seus documentos e informações do veículo.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Documentos Pessoais
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="CPF"
                  value={formData.documentCpf}
                  onChange={(e) => setFormData(prev => ({ ...prev, documentCpf: e.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="RG"
                  value={formData.documentRg}
                  onChange={(e) => setFormData(prev => ({ ...prev, documentRg: e.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="CNH"
                  value={formData.documentCnh}
                  onChange={(e) => setFormData(prev => ({ ...prev, documentCnh: e.target.value }))}
                  required
                  fullWidth
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Informações do Veículo
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Placa do Veículo"
                  value={formData.vehiclePlate}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehiclePlate: e.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="Modelo do Veículo"
                  value={formData.vehicleModel}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehicleModel: e.target.value }))}
                  required
                  fullWidth
                />
                <FormControl fullWidth required>
                  <InputLabel>Comunidade</InputLabel>
                  <Select
                    value={formData.communityId}
                    onChange={(e) => setFormData(prev => ({ ...prev, communityId: e.target.value }))}
                  >
                    {communities.map(community => (
                      <MenuItem key={community.id} value={community.id}>
                        {community.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ px: 6 }}
            >
              {loading ? 'Enviando...' : 'Enviar Documentos'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}
