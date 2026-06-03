import { useState, useEffect } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Chip, Button, TextField, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Snackbar, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { Add, CheckCircle, Store } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const GOLD = '#B8942E';
const STATUS_MAP = { pending: { label: 'Pendente', color: 'warning' }, approved: { label: 'Aprovado', color: 'info' }, active: { label: 'Ativo', color: 'success' }, paused: { label: 'Pausado', color: 'default' }, blocked: { label: 'Bloqueado', color: 'error' } };

export default function CommerceAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', trade_name: '', category: 'outro', phone: '', email: '', address: '', crm_lead_id: '' });
  const [activateResult, setActivateResult] = useState(null);

  const adminData = localStorage.getItem('kaviar_admin_data');
  const admin = adminData ? JSON.parse(adminData) : null;
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';
  const token = localStorage.getItem('kaviar_admin_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetch_ = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/commerce/accounts`, { headers });
      const data = await res.json();
      if (data.success) setAccounts(data.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return setSnack('Nome obrigatório');
    const res = await fetch(`${API_BASE_URL}/api/admin/commerce/accounts`, { method: 'POST', headers, body: JSON.stringify(form) });
    const data = await res.json();
    if (data.success) { setCreateOpen(false); fetch_(); setSnack('Comércio criado!'); setForm({ name: '', trade_name: '', category: 'outro', phone: '', email: '', address: '', crm_lead_id: '' }); }
    else setSnack(data.error || 'Erro');
  };

  const handleActivate = async (id) => {
    if (!window.confirm('Ativar este comércio? Uma senha temporária será gerada.')) return;
    const res = await fetch(`${API_BASE_URL}/api/admin/commerce/accounts/${id}/activate`, { method: 'POST', headers });
    const data = await res.json();
    if (data.success) { setActivateResult(data.data); fetch_(); setSnack('Comércio ativado!'); }
    else setSnack(data.error || 'Erro');
  };

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ color: GOLD, fontWeight: 800 }}>🏪 Comércios Locais</Typography>
        {isSuperAdmin && <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setCreateOpen(true)} sx={{ bgcolor: GOLD, textTransform: 'none' }}>Novo Comércio</Button>}
      </Box>

      {loading ? <CircularProgress sx={{ color: GOLD }} /> : (
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 11, color: '#6B7280', textTransform: 'uppercase' } }}>
              <TableCell>Nome</TableCell><TableCell>Categoria</TableCell><TableCell>Email</TableCell><TableCell>Status</TableCell><TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {accounts.map(a => (
              <TableRow key={a.id} hover>
                <TableCell><Typography sx={{ fontWeight: 600, fontSize: 13 }}>{a.name}</Typography>{a.trade_name && <Typography sx={{ fontSize: 11, color: '#6B7280' }}>{a.trade_name}</Typography>}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{a.category}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{a.email || '—'}</TableCell>
                <TableCell><Chip label={STATUS_MAP[a.status]?.label || a.status} color={STATUS_MAP[a.status]?.color || 'default'} size="small" /></TableCell>
                <TableCell>
                  {isSuperAdmin && a.status === 'pending' && <Button size="small" startIcon={<CheckCircle />} onClick={() => handleActivate(a.id)} sx={{ textTransform: 'none', color: '#10B981' }}>Ativar</Button>}
                </TableCell>
              </TableRow>
            ))}
            {accounts.length === 0 && <TableRow><TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: '#9CA3AF' }}>Nenhum comércio cadastrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Novo Comércio</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="Nome *" size="small" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <TextField label="Nome Fantasia" size="small" value={form.trade_name} onChange={e => setForm(f => ({ ...f, trade_name: e.target.value }))} />
          <FormControl size="small"><InputLabel>Categoria</InputLabel><Select value={form.category} label="Categoria" onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {['padaria','restaurante','pizzaria','lanchonete','mercado','farmacia','pet_shop','salao','oficina','loja','outro'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select></FormControl>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField label="Telefone" size="small" fullWidth value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <TextField label="Email" size="small" fullWidth value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </Box>
          <TextField label="Endereço" size="small" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          <TextField label="CRM Lead ID (opcional)" size="small" value={form.crm_lead_id} onChange={e => setForm(f => ({ ...f, crm_lead_id: e.target.value }))} placeholder="UUID do lead no CRM" />
        </DialogContent>
        <DialogActions><Button onClick={() => setCreateOpen(false)}>Cancelar</Button><Button variant="contained" onClick={handleCreate} sx={{ bgcolor: GOLD }}>Criar</Button></DialogActions>
      </Dialog>

      {/* Activate Result (temp password) */}
      <Dialog open={!!activateResult} onClose={() => setActivateResult(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#10B981' }}>✅ Comércio Ativado</DialogTitle>
        <DialogContent>
          {activateResult && <>
            <Alert severity="warning" sx={{ mb: 2 }}>A senha abaixo aparece APENAS UMA VEZ. Envie manualmente ao comércio.</Alert>
            <Typography sx={{ fontSize: 13, mb: 1 }}>Email: <strong>{activateResult.user?.email}</strong></Typography>
            <Typography sx={{ fontSize: 13, mb: 1 }}>Senha temporária: <strong style={{ fontFamily: 'monospace', fontSize: 16 }}>{activateResult.temp_password}</strong></Typography>
            <Typography sx={{ fontSize: 11, color: '#6B7280', mt: 1 }}>O comércio será obrigado a trocar a senha no primeiro acesso.</Typography>
          </>}
        </DialogContent>
        <DialogActions><Button onClick={() => setActivateResult(null)}>Fechar</Button></DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}
