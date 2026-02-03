import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../../config/api';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  ArrowBack,
  Cancel,
  CheckCircle,
  Edit,
  Timeline as TimelineIcon,
  AttachMoney,
  Person,
  LocationOn
} from '@mui/icons-material';

const statusColors = {
  requested: 'warning',
  accepted: 'info',
  arrived: 'primary',
  started: 'secondary',
  completed: 'success',
  paid: 'success',
  cancelled_by_user: 'error',
  cancelled_by_driver: 'error',
  cancelled_by_admin: 'error'
};

export default function RideDetail() {
  
  const { id } = useParams();
  const navigate = useNavigate();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Modais
  const [cancelModal, setCancelModal] = useState(false);
  const [forceCompleteModal, setForceCompleteModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);

  // Formulários
  const [cancelReason, setCancelReason] = useState('');
  const [forceReason, setForceReason] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');

  const loadRide = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      
      if (!token) {
        window.location.href = '/admin/login';
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/admin/rides/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setRide(data.data);
      } else {
        setError(data.error || 'Erro ao carregar detalhes da corrida');
      }
    } catch (error) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRide();
  }, [id]);

  const handleCancelRide = async () => {
    if (!cancelReason.trim()) return;
    
    setActionLoading(true);
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/rides/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: cancelReason })
      });

      const data = await response.json();
      
      if (data.success) {
        setCancelModal(false);
        setCancelReason('');
        loadRide();
      } else {
        setError(data.error || 'Erro ao cancelar corrida');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setActionLoading(false);
    }
  };

  const handleForceComplete = async () => {
    if (!forceReason.trim()) return;
    
    setActionLoading(true);
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/rides/${id}/force-complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: forceReason })
      });

      const data = await response.json();
      
      if (data.success) {
        setForceCompleteModal(false);
        setForceReason('');
        loadRide();
      } else {
        setError(data.error || 'Erro ao finalizar corrida');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus || !statusReason.trim()) return;
    
    setActionLoading(true);
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/rides/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status: newStatus,
          reason: statusReason 
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setStatusModal(false);
        setNewStatus('');
        setStatusReason('');
        loadRide();
      } else {
        setError(data.error || 'Erro ao atualizar status');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const calculateFinancials = (price) => {
    const grossValue = parseFloat(price);
    const platformFee = grossValue * 0.15; // 15% taxa da plataforma
    const driverAmount = grossValue - platformFee;
    
    return {
      gross: grossValue,
      platformFee,
      driverAmount
    };
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !ride) {
    return (
      <Container maxWidth="lg" sx={{ mt: 2 }}>
        <Alert severity="error">
          {error || 'Corrida não encontrada'}
        </Alert>
      </Container>
    );
  }

  const financials = calculateFinancials(ride.price);

  return (
    <Container maxWidth="lg" sx={{ mt: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin/rides')}
        >
          Voltar
        </Button>
        <Box>
          <Typography variant="h4">
            Corrida #{ride.id.slice(-8)}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Detalhes e ações administrativas
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Informações Principais */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informações da Corrida
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Status Atual
                    </Typography>
                    <Chip 
                      label={ride.status} 
                      color={statusColors[ride.status] || 'default'}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Tipo da Corrida
                    </Typography>
                    <Typography variant="body1">
                      {ride.type || 'Normal'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      <LocationOn sx={{ fontSize: 16, mr: 0.5 }} />
                      Rota
                    </Typography>
                    <Typography variant="body1">
                      <strong>Origem:</strong> {ride.origin}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Destino:</strong> {ride.destination}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      <Person sx={{ fontSize: 16, mr: 0.5 }} />
                      Passageiro
                    </Typography>
                    <Typography variant="body1">
                      {ride.passenger?.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {ride.passenger?.phone}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      <Person sx={{ fontSize: 16, mr: 0.5 }} />
                      Motorista
                    </Typography>
                    <Typography variant="body1">
                      {ride.driver?.name || 'Não atribuído'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {ride.driver?.phone || ''}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Informações Financeiras */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <AttachMoney sx={{ fontSize: 20, mr: 0.5 }} />
                Breakdown Financeiro
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Valor Bruto
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {formatCurrency(financials.gross)}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Taxa Plataforma (15%)
                    </Typography>
                    <Typography variant="h6" color="warning.main">
                      {formatCurrency(financials.platformFee)}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Repasse Motorista
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {formatCurrency(financials.driverAmount)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Método de Pagamento
                </Typography>
                <Typography variant="body1">
                  {ride.paymentMethod || 'Cartão de Crédito'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Ações e Timeline */}
        <Grid item xs={12} md={4}>
          {/* Ações Administrativas */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ações Administrativas
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Cancel />}
                  onClick={() => setCancelModal(true)}
                  disabled={['completed', 'paid', 'cancelled_by_admin', 'cancelled_by_user', 'cancelled_by_driver'].includes(ride.status)}
                  fullWidth
                >
                  Cancelar Corrida
                </Button>
                
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<CheckCircle />}
                  onClick={() => setForceCompleteModal(true)}
                  disabled={['completed', 'paid', 'cancelled_by_admin', 'cancelled_by_user', 'cancelled_by_driver'].includes(ride.status)}
                  fullWidth
                >
                  Forçar Finalização
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => setStatusModal(true)}
                  fullWidth
                >
                  Corrigir Status
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Timeline Simplificada */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <TimelineIcon sx={{ fontSize: 20, mr: 0.5 }} />
                Linha do Tempo
              </Typography>
              
              <List>
                {ride.statusHistory?.map((history, index) => (
                  <ListItem key={history.id}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            label={history.status} 
                            color={statusColors[history.status] || 'grey'}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={formatDateTime(history.createdAt)}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Modal Cancelar */}
      <Dialog open={cancelModal} onClose={() => setCancelModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cancelar Corrida</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Motivo do cancelamento"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            sx={{ mt: 1 }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelModal(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCancelRide}
            color="error"
            disabled={!cancelReason.trim() || actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : 'Confirmar Cancelamento'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Forçar Finalização */}
      <Dialog open={forceCompleteModal} onClose={() => setForceCompleteModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Forçar Finalização</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Motivo da finalização forçada"
            value={forceReason}
            onChange={(e) => setForceReason(e.target.value)}
            sx={{ mt: 1 }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForceCompleteModal(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleForceComplete}
            color="success"
            disabled={!forceReason.trim() || actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : 'Confirmar Finalização'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Corrigir Status */}
      <Dialog open={statusModal} onClose={() => setStatusModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Corrigir Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
            <InputLabel>Novo Status</InputLabel>
            <Select
              value={newStatus}
              label="Novo Status"
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <MenuItem value="requested">Solicitada</MenuItem>
              <MenuItem value="accepted">Aceita</MenuItem>
              <MenuItem value="arrived">Chegou</MenuItem>
              <MenuItem value="started">Iniciada</MenuItem>
              <MenuItem value="completed">Concluída</MenuItem>
              <MenuItem value="paid">Paga</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Justificativa da correção"
            value={statusReason}
            onChange={(e) => setStatusReason(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusModal(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleStatusUpdate}
            color="primary"
            disabled={!newStatus || !statusReason.trim() || actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : 'Atualizar Status'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
