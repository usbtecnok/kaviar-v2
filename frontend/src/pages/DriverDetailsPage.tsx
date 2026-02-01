import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Paper, Typography, Box, CircularProgress, Divider } from '@mui/material';
import { VirtualFenceCenterCard } from '../components/admin/VirtualFenceCenterCard';
import { useAuth } from '../contexts/AuthContext';

interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
}

const API_URL = process.env.REACT_APP_API_URL || 'https://api.kaviar.com.br';

export const DriverDetailsPage: React.FC = () => {
  const { driverId } = useParams<{ driverId: string }>();
  const { token } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (driverId && token) {
      fetchDriver();
    }
  }, [driverId, token]);

  const fetchDriver = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/admin/drivers/${driverId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setDriver(data.driver);
      }
    } catch (error) {
      console.error('Erro ao carregar motorista:', error);
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

  if (!driver) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography variant="h5">Motorista não encontrado</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Detalhes do Motorista
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1"><strong>Nome:</strong> {driver.name}</Typography>
          <Typography variant="body1"><strong>Email:</strong> {driver.email}</Typography>
          <Typography variant="body1"><strong>Telefone:</strong> {driver.phone}</Typography>
          <Typography variant="body1"><strong>Status:</strong> {driver.status}</Typography>
        </Box>
      </Paper>

      <Divider sx={{ my: 3 }} />

      <VirtualFenceCenterCard driverId={driver.id} />
    </Container>
  );
};
