import { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Card, CardContent, Grid, Chip, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tabs, Tab,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField
} from '@mui/material';
import { CheckCircle, Cancel, Paid, Add, Warning } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const GOLD = '#B8942E';
const STATUS_LABELS = { requested: 'Solicitado', in_review: 'Em análise', approved: 'Aprovado', rejected: 'Rejeitado', paid: 'Pago', canceled: 'Cancelado' };
const STATUS_COLORS = { requested: '#F59E0B', in_review: '#8B5CF6', approved: '#3B82F6', rejected: '#EF4444', paid: '#10B981', canceled: '#6B7280' };

export default function RetornoFamiliarAdmin() {
  const [tab, setTab] = useState(0);
  const [policies, setPolicies] = useState([]);
  const [report, setReport] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionDialog, setActionDialog] = useState({ open: false, item: null, action: '' });
  const [actionPassword, setActionPassword] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [actionExtra, setActionExtra] = useState({});
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ year: new Date().getFullYear(), percent_rate: '5', max_per_driver_cents: '10000', fund_budget_cents: '50000', request_start: '', request_end: '', is_active: false });
  const [createPassword, setCreatePassword] = useState('');
  const [createReason, setCreateReason] = useState('');

  const token = localStorage.getItem('kaviar_admin_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const year = new Date().getFullYear();

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [polRes, repRes, reqRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/retorno-familiar/policies`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/retorno-familiar/report?year=${year}`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/retorno-familiar/requests?year=${year}`, { headers }),
      ]);
      const [polData, repData, reqData] = await Promise.all([polRes.json(), repRes.json(), reqRes.json()]);
      if (polData.success) setPolicies(polData.data || []);
      if (repData.success) setReport(repData.data);
      if (reqData.success) setRequests(reqData.data || []);
    } catch { setError('Erro ao carregar dados'); }
    setLoading(false);
  };

  const handleAction = async () => {
    const { item, action } = actionDialog;
    if (!actionPassword || !actionReason) { setError('Senha e motivo obrigatórios'); return; }
    const body = { password: actionPassword, reason: actionReason, ...actionExtra };
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/retorno-familiar/requests/${item.id}/${action}`, { method: 'PUT', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) { setSuccess(data.message); setActionDialog({ open: false, item: null, action: '' }); setActionPassword(''); setActionReason(''); setActionExtra({}); fetchAll(); }
      else setError(data.error);
    } catch { setError('Erro de conexão'); }
  };

  const handleCreatePolicy = async () => {
    if (!createPassword || !createReason) { setError('Senha e motivo obrigatórios'); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/retorno-familiar/policies`, {
        method: 'POST', headers,
        body: JSON.stringify({ ...createForm, year: Number(createForm.year), percent_rate: Number(createForm.percent_rate), max_per_driver_cents: Number(createForm.max_per_driver_cents) || null, fund_budget_cents: Number(createForm.fund_budget_cents) || null, password: createPassword, reason: createReason }),
      });
      const data = await res.json();
      if (data.success) { setSuccess('Política criada'); setCreateOpen(false); setCreatePassword(''); setCreateReason(''); fetchAll(); }
      else setError(data.error);
    } catch { setError('Erro de conexão'); }
  };

  const fmt = (cents) => `R$ ${(Number(cents) / 100).toFixed(2).replace('.', ',')}`;

  if (loading) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress sx={{ color: GOLD }} /></Box>;

  return (
    <Box sx={{ bgcolor: '#FAFAF8', minHeight: '100vh', py: 3 }}>
      <Container maxWidth="lg">
        <Typography variant="h5" sx={{ color: '#1A1A1A', fontWeight: 800, mb: 0.5 }}>Retorno Familiar KAVIAR</Typography>
        <Typography sx={{ color: '#6B7280', fontSize: 13, mb: 3 }}>Programa voluntário de reconhecimento. Não constitui obrigação automática.</Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

        <Card sx={{ border: '1px solid #E8E5DE', borderRadius: 2, bgcolor: '#fff', mb: 3 }}>
          <Box sx={{ borderBottom: '1px solid #E8E5DE', px: 2 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { fontWeight: 600, fontSize: 13, textTransform: 'none', color: '#6B7280' }, '& .Mui-selected': { color: `${GOLD} !important` }, '& .MuiTabs-indicator': { bgcolor: GOLD } }}>
              <Tab label="Relatório" />
              <Tab label={`Solicitações (${requests.length})`} />
              <Tab label="Políticas" />
            </Tabs>
          </Box>

          <CardContent sx={{ p: 3 }}>
            {/* Tab 0: Report */}
            {tab === 0 && report && (
              <>
                {!report.policy && <Alert severity="info">Nenhuma política criada para {year}. Crie na aba "Políticas".</Alert>}
                {report.policy && (
                  <>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                      <Chip label={`Política ${year}: ${report.policy.percent_rate}%`} sx={{ bgcolor: '#EEF2FF', color: '#4F46E5', fontWeight: 600 }} />
                      {report.fund_summary.budget_cents && <Chip label={`Fundo: ${fmt(report.fund_summary.budget_cents)}`} sx={{ bgcolor: '#ECFDF5', color: '#059669', fontWeight: 600 }} />}
                      {report.fund_summary.remaining_cents != null && <Chip label={`Disponível: ${fmt(report.fund_summary.remaining_cents)}`} sx={{ bgcolor: '#FFFBEB', color: '#D97706', fontWeight: 600 }} />}
                      <Chip label={`${report.eligible.length} motoristas elegíveis`} sx={{ fontWeight: 600 }} />
                    </Box>

                    {report.warnings.length > 0 && (
                      <Alert severity="warning" sx={{ mb: 2, fontSize: 11 }}>
                        <strong>{report.warnings.length} compra(s) confirmada(s) sem data de pagamento</strong> — revisão manual necessária. Essas compras NÃO entram no cálculo.
                      </Alert>
                    )}

                    {report.eligible.length > 0 && (
                      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E8E5DE', borderRadius: 2 }}>
                        <Table size="small">
                          <TableHead sx={{ bgcolor: '#F9FAFB' }}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Motorista</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right">Pago no Ano</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right">Compras</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right">Retorno Est.</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>PIX</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {report.eligible.map(d => (
                              <TableRow key={d.id} hover sx={{ '&:hover': { bgcolor: '#FFFDF7' } }}>
                                <TableCell sx={{ fontSize: 12 }}>{d.name}<br /><span style={{ fontSize: 10, color: '#9CA3AF' }}>{d.email}</span></TableCell>
                                <TableCell sx={{ fontSize: 12, fontWeight: 600 }} align="right">{fmt(d.total_paid_cents)}</TableCell>
                                <TableCell sx={{ fontSize: 12 }} align="right">{d.total_purchases}</TableCell>
                                <TableCell sx={{ fontSize: 12, fontWeight: 700, color: GOLD }} align="right">{fmt(d.calculated_return_cents)}</TableCell>
                                <TableCell>{d.has_pix ? <Chip label="OK" size="small" sx={{ bgcolor: '#ECFDF5', color: '#059669', fontSize: 10 }} /> : <Chip label="Sem PIX" size="small" sx={{ bgcolor: '#FEF2F2', color: '#DC2626', fontSize: 10 }} />}</TableCell>
                                <TableCell>{d.existing_request ? <Chip label={STATUS_LABELS[d.existing_request.status] || d.existing_request.status} size="small" sx={{ bgcolor: `${STATUS_COLORS[d.existing_request.status] || '#6B7280'}20`, color: STATUS_COLORS[d.existing_request.status] || '#6B7280', fontSize: 10, fontWeight: 600 }} /> : <Chip label="Sem solicitação" size="small" sx={{ fontSize: 10 }} />}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </>
                )}
              </>
            )}

            {/* Tab 1: Requests */}
            {tab === 1 && (
              requests.length === 0 ? <Alert severity="info">Nenhuma solicitação para {year}.</Alert> : (
                <Grid container spacing={2}>
                  {requests.map(r => (
                    <Grid item xs={12} sm={6} key={r.id}>
                      <Card sx={{ border: `1px solid ${STATUS_COLORS[r.status] || '#E8E5DE'}40`, borderTop: `3px solid ${STATUS_COLORS[r.status] || '#E8E5DE'}`, borderRadius: 2 }}>
                        <CardContent sx={{ py: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{r.driver_name}</Typography>
                            <Chip label={STATUS_LABELS[r.status]} size="small" sx={{ bgcolor: `${STATUS_COLORS[r.status]}20`, color: STATUS_COLORS[r.status], fontWeight: 600, fontSize: 10 }} />
                          </Box>
                          <Typography sx={{ fontSize: 11, color: '#6B7280' }}>{r.driver_email}</Typography>
                          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                            <Typography sx={{ fontSize: 12 }}>Pago: <strong>{fmt(r.total_paid_cents)}</strong></Typography>
                            <Typography sx={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>Retorno: {fmt(r.calculated_return_cents)}</Typography>
                          </Box>
                          {r.approved_amount_cents && <Typography sx={{ fontSize: 12, color: '#10B981', mt: 0.5 }}>Aprovado: {fmt(r.approved_amount_cents)}</Typography>}
                          {r.review_reason && <Typography sx={{ fontSize: 11, color: '#6B7280', mt: 0.5 }}>Motivo: {r.review_reason}</Typography>}
                          <Typography sx={{ fontSize: 10, color: '#9CA3AF', mt: 1 }}>PIX: {r.pix_key ? `${r.pix_key_type} — ${r.pix_key.slice(0, 6)}...` : 'Sem PIX'}</Typography>

                          {['requested', 'in_review'].includes(r.status) && (
                            <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                              <Button size="small" variant="contained" startIcon={<CheckCircle />} onClick={() => setActionDialog({ open: true, item: r, action: 'approve' })} sx={{ bgcolor: '#10B981', fontSize: 10, '&:hover': { bgcolor: '#059669' } }}>Aprovar</Button>
                              <Button size="small" variant="outlined" startIcon={<Cancel />} onClick={() => setActionDialog({ open: true, item: r, action: 'reject' })} sx={{ borderColor: '#EF4444', color: '#EF4444', fontSize: 10 }}>Rejeitar</Button>
                              <Button size="small" variant="outlined" onClick={() => setActionDialog({ open: true, item: r, action: 'cancel' })} sx={{ fontSize: 10, color: '#6B7280' }}>Cancelar</Button>
                            </Box>
                          )}
                          {r.status === 'approved' && (
                            <Button size="small" variant="contained" startIcon={<Paid />} onClick={() => { setActionExtra({ paid_method: 'pix_manual' }); setActionDialog({ open: true, item: r, action: 'mark-paid' }); }} sx={{ mt: 1.5, bgcolor: GOLD, fontSize: 10, '&:hover': { bgcolor: '#9A7B24' } }}>Marcar como Pago</Button>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )
            )}

            {/* Tab 2: Policies */}
            {tab === 2 && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button startIcon={<Add />} variant="contained" size="small" onClick={() => setCreateOpen(true)} sx={{ bgcolor: GOLD, fontWeight: 600, '&:hover': { bgcolor: '#9A7B24' } }}>Nova Política</Button>
                </Box>
                {policies.length === 0 ? <Alert severity="info">Nenhuma política criada.</Alert> : (
                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E8E5DE', borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#F9FAFB' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Ano</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right">Taxa %</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right">Teto/motorista</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 11 }} align="right">Fundo</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Período</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {policies.map(p => (
                          <TableRow key={p.id}>
                            <TableCell sx={{ fontSize: 13, fontWeight: 700 }}>{p.year}</TableCell>
                            <TableCell sx={{ fontSize: 12, color: GOLD, fontWeight: 700 }} align="right">{Number(p.percent_rate)}%</TableCell>
                            <TableCell sx={{ fontSize: 12 }} align="right">{p.max_per_driver_cents ? fmt(p.max_per_driver_cents) : '—'}</TableCell>
                            <TableCell sx={{ fontSize: 12 }} align="right">{p.fund_budget_cents ? fmt(p.fund_budget_cents) : '—'}</TableCell>
                            <TableCell sx={{ fontSize: 11, color: '#6B7280' }}>{p.request_start} a {p.request_end}</TableCell>
                            <TableCell><Chip label={p.is_active ? 'Ativa' : 'Inativa'} size="small" sx={{ bgcolor: p.is_active ? '#ECFDF5' : '#F3F4F6', color: p.is_active ? '#059669' : '#6B7280', fontWeight: 600, fontSize: 10 }} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Action Dialog */}
        <Dialog open={actionDialog.open} onClose={() => { setActionDialog({ open: false, item: null, action: '' }); setActionPassword(''); setActionReason(''); setActionExtra({}); }} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {actionDialog.action === 'approve' ? 'Aprovar Solicitação' : actionDialog.action === 'reject' ? 'Rejeitar Solicitação' : actionDialog.action === 'cancel' ? 'Cancelar Solicitação' : 'Registrar Pagamento'}
          </DialogTitle>
          <DialogContent>
            {actionDialog.item && (
              <Box sx={{ p: 2, bgcolor: '#F9FAFB', borderRadius: 2, mb: 2 }}>
                <Typography sx={{ fontSize: 13 }}><strong>{actionDialog.item.driver_name}</strong></Typography>
                <Typography sx={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>Retorno: {fmt(actionDialog.item.calculated_return_cents)}</Typography>
              </Box>
            )}
            {actionDialog.action === 'mark-paid' && (
              <>
                <TextField fullWidth label="Método" value={actionExtra.paid_method || 'pix_manual'} onChange={e => setActionExtra(x => ({ ...x, paid_method: e.target.value }))} size="small" sx={{ mb: 2 }} />
                <TextField fullWidth label="Referência/Comprovante" value={actionExtra.paid_reference || ''} onChange={e => setActionExtra(x => ({ ...x, paid_reference: e.target.value }))} size="small" sx={{ mb: 2 }} />
              </>
            )}
            <TextField fullWidth label="Motivo (obrigatório)" value={actionReason} onChange={e => setActionReason(e.target.value)} size="small" sx={{ mb: 2 }} />
            <TextField fullWidth label="Sua senha (confirmação)" type="password" value={actionPassword} onChange={e => setActionPassword(e.target.value)} size="small" />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setActionDialog({ open: false, item: null, action: '' }); setActionPassword(''); setActionReason(''); }} sx={{ color: '#6B7280' }}>Cancelar</Button>
            <Button onClick={handleAction} variant="contained" disabled={!actionPassword || !actionReason} sx={{ bgcolor: actionDialog.action === 'approve' ? '#10B981' : actionDialog.action === 'reject' ? '#EF4444' : GOLD, fontWeight: 600 }}>Confirmar</Button>
          </DialogActions>
        </Dialog>

        {/* Create Policy Dialog */}
        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Nova Política Anual</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2, fontSize: 11 }}>Programa voluntário. Não gera obrigação automática.</Alert>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={4}><TextField fullWidth label="Ano" type="number" value={createForm.year} onChange={e => setCreateForm(f => ({ ...f, year: e.target.value }))} size="small" /></Grid>
              <Grid item xs={4}><TextField fullWidth label="Taxa (%)" type="number" value={createForm.percent_rate} onChange={e => setCreateForm(f => ({ ...f, percent_rate: e.target.value }))} size="small" inputProps={{ min: 0.01, max: 50, step: 0.5 }} /></Grid>
              <Grid item xs={4}><TextField fullWidth label="Teto/motorista (centavos)" type="number" value={createForm.max_per_driver_cents} onChange={e => setCreateForm(f => ({ ...f, max_per_driver_cents: e.target.value }))} size="small" /></Grid>
              <Grid item xs={4}><TextField fullWidth label="Fundo total (centavos)" type="number" value={createForm.fund_budget_cents} onChange={e => setCreateForm(f => ({ ...f, fund_budget_cents: e.target.value }))} size="small" /></Grid>
              <Grid item xs={4}><TextField fullWidth label="Início solicitações" type="date" value={createForm.request_start} onChange={e => setCreateForm(f => ({ ...f, request_start: e.target.value }))} size="small" InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={4}><TextField fullWidth label="Fim solicitações" type="date" value={createForm.request_end} onChange={e => setCreateForm(f => ({ ...f, request_end: e.target.value }))} size="small" InputLabelProps={{ shrink: true }} /></Grid>
            </Grid>
            <TextField fullWidth label="Motivo (obrigatório)" value={createReason} onChange={e => setCreateReason(e.target.value)} size="small" sx={{ mt: 2, mb: 2 }} />
            <TextField fullWidth label="Sua senha (confirmação)" type="password" value={createPassword} onChange={e => setCreatePassword(e.target.value)} size="small" />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreateOpen(false)} sx={{ color: '#6B7280' }}>Cancelar</Button>
            <Button onClick={handleCreatePolicy} variant="contained" disabled={!createPassword || !createReason} sx={{ bgcolor: GOLD, fontWeight: 600, '&:hover': { bgcolor: '#9A7B24' } }}>Criar Política</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
