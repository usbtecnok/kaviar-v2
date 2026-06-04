import { useState, useEffect, useRef } from 'react';
import { Box, Container, Typography, Card, CardContent, Button, TextField, Select, MenuItem, FormControl, InputLabel, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Snackbar, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress } from '@mui/material';
import { Add, Description, Print, ContentCopy } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const GOLD = '#B8942E';
const ROLES = [{ value: 'captador_motorista', label: 'Captador Motorista' }, { value: 'captador_passageiro', label: 'Captador Passageiro' }, { value: 'captador_comercio', label: 'Captador Comércio' }, { value: 'captador_associacao', label: 'Captador Associação' }, { value: 'parceiro_local', label: 'Parceiro Local' }, { value: 'suporte_local', label: 'Suporte Local' }, { value: 'outro', label: 'Outro' }];
const STATUS_MAP = { active: { label: 'Ativo', color: '#10B981' }, pending: { label: 'Pendente', color: '#F59E0B' }, inactive: { label: 'Inativo', color: '#6B7280' } };
const CONTRACT_MAP = { pending: { label: 'Pendente', color: '#F59E0B' }, delivered: { label: 'Entregue', color: '#3B82F6' }, signed: { label: 'Assinado', color: '#10B981' }, waived: { label: 'Dispensado', color: '#6B7280' } };

