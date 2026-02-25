import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
import api from '../../api/index';

export function DriverCreditsCard({ driverId }) {
  const [balance, setBalance] = useState(0);
  const [ledger, setLedger] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadBalance();
    loadLedger();
  }, [driverId, page, rowsPerPage]);

  const loadBalance = async () => {
    try {
      const res = await api.get(`/api/admin/drivers/${driverId}/credits/balance`);
      // Normalize: API may return string, ensure number
      setBalance(parseFloat(res.data.balance) || 0);
    } catch (err) {
      console.error('Error loading balance:', err);
    }
  };

  const loadLedger = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/admin/drivers/${driverId}/credits/ledger`, {
        params: { page: page + 1, limit: rowsPerPage }
      });
      setLedger(res.data.entries || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Error loading ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = async () => {
    setError('');
    setSuccess('');

    const deltaNum = parseFloat(delta);
    if (isNaN(deltaNum) || deltaNum === 0) {
      setError('Delta deve ser um número diferente de zero');
      return;
    }
    if (!reason.trim()) {
      setError('Motivo é obrigatório');
      return;
    }

    try {
      const idempotencyKey = `adjust-${driverId}-${Date.now()}-${Math.random()}`;
      await api.post(`/api/admin/drivers/${driverId}/credits/adjust`, {
        delta: deltaNum,
        reason: reason.trim(),
        idempotencyKey
      });

      setSuccess('Créditos ajustados com sucesso');
      setModalOpen(false);
      setDelta('');
      setReason('');
      loadBalance();
      loadLedger();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao ajustar créditos');
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Créditos do Motorista</Typography>
          <Box display="flex" gap={2} alignItems="center">
            <Chip 
              label={`R$ ${(parseFloat(balance) || 0).toFixed(2)}`} 
              color="primary" 
              size="large"
            />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setModalOpen(true)}
            >
              Ajustar
            </Button>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Typography variant="subtitle2" color="text.secondary" mb={2}>
          Histórico de Transações
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : ledger.length === 0 ? (
          <Typography color="text.secondary" align="center" py={3}>
            Nenhuma transação registrada
          </Typography>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Data</TableCell>
                    <TableCell align="right">Valor</TableCell>
                    <TableCell align="right">Saldo Após</TableCell>
                    <TableCell>Motivo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ledger.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {new Date(entry.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          color={parseFloat(entry.delta) > 0 ? 'success.main' : 'error.main'}
                          fontWeight="bold"
                        >
                          {parseFloat(entry.delta) > 0 ? '+' : ''}
                          R$ {(parseFloat(entry.delta) || 0).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        R$ {(parseFloat(entry.balance_after) || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>{entry.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              labelRowsPerPage="Linhas por página"
            />
          </>
        )}
      </CardContent>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajustar Créditos</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Valor (positivo para adicionar, negativo para remover)"
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="Ex: 50.00 ou -25.00"
              fullWidth
            />
            <TextField
              label="Motivo"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Bônus de boas-vindas"
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleAdjust} variant="contained">
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
