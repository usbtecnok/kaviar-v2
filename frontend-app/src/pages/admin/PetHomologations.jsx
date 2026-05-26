import { useState, useEffect } from 'react';
import { Container, Typography, Box, Card, CardContent, Grid, Chip, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Select, FormControl, InputLabel, CircularProgress, Alert, IconButton, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { Add, Pets, ArrowBack, PersonAdd } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';

const STATUSES = ['NOVO','EM_CONTATO','AGUARDANDO_TREINAMENTO','AGUARDANDO_QUESTIONARIO','AGUARDANDO_FOTOS','EM_ANALISE','APROVADO','REPROVADO','SUSPENSO','DESISTIU'];
const STATUS_COLORS = { NOVO:'#FFF2CC', EM_CONTATO:'#CFE2F3', AGUARDANDO_TREINAMENTO:'#FCE5CD', AGUARDANDO_QUESTIONARIO:'#FCE5CD', AGUARDANDO_FOTOS:'#FCE5CD', EM_ANALISE:'#D9EAD3', APROVADO:'#4caf50', REPROVADO:'#f44336', SUSPENSO:'#ff9800', DESISTIU:'#9e9e9e' };

export default function PetHomologations() {
  const [items, setItems] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(null);
  const [form, setForm] = useState({ name:'', phone:'', email:'', region:'', vehicle_model:'', notes:'' });
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const admin = JSON.parse(localStorage.getItem('kaviar_admin_data') || '{}');
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';
  const token = () => localStorage.getItem('kaviar_admin_token');
  const headers = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });

  useEffect(() => { fetchItems(); if (isSuperAdmin) fetchOperators(); }, []);

  const fetchItems = async () => {
    try {
      const url = statusFilter ? `${API_BASE_URL}/api/admin/pet/homologations?status=${statusFilter}` : `${API_BASE_URL}/api/admin/pet/homologations`;
      const res = await fetch(url, { headers: headers() });
      const json = await res.json();
      if (json.success) setItems(json.data);
      else setError(json.error);
    } catch { setError('Erro ao carregar'); }
    finally { setLoading(false); }
  };

  const fetchOperators = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/pet/operators`, { headers: headers() });
      const json = await res.json();
      if (json.success) setOperators(json.data.filter(o => o.is_active));
    } catch {}
  };

  useEffect(() => { setLoading(true); fetchItems(); }, [statusFilter]);

  const handleCreate = async () => {
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/pet/homologations`, { method:'POST', headers:headers(), body:JSON.stringify(form) });
      const json = await res.json();
      if (json.success) { setDialog(false); setForm({ name:'', phone:'', email:'', region:'', vehicle_model:'', notes:'' }); fetchItems(); }
      else setError(json.error);
    } catch { setError('Erro ao criar'); }
    finally { setSaving(false); }
  };

  const handleStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/pet/homologations/${id}`, { method:'PATCH', headers:headers(), body:JSON.stringify({ status: newStatus }) });
      const json = await res.json();
      if (json.success) fetchItems();
    } catch {}
  };

  const handleAssign = async (id, operatorId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/pet/homologations/${id}/assign`, { method:'PATCH', headers:headers(), body:JSON.stringify({ operator_id: operatorId }) });
      const json = await res.json();
      if (json.success) { setAssignDialog(null); fetchItems(); }
    } catch {}
  };

  if (loading) return <Container maxWidth="lg" sx={{ mt:4 }}><Box sx={{ display:'flex', justifyContent:'center', py:8 }}><CircularProgress sx={{ color:'#b8960c' }} /></Box></Container>;

  return (
    <Container maxWidth="lg" sx={{ mt:2, mb:4 }}>
      <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:1 }}>
        <Button component={Link} to="/admin/pet" startIcon={<ArrowBack />} size="small" sx={{ color:'#888', textTransform:'none' }}>Central Pet</Button>
      </Box>

      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:2 }}>
        <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
          <Pets sx={{ color:'#b8960c', fontSize:28 }} />
          <Typography variant="h5" fontWeight="700" sx={{ color:'#E8E3D5' }}>Homologações KAVIAR Pet</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialog(true)} sx={{ bgcolor:'#b8960c', '&:hover':{ bgcolor:'#d4af37' }, textTransform:'none' }}>Nova homologação</Button>
      </Box>

      <Box sx={{ mb:2, display:'flex', gap:1, flexWrap:'wrap' }}>
        <Chip label="Todos" onClick={() => setStatusFilter('')} variant={!statusFilter ? 'filled' : 'outlined'} sx={{ bgcolor: !statusFilter ? '#b8960c' : 'transparent', color: !statusFilter ? '#000' : '#aaa', borderColor:'#444' }} />
        {STATUSES.map(s => <Chip key={s} label={s.replace(/_/g,' ')} onClick={() => setStatusFilter(s)} variant={statusFilter===s ? 'filled' : 'outlined'} size="small" sx={{ bgcolor: statusFilter===s ? STATUS_COLORS[s] : 'transparent', color: statusFilter===s ? '#000' : '#aaa', borderColor:'#444' }} />)}
      </Box>

      {error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError('')}>{error}</Alert>}

      {items.length === 0 ? (
        <Card sx={{ bgcolor:'#111217', border:'1px solid #222' }}><CardContent sx={{ textAlign:'center', py:4 }}><Typography sx={{ color:'#888' }}>Nenhuma homologação encontrada.</Typography></CardContent></Card>
      ) : (
        <Card sx={{ bgcolor:'#111217', border:'1px solid #222', overflow:'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color:'#888', borderColor:'#333' }}>Nome</TableCell>
                <TableCell sx={{ color:'#888', borderColor:'#333' }}>Telefone</TableCell>
                <TableCell sx={{ color:'#888', borderColor:'#333' }}>Região</TableCell>
                <TableCell sx={{ color:'#888', borderColor:'#333' }}>Status</TableCell>
                <TableCell sx={{ color:'#888', borderColor:'#333' }}>Operador</TableCell>
                <TableCell sx={{ color:'#888', borderColor:'#333' }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id}>
                  <TableCell sx={{ color:'#E8E3D5', borderColor:'#333' }}>{item.name}</TableCell>
                  <TableCell sx={{ color:'#ccc', borderColor:'#333' }}>{item.phone}</TableCell>
                  <TableCell sx={{ color:'#ccc', borderColor:'#333' }}>{item.region || '—'}</TableCell>
                  <TableCell sx={{ borderColor:'#333' }}>
                    <FormControl size="small" sx={{ minWidth:140 }}>
                      <Select value={item.status} onChange={e => handleStatus(item.id, e.target.value)} sx={{ color:'#E8E3D5', fontSize:12, '.MuiOutlinedInput-notchedOutline':{ borderColor:'#444' } }}>
                        {STATUSES.map(s => <MenuItem key={s} value={s} sx={{ fontSize:12 }}>{s.replace(/_/g,' ')}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell sx={{ color:'#ccc', borderColor:'#333' }}>
                    {item.operator_id ? (operators.find(o => o.id === item.operator_id)?.name || 'Atribuído') : '—'}
                    {isSuperAdmin && <IconButton size="small" onClick={() => setAssignDialog(item)} sx={{ color:'#b8960c', ml:0.5 }}><PersonAdd sx={{ fontSize:16 }} /></IconButton>}
                  </TableCell>
                  <TableCell sx={{ borderColor:'#333' }}>
                    <Button size="small" sx={{ color:'#b8960c', textTransform:'none', fontSize:11 }}>Ver</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Dialog criar */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx:{ bgcolor:'#1a1a2e', color:'#E8E3D5' } }}>
        <DialogTitle>Nova Homologação</DialogTitle>
        <DialogContent>
          <Box sx={{ display:'flex', flexDirection:'column', gap:2, mt:1 }}>
            <TextField label="Nome" value={form.name} onChange={e => setForm({...form, name:e.target.value})} fullWidth required InputLabelProps={{ sx:{color:'#888'} }} InputProps={{ sx:{color:'#E8E3D5'} }} />
            <TextField label="WhatsApp" value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} fullWidth required placeholder="(21) 99999-9999" InputLabelProps={{ sx:{color:'#888'} }} InputProps={{ sx:{color:'#E8E3D5'} }} />
            <TextField label="E-mail" value={form.email} onChange={e => setForm({...form, email:e.target.value})} fullWidth InputLabelProps={{ sx:{color:'#888'} }} InputProps={{ sx:{color:'#E8E3D5'} }} />
            <TextField label="Região/Bairro" value={form.region} onChange={e => setForm({...form, region:e.target.value})} fullWidth InputLabelProps={{ sx:{color:'#888'} }} InputProps={{ sx:{color:'#E8E3D5'} }} />
            <TextField label="Veículo (modelo)" value={form.vehicle_model} onChange={e => setForm({...form, vehicle_model:e.target.value})} fullWidth InputLabelProps={{ sx:{color:'#888'} }} InputProps={{ sx:{color:'#E8E3D5'} }} />
            <TextField label="Observações" value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} fullWidth multiline rows={2} InputLabelProps={{ sx:{color:'#888'} }} InputProps={{ sx:{color:'#E8E3D5'} }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)} sx={{ color:'#888' }}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={saving || !form.name || !form.phone} variant="contained" sx={{ bgcolor:'#b8960c', '&:hover':{ bgcolor:'#d4af37' } }}>{saving ? 'Criando...' : 'Criar'}</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog atribuir */}
      <Dialog open={!!assignDialog} onClose={() => setAssignDialog(null)} maxWidth="xs" fullWidth PaperProps={{ sx:{ bgcolor:'#1a1a2e', color:'#E8E3D5' } }}>
        <DialogTitle>Atribuir Operador</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color:'#aaa', mb:2 }}>Homologação: {assignDialog?.name}</Typography>
          {operators.map(op => (
            <Button key={op.id} fullWidth onClick={() => handleAssign(assignDialog.id, op.id)} sx={{ justifyContent:'flex-start', color:'#E8E3D5', textTransform:'none', mb:0.5, '&:hover':{ bgcolor:'rgba(184,150,12,0.1)' } }}>
              {op.name} <Chip label={op.role.replace('PET_','')} size="small" sx={{ ml:1, fontSize:10, height:18 }} />
            </Button>
          ))}
          <Button fullWidth onClick={() => handleAssign(assignDialog?.id, null)} sx={{ justifyContent:'flex-start', color:'#888', textTransform:'none', mt:1 }}>Remover atribuição</Button>
        </DialogContent>
      </Dialog>
    </Container>
  );
}
