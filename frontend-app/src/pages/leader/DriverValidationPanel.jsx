import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
} from '@mui/material';
import {
  CheckCircle as ValidateIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import axios from 'axios';
import ReputationBadge from '../../components/ReputationBadge';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export default function DriverValidationPanel() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [notes, setNotes] = useState('');
  
  // TODO: Get from authentication context
  const leaderId = 'leader-id-placeholder';
  const communityId = 'community-id-placeholder';
  
  useEffect(() => {
    fetchPendingDrivers();
  }, []);
  
  const fetchPendingDrivers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/reputation/leaders/pending-validations/${communityId}`
      );
      setDrivers(response.data.drivers || []);
    } catch (err) {
      console.error('Error fetching pending drivers:', err);
      setError('Erro ao carregar motoristas pendentes');
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenDialog = (driver) => {
    setSelectedDriver(driver);
    setNotes('');
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedDriver(null);
    setNotes('');
    setError('');
  };
  
  const handleValidate = async () => {
    try {
      setLoading(true);
      setError('');
      
      await axios.post(`${API_BASE_URL}/reputation/leaders/validate`, {
        leaderId,
        driverId: selectedDriver.id,
        communityId,
        notes: notes || undefined,
      });
      
      setSuccess(`Motorista ${selectedDriver.name} validado com sucesso!`);
      handleCloseDialog();
      fetchPendingDrivers();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error validating driver:', err);
      setError(err.response?.data?.error || 'Erro ao validar motorista');
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (date) => {
    if (!date) return 'Recente';
    return new Date(date).toLocaleDateString('pt-BR', { 
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 3 }}>
          Validação de Motoristas
        </Typography>
        
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Motoristas aguardando validação comunitária (níveis NEW e ACTIVE)
        </Typography>
        
        {drivers.length === 0 ? (
          <Alert severity="info">
            Nenhum motorista pendente de validação no momento
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {drivers.map((driver) => (
              <Grid item xs={12} md={6} lg={4} key={driver.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ width: 56, height: 56, mr: 2 }}>
                        {driver.name.charAt(0)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6">{driver.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {driver.email}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <ReputationBadge
                        level={driver.reputation_level}
                        badge={driver.badge_type}
                        totalRides={driver.total_rides}
                        avgRating={parseFloat(driver.avg_rating)}
                        firstRideAt={driver.first_ride_at}
                        showDetails={false}
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Corridas:
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {driver.total_rides}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Avaliação:
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <StarIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                          <Typography variant="body2" fontWeight="bold">
                            {parseFloat(driver.avg_rating).toFixed(1)}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Membro desde:
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatDate(driver.first_ride_at)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                  
                  <CardActions>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<ValidateIcon />}
                      onClick={() => handleOpenDialog(driver)}
                      disabled={loading}
                    >
                      Validar Motorista
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
      
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Validar Motorista</DialogTitle>
        <DialogContent>
          {selectedDriver && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Você está prestes a validar <strong>{selectedDriver.name}</strong> como 
                motorista verificado pela comunidade.
              </Alert>
              
              <TextField
                label="Notas (opcional)"
                multiline
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth
                placeholder="Ex: Conheço pessoalmente, mora na comunidade há 5 anos..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleValidate}
            variant="contained"
            disabled={loading}
          >
            Confirmar Validação
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
