import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Box,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid
} from '@mui/material';
import { CheckCircle, Cancel, Visibility } from '@mui/icons-material';
import adminApi from '../../services/adminApi';

export default function DriverApproval() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      const response = await adminApi.get('/drivers');
      if (response.data.success) {
        setDrivers(response.data.data);
      }
    } catch (error) {
      setError('Erro ao carregar motoristas');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (driverId) => {
    try {
      await adminApi.put(`/drivers/${driverId}/approve`);
      loadDrivers(); // Recarregar lista
    } catch (error) {
      setError('Erro ao aprovar motorista');
    }
  };

  const handleSuspend = async (driverId) => {
    try {
      await adminApi.put(`/drivers/${driverId}/suspend`, {
        reason: 'Documentos inválidos'
      });
      loadDrivers(); // Recarregar lista
    } catch (error) {
      setError('Erro ao reprovar motorista');
    }
  };

  const openDetails = (driver) => {
    setSelectedDriver(driver);
    setDetailsOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'suspended': return 'error';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'approved': return 'Aprovado';
      case 'suspended': return 'Suspenso';
      case 'rejected': return 'Rejeitado';
      default: return status;
    }
  };

  if (loading) return <Typography>Carregando...</Typography>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Aprovação de Motoristas
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Data Cadastro</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {drivers.map((driver) => (
              <TableRow key={driver.id}>
                <TableCell>{driver.name}</TableCell>
                <TableCell>{driver.email}</TableCell>
                <TableCell>
                  <Chip 
                    label={getStatusLabel(driver.status)} 
                    color={getStatusColor(driver.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(driver.createdAt).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => openDetails(driver)}
                    >
                      Ver
                    </Button>
                    {driver.status === 'pending' && (
                      <>
                        <Button
                          size="small"
                          color="success"
                          startIcon={<CheckCircle />}
                          onClick={() => handleApprove(driver.id)}
                        >
                          Aprovar
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<Cancel />}
                          onClick={() => handleSuspend(driver.id)}
                        >
                          Reprovar
                        </Button>
                      </>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de Detalhes */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Detalhes do Motorista</DialogTitle>
        <DialogContent>
          {selectedDriver && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Nome:</Typography>
                <Typography>{selectedDriver.name}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Email:</Typography>
                <Typography>{selectedDriver.email}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Telefone:</Typography>
                <Typography>{selectedDriver.phone || 'Não informado'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2">Status:</Typography>
                <Chip 
                  label={getStatusLabel(selectedDriver.status)} 
                  color={getStatusColor(selectedDriver.status)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Documentos:</Typography>
                <Typography>CPF: {selectedDriver.documentCpf || 'Não enviado'}</Typography>
                <Typography>RG: {selectedDriver.documentRg || 'Não enviado'}</Typography>
                <Typography>CNH: {selectedDriver.documentCnh || 'Não enviado'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Veículo:</Typography>
                <Typography>Placa: {selectedDriver.vehiclePlate || 'Não informado'}</Typography>
                <Typography>Modelo: {selectedDriver.vehicleModel || 'Não informado'}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
