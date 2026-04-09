import { useState, useEffect } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, TextField, MenuItem, Card, CardContent, Grid, IconButton,
  Dialog, DialogTitle, DialogContent, CircularProgress, TablePagination
} from '@mui/material';
import { Visibility } from '@mui/icons-material';
import api from '../../api';

const statusColor = { confirmed: 'success', pending: 'warning', expired: 'default' };
const statusLabel = { confirmed: 'Confirmado', pending: 'Pendente', expired: 'Expirado' };

export default function CreditPurchases() {
  const [purchases, setPurchases] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [webhookDialog, setWebhookDialog] = useState({ open: false, paymentId: '', events: [] });

  useEffect(() => { fetchData(); }, [filter, page]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page + 1), limit: '25' });
      if (filter) params.set('status', filter);

      const [pRes, sRes] = await Promise.all([
        api.get(`/api/admin/credit-purchases?${params}`),
        api.get('/api/admin/credit-purchases/summary')
      ]);
      setPurchases(pRes.data.data);
      setTotal(pRes.data.pagination.total);
      setSummary(sRes.data.data);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const showWebhooks = async (paymentId) => {
    try {
      const res = await api.get(`/api/admin/credit-purchases/${paymentId}/webhooks`);
      setWebhookDialog({ open: true, paymentId, events: res.data.data });
    } catch (err) {
      console.error('Erro webhooks:', err);
    }
  };

  const fmt = (cents) => `R$ ${(cents / 100).toFixed(2)}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>Compras de Créditos</Typography>

      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Confirmadas', value: summary.confirmed, color: '#4caf50' },
            { label: 'Pendentes', value: summary.pending, color: '#ff9800' },
            { label: 'Receita Total', value: fmt(summary.totalRevenueCents), color: '#FFD700' },
            { label: 'Compradores', value: summary.uniqueBuyers, color: '#2196f3' },
          ].map((m) => (
            <Grid item xs={6} md={3} key={m.label}>
              <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333' }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" sx={{ color: m.color }}>{m.value}</Typography>
                  <Typography variant="body2" sx={{ color: '#aaa' }}>{m.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Box sx={{ mb: 2 }}>
        <TextField select size="small" label="Status" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }} sx={{ minWidth: 160 }}>
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="confirmed">Confirmado</MenuItem>
          <MenuItem value="pending">Pendente</MenuItem>
        </TextField>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress sx={{ color: '#FFD700' }} /></Box>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ bgcolor: '#1a1a1a' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#FFD700' }}>Motorista</TableCell>
                  <TableCell sx={{ color: '#FFD700' }}>Valor</TableCell>
                  <TableCell sx={{ color: '#FFD700' }}>Créditos</TableCell>
                  <TableCell sx={{ color: '#FFD700' }}>Status</TableCell>
                  <TableCell sx={{ color: '#FFD700' }}>Saldo Atual</TableCell>
                  <TableCell sx={{ color: '#FFD700' }}>Asaas ID</TableCell>
                  <TableCell sx={{ color: '#FFD700' }}>Criado</TableCell>
                  <TableCell sx={{ color: '#FFD700' }}>Pago</TableCell>
                  <TableCell sx={{ color: '#FFD700' }}>Webhooks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {purchases.map((p) => (
                  <TableRow key={p.id} sx={{ '&:hover': { bgcolor: '#222' } }}>
                    <TableCell sx={{ color: '#fff' }}>
                      <Typography variant="body2">{p.driver_name || '—'}</Typography>
                      <Typography variant="caption" sx={{ color: '#888' }}>{p.driver_phone}</Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#fff' }}>{fmt(p.amount_cents)}</TableCell>
                    <TableCell sx={{ color: '#fff' }}>{p.credits_amount}</TableCell>
                    <TableCell>
                      <Chip label={statusLabel[p.status] || p.status} color={statusColor[p.status] || 'default'} size="small" />
                    </TableCell>
                    <TableCell sx={{ color: '#4caf50' }}>{p.driver_balance}</TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: '#888', fontFamily: 'monospace' }}>
                        {p.asaas_payment_id?.slice(-12)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#aaa' }}><Typography variant="caption">{fmtDate(p.created_at)}</Typography></TableCell>
                    <TableCell sx={{ color: '#aaa' }}><Typography variant="caption">{fmtDate(p.paid_at)}</Typography></TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => showWebhooks(p.asaas_payment_id)} sx={{ color: '#FFD700' }}>
                        <Visibility fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div" count={total} page={page} rowsPerPage={25}
            onPageChange={(_, p) => setPage(p)} rowsPerPageOptions={[25]}
            sx={{ color: '#fff' }}
          />
        </>
      )}

      <Dialog open={webhookDialog.open} onClose={() => setWebhookDialog({ open: false, paymentId: '', events: [] })} maxWidth="md" fullWidth>
        <DialogTitle>Webhooks — {webhookDialog.paymentId}</DialogTitle>
        <DialogContent>
          {webhookDialog.events.length === 0 ? (
            <Typography color="text.secondary">Nenhum webhook recebido</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Evento</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Erro</TableCell>
                  <TableCell>Recebido</TableCell>
                  <TableCell>Processado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {webhookDialog.events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.event_type}</TableCell>
                    <TableCell>
                      <Chip label={e.status} size="small"
                        color={e.status === 'processed' ? 'success' : e.status === 'duplicate' ? 'info' : e.status === 'error' ? 'error' : 'default'} />
                    </TableCell>
                    <TableCell>{e.error || '—'}</TableCell>
                    <TableCell><Typography variant="caption">{fmtDate(e.created_at)}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{fmtDate(e.processed_at)}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
