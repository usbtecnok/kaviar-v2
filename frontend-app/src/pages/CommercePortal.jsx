import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Table, TableBody, TableCell, TableHead, TableRow, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Snackbar, Switch, CircularProgress, Card, CardContent, IconButton, Tabs, Tab, Grid } from '@mui/material';
import { Add, Edit, Delete, ContentCopy, PhotoCamera, Close } from '@mui/icons-material';
import { API_BASE_URL } from '../config/api';
import { formatDate } from '../utils/formatDate';

const GOLD = '#B8942E';
const ORDER_STATUS = { PENDING: { label: 'Novo', color: '#3B82F6' }, ACCEPTED: { label: 'Aceito', color: '#8B5CF6' }, PREPARING: { label: 'Preparando', color: '#F59E0B' }, READY: { label: 'Pronto', color: '#10B981' }, CANCELED: { label: 'Cancelado', color: '#EF4444' }, COMPLETED: { label: 'Concluído', color: '#6B7280' } };

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('');
  const handleSubmit = async (e) => { e.preventDefault(); setError(''); const res = await fetch(`${API_BASE_URL}/api/commerce/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }); const data = await res.json(); if (data.success) { localStorage.setItem('kaviar_commerce_token', data.token); localStorage.setItem('kaviar_commerce_data', JSON.stringify(data)); onLogin(data); } else setError(data.error || 'Erro'); };
  return (<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#FAFAF8' }}><Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}><CardContent sx={{ p: 4 }}><Typography variant="h5" sx={{ fontWeight: 800, color: GOLD, mb: 3, textAlign: 'center' }}>🏪 Portal do Comércio</Typography>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}<form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}><TextField label="Email" type="email" size="small" value={email} onChange={e => setEmail(e.target.value)} required /><TextField label="Senha" type="password" size="small" value={password} onChange={e => setPassword(e.target.value)} required /><Button type="submit" variant="contained" sx={{ bgcolor: GOLD }}>Entrar</Button></form></CardContent></Card></Box>);
}

function ChangePasswordForm({ onDone, token }) {
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState(''); const [error, setError] = useState('');
  const handle = async () => { if (pw.length < 6) return setError('Mínimo 6 caracteres'); if (pw !== pw2) return setError('Senhas não conferem'); const res = await fetch(`${API_BASE_URL}/api/commerce/auth/change-password`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ new_password: pw }) }); const data = await res.json(); if (data.success) onDone(); else setError(data.error || 'Erro'); };
  return (<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#FAFAF8' }}><Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}><CardContent sx={{ p: 4 }}><Typography variant="h6" sx={{ fontWeight: 700, color: GOLD, mb: 1 }}>🔒 Trocar Senha</Typography><Alert severity="info" sx={{ mb: 2 }}>Defina uma nova senha para continuar.</Alert>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}><TextField label="Nova Senha" type="password" size="small" value={pw} onChange={e => setPw(e.target.value)} /><TextField label="Confirmar" type="password" size="small" value={pw2} onChange={e => setPw2(e.target.value)} /><Button variant="contained" onClick={handle} sx={{ bgcolor: GOLD }}>Salvar</Button></Box></CardContent></Card></Box>);
}

export default function CommercePortal() {
  const [authed, setAuthed] = useState(false);
  const [mustChange, setMustChange] = useState(false);
  const [account, setAccount] = useState(null);
  const [tab, setTab] = useState(0);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [walletTxs, setWalletTxs] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: '', price_cents: '', stock_quantity: '', is_restricted: false });
  const [editId, setEditId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);

  const token = localStorage.getItem('kaviar_commerce_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => { const stored = localStorage.getItem('kaviar_commerce_data'); if (token && stored) { const d = JSON.parse(stored); setAuthed(true); setMustChange(d.user?.must_change_password); setAccount(d.account); } else setLoading(false); }, []);
  useEffect(() => { if (authed && !mustChange) { fetchProducts(); fetchOrders(); fetchWallet(); } }, [authed, mustChange]);

  const fetchProducts = async () => { setLoading(true); try { const res = await fetch(`${API_BASE_URL}/api/commerce/products`, { headers }); const data = await res.json(); if (data.success) setProducts(data.data); } catch {} setLoading(false); };
  const fetchOrders = async () => { try { const res = await fetch(`${API_BASE_URL}/api/commerce/orders`, { headers }); const data = await res.json(); if (data.success) setOrders(data.data); } catch {} };
  const fetchWallet = async () => { try { const [wRes, tRes, wdRes] = await Promise.all([fetch(`${API_BASE_URL}/api/commerce/wallet`, { headers }), fetch(`${API_BASE_URL}/api/commerce/wallet/transactions`, { headers }), fetch(`${API_BASE_URL}/api/commerce/withdrawals`, { headers })]); const [w, t, wd] = await Promise.all([wRes.json(), tRes.json(), wdRes.json()]); if (w.success) setWallet(w.data); if (t.success) setWalletTxs(t.data); if (wd.success) setWithdrawals(wd.data); } catch {} };

  const handleLogin = (data) => { setAuthed(true); setAccount(data.account); setMustChange(data.user?.must_change_password); };
  const handlePasswordChanged = () => { setMustChange(false); const d = JSON.parse(localStorage.getItem('kaviar_commerce_data') || '{}'); d.user.must_change_password = false; localStorage.setItem('kaviar_commerce_data', JSON.stringify(d)); };

  const openNew = () => { setEditId(null); setForm({ name: '', description: '', category: '', price_cents: '', stock_quantity: '', is_restricted: false }); setImageFile(null); setImagePreview(null); setEditOpen(true); };
  const openEdit = (p) => { setEditId(p.id); setForm({ name: p.name, description: p.description || '', category: p.category || '', price_cents: String(p.price_cents), stock_quantity: p.stock_quantity != null ? String(p.stock_quantity) : '', is_restricted: p.is_restricted }); setImageFile(null); setImagePreview(p.image_url || null); setEditOpen(true); };
  const handleSave = async () => {
    if (!form.name || !form.price_cents) return setSnack('Nome e preço obrigatórios');
    const body = { ...form, price_cents: parseInt(form.price_cents), stock_quantity: form.stock_quantity ? parseInt(form.stock_quantity) : null };
    const url = editId ? `${API_BASE_URL}/api/commerce/products/${editId}` : `${API_BASE_URL}/api/commerce/products`;
    const res = await fetch(url, { method: editId ? 'PATCH' : 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.success) {
      const productId = data.data.id;
      if (imageFile) {
        setImageUploading(true);
        const fd = new FormData();
        fd.append('image', imageFile);
        await fetch(`${API_BASE_URL}/api/commerce/products/${productId}/image`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        setImageUploading(false);
      }
      setEditOpen(false); fetchProducts(); setSnack(editId ? 'Atualizado!' : 'Criado!');
    } else setSnack(data.error || 'Erro');
  };
  const handleRemoveImage = async () => {
    if (!editId) return;
    setImageUploading(true);
    const res = await fetch(`${API_BASE_URL}/api/commerce/products/${editId}/image`, { method: 'DELETE', headers });
    const data = await res.json();
    if (data.success) { setImagePreview(null); setSnack('Foto removida'); fetchProducts(); }
    else setSnack(data.error || 'Erro');
    setImageUploading(false);
  };
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setSnack('Apenas JPG, PNG ou WebP');
    if (file.size > 5 * 1024 * 1024) return setSnack('Máximo 5MB');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };
  const toggleAvailability = async (id) => { const res = await fetch(`${API_BASE_URL}/api/commerce/products/${id}/availability`, { method: 'PATCH', headers }); const data = await res.json(); if (data.success) fetchProducts(); else setSnack(data.error || 'Erro'); };
  const deleteProduct = async (id) => { if (!window.confirm('Remover?')) return; await fetch(`${API_BASE_URL}/api/commerce/products/${id}`, { method: 'DELETE', headers }); fetchProducts(); };

  const updateOrderStatus = async (id, status) => {
    const res = await fetch(`${API_BASE_URL}/api/commerce/orders/${id}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status }) });
    const data = await res.json();
    if (data.success) { fetchOrders(); setSnack(`Pedido ${ORDER_STATUS[status]?.label || status}!`); }
    else setSnack(data.error || 'Erro');
  };

  const logout = () => { localStorage.removeItem('kaviar_commerce_token'); localStorage.removeItem('kaviar_commerce_data'); setAuthed(false); };
  if (!authed) return <LoginForm onLogin={handleLogin} />;
  if (mustChange) return <ChangePasswordForm onDone={handlePasswordChanged} token={token} />;

  const storeUrl = account?.slug ? `${window.location.origin}/comercio/${account.slug}` : null;
  const pendingOrders = orders.filter(o => o.status === 'PENDING').length;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FAFAF8', p: 3 }}>
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: GOLD }}>🏪 {account?.name || 'Meu Comércio'}</Typography>
          <Button size="small" onClick={logout} sx={{ color: '#6B7280', textTransform: 'none' }}>Sair</Button>
        </Box>
        {storeUrl && <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}><Typography sx={{ fontSize: 12, color: '#6B7280' }}>Link público:</Typography><Typography sx={{ fontSize: 12, color: GOLD, fontWeight: 600 }}>{storeUrl}</Typography><IconButton size="small" onClick={() => { navigator.clipboard.writeText(storeUrl); setSnack('Link copiado!'); }}><ContentCopy sx={{ fontSize: 14 }} /></IconButton></Box>}

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}>
          <Tab label={`Produtos (${products.length})`} />
          <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>Pedidos {pendingOrders > 0 && <Chip label={pendingOrders} size="small" color="error" sx={{ height: 18, fontSize: 10 }} />}</Box>} />
          <Tab label="Carteira" />
        </Tabs>

        {/* Products Tab */}
        {tab === 0 && (<>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}><Button size="small" variant="contained" startIcon={<Add />} onClick={openNew} sx={{ bgcolor: GOLD, textTransform: 'none' }}>Produto</Button></Box>
          {loading ? <CircularProgress sx={{ color: GOLD }} /> : (
            <Table size="small"><TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 11, color: '#6B7280', textTransform: 'uppercase' } }}><TableCell>Produto</TableCell><TableCell>Preço</TableCell><TableCell>Estoque</TableCell><TableCell>Status</TableCell><TableCell>Ações</TableCell></TableRow></TableHead><TableBody>
              {products.map(p => (<TableRow key={p.id} hover><TableCell><Typography sx={{ fontWeight: 600, fontSize: 13 }}>{p.name}</Typography></TableCell><TableCell sx={{ fontWeight: 600 }}>R$ {(p.price_cents / 100).toFixed(2)}</TableCell><TableCell>{p.stock_quantity != null ? p.stock_quantity : '—'}</TableCell><TableCell>{p.is_restricted ? <Chip label="Restrito" size="small" color="error" /> : p.is_available ? <Chip label="Disponível" size="small" color="success" /> : <Chip label="Indisponível" size="small" />}</TableCell><TableCell>{!p.is_restricted && <Switch size="small" checked={p.is_available} onChange={() => toggleAvailability(p.id)} />}<IconButton size="small" onClick={() => openEdit(p)}><Edit sx={{ fontSize: 16 }} /></IconButton><IconButton size="small" onClick={() => deleteProduct(p.id)} sx={{ color: '#EF4444' }}><Delete sx={{ fontSize: 16 }} /></IconButton></TableCell></TableRow>))}
              {products.length === 0 && <TableRow><TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: '#9CA3AF' }}>Nenhum produto</TableCell></TableRow>}
            </TableBody></Table>
          )}
        </>)}

        {/* Orders Tab */}
        {tab === 1 && (
          <Box>
            {orders.length === 0 ? <Typography sx={{ textAlign: 'center', py: 4, color: '#9CA3AF' }}>Nenhum pedido ainda</Typography> : orders.map(o => (
              <Card key={o.id} sx={{ mb: 2, border: o.status === 'PENDING' ? '2px solid #3B82F6' : '1px solid #E5E7EB' }}>
                <CardContent sx={{ py: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{o.customer_name}</Typography>
                      <Typography sx={{ fontSize: 12, color: '#6B7280' }}>{o.customer_phone} • {formatDate(o.created_at, { showTime: true })}</Typography>
                    </Box>
                    <Chip label={ORDER_STATUS[o.status]?.label || o.status} size="small" sx={{ bgcolor: `${ORDER_STATUS[o.status]?.color || '#6B7280'}20`, color: ORDER_STATUS[o.status]?.color, fontWeight: 600 }} />
                  </Box>
                  <Box sx={{ bgcolor: '#F9FAFB', p: 1, borderRadius: 1, mb: 1 }}>
                    {o.items?.map(i => <Typography key={i.id} sx={{ fontSize: 12 }}>{i.quantity}× {i.product_name} — R$ {(i.total_cents / 100).toFixed(2)}{i.notes ? ` (${i.notes})` : ''}</Typography>)}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 13 }}>Total: R$ {(o.total_cents / 100).toFixed(2)}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {o.status === 'PENDING' && <><Button size="small" variant="contained" onClick={() => updateOrderStatus(o.id, 'ACCEPTED')} sx={{ bgcolor: '#8B5CF6', textTransform: 'none', fontSize: 11 }}>Aceitar</Button><Button size="small" onClick={() => updateOrderStatus(o.id, 'CANCELED')} sx={{ color: '#EF4444', textTransform: 'none', fontSize: 11 }}>Recusar</Button></>}
                      {o.status === 'ACCEPTED' && <Button size="small" variant="contained" onClick={() => updateOrderStatus(o.id, 'PREPARING')} sx={{ bgcolor: '#F59E0B', textTransform: 'none', fontSize: 11 }}>Preparando</Button>}
                      {o.status === 'PREPARING' && <Button size="small" variant="contained" onClick={() => updateOrderStatus(o.id, 'READY')} sx={{ bgcolor: '#10B981', textTransform: 'none', fontSize: 11 }}>Pronto!</Button>}
                      {o.status === 'READY' && o.delivery_type === 'pickup' && <Button size="small" variant="contained" onClick={() => updateOrderStatus(o.id, 'COMPLETED')} sx={{ bgcolor: '#6B7280', textTransform: 'none', fontSize: 11 }}>Concluir</Button>}
                      {o.status === 'READY' && o.delivery_type === 'delivery' && o.delivery_status === 'none' && <Button size="small" variant="contained" onClick={async () => { const res = await fetch(`${API_BASE_URL}/api/commerce/orders/${o.id}/request-delivery`, { method: 'POST', headers }); const d = await res.json(); if (d.success) { fetchOrders(); setSnack('Entrega solicitada! Aguardando motociclista.'); } else if (d.error === 'MOTO_EXPRESS_UNAVAILABLE') { setSnack('Entrega por moto indisponível agora. Tente novamente em alguns minutos.'); } else setSnack(d.error || 'Erro ao solicitar entrega'); }} sx={{ bgcolor: '#059669', textTransform: 'none', fontSize: 11 }}>🏍️ Solicitar Moto Express</Button>}
                      {o.delivery_status === 'requested' && <Chip label="⏳ Aguardando motociclista" size="small" color="warning" sx={{ fontSize: 10 }} />}
                      {o.delivery_status === 'assigned' && <Chip label={`Motorista: ${o.driver_name}`} size="small" color="success" sx={{ fontSize: 10 }} />}
                    </Box>
                  </Box>
                  {o.notes && <Typography sx={{ fontSize: 11, color: '#6B7280', mt: 0.5, fontStyle: 'italic' }}>Obs: {o.notes}</Typography>}
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* Wallet Tab */}
        {tab === 2 && (
          <Box>
            {wallet && (
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}><Card><CardContent sx={{ textAlign: 'center', py: 1.5 }}><Typography sx={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase' }}>Disponível</Typography><Typography sx={{ fontSize: 20, fontWeight: 800, color: '#10B981' }}>R$ {(wallet.available_balance_cents / 100).toFixed(2)}</Typography></CardContent></Card></Grid>
                <Grid item xs={6} sm={3}><Card><CardContent sx={{ textAlign: 'center', py: 1.5 }}><Typography sx={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase' }}>Pendente</Typography><Typography sx={{ fontSize: 20, fontWeight: 800, color: '#F59E0B' }}>R$ {(wallet.pending_balance_cents / 100).toFixed(2)}</Typography></CardContent></Card></Grid>
                <Grid item xs={6} sm={3}><Card><CardContent sx={{ textAlign: 'center', py: 1.5 }}><Typography sx={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase' }}>Total Recebido</Typography><Typography sx={{ fontSize: 20, fontWeight: 800 }}>R$ {(wallet.total_received_cents / 100).toFixed(2)}</Typography></CardContent></Card></Grid>
                <Grid item xs={6} sm={3}><Card><CardContent sx={{ textAlign: 'center', py: 1.5 }}><Typography sx={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase' }}>Sacado</Typography><Typography sx={{ fontSize: 20, fontWeight: 800, color: '#6B7280' }}>R$ {(wallet.total_withdrawn_cents / 100).toFixed(2)}</Typography></CardContent></Card></Grid>
              </Grid>
            )}
            <Button size="small" variant="contained" sx={{ bgcolor: GOLD, textTransform: 'none', mb: 2 }} onClick={async () => {
              const input = prompt('Valor do saque (R$):\nEx: 10,80');
              if (!input) return;
              const parsed = parseFloat(input.replace(',', '.'));
              if (isNaN(parsed) || parsed <= 0) return setSnack('Valor inválido');
              const amount_cents = Math.round(parsed * 100);
              if (amount_cents > (wallet?.available_balance_cents || 0)) return setSnack(`Saldo insuficiente. Disponível: R$ ${((wallet?.available_balance_cents || 0) / 100).toFixed(2)}`);
              if (!window.confirm(`Confirmar saque de R$ ${(amount_cents / 100).toFixed(2)}?`)) return;
              const res = await fetch(`${API_BASE_URL}/api/commerce/withdrawals`, { method: 'POST', headers, body: JSON.stringify({ amount_cents }) });
              const data = await res.json();
              if (data.success) { setSnack('Saque solicitado!'); fetchWallet(); } else setSnack(data.error || 'Erro');
            }}>Solicitar Saque</Button>
            {withdrawals.length > 0 && <><Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1 }}>Solicitações de Saque</Typography>{withdrawals.map(w => <Box key={w.id} sx={{ p: 1, mb: 1, bgcolor: '#F9FAFB', borderRadius: 1, display: 'flex', justifyContent: 'space-between' }}><Typography sx={{ fontSize: 12 }}>R$ {(w.amount_cents / 100).toFixed(2)}</Typography><Chip label={w.status} size="small" sx={{ fontSize: 10 }} /></Box>)}</>}
            {walletTxs.length > 0 && <><Typography sx={{ fontWeight: 700, fontSize: 13, mt: 2, mb: 1 }}>Movimentações</Typography>{walletTxs.map(t => <Box key={t.id} sx={{ p: 1, mb: 0.5, bgcolor: '#F9FAFB', borderRadius: 1, display: 'flex', justifyContent: 'space-between' }}><Typography sx={{ fontSize: 11 }}>{t.type} — {t.description || ''}</Typography><Typography sx={{ fontSize: 11, fontWeight: 600, color: t.amount_cents >= 0 ? '#10B981' : '#EF4444' }}>{t.amount_cents >= 0 ? '+' : ''}{(t.amount_cents / 100).toFixed(2)}</Typography></Box>)}</>}
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button size="small" sx={{ textTransform: 'none', color: '#6B7280' }} onClick={() => window.print()}>🖨️ Imprimir</Button>
              <Button size="small" sx={{ textTransform: 'none', color: '#6B7280' }} onClick={() => {
                const code = `REL-KAV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(new Date().getHours()).padStart(2,'0')}${String(new Date().getMinutes()).padStart(2,'0')}`;
                const text = `📊 Relatório KAVIAR Comércio\n🏢 KAVIAR TECNOLOGIA E SERVICOS DIGITAIS LTDA\nCNPJ: 67.783.601/0001-99\nCódigo: ${code}\n🏪 ${account?.name || ''}\nEmitido: ${new Date().toLocaleString('pt-BR')}\n\n✅ Disponível: R$ ${((wallet?.available_balance_cents||0)/100).toFixed(2)}\n⏳ Pendente: R$ ${((wallet?.pending_balance_cents||0)/100).toFixed(2)}\n💰 Total recebido: R$ ${((wallet?.total_received_cents||0)/100).toFixed(2)}\n💸 Total sacado: R$ ${((wallet?.total_withdrawn_cents||0)/100).toFixed(2)}\n\nRelatório operacional KAVIAR.`;
                navigator.clipboard.writeText(text); setSnack('Resumo copiado!');
              }}>📋 Copiar</Button>
            </Box>
          </Box>
        )}
      </Box>

      {/* Product Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editId ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="Nome *" size="small" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <TextField label="Descrição" size="small" multiline rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <Box sx={{ display: 'flex', gap: 1 }}><TextField label="Categoria" size="small" fullWidth value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /><TextField label="Preço (centavos) *" size="small" fullWidth type="number" value={form.price_cents} onChange={e => setForm(f => ({ ...f, price_cents: e.target.value }))} helperText="1500 = R$15" /></Box>
          <TextField label="Estoque" size="small" type="number" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} />
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1, color: '#374151' }}>Foto do produto</Typography>
            {imagePreview && (
              <Box sx={{ position: 'relative', mb: 1, width: 120, height: 120, borderRadius: 1, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <IconButton size="small" onClick={() => { setImageFile(null); setImagePreview(null); }} sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}><Close sx={{ fontSize: 14 }} /></IconButton>
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button size="small" variant="outlined" component="label" startIcon={<PhotoCamera sx={{ fontSize: 16 }} />} sx={{ textTransform: 'none', fontSize: 12 }} disabled={imageUploading}>
                {imagePreview ? 'Trocar foto' : 'Escolher foto'}
                <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} />
              </Button>
              {editId && imagePreview && !imageFile && <Button size="small" color="error" onClick={handleRemoveImage} sx={{ textTransform: 'none', fontSize: 12 }} disabled={imageUploading}>Remover foto</Button>}
              {imageUploading && <CircularProgress size={16} sx={{ color: GOLD }} />}
            </Box>
            <Typography sx={{ fontSize: 11, color: '#9CA3AF', mt: 0.5 }}>JPG, PNG ou WebP • máx. 5MB</Typography>
          </Box>
          {form.is_restricted && <Alert severity="error">Produto restrito — não ficará disponível.</Alert>}
        </DialogContent>
        <DialogActions><Button onClick={() => setEditOpen(false)}>Cancelar</Button><Button variant="contained" onClick={handleSave} sx={{ bgcolor: GOLD }}>Salvar</Button></DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}
