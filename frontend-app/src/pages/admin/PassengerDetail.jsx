import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowBack } from '@mui/icons-material';
import { PassengerFavoritesCard } from '../../components/admin/PassengerFavoritesCard';


export default function PassengerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [passenger, setPassenger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPassenger();
  }, [id]);

  const loadPassenger = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/passengers/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPassenger(data.passenger || data.data);
      } else {
        setError(data.error || 'Passageiro não encontrado');
      }
    } catch (error) {
      console.error('Erro ao carregar passageiro:', error);
      setError('Erro ao carregar dados do passageiro');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin/passengers')}
        >
          Voltar
        </Button>
      </Container>
    );
  }

  if (!passenger) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography variant="h5">Passageiro não encontrado</Typography>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin/passengers')}
          sx={{ mt: 2 }}
        >
          Voltar
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/admin/passengers')}
        sx={{ mb: 2 }}
      >
        Voltar
      </Button>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Detalhes do Passageiro
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1"><strong>Nome:</strong> {passenger.name}</Typography>
          <Typography variant="body1"><strong>Email:</strong> {passenger.email}</Typography>
          <Typography variant="body1"><strong>Telefone:</strong> {passenger.phone || 'N/A'}</Typography>
          <Typography variant="body1"><strong>ID:</strong> {passenger.id}</Typography>
        </Box>
      </Paper>

      {/* Passenger Favorites Card */}
      <Box sx={{ mt: 3 }}>
        <PassengerFavoritesCard passengerId={id} />
      </Box>
    </Container>
  );
}
