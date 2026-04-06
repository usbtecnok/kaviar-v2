import { useState, useEffect } from 'react';
import { Container, Typography, Box, Card, CardContent, Grid, Chip, Button, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton, Tooltip, Divider, InputAdornment } from '@mui/material';
import { Add, Search, ContentCopy, CheckCircle, Payment, Cancel, Visibility, FilterList } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const STATUS_CHIPS = {
  pending: { label: 'Pendente', color: 'warning' },
  qualified: { label: 'Qualificada', color: 'success' },
  rejected: { label: 'Rejeitada', color: 'error' },
};
const PAY_CHIPS = {
  pending_pix: { label: 'Sem PIX', color: 'default' },
  pending_approval: { label: 'Aguardando aprovação', color: 'warning' },
  approved: { label: 'Aprovado', color: 'info' },
  paid: { label: 'Pago', color: 'success' },
  canceled: { label: 'Cancelado', color: 'error' },
};
const PIX_TYPES = ['CPF', 'PHONE', 'EMAIL', 'RANDOM'];

export default function ReferralManagement() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPay, setFilterPay] = useState('');
  const [filterPix, setFilterPix] = useState('');

  // Dialogs
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState({ open: false, action: '', ref: null });
  const [actionInput, setActionInput] = useState('');
  const [saving, setSaving] = useState(false);

  // New referral form
  const [agents, setAgents] = useState([]);
  const [newForm, setNewForm] = useState({ agent_name: '', agent_phone: '', driver_phone: '', agent_id: '' });
  const [pixForm, setPixForm] = useState({ pix_key: '', pix_key_type: 'CPF' });

  const token = () => localStorage.getItem('kaviar_admin_token');
  const headers = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [refRes, agRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/referrals`, { headers: headers() }),
        fetch(`${API_BASE_URL}/api/admin/referral-agents`, { headers: headers() }),
      ]);
      const refJson = await refRes.json();
      const agJson = await agRes.json();
      if (refJson.success) setReferrals(refJson.data);
      if (agJson.success) setAgents(agJson.data);
    } catch { setError('Erro ao carregar dados'); }
    finally { setLoading(false); }
  };

  const handleAction = async () => {
    setSaving(true);
    try {
      const body = { action: actionDialog.action };
      if (actionDialog.action === 'mark_paid') body.payment_ref = actionInput;
      if (actionDialog.action === 'reject' || actionDialog.action === 'cancel_payment') body.rejection_reason = actionInput;
      const res = await fetch(`${API_BASE_URL}/api/admin/referrals/${actionDialog.ref.id}`, {
        method: 'PATCH', headers: headers(), body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error); }
      else { setActionDialog({ open: false, action: '', ref: null }); setActionInput(''); fetchAll(); }
    } catch { setError('Erro ao processar ação'); }
    finally { setSaving(false); }
  };

  const handleNewReferral = async () => {
    setSaving(true);
    try {
      // Create or find agent
      let agentId = newForm.agent_id;
      if (!agentId) {
        const agRes = await fetch(`${API_BASE_URL}/api/admin/referral-agents`, {
          method: 'POST', headers: headers(),
          body: JSON.stringify({ name: newForm.agent_name, phone: newForm.agent_phone }),
        });
        const agJson = await agRes.json();
        if (!agJson.success) { setError(agJson.error); setSaving(false); return; }
        agentId = agJson.data.id;
      }
      const res = await fetch(`${API_BASE_URL}/api/admin/referrals`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ agent_id: agentId, driver_phone: newForm.driver_phone }),
      });
      const json = await res.json();
      if (!json.success) setError(json.error);
      else { setNewOpen(false); setNewForm({ agent_name: '', agent_phone: '', driver_phone: '', agent_id: '' }); fetchAll(); }
    } catch { setError('Erro ao criar indicação'); }
    finally { setSaving(false); }
  };

  const handleSavePix = async (agentId) => {
    try {
      await fetch(`${API_BASE_URL}/api/admin/referral-agents/${agentId}`, {
        method: 'PATCH', headers: headers(),
        body: JSON.stringify(pixForm),
      });
      setPixForm({ pix_key: '', pix_key_type: 'CPF' });
      fetchAll();
    } catch { setError('Erro ao salvar PIX'); }
  };

  const copyPix = (key) => { navigator.clipboard.writeText(key); };
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') + ' ' + new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';

  // Filters
  let filtered = referrals;
  if (filterStatus) filtered = filtered.filter(r => r.status === filterStatus);
  if (filterPay) filtered = filtered.filter(r => r.payment_status === filterPay);
  if (filterPix === 'true') filtered = filtered.filter(r => r.agent?.pix_key);
  if (filterPix === 'false') filtered = filtered.filter(r => !r.agent?.pix_key);
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(r =>
      r.agent?.name?.toLowerCase().includes(s) ||
      r.agent?.phone?.includes(s) ||
      r.driver_phone?.includes(s) ||
      r.driver?.name?.toLowerCase().includes(s)
    );
  }

  const readyToPay = filtered.filter(r => r.status === 'qualified' && r.payment_status === 'pending_approval');

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Indicações</Typography>
          <Typography variant="body2" color="text.secondary">
            {referrals.length} indicações • {readyToPay.length} prontas para pagar
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} sx={{ bgcolor: '#FFD700', color: '#000' }} onClick={() => setNewOpen(true)}>
          Nova indicação
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="Buscar nome ou telefone..." value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: 240 }} />
        <TextField select size="small" label="Status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="">Todos</MenuItem>
          {Object.entries(STATUS_CHIPS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Pagamento" value={filterPay} onChange={e => setFilterPay(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">Todos</MenuItem>
          {Object.entries(PAY_CHIPS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="PIX" value={filterPix} onChange={e => setFilterPix(e.target.value)} sx={{ minWidth: 120 }}>
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="true">Com PIX</MenuItem>
          <MenuItem value="false">Sem PIX</MenuItem>
        </TextField>
      </Box>

      {/* Cards */}
      <Grid container spacing={2}>
        {filtered.map(r => {
          const sc = STATUS_CHIPS[r.status] || { label: r.status, color: 'default' };
          const pc = PAY_CHIPS[r.payment_status] || { label: r.payment_status, color: 'default' };
          const isReady = r.status === 'qualified' && r.payment_status === 'pending_approval';
          return (
            <Grid item xs={12} sm={6} md={4} key={r.id}>
              <Card variant="outlined" sx={{ borderRadius: 3, borderColor: isReady ? '#FFD700' : undefined, borderWidth: isReady ? 2 : 1 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>{r.agent?.name || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">{r.agent?.phone}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Chip label={sc.label} color={sc.color} size="small" />
                      <Chip label={pc.label} color={pc.color} size="small" variant="outlined" />
                    </Box>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" color="text.secondary">Motorista: <b>{r.driver?.name || r.driver_phone}</b></Typography>
                  <Typography variant="body2" color="text.secondary">Valor: <b>R$ {Number(r.reward_amount).toFixed(2)}</b></Typography>
                  {r.agent?.pix_key && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <Typography variant="caption" color="success.main">PIX: {r.agent.pix_key}</Typography>
                      <IconButton size="small" onClick={() => copyPix(r.agent.pix_key)}><ContentCopy sx={{ fontSize: 14 }} /></IconButton>
                    </Box>
                  )}
                  {!r.agent?.pix_key && <Typography variant="caption" color="error">⚠ Sem chave PIX</Typography>}
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 1.5, flexWrap: 'wrap' }}>
                    <Button size="small" startIcon={<Visibility />} onClick={() => { setSelected(r); setDetailOpen(true); }}>Detalhes</Button>
                    {r.payment_status === 'pending_approval' && (
                      <Button size="small" color="success" startIcon={<CheckCircle />} onClick={() => setActionDialog({ open: true, action: 'approve_payment', ref: r })}>Aprovar</Button>
                    )}
                    {r.payment_status === 'approved' && (
                      <Button size="small" color="primary" startIcon={<Payment />} onClick={() => setActionDialog({ open: true, action: 'mark_paid', ref: r })}>Pagar</Button>
                    )}
                    {r.payment_status !== 'paid' && r.status !== 'rejected' && (
                      <Button size="small" color="error" startIcon={<Cancel />} onClick={() => setActionDialog({ open: true, action: 'reject', ref: r })}>Rejeitar</Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {filtered.length === 0 && <Box sx={{ textAlign: 'center', mt: 6 }}><Typography color="text.secondary">Nenhuma indicação encontrada</Typography></Box>}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        {selected && (
          <>
            <DialogTitle>Indicação — {selected.agent?.name}</DialogTitle>
            <DialogContent>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>INDICADOR</Typography>
              <Typography>Nome: {selected.agent?.name}</Typography>
              <Typography>Telefone: {selected.agent?.phone}</Typography>
              {selected.agent?.email && <Typography>Email: {selected.agent.email}</Typography>}
              {selected.agent?.pix_key ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Typography>PIX ({selected.agent.pix_key_type}): <b>{selected.agent.pix_key}</b></Typography>
                  <IconButton size="small" onClick={() => copyPix(selected.agent.pix_key)}><ContentCopy sx={{ fontSize: 16 }} /></IconButton>
                </Box>
              ) : (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="error">Sem chave PIX — cadastrar:</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <TextField size="small" label="Chave PIX" value={pixForm.pix_key} onChange={e => setPixForm({ ...pixForm, pix_key: e.target.value })} />
                    <TextField select size="small" label="Tipo" value={pixForm.pix_key_type} onChange={e => setPixForm({ ...pixForm, pix_key_type: e.target.value })} sx={{ minWidth: 100 }}>
                      {PIX_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </TextField>
                    <Button size="small" variant="contained" sx={{ bgcolor: '#FFD700', color: '#000' }} onClick={() => handleSavePix(selected.agent.id)}>Salvar</Button>
                  </Box>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="text.secondary">MOTORISTA</Typography>
              <Typography>Nome: {selected.driver?.name || '—'}</Typography>
              <Typography>Telefone: {selected.driver_phone}</Typography>
              <Typography>Status: {selected.driver?.status || '—'}</Typography>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="text.secondary">TIMELINE</Typography>
              <Box sx={{ pl: 2, borderLeft: '2px solid #eee' }}>
                <Typography variant="body2">📋 Criada em {fmtDate(selected.created_at)}</Typography>
                {selected.qualified_at && <Typography variant="body2">✅ Qualificada em {fmtDate(selected.qualified_at)}</Typography>}
                {selected.payment_approved_at && <Typography variant="body2">👍 Aprovada em {fmtDate(selected.payment_approved_at)}</Typography>}
                {selected.payment_paid_at && <Typography variant="body2">💰 Paga em {fmtDate(selected.payment_paid_at)} — Ref: {selected.payment_ref}</Typography>}
                {selected.rejected_at && <Typography variant="body2">❌ Rejeitada em {fmtDate(selected.rejected_at)} — {selected.rejection_reason}</Typography>}
              </Box>

              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary">Valor: R$ {Number(selected.reward_amount).toFixed(2)}</Typography>
            </DialogContent>
            <DialogActions><Button onClick={() => setDetailOpen(false)}>Fechar</Button></DialogActions>
          </>
        )}
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onClose={() => setActionDialog({ open: false, action: '', ref: null })}>
        <DialogTitle>
          {actionDialog.action === 'approve_payment' && 'Aprovar pagamento'}
          {actionDialog.action === 'mark_paid' && 'Confirmar pagamento'}
          {actionDialog.action === 'reject' && 'Rejeitar indicação'}
          {actionDialog.action === 'cancel_payment' && 'Cancelar pagamento'}
        </DialogTitle>
        <DialogContent>
          {actionDialog.action === 'mark_paid' && (
            <TextField fullWidth label="Referência do PIX" value={actionInput} onChange={e => setActionInput(e.target.value)} sx={{ mt: 1 }} required />
          )}
          {(actionDialog.action === 'reject' || actionDialog.action === 'cancel_payment') && (
            <TextField fullWidth label="Motivo" value={actionInput} onChange={e => setActionInput(e.target.value)} sx={{ mt: 1 }} multiline rows={2} />
          )}
          {actionDialog.action === 'approve_payment' && (
            <Typography sx={{ mt: 1 }}>Confirma a aprovação do pagamento de R$ {actionDialog.ref && Number(actionDialog.ref.reward_amount).toFixed(2)}?</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setActionDialog({ open: false, action: '', ref: null }); setActionInput(''); }}>Cancelar</Button>
          <Button variant="contained" onClick={handleAction} disabled={saving} sx={{ bgcolor: '#FFD700', color: '#000' }}>
            {saving ? 'Processando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Referral Dialog */}
      <Dialog open={newOpen} onClose={() => setNewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nova indicação</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">INDICADOR</Typography>
          <TextField select label="Indicador existente (opcional)" value={newForm.agent_id} onChange={e => setNewForm({ ...newForm, agent_id: e.target.value })} fullWidth>
            <MenuItem value="">Criar novo indicador</MenuItem>
            {agents.map(a => <MenuItem key={a.id} value={a.id}>{a.name} — {a.phone}</MenuItem>)}
          </TextField>
          {!newForm.agent_id && (
            <>
              <TextField label="Nome do indicador" value={newForm.agent_name} onChange={e => setNewForm({ ...newForm, agent_name: e.target.value })} fullWidth required />
              <TextField label="Telefone do indicador" value={newForm.agent_phone} onChange={e => setNewForm({ ...newForm, agent_phone: e.target.value })} fullWidth required />
            </>
          )}
          <Divider />
          <Typography variant="subtitle2" color="text.secondary">MOTORISTA INDICADO</Typography>
          <TextField label="Telefone do motorista" value={newForm.driver_phone} onChange={e => setNewForm({ ...newForm, driver_phone: e.target.value })} fullWidth required />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleNewReferral} disabled={saving} sx={{ bgcolor: '#FFD700', color: '#000' }}>
            {saving ? 'Criando...' : 'Criar indicação'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
