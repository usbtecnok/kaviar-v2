import { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid, Chip, Button,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, IconButton, Tooltip, Divider, InputAdornment, Tabs, Tab
} from '@mui/material';
import { Payment, CheckCircle, Search, Visibility, ContentCopy, AccountBalance } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const gold = '#FFD700';
const bg = '#0A0A0F';
const cardBg = '#111217';
const border = '#333';

const PAY_CHIPS = {
  pending_pix: { label: 'Sem PIX', color: '#888' },
  pending_approval: { label: 'Aguardando Aprovação', color: gold },
  approved: { label: 'Aprovado — Pagar', color: '#42A5F5' },
  paid: { label: 'Pago', color: '#66BB6A' },
  canceled: { label: 'Cancelado', color: '#EF5350' },
};

const PIX_TYPES = ['CPF', 'PHONE', 'EMAIL', 'RANDOM'];

const TABS = [
  { key: '', label: 'Todas' },
  { key: 'pending_pix', label: 'Sem PIX' },
  { key: 'pending_approval', label: 'Aguardando' },
  { key: 'approved', label: 'Pagar' },
  { key: 'paid', label: 'Pagos' },
];

export default function FinancePayments() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [actionDialog, setActionDialog] = useState({ open: false, action: '', ref: null });
  const [actionInput, setActionInput] = useState('');
  const [pixDialog, setPixDialog] = useState({ open: false, agent: null });
  const [pixForm, setPixForm] = useState({ pix_key: '', pix_key_type: 'CPF' });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState('');

  const token = () => localStorage.getItem('kaviar_admin_token');
  const headers = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });

  useEffect(() => { fetchReferrals(); }, []);

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/referrals`, { headers: headers() });
      const json = await res.json();
      if (json.success) setReferrals(json.data);
      else setError(json.error);
    } catch { setError('Erro ao carregar indicações'); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('kaviar_admin_token');
    localStorage.removeItem('kaviar_admin_data');
    // redirect removido — ProtectedAdminRoute cuida
  };

  // KPI counts
  const counts = {
    '': referrals.length,
    pending_pix: referrals.filter(r => r.payment_status === 'pending_pix').length,
    pending_approval: referrals.filter(r => r.payment_status === 'pending_approval').length,
    approved: referrals.filter(r => r.payment_status === 'approved').length,
    paid: referrals.filter(r => r.payment_status === 'paid').length,
  };

  const activeFilter = TABS[tab].key;
  const filtered = referrals.filter(r => {
    if (activeFilter && r.payment_status !== activeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (r.agent?.name || '').toLowerCase().includes(s)
        || (r.driver_phone || '').includes(s)
        || (r.agent?.phone || '').includes(s);
    }
    return true;
  });

  // Actions
  const doAction = async (action, id, extra = {}) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/referrals/${id}`, {
        method: 'PATCH', headers: headers(),
        body: JSON.stringify({ action, ...extra }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error); return; }
      await fetchReferrals();
      setActionDialog({ open: false, action: '', ref: null });
      setActionInput('');
      setDetailOpen(false);
    } catch { setError('Erro ao processar ação'); }
    finally { setSaving(false); }
  };

  const savePix = async () => {
    if (!pixDialog.agent) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/referral-agents/${pixDialog.agent.id}`, {
        method: 'PATCH', headers: headers(),
        body: JSON.stringify(pixForm),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error); return; }
      await fetchReferrals();
      setPixDialog({ open: false, agent: null });
    } catch { setError('Erro ao salvar PIX'); }
    finally { setSaving(false); }
  };

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: bg }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress sx={{ color: gold, mb: 2 }} />
          <Typography sx={{ color: gold }}>Carregando pagamentos...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: bg, minHeight: '100vh', color: '#E8E3D5' }}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, p: 2, bgcolor: cardBg, borderRadius: 1, border: `1px solid ${gold}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AccountBalance sx={{ color: gold, fontSize: 32 }} />
            <Box>
              <Typography variant="h5" sx={{ color: gold, fontWeight: 'bold' }}>Pagamentos de Indicação</Typography>
              <Typography variant="body2" sx={{ color: '#999' }}>Financeiro — Controle de pagamentos</Typography>
            </Box>
          </Box>
          <Button onClick={handleLogout} variant="outlined" size="small" sx={{ borderColor: gold, color: gold, '&:hover': { borderColor: '#FFC107', bgcolor: 'rgba(255,215,0,0.1)' } }}>
            Sair
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {copied && <Alert severity="success" sx={{ mb: 2 }}>{copied} copiado!</Alert>}

        {/* KPI Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Sem PIX', value: counts.pending_pix, color: '#888', icon: '⏳' },
            { label: 'Aguardando Aprovação', value: counts.pending_approval, color: gold, icon: '🔔' },
            { label: 'Aprovados — Pagar', value: counts.approved, color: '#42A5F5', icon: '💰' },
            { label: 'Pagos', value: counts.paid, color: '#66BB6A', icon: '✅' },
          ].map((kpi) => (
            <Grid item xs={6} md={3} key={kpi.label}>
              <Card sx={{ bgcolor: cardBg, border: `1px solid ${kpi.color}40`, textAlign: 'center' }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography sx={{ fontSize: 28 }}>{kpi.icon}</Typography>
                  <Typography variant="h4" sx={{ color: kpi.color, fontWeight: 'bold' }}>{kpi.value}</Typography>
                  <Typography variant="caption" sx={{ color: '#999' }}>{kpi.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Tabs + Search */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { color: '#999', minWidth: 'auto', px: 2 }, '& .Mui-selected': { color: gold }, '& .MuiTabs-indicator': { bgcolor: gold } }}>
            {TABS.map((t, i) => (
              <Tab key={t.key} label={`${t.label} (${counts[t.key]})`} />
            ))}
          </Tabs>
          <TextField
            size="small" placeholder="Buscar..."
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: '#666' }} /></InputAdornment> }}
            sx={{ width: 250, '& .MuiOutlinedInput-root': { color: '#E8E3D5', '& fieldset': { borderColor: border } } }}
          />
        </Box>

        {/* Referral List */}
        {filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography sx={{ color: '#666' }}>Nenhuma indicação encontrada</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filtered.map(ref => {
              const chip = PAY_CHIPS[ref.payment_status] || { label: ref.payment_status, color: '#666' };
              return (
                <Card key={ref.id} sx={{ bgcolor: cardBg, border: `1px solid ${border}`, cursor: 'pointer', '&:hover': { borderColor: gold + '60' } }}
                  onClick={() => { setSelected(ref); setDetailOpen(true); }}>
                  <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box>
                      <Typography sx={{ color: '#E8E3D5', fontWeight: 500 }}>{ref.agent?.name || '—'}</Typography>
                      <Typography variant="caption" sx={{ color: '#888' }}>
                        Motorista: {ref.driver_phone} · R$ {Number(ref.reward_amount).toFixed(2)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={chip.label} size="small" sx={{ bgcolor: chip.color + '20', color: chip.color, fontWeight: 600, border: `1px solid ${chip.color}40` }} />
                      <Visibility sx={{ color: '#666', fontSize: 20 }} />
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Container>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#1a1a1a', color: '#E8E3D5', border: `1px solid ${gold}40` } }}>
        {selected && (() => {
          const r = selected;
          const chip = PAY_CHIPS[r.payment_status] || { label: r.payment_status, color: '#666' };
          return (
            <>
              <DialogTitle sx={{ color: gold, borderBottom: `1px solid ${border}` }}>
                Detalhe da Indicação
              </DialogTitle>
              <DialogContent sx={{ pt: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                  {/* Indicador */}
                  <Box>
                    <Typography variant="overline" sx={{ color: '#888' }}>Indicador</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{r.agent?.name}</Typography>
                    <Typography variant="body2" sx={{ color: '#aaa' }}>{r.agent?.phone}</Typography>
                  </Box>

                  {/* PIX */}
                  <Box>
                    <Typography variant="overline" sx={{ color: '#888' }}>Chave PIX</Typography>
                    {r.agent?.pix_key ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={r.agent.pix_key_type} size="small" sx={{ bgcolor: gold + '20', color: gold }} />
                        <Typography sx={{ fontFamily: 'monospace' }}>{r.agent.pix_key}</Typography>
                        <IconButton size="small" onClick={() => copyText(r.agent.pix_key, 'PIX')}>
                          <ContentCopy sx={{ fontSize: 16, color: '#888' }} />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ color: '#EF5350' }}>Não cadastrada</Typography>
                        <Button size="small" variant="outlined" sx={{ borderColor: gold, color: gold }}
                          onClick={() => { setPixForm({ pix_key: '', pix_key_type: 'CPF' }); setPixDialog({ open: true, agent: r.agent }); }}>
                          Cadastrar PIX
                        </Button>
                      </Box>
                    )}
                  </Box>

                  <Divider sx={{ borderColor: border }} />

                  {/* Motorista */}
                  <Box>
                    <Typography variant="overline" sx={{ color: '#888' }}>Motorista indicado</Typography>
                    <Typography>{r.driver?.name || r.driver_phone}</Typography>
                  </Box>

                  {/* Valor + Status */}
                  <Box sx={{ display: 'flex', gap: 3 }}>
                    <Box>
                      <Typography variant="overline" sx={{ color: '#888' }}>Valor</Typography>
                      <Typography variant="h6" sx={{ color: gold }}>R$ {Number(r.reward_amount).toFixed(2)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="overline" sx={{ color: '#888' }}>Status Pagamento</Typography>
                      <Chip label={chip.label} sx={{ bgcolor: chip.color + '20', color: chip.color, fontWeight: 600, border: `1px solid ${chip.color}40` }} />
                    </Box>
                  </Box>

                  {/* Payment ref */}
                  {r.payment_ref && (
                    <Box>
                      <Typography variant="overline" sx={{ color: '#888' }}>Referência/Comprovante</Typography>
                      <Typography sx={{ fontFamily: 'monospace', color: '#66BB6A' }}>{r.payment_ref}</Typography>
                    </Box>
                  )}

                  {/* Timestamps */}
                  {r.payment_approved_at && (
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      Aprovado em: {new Date(r.payment_approved_at).toLocaleString('pt-BR')}
                    </Typography>
                  )}
                  {r.payment_paid_at && (
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      Pago em: {new Date(r.payment_paid_at).toLocaleString('pt-BR')}
                    </Typography>
                  )}
                </Box>
              </DialogContent>
              <DialogActions sx={{ borderTop: `1px solid ${border}`, p: 2, gap: 1 }}>
                {r.agent?.pix_key && (
                  <Button size="small" variant="outlined" sx={{ borderColor: '#888', color: '#888' }}
                    onClick={() => { setPixForm({ pix_key: r.agent.pix_key || '', pix_key_type: r.agent.pix_key_type || 'CPF' }); setPixDialog({ open: true, agent: r.agent }); }}>
                    Editar PIX
                  </Button>
                )}
                {r.payment_status === 'pending_approval' && (
                  <Button variant="contained" sx={{ bgcolor: gold, color: '#000', '&:hover': { bgcolor: '#FFC107' } }}
                    onClick={() => doAction('approve_payment', r.id)}>
                    <CheckCircle sx={{ mr: 0.5, fontSize: 18 }} /> Aprovar Pagamento
                  </Button>
                )}
                {r.payment_status === 'approved' && (
                  <Button variant="contained" sx={{ bgcolor: '#66BB6A', '&:hover': { bgcolor: '#4CAF50' } }}
                    onClick={() => setActionDialog({ open: true, action: 'mark_paid', ref: r })}>
                    <Payment sx={{ mr: 0.5, fontSize: 18 }} /> Marcar como Pago
                  </Button>
                )}
                {['pending_approval', 'approved'].includes(r.payment_status) && (
                  <Button size="small" variant="outlined" color="error"
                    onClick={() => doAction('cancel_payment', r.id)}>
                    Cancelar Pagamento
                  </Button>
                )}
                <Button onClick={() => setDetailOpen(false)} sx={{ color: '#888' }}>Fechar</Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>

      {/* Mark Paid Dialog */}
      <Dialog open={actionDialog.open} onClose={() => setActionDialog({ open: false, action: '', ref: null })}
        PaperProps={{ sx: { bgcolor: '#1a1a1a', color: '#E8E3D5', border: `1px solid ${gold}40` } }}>
        <DialogTitle sx={{ color: gold }}>Marcar como Pago</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#aaa', mb: 2 }}>
            Informe a referência do comprovante de pagamento (ID da transação, protocolo, etc.)
          </Typography>
          <TextField fullWidth label="Referência / Comprovante" value={actionInput} onChange={e => setActionInput(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { color: '#E8E3D5', '& fieldset': { borderColor: border } }, '& .MuiInputLabel-root': { color: '#888' } }} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setActionDialog({ open: false, action: '', ref: null })} sx={{ color: '#888' }}>Cancelar</Button>
          <Button variant="contained" disabled={!actionInput.trim() || saving}
            sx={{ bgcolor: '#66BB6A', '&:hover': { bgcolor: '#4CAF50' } }}
            onClick={() => doAction('mark_paid', actionDialog.ref?.id, { payment_ref: actionInput.trim() })}>
            {saving ? <CircularProgress size={20} /> : 'Confirmar Pagamento'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PIX Dialog */}
      <Dialog open={pixDialog.open} onClose={() => setPixDialog({ open: false, agent: null })}
        PaperProps={{ sx: { bgcolor: '#1a1a1a', color: '#E8E3D5', border: `1px solid ${gold}40` } }}>
        <DialogTitle sx={{ color: gold }}>
          {pixDialog.agent?.pix_key ? 'Editar' : 'Cadastrar'} Chave PIX — {pixDialog.agent?.name}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2, mt: 1 }}>
          <TextField select label="Tipo" value={pixForm.pix_key_type} onChange={e => setPixForm(f => ({ ...f, pix_key_type: e.target.value }))}
            sx={{ '& .MuiOutlinedInput-root': { color: '#E8E3D5', '& fieldset': { borderColor: border } }, '& .MuiInputLabel-root': { color: '#888' } }}>
            {PIX_TYPES.map(t => <MenuItem key={t} value={t} sx={{ color: '#000' }}>{t}</MenuItem>)}
          </TextField>
          <TextField label="Chave PIX" value={pixForm.pix_key} onChange={e => setPixForm(f => ({ ...f, pix_key: e.target.value }))}
            sx={{ '& .MuiOutlinedInput-root': { color: '#E8E3D5', '& fieldset': { borderColor: border } }, '& .MuiInputLabel-root': { color: '#888' } }} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPixDialog({ open: false, agent: null })} sx={{ color: '#888' }}>Cancelar</Button>
          <Button variant="contained" disabled={!pixForm.pix_key.trim() || saving}
            sx={{ bgcolor: gold, color: '#000', '&:hover': { bgcolor: '#FFC107' } }}
            onClick={savePix}>
            {saving ? <CircularProgress size={20} /> : 'Salvar PIX'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
