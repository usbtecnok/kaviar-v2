import { useState, useEffect } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, Chip, Button, TextField, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Snackbar, Select, MenuItem, FormControl, InputLabel, IconButton, Tooltip, Drawer, Divider, Card, CardContent, Grid, Tabs, Tab } from '@mui/material';
import { Add, CheckCircle, LockReset, ContentCopy, AccountBalanceWallet, Close, Download } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const GOLD = '#B8942E';
const STATUS_MAP = { pending: { label: 'Pendente', color: 'warning' }, approved: { label: 'Aprovado', color: 'info' }, active: { label: 'Ativo', color: 'success' }, paused: { label: 'Pausado', color: 'default' }, blocked: { label: 'Bloqueado', color: 'error' } };
const WD_STATUS = { REQUESTED: { label: 'Solicitado', color: '#F59E0B' }, APPROVED: { label: 'Aprovado', color: '#3B82F6' }, PAID: { label: 'Pago', color: '#10B981' }, REJECTED: { label: 'Rejeitado', color: '#EF4444' } };

export default function CommerceAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', trade_name: '', category: 'outro', phone: '', email: '', address: '', crm_lead_id: '' });
  const [passwordResult, setPasswordResult] = useState(null);
  // Wallet drawer
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletAccount, setWalletAccount] = useState(null);
  const [walletData, setWalletData] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [walletTxs, setWalletTxs] = useState([]);
  // Finance tab
  const [mainTab, setMainTab] = useState(0);
  const [financeSummary, setFinanceSummary] = useState(null);
  const [financeAccounts, setFinanceAccounts] = useState([]);

  const adminData = localStorage.getItem('kaviar_admin_data');
  const admin = adminData ? JSON.parse(adminData) : null;
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';
  const token = localStorage.getItem('kaviar_admin_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchAccounts = async () => { setLoading(true); try { const res = await fetch(`${API_BASE_URL}/api/admin/commerce/accounts`, { headers }); const data = await res.json(); if (data.success) setAccounts(data.data); } catch {} setLoading(false); };
  const fetchFinance = async () => { try { const [sRes, aRes] = await Promise.all([fetch(`${API_BASE_URL}/api/admin/commerce/finance/summary`, { headers }), fetch(`${API_BASE_URL}/api/admin/commerce/finance/by-account`, { headers })]); const [s, a] = await Promise.all([sRes.json(), aRes.json()]); if (s.success) setFinanceSummary(s.data); if (a.success) setFinanceAccounts(a.data); } catch {} };
  useEffect(() => { fetchAccounts(); if (isSuperAdmin) fetchFinance(); }, []);

  const handleCreate = async () => { if (!form.name.trim()) return setSnack('Nome obrigatório'); const res = await fetch(`${API_BASE_URL}/api/admin/commerce/accounts`, { method: 'POST', headers, body: JSON.stringify(form) }); const data = await res.json(); if (data.success) { setCreateOpen(false); fetchAccounts(); setSnack('Comércio criado!'); setForm({ name: '', trade_name: '', category: 'outro', phone: '', email: '', address: '', crm_lead_id: '' }); } else setSnack(data.error || 'Erro'); };
  const handleActivate = async (id) => { if (!window.confirm('Ativar este comércio?')) return; const res = await fetch(`${API_BASE_URL}/api/admin/commerce/accounts/${id}/activate`, { method: 'POST', headers }); const data = await res.json(); if (data.success) { setPasswordResult({ email: data.data.user?.email, temp_password: data.data.temp_password, action: 'ativação' }); fetchAccounts(); } else setSnack(data.error || 'Erro'); };
  const handleResetPassword = async (id) => { if (!window.confirm('Gerar nova senha?')) return; const res = await fetch(`${API_BASE_URL}/api/admin/commerce/accounts/${id}/reset-password`, { method: 'POST', headers }); const data = await res.json(); if (data.success) setPasswordResult({ email: data.data.email, temp_password: data.data.temp_password, action: 'reset' }); else setSnack(data.error || 'Erro'); };
  const copyToClipboard = (text) => { navigator.clipboard.writeText(text).then(() => setSnack('Copiado!')); };

  const openWallet = async (account) => {
    setWalletAccount(account);
    setWalletOpen(true);
    // Fetch wallet details via admin account detail
    try {
      const [accRes, wdRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/commerce/accounts/${account.id}`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/commerce/withdrawals?status=`, { headers }),
      ]);
      const accData = await accRes.json();
      const wdData = await wdRes.json();
      if (accData.success) setWalletData(accData.data);
      if (wdData.success) setWithdrawals(wdData.data.filter(w => w.commerce_account_id === account.id));
    } catch {}
  };

  const handleWithdrawalAction = async (wdId, action) => {
    if (action === 'pay' && !window.confirm('Confirme somente depois de realizar o Pix/transferência manual para o comércio. Esta ação debitará o saldo disponível.')) return;
    const res = await fetch(`${API_BASE_URL}/api/admin/commerce/withdrawals/${wdId}`, { method: 'PATCH', headers, body: JSON.stringify({ action }) });
    const data = await res.json();
    if (data.success) { setSnack(action === 'approve' ? 'Aprovado!' : action === 'pay' ? 'Marcado como pago!' : 'Rejeitado'); openWallet(walletAccount); }
    else setSnack(data.error || 'Erro');
  };

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ color: GOLD, fontWeight: 800 }}>🏪 Comércios Locais</Typography>
        {isSuperAdmin && <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setCreateOpen(true)} sx={{ bgcolor: GOLD, textTransform: 'none' }}>Novo Comércio</Button>}
      </Box>

      {isSuperAdmin && <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)} sx={{ mb: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}>
        <Tab label="Comércios" />
        <Tab label="Financeiro" />
      </Tabs>}

      {/* Comércios Tab */}
      {(mainTab === 0 || !isSuperAdmin) && (<>
      {loading ? <CircularProgress sx={{ color: GOLD }} /> : (
        <Table size="small">
          <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 11, color: '#6B7280', textTransform: 'uppercase' } }}>
            <TableCell>Nome</TableCell><TableCell>Categoria</TableCell><TableCell>Email</TableCell><TableCell>Status</TableCell><TableCell>Ações</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {accounts.map(a => (
              <TableRow key={a.id} hover>
                <TableCell><Typography sx={{ fontWeight: 600, fontSize: 13 }}>{a.name}</Typography>{a.trade_name && <Typography sx={{ fontSize: 11, color: '#6B7280' }}>{a.trade_name}</Typography>}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{a.category}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{a.email || '—'}</TableCell>
                <TableCell><Chip label={STATUS_MAP[a.status]?.label || a.status} color={STATUS_MAP[a.status]?.color || 'default'} size="small" /></TableCell>
                <TableCell>
                  {isSuperAdmin && a.status === 'pending' && <Button size="small" startIcon={<CheckCircle />} onClick={() => handleActivate(a.id)} sx={{ textTransform: 'none', color: '#10B981' }}>Ativar</Button>}
                  {isSuperAdmin && a.status === 'active' && <>
                    <Tooltip title="Carteira / Saques"><IconButton size="small" onClick={() => openWallet(a)} sx={{ color: GOLD }}><AccountBalanceWallet sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                    <Tooltip title="Resetar senha"><IconButton size="small" onClick={() => handleResetPassword(a.id)} sx={{ color: '#6B7280' }}><LockReset sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                  </>}
                </TableCell>
              </TableRow>
            ))}
            {accounts.length === 0 && <TableRow><TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: '#9CA3AF' }}>Nenhum comércio</TableCell></TableRow>}
          </TableBody>
        </Table>
      )}
      </>)}

      {/* Finance Tab */}
      {mainTab === 1 && isSuperAdmin && (
        <Box>
          {financeSummary && (
            <Grid container spacing={1} sx={{ mb: 3 }}>
              {[
                ['Total Vendido', financeSummary.total_sold, '#111'],
                ['Comissão KAVIAR', financeSummary.kaviar_commission, GOLD],
                ['Pendente', financeSummary.pending_balance, '#F59E0B'],
                ['Disponível', financeSummary.available_balance, '#10B981'],
                ['Sacado', financeSummary.total_withdrawn, '#6B7280'],
                ['Saques Solicit.', financeSummary.withdrawals_requested, '#F59E0B', true],
                ['Saques Aprov.', financeSummary.withdrawals_approved, '#3B82F6', true],
                ['Saques Pagos', financeSummary.withdrawals_paid, '#10B981', true],
              ].map(([label, val, color, isCount]) => (
                <Grid item xs={6} sm={3} key={label}><Card><CardContent sx={{ py: 1, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase' }}>{label}</Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 800, color }}>{isCount ? val : `R$ ${(val / 100).toFixed(2)}`}</Typography>
                </CardContent></Card></Grid>
              ))}
            </Grid>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Button size="small" startIcon={<Download />} sx={{ textTransform: 'none', color: '#6B7280' }} onClick={async () => {
              const res = await fetch(`${API_BASE_URL}/api/admin/commerce/finance/export`, { headers });
              if (!res.ok) return setSnack('Erro');
              const blob = await res.blob(); const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `financeiro_comercios.csv`; a.click();
            }}>CSV</Button>
          </Box>
          <Table size="small">
            <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 10, color: '#6B7280', textTransform: 'uppercase' } }}>
              <TableCell>Comércio</TableCell><TableCell>Vendido</TableCell><TableCell>Comissão</TableCell><TableCell>Pendente</TableCell><TableCell>Disponível</TableCell><TableCell>Sacado</TableCell><TableCell>Saques</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {financeAccounts.map(a => (
                <TableRow key={a.id} hover>
                  <TableCell><Typography sx={{ fontWeight: 600, fontSize: 12 }}>{a.name}</Typography><Typography sx={{ fontSize: 10, color: '#6B7280' }}>{a.category}</Typography></TableCell>
                  <TableCell sx={{ fontSize: 12 }}>R$ {(a.total_sold / 100).toFixed(2)}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: GOLD }}>R$ {(a.kaviar_commission / 100).toFixed(2)}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>R$ {(a.pending_balance / 100).toFixed(2)}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: '#10B981' }}>R$ {(a.available_balance / 100).toFixed(2)}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>R$ {(a.total_withdrawn / 100).toFixed(2)}</TableCell>
                  <TableCell>{a.withdrawals_open > 0 && <Chip label={a.withdrawals_open} size="small" color="warning" sx={{ fontSize: 10 }} />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Wallet Drawer */}
      <Drawer anchor="right" open={walletOpen} onClose={() => setWalletOpen(false)} PaperProps={{ sx: { width: { xs: '100%', md: 520 }, p: 3 } }}>
        {walletAccount && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>💰 {walletAccount.name}</Typography>
              <IconButton onClick={() => setWalletOpen(false)}><Close /></IconButton>
            </Box>

            {walletData?.wallet ? (
              <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item xs={6}><Card><CardContent sx={{ py: 1, textAlign: 'center' }}><Typography sx={{ fontSize: 10, color: '#6B7280' }}>Disponível</Typography><Typography sx={{ fontSize: 18, fontWeight: 800, color: '#10B981' }}>R$ {((walletData.wallet?.available_balance_cents || 0) / 100).toFixed(2)}</Typography></CardContent></Card></Grid>
                <Grid item xs={6}><Card><CardContent sx={{ py: 1, textAlign: 'center' }}><Typography sx={{ fontSize: 10, color: '#6B7280' }}>Pendente</Typography><Typography sx={{ fontSize: 18, fontWeight: 800, color: '#F59E0B' }}>R$ {((walletData.wallet?.pending_balance_cents || 0) / 100).toFixed(2)}</Typography></CardContent></Card></Grid>
                <Grid item xs={6}><Card><CardContent sx={{ py: 1, textAlign: 'center' }}><Typography sx={{ fontSize: 10, color: '#6B7280' }}>Total Recebido</Typography><Typography sx={{ fontSize: 16, fontWeight: 700 }}>R$ {((walletData.wallet?.total_received_cents || 0) / 100).toFixed(2)}</Typography></CardContent></Card></Grid>
                <Grid item xs={6}><Card><CardContent sx={{ py: 1, textAlign: 'center' }}><Typography sx={{ fontSize: 10, color: '#6B7280' }}>Total Sacado</Typography><Typography sx={{ fontSize: 16, fontWeight: 700, color: '#6B7280' }}>R$ {((walletData.wallet?.total_withdrawn_cents || 0) / 100).toFixed(2)}</Typography></CardContent></Card></Grid>
              </Grid>
            ) : <Alert severity="info" sx={{ mb: 2, fontSize: 12 }}>Carteira ainda não criada (nenhum pagamento recebido)</Alert>}

            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1 }}>Solicitações de Saque</Typography>
            {withdrawals.length === 0 ? <Typography sx={{ color: '#9CA3AF', fontSize: 12 }}>Nenhuma solicitação</Typography> : withdrawals.map(w => (
              <Box key={w.id} sx={{ p: 1.5, mb: 1, bgcolor: '#F9FAFB', borderRadius: 1, border: '1px solid #E5E7EB' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }}>R$ {(w.amount_cents / 100).toFixed(2)}</Typography>
                  <Chip label={WD_STATUS[w.status]?.label || w.status} size="small" sx={{ bgcolor: `${WD_STATUS[w.status]?.color || '#6B7280'}15`, color: WD_STATUS[w.status]?.color, fontWeight: 600 }} />
                </Box>
                <Typography sx={{ fontSize: 11, color: '#6B7280' }}>{new Date(w.requested_at).toLocaleString('pt-BR')}</Typography>
                {w.receiver_name && <Typography sx={{ fontSize: 11, color: '#374151' }}>Recebedor: {w.receiver_name}</Typography>}
                {isSuperAdmin && w.pix_key && <Typography sx={{ fontSize: 11, color: '#374151' }}>Pix ({w.pix_key_type}): {w.pix_key}</Typography>}
                <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                  {w.status === 'REQUESTED' && isSuperAdmin && <>
                    <Button size="small" variant="contained" onClick={() => handleWithdrawalAction(w.id, 'approve')} sx={{ bgcolor: '#3B82F6', textTransform: 'none', fontSize: 11 }}>Aprovar</Button>
                    <Button size="small" onClick={() => handleWithdrawalAction(w.id, 'reject')} sx={{ color: '#EF4444', textTransform: 'none', fontSize: 11 }}>Rejeitar</Button>
                  </>}
                  {w.status === 'APPROVED' && isSuperAdmin && <Button size="small" variant="contained" onClick={() => handleWithdrawalAction(w.id, 'pay')} sx={{ bgcolor: '#10B981', textTransform: 'none', fontSize: 11 }}>💸 Marcar como Pago</Button>}
                </Box>
              </Box>
            ))}

            {walletAccount.payout_pix_key && <>
              <Divider sx={{ my: 2 }} />
              <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 0.5 }}>Dados Pix do Comércio</Typography>
              <Typography sx={{ fontSize: 12, color: '#374151' }}>Tipo: {walletAccount.payout_pix_key_type} • Chave: {walletAccount.payout_pix_key}</Typography>
              {walletAccount.payout_receiver_name && <Typography sx={{ fontSize: 12, color: '#374151' }}>Nome: {walletAccount.payout_receiver_name}</Typography>}
            </>}
          </Box>
        )}
      </Drawer>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Novo Comércio</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="Nome *" size="small" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <TextField label="Nome Fantasia" size="small" value={form.trade_name} onChange={e => setForm(f => ({ ...f, trade_name: e.target.value }))} />
          <FormControl size="small"><InputLabel>Categoria</InputLabel><Select value={form.category} label="Categoria" onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {['padaria','restaurante','pizzaria','lanchonete','mercado','farmacia','pet_shop','salao','oficina','loja','bar','outro'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select></FormControl>
          <Box sx={{ display: 'flex', gap: 1 }}><TextField label="Telefone" size="small" fullWidth value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /><TextField label="Email" size="small" fullWidth value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Box>
          <TextField label="Endereço" size="small" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          <TextField label="CRM Lead ID (opcional)" size="small" value={form.crm_lead_id} onChange={e => setForm(f => ({ ...f, crm_lead_id: e.target.value }))} placeholder="UUID do lead no CRM" />
        </DialogContent>
        <DialogActions><Button onClick={() => setCreateOpen(false)}>Cancelar</Button><Button variant="contained" onClick={handleCreate} sx={{ bgcolor: GOLD }}>Criar</Button></DialogActions>
      </Dialog>

      {/* Password Result */}
      <Dialog open={!!passwordResult} onClose={() => setPasswordResult(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#10B981' }}>{passwordResult?.action === 'reset' ? '🔒 Senha Resetada' : '✅ Comércio Ativado'}</DialogTitle>
        <DialogContent>{passwordResult && <><Alert severity="warning" sx={{ mb: 2, fontWeight: 600 }}>⚠️ Esta senha aparece APENAS UMA VEZ.</Alert><Box sx={{ bgcolor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 2, p: 2 }}><Typography sx={{ fontSize: 12, color: '#6B7280', mb: 0.5 }}>Login:</Typography><Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}><Typography sx={{ fontWeight: 600 }}>{passwordResult.email}</Typography><IconButton size="small" onClick={() => copyToClipboard(passwordResult.email)}><ContentCopy sx={{ fontSize: 14 }} /></IconButton></Box><Typography sx={{ fontSize: 12, color: '#6B7280', mb: 0.5 }}>Senha:</Typography><Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Typography sx={{ fontWeight: 800, fontSize: 20, fontFamily: 'monospace' }}>{passwordResult.temp_password}</Typography><IconButton size="small" onClick={() => copyToClipboard(passwordResult.temp_password)}><ContentCopy sx={{ fontSize: 14 }} /></IconButton></Box></Box><Button fullWidth variant="outlined" size="small" sx={{ mt: 2, textTransform: 'none' }} onClick={() => copyToClipboard(`Login: ${passwordResult.email}\nSenha: ${passwordResult.temp_password}`)}>📋 Copiar tudo</Button></>}</DialogContent>
        <DialogActions><Button onClick={() => setPasswordResult(null)} variant="contained" sx={{ bgcolor: GOLD }}>Fechar</Button></DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}
