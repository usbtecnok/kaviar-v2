import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Typography, Box, Card, CardContent, Chip, Button, TextField, CircularProgress, Alert, MenuItem, Select, FormControl, InputLabel, Divider } from '@mui/material';
import { ArrowBack, Pets, Timeline, Send } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';

const STATUSES = ['NOVO','EM_CONTATO','AGUARDANDO_TREINAMENTO','AGUARDANDO_QUESTIONARIO','AGUARDANDO_FOTOS','EM_ANALISE','APROVADO','REPROVADO','SUSPENSO','DESISTIU'];
const STATUS_COLORS = { NOVO:'#FFF2CC', EM_CONTATO:'#CFE2F3', AGUARDANDO_TREINAMENTO:'#FCE5CD', AGUARDANDO_QUESTIONARIO:'#FCE5CD', AGUARDANDO_FOTOS:'#FCE5CD', EM_ANALISE:'#D9EAD3', APROVADO:'#4caf50', REPROVADO:'#f44336', SUSPENSO:'#ff9800', DESISTIU:'#9e9e9e' };
const ACTION_LABELS = { created:'Criado', status_changed:'Status alterado', assigned:'Operador atribuído', note_added:'Observação', approved:'Aprovado', rejected:'Reprovado' };

export default function PetHomologationDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const token = () => localStorage.getItem('kaviar_admin_token');
  const headers = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    try {
      const [resItem, resLogs] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/pet/homologations?status=`, { headers: headers() }),
        fetch(`${API_BASE_URL}/api/admin/pet/homologations/${id}/logs`, { headers: headers() }),
      ]);
      const jsonItems = await resItem.json();
      const jsonLogs = await resLogs.json();
      if (jsonItems.success) setItem(jsonItems.data.find(h => h.id === id) || null);
      if (jsonLogs.success) setLogs(jsonLogs.data);
    } catch { setError('Erro ao carregar'); }
    finally { setLoading(false); }
  };

  const handleStatus = async (newStatus) => {
    try {
      await fetch(`${API_BASE_URL}/api/admin/pet/homologations/${id}`, { method:'PATCH', headers:headers(), body:JSON.stringify({ status: newStatus }) });
      fetchData();
    } catch {}
  };

  const handleNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/pet/homologations/${id}/notes`, { method:'POST', headers:headers(), body:JSON.stringify({ note }) });
      const json = await res.json();
      if (json.success) { setNote(''); fetchData(); }
      else setError(json.error);
    } catch { setError('Erro ao salvar'); }
    finally { setSaving(false); }
  };

  if (loading) return <Container maxWidth="md" sx={{ mt:4 }}><Box sx={{ display:'flex', justifyContent:'center', py:8 }}><CircularProgress sx={{ color:'#b8960c' }} /></Box></Container>;
  if (!item) return <Container maxWidth="md" sx={{ mt:4 }}><Alert severity="error">Homologação não encontrada</Alert></Container>;

  return (
    <Container maxWidth="md" sx={{ mt:2, mb:4 }}>
      <Button component={Link} to="/admin/pet/homologations" startIcon={<ArrowBack />} size="small" sx={{ color:'#888', textTransform:'none', mb:2 }}>Voltar</Button>

      <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:3 }}>
        <Pets sx={{ color:'#b8960c', fontSize:24 }} />
        <Typography variant="h6" fontWeight="700" sx={{ color:'#E8E3D5' }}>{item.name}</Typography>
        <Chip label={item.status.replace(/_/g,' ')} size="small" sx={{ bgcolor: STATUS_COLORS[item.status] || '#666', color:'#000', fontWeight:600 }} />
      </Box>

      {error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Dados */}
      <Card sx={{ bgcolor:'#111217', border:'1px solid #222', mb:3 }}>
        <CardContent>
          <Box sx={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:2 }}>
            <Box><Typography variant="caption" sx={{ color:'#888' }}>Telefone</Typography><Typography sx={{ color:'#E8E3D5' }}>{item.phone}</Typography></Box>
            <Box><Typography variant="caption" sx={{ color:'#888' }}>E-mail</Typography><Typography sx={{ color:'#E8E3D5' }}>{item.email || '—'}</Typography></Box>
            <Box><Typography variant="caption" sx={{ color:'#888' }}>Região</Typography><Typography sx={{ color:'#E8E3D5' }}>{item.region || '—'}</Typography></Box>
            <Box><Typography variant="caption" sx={{ color:'#888' }}>Veículo</Typography><Typography sx={{ color:'#E8E3D5' }}>{item.vehicle_model || '—'}</Typography></Box>
            <Box><Typography variant="caption" sx={{ color:'#888' }}>Criado em</Typography><Typography sx={{ color:'#E8E3D5' }}>{new Date(item.created_at).toLocaleDateString('pt-BR')}</Typography></Box>
            <Box><Typography variant="caption" sx={{ color:'#888' }}>Fonte</Typography><Typography sx={{ color:'#E8E3D5' }}>{item.source}</Typography></Box>
          </Box>
          <Box sx={{ mt:2 }}>
            <Typography variant="caption" sx={{ color:'#888' }}>Status</Typography>
            <FormControl size="small" sx={{ ml:1, minWidth:180 }}>
              <Select value={item.status} onChange={e => handleStatus(e.target.value)} sx={{ color:'#E8E3D5', fontSize:13, '.MuiOutlinedInput-notchedOutline':{ borderColor:'#444' } }}>
                {STATUSES.map(s => <MenuItem key={s} value={s} sx={{ fontSize:12 }}>{s.replace(/_/g,' ')}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          {item.notes && <Box sx={{ mt:2 }}><Typography variant="caption" sx={{ color:'#888' }}>Notas</Typography><Typography sx={{ color:'#ccc', fontSize:13 }}>{item.notes}</Typography></Box>}
        </CardContent>
      </Card>

      {/* Adicionar observação */}
      <Card sx={{ bgcolor:'#111217', border:'1px solid #222', mb:3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ color:'#E8E3D5', mb:1 }}>Adicionar observação</Typography>
          <Box sx={{ display:'flex', gap:1 }}>
            <TextField value={note} onChange={e => setNote(e.target.value)} placeholder="Registrar ação, contato, pendência..." fullWidth size="small" multiline maxRows={3} InputProps={{ sx:{ color:'#E8E3D5', fontSize:13 } }} sx={{ '.MuiOutlinedInput-notchedOutline':{ borderColor:'#333' } }} />
            <Button onClick={handleNote} disabled={saving || !note.trim()} variant="contained" sx={{ bgcolor:'#b8960c', '&:hover':{ bgcolor:'#d4af37' }, minWidth:40 }}><Send sx={{ fontSize:18 }} /></Button>
          </Box>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card sx={{ bgcolor:'#111217', border:'1px solid #222' }}>
        <CardContent>
          <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:2 }}>
            <Timeline sx={{ color:'#b8960c', fontSize:20 }} />
            <Typography variant="subtitle2" sx={{ color:'#E8E3D5' }}>Histórico</Typography>
          </Box>
          {logs.length === 0 ? (
            <Typography sx={{ color:'#888', fontSize:13 }}>Nenhum registro ainda.</Typography>
          ) : (
            <Box>
              {logs.map((log, i) => (
                <Box key={log.id} sx={{ borderLeft:'2px solid #333', pl:2, pb:2, ml:1, position:'relative', '&::before':{ content:'""', position:'absolute', left:-5, top:6, width:8, height:8, borderRadius:'50%', bgcolor:'#b8960c' } }}>
                  <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <Typography sx={{ fontSize:12, fontWeight:600, color:'#E8E3D5' }}>{ACTION_LABELS[log.action] || log.action}</Typography>
                    <Typography sx={{ fontSize:11, color:'#666' }}>{new Date(log.created_at).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</Typography>
                  </Box>
                  <Typography sx={{ fontSize:11, color:'#888' }}>{log.admin_name || 'Sistema'}</Typography>
                  {log.old_status && log.new_status && <Typography sx={{ fontSize:11, color:'#aaa' }}>{log.old_status.replace(/_/g,' ')} → {log.new_status.replace(/_/g,' ')}</Typography>}
                  {log.note && <Typography sx={{ fontSize:12, color:'#ccc', mt:0.5, fontStyle:'italic' }}>"{log.note}"</Typography>}
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