export default function ManagerTeamPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', role_type: 'outro', notes: '', cpf: '', address: '', city: '', state: '', zipcode: '', pix_key: '', pix_key_type: '' });
  const [termoMember, setTermoMember] = useState(null);
  const [territoryName, setTerritoryName] = useState('');
  const termoRef = useRef(null);

  const token = localStorage.getItem('kaviar_admin_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const admin = JSON.parse(localStorage.getItem('kaviar_admin_data') || '{}');

  const fetchMembers = async () => { setLoading(true); try { const res = await fetch(`${API_BASE_URL}/api/admin/manager/finance/team`, { headers }); const d = await res.json(); if (d.success) setMembers(d.data); } catch {} setLoading(false); };
  useEffect(() => {
    fetchMembers();
    fetch(`${API_BASE_URL}/api/admin/my-operator-profile`, { headers }).then(r => r.json()).then(d => { if (d.success && d.data?.territory?.name) setTerritoryName(d.data.territory.name); }).catch(() => {});
  }, []);

  const openNew = () => { setEditId(null); setForm({ name: '', phone: '', role_type: 'outro', notes: '', cpf: '', address: '', city: '', state: '', zipcode: '', pix_key: '', pix_key_type: '' }); setDialogOpen(true); };
  const openEdit = (m) => { setEditId(m.id); setForm({ name: m.name, phone: m.phone || '', role_type: m.role_type, notes: m.notes || '', cpf: m.cpf || '', address: m.address || '', city: m.city || '', state: m.state || '', zipcode: m.zipcode || '', pix_key: m.pix_key || '', pix_key_type: m.pix_key_type || '' }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) return setSnack('Nome obrigatório');
    const url = editId ? `${API_BASE_URL}/api/admin/manager/finance/team/${editId}` : `${API_BASE_URL}/api/admin/manager/finance/team`;
    const res = await fetch(url, { method: editId ? 'PATCH' : 'POST', headers, body: JSON.stringify(form) });
    const d = await res.json();
    if (d.success) { setDialogOpen(false); fetchMembers(); setSnack(editId ? 'Atualizado!' : 'Cadastrado!'); } else setSnack(d.error || 'Erro');
  };

  const updateContract = async (id, contract_status) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/manager/finance/team/${id}`, { method: 'PATCH', headers, body: JSON.stringify({ contract_status }) });
    const d = await res.json();
    if (d.success) { fetchMembers(); setSnack(`Termo: ${CONTRACT_MAP[contract_status]?.label}`); } else setSnack(d.error || 'Erro');
  };

  const toggleStatus = async (m) => {
    await fetch(`${API_BASE_URL}/api/admin/manager/finance/team/${m.id}`, { method: 'PATCH', headers, body: JSON.stringify({ status: m.status === 'active' ? 'inactive' : 'active' }) });
    fetchMembers();
  };

  const getTermoText = (m) => {
    const roleLabel = ROLES.find(r => r.value === m.role_type)?.label || m.role_type;
    const hoje = new Date().toLocaleDateString('pt-BR');
    return `TERMO DE COMPROMISSO — MEMBRO DA EQUIPE DO GESTOR TERRITORIAL\nVersão: v1.0-equipe\n\nPelo presente termo, o(a) Sr(a). ${m.name || '___'}${m.cpf ? `, CPF ${m.cpf}` : ''}${m.phone ? `, telefone ${m.phone}` : ''}, na função de ${roleLabel}, declara que integra a equipe do Gestor Territorial ${admin.name || '___'}, atuando no território "${territoryName || '(não definido)'}".\n\nO membro compromete-se a:\n1. Atuar de acordo com as diretrizes do KAVIAR;\n2. Respeitar as orientações do Gestor Territorial;\n3. Manter sigilo sobre informações operacionais;\n4. Não realizar captações fora do território designado;\n5. Reportar atividades ao Gestor Territorial responsável.\n\nO Gestor Territorial é responsável pelo acompanhamento e gestão do membro.\n\nData: ${hoje}\nGestor: ${admin.name || '___'}\nTerritório: ${territoryName || '(não definido)'}\nMembro: ${m.name || '___'}\n\n___________________________\nAssinatura do Membro\n\n___________________________\nAssinatura do Gestor Territorial`;
  };

  const handlePrint = () => {
    const content = termoRef.current?.innerText;
    if (!content) return;
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Termo - ${termoMember?.name}</title><style>body{font-family:Arial,sans-serif;padding:40px;white-space:pre-wrap;line-height:1.6;font-size:14px;}</style></head><body>${content.replace(/\n/g, '<br>')}</body></html>`);
    w.document.close();
    w.print();
  };

  const handleCopy = () => {
    const text = getTermoText(termoMember);
    navigator.clipboard.writeText(text).then(() => setSnack('Texto copiado!')).catch(() => setSnack('Erro ao copiar'));
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FAFAF8', pt: 2, pb: 6 }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box><Typography variant="h6" sx={{ fontWeight: 700 }}><span style={{ color: GOLD }}>👥</span> Minha Equipe</Typography><Typography sx={{ color: '#6B7280', fontSize: 12 }}>Cadastro interno do Gestor Territorial</Typography></Box>
          <Button variant="contained" size="small" startIcon={<Add />} onClick={openNew} sx={{ bgcolor: GOLD, textTransform: 'none' }}>Novo Membro</Button>
        </Box>

        <Alert severity="info" sx={{ mb: 2, fontSize: 11 }}>Este cadastro é um controle interno do Gestor Territorial. O KAVIAR não realiza pagamentos automáticos aos membros da equipe do gestor e não cria vínculo financeiro direto com esses membros nesta fase.</Alert>

        {loading ? <CircularProgress sx={{ color: GOLD }} /> : members.length > 0 ? (
          <Card sx={{ bgcolor: '#fff', border: '1px solid #E8E5DE', borderRadius: 2 }}><CardContent sx={{ p: 2 }}>
            <Table size="small"><TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 11, color: '#6B7280', textTransform: 'uppercase' } }}>
              <TableCell>Nome</TableCell><TableCell>Função</TableCell><TableCell>Telefone</TableCell><TableCell>Status</TableCell><TableCell>Termo</TableCell><TableCell>Ações</TableCell>
            </TableRow></TableHead><TableBody>
              {members.map(m => (
                <TableRow key={m.id} hover>
                  <TableCell><Typography sx={{ fontWeight: 600, fontSize: 13 }}>{m.name}</Typography>{m.cpf && <Typography sx={{ fontSize: 10, color: '#6B7280' }}>CPF: {m.cpf}</Typography>}</TableCell>
                  <TableCell><Chip label={ROLES.find(r => r.value === m.role_type)?.label || m.role_type} size="small" sx={{ fontSize: 10 }} /></TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{m.phone || '—'}</TableCell>
                  <TableCell><Chip label={STATUS_MAP[m.status]?.label || m.status} size="small" sx={{ bgcolor: `${STATUS_MAP[m.status]?.color}15`, color: STATUS_MAP[m.status]?.color, fontSize: 10 }} /></TableCell>
                  <TableCell><Chip label={CONTRACT_MAP[m.contract_status]?.label || 'Pendente'} size="small" sx={{ bgcolor: `${CONTRACT_MAP[m.contract_status]?.color || '#F59E0B'}15`, color: CONTRACT_MAP[m.contract_status]?.color || '#F59E0B', fontSize: 10 }} /></TableCell>
                  <TableCell>
                    <Button size="small" startIcon={<Description />} onClick={() => setTermoMember(m)} sx={{ textTransform: 'none', fontSize: 10, color: GOLD }}>Ver Termo</Button>
                    <Button size="small" onClick={() => openEdit(m)} sx={{ textTransform: 'none', fontSize: 11 }}>Editar</Button>
                    {m.contract_status === 'pending' && <Button size="small" onClick={() => updateContract(m.id, 'delivered')} sx={{ textTransform: 'none', fontSize: 10, color: '#3B82F6' }}>Entregue</Button>}
                    {(m.contract_status === 'pending' || m.contract_status === 'delivered') && <Button size="small" onClick={() => updateContract(m.id, 'signed')} sx={{ textTransform: 'none', fontSize: 10, color: '#10B981' }}>Assinado</Button>}
                    <Button size="small" onClick={() => toggleStatus(m)} sx={{ textTransform: 'none', fontSize: 10, color: m.status === 'active' ? '#EF4444' : '#10B981' }}>{m.status === 'active' ? 'Inativar' : 'Ativar'}</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </CardContent></Card>
        ) : <Alert severity="warning">Nenhum membro cadastrado.</Alert>}

        <Alert severity="warning" sx={{ mt: 2, fontSize: 11 }} icon={false}>
          ⚠️ Este controle é manual e registra a informação prestada pelo Gestor Territorial. Não representa assinatura digital certificada pelo KAVIAR.
        </Alert>
      </Container>

      {/* Termo Modal */}
      <Dialog open={!!termoMember} onClose={() => setTermoMember(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Description sx={{ color: GOLD }} /> Termo — Membro da Equipe
        </DialogTitle>
        <DialogContent>
          {termoMember && (
            <Box ref={termoRef} sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.7, p: 2, bgcolor: '#FAFAF8', borderRadius: 1, border: '1px solid #E8E5DE' }}>
              {getTermoText(termoMember)}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
          <Box>
            <Button startIcon={<Print />} onClick={handlePrint} sx={{ textTransform: 'none', fontSize: 12 }}>Imprimir</Button>
            <Button startIcon={<ContentCopy />} onClick={handleCopy} sx={{ textTransform: 'none', fontSize: 12 }}>Copiar texto</Button>
          </Box>
          <Button onClick={() => setTermoMember(null)} variant="outlined" sx={{ textTransform: 'none' }}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{editId ? 'Editar Membro' : 'Novo Membro da Equipe'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="Nome completo *" size="small" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField label="Telefone/WhatsApp" size="small" fullWidth value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <TextField label="CPF" size="small" fullWidth value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} />
          </Box>
          <TextField label="Endereço" size="small" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField label="Cidade" size="small" fullWidth value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            <TextField label="UF" size="small" sx={{ width: 80 }} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
            <TextField label="CEP" size="small" sx={{ width: 120 }} value={form.zipcode} onChange={e => setForm(f => ({ ...f, zipcode: e.target.value }))} />
          </Box>
          <FormControl size="small"><InputLabel>Função</InputLabel><Select value={form.role_type} label="Função" onChange={e => setForm(f => ({ ...f, role_type: e.target.value }))}>{ROLES.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}</Select></FormControl>
          <Alert severity="warning" sx={{ fontSize: 10, py: 0.5 }}>Chave Pix informada ao Gestor — dado interno. O KAVIAR não realiza pagamento automático ao membro.</Alert>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControl size="small" sx={{ width: 140 }}><InputLabel>Tipo Pix</InputLabel><Select value={form.pix_key_type} label="Tipo Pix" onChange={e => setForm(f => ({ ...f, pix_key_type: e.target.value }))}><MenuItem value="">—</MenuItem><MenuItem value="cpf">CPF</MenuItem><MenuItem value="cnpj">CNPJ</MenuItem><MenuItem value="email">Email</MenuItem><MenuItem value="phone">Telefone</MenuItem><MenuItem value="random">Aleatória</MenuItem></Select></FormControl>
            <TextField label="Chave Pix (opcional)" size="small" fullWidth value={form.pix_key} onChange={e => setForm(f => ({ ...f, pix_key: e.target.value }))} />
          </Box>
          <TextField label="Observações" size="small" multiline rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </DialogContent>
        <DialogActions><Button onClick={() => setDialogOpen(false)}>Cancelar</Button><Button variant="contained" onClick={handleSave} sx={{ bgcolor: GOLD }}>Salvar</Button></DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}
