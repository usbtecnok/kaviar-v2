import { useState, useEffect, Fragment } from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Box,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  AttachMoney,
  DirectionsCar,
  Diamond,
  TrendingUp
} from '@mui/icons-material';
import Layout from '../../components/common/Layout';
import api from '../../api';

const DriverEarnings = () => {
  const [earnings, setEarnings] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEarnings();
  }, [selectedPeriod]);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/driver/earnings?period=${selectedPeriod}`);
      setEarnings(response.data.data.summary);
      setTransactions(response.data.data.transactions);
    } catch (err) {
      setError('Erro ao carregar extrato');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'ride_fare': return <DirectionsCar />;
      case 'first_accept_bonus': return <Diamond sx={{ color: 'gold' }} />;
      case 'community_bonus': return <TrendingUp />;
      default: return <AttachMoney />;
    }
  };

  const getTransactionLabel = (type) => {
    switch (type) {
      case 'ride_fare': return 'Corrida';
      case 'first_accept_bonus': return 'Bônus Aceite Imediato';
      case 'community_bonus': return 'Bônus Comunitário';
      default: return 'Ganho';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Layout title="Motorista - Extrato">
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Motorista - Extrato">
      <Typography variant="h4" gutterBottom>
        Meus Ganhos
      </Typography>

      {/* Filtro de Período */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <FormControl fullWidth>
            <InputLabel>Período</InputLabel>
            <Select
              value={selectedPeriod}
              label="Período"
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <MenuItem value={1}>Hoje</MenuItem>
              <MenuItem value={7}>Últimos 7 dias</MenuItem>
              <MenuItem value={30}>Últimos 30 dias</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {earnings && (
        <>
          {/* Resumo de Ganhos */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Resumo do Período
              </Typography>
              
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h3" color="success.main">
                  R$ {earnings.total_earnings?.toFixed(2) || '0,00'}
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Total de Ganhos
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                <Box>
                  <Typography variant="h6">
                    {earnings.total_rides || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Corridas
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="h6" color="primary.main">
                    {earnings.bonus_rides || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Com Bônus 💎
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="h6">
                    R$ {earnings.average_per_ride?.toFixed(2) || '0,00'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Média/Corrida
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Lista de Transações */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Histórico de Transações
              </Typography>
              
              {transactions.length === 0 ? (
                <Typography variant="body2" color="textSecondary" textAlign="center" py={3}>
                  Nenhuma transação no período selecionado
                </Typography>
              ) : (
                <List>
                  {transactions.map((transaction, index) => (
                    <Fragment key={transaction.id}>
                      <ListItem>
                        <ListItemIcon>
                          {getTransactionIcon(transaction.type)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="body1">
                                {getTransactionLabel(transaction.type)}
                              </Typography>
                              <Typography variant="h6" color="success.main">
                                + R$ {transaction.amount?.toFixed(2)}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2" color="textSecondary">
                                {formatDate(transaction.created_at)}
                              </Typography>
                              {transaction.type === 'first_accept_bonus' && (
                                <Chip 
                                  label="💎 Bônus" 
                                  size="small" 
                                  color="primary"
                                />
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < transactions.length - 1 && <Divider />}
                    </Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Layout>
  );
};

export default DriverEarnings;
