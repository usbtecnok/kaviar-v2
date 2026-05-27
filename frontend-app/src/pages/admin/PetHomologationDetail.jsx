import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Typography, Box, Card, CardContent, Chip, Button, TextField, CircularProgress, Alert, MenuItem, Select, FormControl, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { ArrowBack, Pets, Timeline, Send, WhatsApp, OndemandVideo, Quiz, CameraAlt, Edit, LinkOff, Link as LinkIcon, Warning, CheckCircle } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';

const STATUSES = ['NOVO','EM_CONTATO','AGUARDANDO_TREINAMENTO','AGUARDANDO_QUESTIONARIO','AGUARDANDO_FOTOS','EM_ANALISE','APROVADO','REPROVADO','SUSPENSO','DESISTIU'];
const STATUS_COLORS = { NOVO:'#FFF2CC', EM_CONTATO:'#CFE2F3', AGUARDANDO_TREINAMENTO:'#FCE5CD', AGUARDANDO_QUESTIONARIO:'#FCE5CD', AGUARDANDO_FOTOS:'#FCE5CD', EM_ANALISE:'#D9EAD3', APROVADO:'#4caf50', REPROVADO:'#f44336', SUSPENSO:'#ff9800', DESISTIU:'#9e9e9e' };
const ACTION_LABELS = { created:'Criado', auto_created:'Cadastro automático', status_changed:'Status alterado', assigned:'Operador atribuído', note_added:'Observação', driver_linked:'Motorista vinculado', approved:'Aprovado', rejected:'Reprovado', WHATSAPP_OPENED:'WhatsApp aberto', TRAINING_SENT:'Treinamento enviado', QUESTIONNAIRE_SENT:'Questionário enviado', PHOTOS_REQUESTED:'Fotos solicitadas' };

function ActionButton({ icon, label, color, onClick }) {
  return (
    <Button onClick={onClick} startIcon={icon} variant="outlined" size="small" sx={{ borderColor: color, color, textTransform:'none', fontSize:12, '&:hover':{ borderColor: color, bgcolor:`${color}15` } }}>
      {label}
    </Button>
  );
}

