import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Table, TableBody, TableCell, TableHead, TableRow, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Snackbar, Switch, CircularProgress, Card, CardContent, IconButton } from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { API_BASE_URL } from '../config/api';

const GOLD = '#B8942E';

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await fetch(`${API_BASE_URL}/api/commerce/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (data.success) { localStorage.setItem('kaviar_commerce_token', data.token); localStorage.setItem('kaviar_commerce_data', JSON.stringify(data)); onLogin(data); }
    else setError(data.error || 'Erro');
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#FAFAF8' }}>
      <Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}><CardContent sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: GOLD, mb: 3, textAlign: 'center' }}>🏪 Portal do Comércio</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <TextField label="Email" type="email" size="small" value={email} onChange={e => setEmail(e.target.value)} required />
          <TextField label="Senha" type="password" size="small" value={password} onChange={e => setPassword(e.target.value)} required />
          <Button type="submit" variant="contained" sx={{ bgcolor: GOLD }}>Entrar</Button>
        </form>
      </CardContent></Card>
    </Box>
  );
}

function ChangePasswordForm({ onDone, token }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');

  const handle = async () => {
    if (pw.length < 6) return setError('Mínimo 6 caracteres');
    if (pw !== pw2) return setError('Senhas não conferem');
    const res = await fetch(`${API_BASE_URL}/api/commerce/auth/change-password`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ new_password: pw }) });
    const data = await res.json();
    if (data.success) onDone();
    else setError(data.error || 'Erro');
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#FAFAF8' }}>
      <Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}><CardContent sx={{ p: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: GOLD, mb: 1 }}>🔒 Trocar Senha</Typography>
        <Alert severity="info" sx={{ mb: 2 }}>Você precisa definir uma nova senha para continuar.</Alert>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Nova Senha" type="password" size="small" value={pw} onChange={e => setPw(e.target.value)} />
          <TextField label="Confirmar Senha" type="password" size="small" value={pw2} onChange={e => setPw2(e.target.value)} />
          <Button variant="contained" onClick={handle} sx={{ bgcolor: GOLD }}>Salvar</Button>
        </Box>
      </CardContent></Card>
    </Box>
  );
}

export default function CommercePortal() {
  const [authed, setAuthed] = useState(false);
  const [mustChange, setMustChange] = useState(false);
  const [account, setAccount] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: '', price_cents: '', stock_quantity: '', is_restricted: false });
  const [editId, setEditId] = useState(null);

  const token = localStorage.getItem('kaviar_commerce_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    const stored = localStorage.getItem('kaviar_commerce_data');
    if (token && stored) {
      const d = JSON.parse(stored);
      if (d.user?.must_change_password) { setAuthed(true); setMustChange(true); }
      else { setAuthed(true); setMustChange(false); }
      setAccount(d.account);
    } else { setLoading(false); }
  }, []);

  useEffect(() => { if (authed && !mustChange) fetchProducts(); }, [authed, mustChange]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/commerce/products`, { headers });
      const data = await res.json();
      if (data.success) setProducts(data.data);
    } catch {}
    setLoading(false);
  };

  const handleLogin = (data) => { setAuthed(true); setAccount(data.account); setMustChange(data.user?.must_change_password); };
  const handlePasswordChanged = () => { setMustChange(false); const d = JSON.parse(localStorage.getItem('kaviar_commerce_data') || '{}'); d.user.must_change_password = false; localStorage.setItem('kaviar_commerce_data', JSON.stringify(d)); };

  const openNew = () => { setEditId(null); setForm({ name: '', description: '', category: '', price_cents: '', stock_quantity: '', is_restricted: false }); setEditOpen(true); };
  const openEdit = (p) => { setEditId(p.id); setForm({ name: p.name, description: p.description || '', category: p.category || '', price_cents: String(p.price_cents), stock_quantity: p.stock_quantity != null ? String(p.stock_quantity) : '', is_restricted: p.is_restricted }); setEditOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.price_cents) return setSnack('Nome e preço obrigatórios');
    const body = { ...form, price_cents: parseInt(form.price_cents), stock_quantity: form.stock_quantity ? parseInt(form.stock_quantity) : null };
    const url = editId ? `${API_BASE_URL}/api/commerce/products/${editId}` : `${API_BASE_URL}/api/commerce/products`;
    const res = await fetch(url, { method: editId ? 'PATCH' : 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.success) { setEditOpen(false); fetchProducts(); setSnack(editId ? 'Produto atualizado!' : 'Produto criado!'); }
    else setSnack(data.error || 'Erro');
  };

  const toggleAvailability = async (id) => {
    const res = await fetch(`${API_BASE_URL}/api/commerce/products/${id}/availability`, { method: 'PATCH', headers });
    const data = await res.json();
    if (data.success) fetchProducts();
    else setSnack(data.error || 'Erro');
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Remover produto?')) return;
    await fetch(`${API_BASE_URL}/api/commerce/products/${id}`, { method: 'DELETE', headers });
    fetchProducts();
  };

  const logout = () => { localStorage.removeItem('kaviar_commerce_token'); localStorage.removeItem('kaviar_commerce_data'); setAuthed(false); setAccount(null); };

  if (!authed) return <LoginForm onLogin={handleLogin} />;
  if (mustChange) return <ChangePasswordForm onDone={handlePasswordChanged} token={token} />;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FAFAF8', p: 3 }}>
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: GOLD }}>🏪 {account?.name || 'Meu Comércio'}</Typography>
            <Typography sx={{ fontSize: 12, color: '#6B7280' }}>{products.length} produtos cadastrados</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="contained" startIcon={<Add />} onClick={openNew} sx={{ bgcolor: GOLD, textTransform: 'none' }}>Produto</Button>
            <Button size="small" onClick={logout} sx={{ color: '#6B7280', textTransform: 'none' }}>Sair</Button>
          </Box>
        </Box>

        {loading ? <CircularProgress sx={{ color: GOLD }} /> : (
          <Table size="small">
            <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 11, color: '#6B7280', textTransform: 'uppercase' } }}>
              <TableCell>Produto</TableCell><TableCell>Preço</TableCell><TableCell>Estoque</TableCell><TableCell>Status</TableCell><TableCell>Ações</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {products.map(p => (
                <TableRow key={p.id} hover>
                  <TableCell><Typography sx={{ fontWeight: 600, fontSize: 13 }}>{p.name}</Typography>{p.category && <Typography sx={{ fontSize: 11, color: '#6B7280' }}>{p.category}</Typography>}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>R$ {(p.price_cents / 100).toFixed(2)}</TableCell>
                  <TableCell>{p.stock_quantity != null ? (p.stock_quantity <= (p.min_stock_alert || 0) ? <Chip label={p.stock_quantity} size="small" color="error" /> : p.stock_quantity) : '—'}</TableCell>
                  <TableCell>
                    {p.is_restricted ? <Chip label="Restrito" size="small" color="error" /> : p.is_available ? <Chip label="Disponível" size="small" color="success" /> : <Chip label="Indisponível" size="small" />}
                  </TableCell>
                  <TableCell>
                    {!p.is_restricted && <Switch size="small" checked={p.is_available} onChange={() => toggleAvailability(p.id)} />}
                    <IconButton size="small" onClick={() => openEdit(p)}><Edit sx={{ fontSize: 16 }} /></IconButton>
                    <IconButton size="small" onClick={() => deleteProduct(p.id)} sx={{ color: '#EF4444' }}><Delete sx={{ fontSize: 16 }} /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && <TableRow><TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: '#9CA3AF' }}>Nenhum produto. Clique em "+ Produto" para começar.</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </Box>

      {/* Product Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editId ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="Nome *" size="small" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <TextField label="Descrição" size="small" multiline rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField label="Categoria" size="small" fullWidth value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="lanche, bebida, refeição..." />
            <TextField label="Preço (centavos) *" size="small" fullWidth type="number" value={form.price_cents} onChange={e => setForm(f => ({ ...f, price_cents: e.target.value }))} helperText="Ex: 1500 = R$15,00" />
          </Box>
          <TextField label="Estoque" size="small" type="number" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} helperText="Deixe vazio para sem controle" />
          {form.is_restricted && <Alert severity="error">Produto marcado como restrito — não ficará disponível para venda.</Alert>}
        </DialogContent>
        <DialogActions><Button onClick={() => setEditOpen(false)}>Cancelar</Button><Button variant="contained" onClick={handleSave} sx={{ bgcolor: GOLD }}>Salvar</Button></DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}
