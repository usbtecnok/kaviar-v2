import { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Card, CardContent, Grid, Chip, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch,
  FormControlLabel, IconButton
} from '@mui/material';
import { Add, Edit, ToggleOn, ToggleOff, Warning } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const GOLD = '#B8942E';

export default function CreditPackagesAdmin() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ id: '', credits: '', price: '', active: true });
  const [createPassword, setCreatePassword] = useState('');
  const [createReason, setCreateReason] = useState('');

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editPkg, setEditPkg] = useState(null);
  const [editForm, setEditForm] = useState({ credits: '', price: '' });
  const [editPassword, setEditPassword] = useState('');
  const [editReason, setEditReason] = useState('');

  // Toggle dialog (activate/deactivate)
  const [toggleOpen, setToggleOpen] = useState(false);
  const [togglePkg, setTogglePkg] = useState(null);
  const [togglePassword, setTogglePassword] = useState('');
  const [toggleReason, setToggleReason] = useState('');

  const token = localStorage.getItem('kaviar_admin_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => { fetchPackages(); }, []);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/credit-packages`, { headers });
      const data = await res.json();
      if (data.success) setPackages(data.data || []);
      else setError(data.error || 'Erro ao carregar pacotes');
    } catch { setError('Erro de conexão'); }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!createForm.id || !createForm.credits || !createForm.price || !createPassword || !createReason) {
      setError('Preencha todos os campos'); return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/credit-packages`, {
        method: 'POST', headers,
        body: JSON.stringify({
          id: createForm.id,
          credits: Number(createForm.credits),
          price: Number(createForm.price),
          active: createForm.active,
          password: createPassword,
          reason: createReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Pacote criado com sucesso');
        setCreateOpen(false);
        resetCreate();
        fetchPackages();
      } else setError(data.error || 'Erro ao criar');
    } catch { setError('Erro de conexão'); }
  };

  const handleEdit = async () => {
    if (!editPassword || !editReason) { setError('Senha e motivo obrigatórios'); return; }
    const body = { password: editPassword, reason: editReason };
    if (editForm.credits) body.credits = Number(editForm.credits);
    if (editForm.price) body.price = Number(editForm.price);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/credit-packages/${editPkg.id}`, {
        method: 'PUT', headers, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Pacote atualizado');
        setEditOpen(false);
        resetEdit();
        fetchPackages();
      } else setError(data.error || 'Erro ao atualizar');
    } catch { setError('Erro de conexão'); }
  };

  const handleToggle = async () => {
    if (!togglePassword || !toggleReason) { setError('Senha e motivo obrigatórios'); return; }
    const action = togglePkg.active ? 'deactivate' : 'activate';
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/credit-packages/${togglePkg.id}/${action}`, {
        method: 'PUT', headers,
        body: JSON.stringify({ password: togglePassword, reason: toggleReason }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(togglePkg.active ? 'Pacote desativado' : 'Pacote reativado');
        setToggleOpen(false);
        resetToggle();
        fetchPackages();
      } else setError(data.error || 'Erro');
    } catch { setError('Erro de conexão'); }
  };

  const resetCreate = () => { setCreateForm({ id: '', credits: '', price: '', active: true }); setCreatePassword(''); setCreateReason(''); };
  const resetEdit = () => { setEditPkg(null); setEditForm({ credits: '', price: '' }); setEditPassword(''); setEditReason(''); };
  const resetToggle = () => { setTogglePkg(null); setTogglePassword(''); setToggleReason(''); };

  const openEdit = (pkg) => { setEditPkg(pkg); setEditForm({ credits: String(pkg.credits), price: String(pkg.price) }); setEditOpen(true); };
  const openToggle = (pkg) => { setTogglePkg(pkg); setToggleOpen(true); };

  const fmt = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;

  return (
    <Box sx={{ bgcolor: '#FAFAF8', minHeight: '100vh', py: 3 }}>
      <Container maxWidth="lg">
        <Typography variant="h5" sx={{ color: '#1A1A1A', fontWeight: 800, mb: 0.5 }}>
          Pacotes de Créditos
        </Typography>
        <Typography sx={{ color: '#6B7280', fontSize: 13, mb: 3 }}>
          Gerencie pacotes disponíveis para compra pelos motoristas.
        </Typography>

        <Alert severity="info" sx={{ mb: 3, borderRadius: 2, fontSize: 12 }}>
          Alterar pacotes afeta apenas novas compras. Compras já geradas, saldos e ledger não são alterados.
        </Alert>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button startIcon={<Add />} variant="contained" size="small" onClick={() => setCreateOpen(true)} sx={{ bgcolor: GOLD, fontWeight: 600, '&:hover': { bgcolor: '#9A7B24' } }}>
            Novo Pacote
          </Button>
        </Box>

        {loading ? <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress sx={{ color: GOLD }} /></Box> : (
          <Card sx={{ border: '1px solid #E8E5DE', borderRadius: 2, bgcolor: '#FFFFFF' }}>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F9FAFB' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }} align="right">Créditos</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }} align="right">Preço</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }} align="right">R$/crédito</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }} align="center">Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }} align="right">Compras</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }}>Criado em</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }} align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {packages.map(pkg => (
                    <TableRow key={pkg.id} hover sx={{ opacity: pkg.active ? 1 : 0.5, '&:hover': { bgcolor: '#FFFDF7' } }}>
                      <TableCell sx={{ fontSize: 12, fontFamily: 'monospace', color: '#1F2937' }}>{pkg.id}</TableCell>
                      <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#1F2937' }} align="right">{pkg.credits}</TableCell>
                      <TableCell sx={{ fontSize: 13, color: GOLD, fontWeight: 700 }} align="right">{fmt(pkg.price)}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: '#6B7280' }} align="right">{fmt(pkg.pricePerCredit)}</TableCell>
                      <TableCell align="center">
                        <Chip label={pkg.active ? 'Ativo' : 'Inativo'} size="small" sx={{ bgcolor: pkg.active ? '#ECFDF5' : '#FEF2F2', color: pkg.active ? '#059669' : '#DC2626', fontWeight: 600, fontSize: 10 }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: '#6B7280' }} align="right">
                        {pkg.confirmedCount > 0 ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                            <Warning sx={{ fontSize: 14, color: '#F59E0B' }} />
                            {pkg.confirmedCount} confirmadas
                          </Box>
                        ) : '0'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 11, color: '#9CA3AF' }}>{pkg.createdAt ? new Date(pkg.createdAt).toLocaleDateString('pt-BR') : '—'}</TableCell>
                      <TableCell align="center">
                        <IconButton size="small" title="Editar" onClick={() => openEdit(pkg)}>
                          <Edit fontSize="small" sx={{ color: '#6B7280' }} />
                        </IconButton>
                        <IconButton size="small" title={pkg.active ? 'Desativar' : 'Ativar'} onClick={() => openToggle(pkg)}>
                          {pkg.active ? <ToggleOff fontSize="small" sx={{ color: '#DC2626' }} /> : <ToggleOn fontSize="small" sx={{ color: '#059669' }} />}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}

        {/* Create Dialog */}
        <Dialog open={createOpen} onClose={() => { setCreateOpen(false); resetCreate(); }} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, color: '#1F2937' }}>Novo Pacote de Créditos</DialogTitle>
          <DialogContent>
            <TextField fullWidth label="ID (ex: pkg-10-promo)" value={createForm.id} onChange={e => setCreateForm(f => ({ ...f, id: e.target.value }))} size="small" sx={{ mb: 2, mt: 1 }} helperText="Letras minúsculas, números e hífens" />
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <TextField fullWidth label="Créditos" type="number" value={createForm.credits} onChange={e => setCreateForm(f => ({ ...f, credits: e.target.value }))} size="small" inputProps={{ min: 1, max: 500 }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Preço (R$)" type="number" value={createForm.price} onChange={e => setCreateForm(f => ({ ...f, price: e.target.value }))} size="small" inputProps={{ min: 0.01, max: 500, step: 0.50 }} />
              </Grid>
            </Grid>
            {createForm.credits && createForm.price && (
              <Alert severity="info" sx={{ mb: 2, fontSize: 11 }}>
                Valor por crédito: {fmt(Number(createForm.price) / Number(createForm.credits))}
              </Alert>
            )}
            <FormControlLabel control={<Switch checked={createForm.active} onChange={e => setCreateForm(f => ({ ...f, active: e.target.checked }))} />} label="Ativo imediatamente" sx={{ mb: 2 }} />
            <TextField fullWidth label="Motivo (obrigatório)" value={createReason} onChange={e => setCreateReason(e.target.value)} size="small" sx={{ mb: 2 }} />
            <TextField fullWidth label="Sua senha (confirmação)" type="password" value={createPassword} onChange={e => setCreatePassword(e.target.value)} size="small" helperText="Necessária para confirmar a ação" />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setCreateOpen(false); resetCreate(); }} sx={{ color: '#6B7280' }}>Cancelar</Button>
            <Button onClick={handleCreate} variant="contained" disabled={!createPassword || !createReason} sx={{ bgcolor: GOLD, fontWeight: 600, '&:hover': { bgcolor: '#9A7B24' } }}>Criar Pacote</Button>
          </DialogActions>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onClose={() => { setEditOpen(false); resetEdit(); }} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, color: '#1F2937' }}>Editar Pacote: {editPkg?.id}</DialogTitle>
          <DialogContent>
            {editPkg?.confirmedCount > 0 && (
              <Alert severity="warning" sx={{ mb: 2, fontSize: 11 }}>
                Este pacote tem {editPkg.confirmedCount} compra(s) confirmada(s). Alterar valores afeta apenas novas compras.
              </Alert>
            )}
            <Grid container spacing={2} sx={{ mb: 2, mt: 0.5 }}>
              <Grid item xs={6}>
                <TextField fullWidth label="Créditos" type="number" value={editForm.credits} onChange={e => setEditForm(f => ({ ...f, credits: e.target.value }))} size="small" inputProps={{ min: 1, max: 500 }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Preço (R$)" type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} size="small" inputProps={{ min: 0.01, max: 500, step: 0.50 }} />
              </Grid>
            </Grid>
            <TextField fullWidth label="Motivo da alteração (obrigatório)" value={editReason} onChange={e => setEditReason(e.target.value)} size="small" sx={{ mb: 2 }} />
            <TextField fullWidth label="Sua senha (confirmação)" type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} size="small" />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setEditOpen(false); resetEdit(); }} sx={{ color: '#6B7280' }}>Cancelar</Button>
            <Button onClick={handleEdit} variant="contained" disabled={!editPassword || !editReason} sx={{ bgcolor: GOLD, fontWeight: 600, '&:hover': { bgcolor: '#9A7B24' } }}>Salvar</Button>
          </DialogActions>
        </Dialog>

        {/* Toggle Dialog */}
        <Dialog open={toggleOpen} onClose={() => { setToggleOpen(false); resetToggle(); }} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, color: '#1F2937' }}>
            {togglePkg?.active ? 'Desativar' : 'Reativar'} Pacote: {togglePkg?.id}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ p: 2, bgcolor: '#F9FAFB', borderRadius: 2, mb: 2 }}>
              <Typography sx={{ fontSize: 13 }}><strong>{togglePkg?.credits} créditos</strong> — {togglePkg ? fmt(togglePkg.price) : ''}</Typography>
              <Typography sx={{ fontSize: 12, color: '#6B7280' }}>Status atual: {togglePkg?.active ? 'Ativo' : 'Inativo'}</Typography>
            </Box>
            {togglePkg?.active && (
              <Alert severity="warning" sx={{ mb: 2, fontSize: 11 }}>
                Desativar remove o pacote das opções de compra. Compras já realizadas não são afetadas.
              </Alert>
            )}
            <TextField fullWidth label="Motivo (obrigatório)" value={toggleReason} onChange={e => setToggleReason(e.target.value)} size="small" sx={{ mb: 2 }} />
            <TextField fullWidth label="Sua senha (confirmação)" type="password" value={togglePassword} onChange={e => setTogglePassword(e.target.value)} size="small" />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setToggleOpen(false); resetToggle(); }} sx={{ color: '#6B7280' }}>Cancelar</Button>
            <Button onClick={handleToggle} variant="contained" disabled={!togglePassword || !toggleReason} sx={{ bgcolor: togglePkg?.active ? '#DC2626' : '#059669', fontWeight: 600 }}>
              {togglePkg?.active ? 'Desativar' : 'Reativar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