export default function PetHomologationDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [logs, setLogs] = useState([]);
  const [driverInfo, setDriverInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});

  const token = () => localStorage.getItem('kaviar_admin_token');
  const headers = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    try {
      const [resItem, resLogs, resDriver] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/pet/homologations?status=`, { headers: headers() }),
        fetch(`${API_BASE_URL}/api/admin/pet/homologations/${id}/logs`, { headers: headers() }),
        fetch(`${API_BASE_URL}/api/admin/pet/homologations/${id}/driver`, { headers: headers() }),
      ]);
      const jsonItems = await resItem.json();
      const jsonLogs = await resLogs.json();
      const jsonDriver = await resDriver.json();
      if (jsonItems.success) setItem(jsonItems.data.find(h => h.id === id) || null);
      if (jsonLogs.success) setLogs(jsonLogs.data);
      if (jsonDriver.success) setDriverInfo(jsonDriver);
    } catch { setError('Erro ao carregar'); }
    finally { setLoading(false); }
  };

  const handleStatus = async (newStatus) => {
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/pet/homologations/${id}`, { method:'PATCH', headers:headers(), body:JSON.stringify({ status: newStatus }) });
      const json = await res.json();
      if (!json.success) setError(json.error);
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

  const handleAction = async (action, message) => {
    try {
      await fetch(`${API_BASE_URL}/api/admin/pet/homologations/${id}/actions`, { method:'POST', headers:headers(), body:JSON.stringify({ action }) });
    } catch {}
    const phone = (item?.phone || '').replace(/\D/g, '');
    const waPhone = phone.startsWith('55') ? phone : '55' + phone;
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`, '_blank');
    fetchData();
  };

  const handleEdit = async () => {
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/pet/homologations/${id}`, { method:'PATCH', headers:headers(), body:JSON.stringify(editForm) });
      const json = await res.json();
      if (json.success) { setEditOpen(false); fetchData(); }
      else setError(json.error);
    } catch { setError('Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const handleLinkDriver = async () => {
    if (!driverInfo?.driver) return;
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/pet/homologations/${id}`, { method:'PATCH', headers:headers(), body:JSON.stringify({ driver_id: driverInfo.driver.id }) });
      const json = await res.json();
      if (json.success) fetchData();
      else setError(json.error);
    } catch { setError('Erro ao vincular'); }
    finally { setSaving(false); }
  };

  const openEdit = () => {
    setEditForm({ name: item.name, phone: item.phone, email: item.email || '', region: item.region || '', vehicle_model: item.vehicle_model || '', vehicle_year: item.vehicle_year || '', four_doors: item.four_doors });
    setEditOpen(true);
  };

  if (loading) return <Container maxWidth="md" sx={{ mt:4 }}><Box sx={{ display:'flex', justifyContent:'center', py:8 }}><CircularProgress sx={{ color:'#b8960c' }} /></Box></Container>;
  if (!item) return <Container maxWidth="md" sx={{ mt:4 }}><Alert severity="error">Homologação não encontrada</Alert></Container>;

  const maskCpf = (cpf) => cpf ? `***.***.${cpf.slice(-6, -3)}-${cpf.slice(-2)}` : '—';

  return (
    <Container maxWidth="md" sx={{ mt:2, mb:4 }}>
      <Button component={Link} to="/admin/pet/homologations" startIcon={<ArrowBack />} size="small" sx={{ color:'#888', textTransform:'none', mb:2 }}>Voltar</Button>

      <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:3 }}>
        <Pets sx={{ color:'#b8960c', fontSize:24 }} />
        <Typography variant="h6" fontWeight="700" sx={{ color:'#E8E3D5' }}>{item.name}</Typography>
        <Chip label={item.status.replace(/_/g,' ')} size="small" sx={{ bgcolor: STATUS_COLORS[item.status] || '#666', color:'#000', fontWeight:600 }} />
      </Box>

      {error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Motorista oficial */}
      <Card sx={{ bgcolor:'#111217', border: driverInfo?.driver ? '1px solid #4caf50' : '1px solid #ff9800', mb:3 }}>
        <CardContent>
          {driverInfo?.driver ? (
            <Box>
              <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:1 }}>
                <CheckCircle sx={{ color:'#4caf50', fontSize:18 }} />
                <Typography variant="subtitle2" sx={{ color:'#4caf50' }}>
                  {driverInfo.linked ? 'Motorista oficial vinculado' : 'Motorista oficial encontrado (por telefone)'}
                </Typography>
              </Box>
              <Box sx={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:1, ml:3 }}>
                <Typography sx={{ color:'#ccc', fontSize:13 }}>Nome: {driverInfo.driver.name}</Typography>
                <Typography sx={{ color:'#ccc', fontSize:13 }}>Status: <Chip label={driverInfo.driver.status} size="small" sx={{ fontSize:10, height:18, bgcolor: driverInfo.driver.status === 'approved' ? '#4caf5033' : '#ff980033', color: driverInfo.driver.status === 'approved' ? '#4caf50' : '#ff9800' }} /></Typography>
                <Typography sx={{ color:'#ccc', fontSize:13 }}>Veículo: {driverInfo.driver.vehicle_model || '—'} {driverInfo.driver.vehicle_plate || ''}</Typography>
                <Typography sx={{ color:'#ccc', fontSize:13 }}>CPF: {maskCpf(driverInfo.driver.document_cpf)}</Typography>
                {driverInfo.driver.approved_at && <Typography sx={{ color:'#ccc', fontSize:13 }}>Aprovado em: {new Date(driverInfo.driver.approved_at).toLocaleDateString('pt-BR')}</Typography>}
              </Box>
              {!driverInfo.linked && (
                <Button onClick={handleLinkDriver} startIcon={<LinkIcon />} size="small" variant="outlined" sx={{ mt:1.5, ml:3, borderColor:'#4caf50', color:'#4caf50', textTransform:'none', fontSize:12 }}>
                  Vincular motorista
                </Button>
              )}
            </Box>
          ) : (
            <Box sx={{ display:'flex', alignItems:'center', gap:1 }}>
              <Warning sx={{ color:'#ff9800', fontSize:18 }} />
              <Typography sx={{ color:'#ff9800', fontSize:13 }}>
                Pré-cadastro Pet ainda não vinculado a motorista KAVIAR. Solicitar cadastro completo antes de aprovar.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Dados */}
      <Card sx={{ bgcolor:'#111217', border:'1px solid #222', mb:3 }}>
        <CardContent>
          <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:1 }}>
            <Typography variant="subtitle2" sx={{ color:'#E8E3D5' }}>Dados do pré-cadastro</Typography>
            <Button onClick={openEdit} startIcon={<Edit />} size="small" sx={{ color:'#b8960c', textTransform:'none', fontSize:12 }}>Editar</Button>
          </Box>
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
          {item.notes && <Box sx={{ mt:2 }}><Typography variant="caption" sx={{ color:'#888' }}>Notas</Typography><Typography sx={{ color:'#ccc', fontSize:13, whiteSpace:'pre-wrap' }}>{item.notes}</Typography></Box>}
        </CardContent>
      </Card>

      {/* Ações rápidas */}
      <Card sx={{ bgcolor:'#111217', border:'1px solid #222', mb:3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ color:'#E8E3D5', mb:1.5 }}>Ações rápidas</Typography>
          <Box sx={{ display:'flex', gap:1, flexWrap:'wrap' }}>
            <ActionButton icon={<WhatsApp />} label="Chamar no WhatsApp" color="#25D366" onClick={() => handleAction('WHATSAPP_OPENED', `Olá ${item.name}! Aqui é a Central KAVIAR Pet 🐾. Você se cadastrou para ser motorista certificado. Vou te acompanhar no processo de homologação. Pode falar?`)} />
            <ActionButton icon={<OndemandVideo />} label="Enviar treinamento" color="#FF9800" onClick={() => handleAction('TRAINING_SENT', `Olá ${item.name}! Seguem os vídeos de treinamento obrigatórios do KAVIAR Pet:\n📹 Vídeo 1 — Segurança: https://youtu.be/HAVkF30EIpg\n📹 Vídeo 2 — Higiene: https://youtu.be/48EpByNv3GI\nAssista os dois e me avise quando terminar para eu enviar o questionário.`)} />
            <ActionButton icon={<Quiz />} label="Enviar questionário" color="#2196F3" onClick={() => handleAction('QUESTIONNAIRE_SENT', `Olá ${item.name}! Agora responda o questionário de certificação (nota mínima 7/10):\n📝 https://forms.gle/rRc5rbCSSvcnEeVc6\nBoa sorte!`)} />
            <ActionButton icon={<CameraAlt />} label="Solicitar fotos" color="#9C27B0" onClick={() => handleAction('PHOTOS_REQUESTED', `Olá ${item.name}! Agora envie as fotos do veículo preparado:\n📸 1. Capa protetora instalada no banco traseiro\n📸 2. Kit de higienização visível\n📸 3. Banco traseiro (visão geral)\nPode enviar aqui mesmo neste chat.`)} />
          </Box>
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
              {logs.map((log) => (
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

      {/* Dialog editar */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx:{ bgcolor:'#1a1a2e', color:'#E8E3D5' } }}>
        <DialogTitle>Editar dados da homologação</DialogTitle>
        <DialogContent>
          <Box sx={{ display:'flex', flexDirection:'column', gap:2, mt:1 }}>
            <TextField label="Nome" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name:e.target.value})} fullWidth InputLabelProps={{ sx:{color:'#888'} }} InputProps={{ sx:{color:'#E8E3D5'} }} />
            <TextField label="WhatsApp" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone:e.target.value})} fullWidth InputLabelProps={{ sx:{color:'#888'} }} InputProps={{ sx:{color:'#E8E3D5'} }} />
            <TextField label="E-mail" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email:e.target.value})} fullWidth InputLabelProps={{ sx:{color:'#888'} }} InputProps={{ sx:{color:'#E8E3D5'} }} />
            <TextField label="Região" value={editForm.region || ''} onChange={e => setEditForm({...editForm, region:e.target.value})} fullWidth InputLabelProps={{ sx:{color:'#888'} }} InputProps={{ sx:{color:'#E8E3D5'} }} />
            <TextField label="Modelo do veículo" value={editForm.vehicle_model || ''} onChange={e => setEditForm({...editForm, vehicle_model:e.target.value})} fullWidth InputLabelProps={{ sx:{color:'#888'} }} InputProps={{ sx:{color:'#E8E3D5'} }} />
            <TextField label="Ano do veículo" value={editForm.vehicle_year || ''} onChange={e => setEditForm({...editForm, vehicle_year:e.target.value})} fullWidth InputLabelProps={{ sx:{color:'#888'} }} InputProps={{ sx:{color:'#E8E3D5'} }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} sx={{ color:'#888' }}>Cancelar</Button>
          <Button onClick={handleEdit} disabled={saving} variant="contained" sx={{ bgcolor:'#b8960c', '&:hover':{ bgcolor:'#d4af37' } }}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
