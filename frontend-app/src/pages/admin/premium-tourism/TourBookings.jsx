import { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Card, CardContent, Button,
  Table, TableBody, TableCell, TableHead, TableRow,
  Chip, IconButton, TextField, MenuItem, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid
} from '@mui/material';
import { Edit, Visibility, Search } from '@mui/icons-material';
import { adminApi } from '../../../services/adminApi';
import { 
  formatPrice, 
  getTourBookingStatusColor, 
  getTourBookingStatusLabel,
  getValidStatusTransitions,
  ERROR_MESSAGES
} from '../../../utils/premiumTourismHelpers';
import DomainHeader from '../../../components/common/DomainHeader';
import PremiumTourismNav from '../../../components/admin/premium-tourism/PremiumTourismNav';

export default function TourBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Modal de atualização de status
  const [statusDialog, setStatusDialog] = useState({ open: false, booking: null });
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadBookings();
  }, [page, search, statusFilter]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const data = await adminApi.getTourBookings(params);
      setBookings(data.bookings || []);
      setTotal(data.total || 0);
      setError('');
    } catch (err) {
      setError('Erro ao carregar reservas turísticas');
      console.error('Error loading tour bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusDialog.booking || !newStatus) return;

    try {
      setUpdating(true);
      await adminApi.updateTourBookingStatus(statusDialog.booking.id, newStatus);
      
      // Atualizar booking na lista
      setBookings(prev => prev.map(booking => 
        booking.id === statusDialog.booking.id 
          ? { ...booking, status: newStatus }
          : booking
      ));
      
      setStatusDialog({ open: false, booking: null });
      setNewStatus('');
      setError('');
    } catch (err) {
      console.error('Error updating booking status:', err);
      
      if (err.response?.status === 409) {
        setError('Transição de status inválida. Verifique o status atual da reserva.');
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        // Limpar tokens e redirecionar para login
        localStorage.removeItem('kaviar_admin_token');
        localStorage.removeItem('kaviar_admin_data');
        window.location.href = '/admin/login';
        return;
      } else {
        setError(err.response?.data?.message || ERROR_MESSAGES.SERVER_ERROR);
      }
    } finally {
      setUpdating(false);
    }
  };

  const openStatusDialog = (booking) => {
    setStatusDialog({ open: true, booking });
    setNewStatus('');
  };

  const closeStatusDialog = () => {
    setStatusDialog({ open: false, booking: null });
    setNewStatus('');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadBookings();
  };

  if (loading && bookings.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 2 }}>
        <Typography>Carregando reservas turísticas...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2 }}>
      <DomainHeader 
        domain="admin" 
        title="Reservas Turísticas"
        breadcrumbs={["Premium/Turismo", "Reservas"]}
        backUrl="/admin"
      />

      <Grid container spacing={3}>
        {/* Navegação Lateral */}
        <Grid item xs={12} md={3}>
          <PremiumTourismNav />
        </Grid>

        {/* Conteúdo Principal */}
        <Grid item xs={12} md={9}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Buscar por cliente ou pacote..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
              sx={{ minWidth: 250 }}
            />
            
            <TextField
              select
              size="small"
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="REQUESTED">Solicitado</MenuItem>
              <MenuItem value="CONFIRMED">Confirmado</MenuItem>
              <MenuItem value="COMPLETED">Concluído</MenuItem>
              <MenuItem value="CANCELLED">Cancelado</MenuItem>
            </TextField>

            <Button
              variant="outlined"
              startIcon={<Search />}
              onClick={handleSearch}
            >
              Buscar
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Tabela de Reservas */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Reservas Turísticas ({total})
          </Typography>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>Pacote</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Passageiros</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {booking.user?.name || 'N/A'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {booking.user?.email || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {booking.tourPackage?.title || 'N/A'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {booking.tourPackage?.partnerName || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {booking.scheduledDate ? 
                      new Date(booking.scheduledDate).toLocaleDateString('pt-BR') : 
                      'Não agendado'
                    }
                  </TableCell>
                  <TableCell>{booking.passengerCount || 0}</TableCell>
                  <TableCell>{formatPrice(booking.totalPrice || 0)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={getTourBookingStatusLabel(booking.status)}
                      color={getTourBookingStatusColor(booking.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => openStatusDialog(booking)}
                      size="small"
                      color="primary"
                      disabled={getValidStatusTransitions(booking.status).length === 0}
                    >
                      <Edit />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {bookings.length === 0 && !loading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                Nenhuma reserva turística encontrada
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Atualização de Status */}
      <Dialog open={statusDialog.open} onClose={closeStatusDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Atualizar Status da Reserva</DialogTitle>
        <DialogContent>
          {statusDialog.booking && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Cliente: {statusDialog.booking.user?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Pacote: {statusDialog.booking.tourPackage?.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Status atual: {getTourBookingStatusLabel(statusDialog.booking.status)}
              </Typography>

              <TextField
                select
                fullWidth
                label="Novo Status"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                sx={{ mt: 2 }}
              >
                {getValidStatusTransitions(statusDialog.booking.status).map((status) => (
                  <MenuItem key={status} value={status}>
                    {getTourBookingStatusLabel(status)}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeStatusDialog}>Cancelar</Button>
          <Button 
            onClick={handleStatusUpdate}
            variant="contained"
            disabled={!newStatus || updating}
          >
            {updating ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </DialogActions>
      </Dialog>
        </Grid>
      </Grid>
    </Container>
  );
}
