import { useState, useEffect } from 'react';
import { Box, Container, Typography, Card, CardContent, Button, TextField, Select, MenuItem, FormControl, InputLabel, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Snackbar, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress } from '@mui/material';
import { Add } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const GOLD = '#B8942E';
const ROLES = [ { value: 'captador_motorista', label: 'Captador de Motorista' }, { value: 'captador_passageiro', label: 'Captador de Passageiro' }, { value: 'captador_comercio', label: 'Captador de Comércio' }, { value: 'captador_associacao', label: 'Captador de Associação' }, { value: 'parceiro_local', label: 'Parceiro Local' }, { value: 'suporte_local', label: 'Suporte Local' }, { value: 'outro', label: 'Outro' } ];
const STATUS_MAP = { active: { label: 'Ativo', color: '#10B981' }, pending: { label: 'Pendente', color: '#F59E0B' }, inactive: { label: 'Inativo', color: '#6B7280' } };

export default function ManagerTeamPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', role_type: 'outro', notes: '' });
  const [editId, setEditId] = useState(null);

  const token = localStorage.getItem('kaviar_admin_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchMembers = async () => { setLoading(true); try { const res = await fetch(`${API_BASE_URL}/api/admin/manager/finance/team`, { headers }); const d = await res.json(); if (d.success) setMembers(d.data); } catch {} setLoading(false); };
  useEffect(() => { fetchMembers(); }, []);

  const openNew = () => { setEditId(null); setForm({ name: '', phone: '', role_type: 'outro', notes: '' }); setDialogOpen(true); };
  const openEdit = (m) => { setEditId(m.id); setForm({ name: m.name, phone: m.phone || '', role_type: m.role_type, notes: m.notes || '' }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) return setSnack('Nome obrigatório');
    const url = editId ? `${API_BASE_URL}/api/admin/manager/finance/team/${editId}` : `${API_BASE_URL}/api/admin/manager/finance/team`;
    const res = await fetch(url, { method: editId ? 'PATCH' : 'POST', headers, body: JSON.stringify(form) });
    const d = await res.json();
    if (d.success) { setDialogOpen(false); fetchMembers(); setSnack(editId ? 'Atualizado!' : 'Membro cadastrado!'); }
    else setSnack(d.error || 'Erro');
  };

  const toggleStatus = async (m) => {
    const newStatus = m.status === 'active' ? 'inactive' : 'active';
    await fetch(`${API_BASE_URL}/api/admin/manager/finance/team/${m.id}`, { method: 'PATCH', headers, body: JSON.stringify({ status: newStatus }) });
    fetchMembers();
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FAFAF8', pt: 2, pb: 6 }}>
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}><span style={{ color: GOLD }}>👥</span> Minha Equipe</Typography>
            <Typography sx={{ color: '#6B7280', fontSize: 12 }}>Cadastro interno do Gestor Territorial</Typography>
          </Box>
          <Button variant="contained" size="small" startIcon={<Add />} onClick={openNew} sx={{ bgcolor: GOLD, textTransform: 'none' }}>Novo Membro</Button>
        </Box>

        <Alert severity="info" sx={{ mb: 2, fontSize: 11 }}>
          Este cadastro é um controle interno do Gestor Territorial. O KAVIAR não realiza pagamentos automáticos aos membros da equipe do gestor e não cria vínculo financeiro direto com esses membros nesta fase.
        </Alert>

        {loading ? <CircularProgress sx={{ color: GOLD }} /> : members.length > 0 ? (
          <Card sx={{ bgcolor: '#fff', border: '1px solid #E8E5DE', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Table size="small">
                <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 11, color: '#6B7280', textTransform: 'uppercase' } }}>
                  <TableCell>Nome</TableCell><TableCell>Função</TableCell><TableCell>Telefone</TableCell><TableCell>Status</TableCell><TableCell>Ações</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {members.map(m => (
                    <TableRow key={m.id} hover>
                      <TableCell><Typography sx={{ fontWeight: 600, fontSize: 13 }}>{m.name}</Typography>{m.notes && <Typography sx={{ fontSize: 10, color: '#6B7280' }}>{m.notes}</Typography>}</TableCell>
                      <TableCell><Chip label={ROLES.find(r => r.value === m.role_type)?.label || m.role_type} size="small" sx={{ fontSize: 10 }} /></TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{m.phone || '—'}</TableCell>
                      <TableCell><Chip label={STATUS_MAP[m.status]?.label || m.status} size="small" sx={{ bgcolor: `${STATUS_MAP[m.status]?.color || '#6B7280'}15`, color: STATUS_MAP[m.status]?.color, fontWeight: 600, fontSize: 10 }} /></TableCell>
                      <TableCell>
                        <Button size="small" onClick={() => openEdit(m)} sx={{ textTransform: 'none', fontSize: 11 }}>Editar</Button>
                        <Button size="small" onClick={() => toggleStatus(m)} sx={{ textTransform: 'none', fontSize: 11, color: m.status === 'active' ? '#EF4444' : '#10B981' }}>{m.status === 'active' ? 'Inativar' : 'Ativar'}</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : <Alert severity="warning">Nenhum membro cadastrado. Clique em "Novo Membro" para começar.</Alert>}
      </Container>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editId ? 'Editar Membro' : 'Novo Membro da Equipe'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="Nome *" size="small" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <TextField label="Telefone/WhatsApp" size="small" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <FormControl size="small"><InputLabel>Função</InputLabel><Select value={form.role_type} label="Função" onChange={e => setForm(f => ({ ...f, role_type: e.target.value }))}>
            {ROLES.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
          </Select></FormControl>
          <TextField label="Observações" size="small" multiline rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </DialogContent>
        <DialogActions><Button onClick={() => setDialogOpen(false)}>Cancelar</Button><Button variant="contained" onClick={handleSave} sx={{ bgcolor: GOLD }}>Salvar</Button></DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}
