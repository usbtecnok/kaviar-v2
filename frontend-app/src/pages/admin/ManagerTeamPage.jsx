import { useState, useEffect, useRef } from 'react';
import { Box, Container, Typography, Card, CardContent, Button, TextField, Select, MenuItem, FormControl, InputLabel, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Snackbar, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Tooltip } from '@mui/material';
import { Add, Description, Print, ContentCopy, AccountBalance, Link as LinkIcon, Share } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const GOLD = '#B8942E';
const ROLES = [{ value: 'captador_motorista', label: 'Captador Motorista' }, { value: 'captador_passageiro', label: 'Captador Passageiro' }, { value: 'captador_comercio', label: 'Captador Comércio' }, { value: 'captador_associacao', label: 'Captador Associação' }, { value: 'parceiro_local', label: 'Parceiro Local' }, { value: 'suporte_local', label: 'Suporte Local' }, { value: 'outro', label: 'Outro' }];
const STATUS_MAP = { active: { label: 'Ativo', color: '#10B981' }, pending: { label: 'Pendente', color: '#F59E0B' }, inactive: { label: 'Inativo', color: '#6B7280' } };
const CONTRACT_MAP = { pending: { label: 'Pendente', color: '#F59E0B' }, delivered: { label: 'Entregue', color: '#3B82F6' }, signed: { label: 'Assinado', color: '#10B981' }, waived: { label: 'Dispensado', color: '#6B7280' } };
const COMMISSION_STATUS = { pending: { label: 'Pendente', color: '#F59E0B' }, agreed: { label: 'Combinado', color: '#3B82F6' }, paid_by_manager: { label: 'Pago pelo Gestor', color: '#10B981' }, canceled: { label: 'Cancelado', color: '#EF4444' } };

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
  const [commMember, setCommMember] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [commLoading, setCommLoading] = useState(false);
  const [commForm, setCommForm] = useState({ description: '', amount: '', reference_month: '', notes: '' });
  const [commFormOpen, setCommFormOpen] = useState(false);
  const [allComm, setAllComm] = useState([]);
  const [commMonth, setCommMonth] = useState('');
  const [leadStats, setLeadStats] = useState([]);
  const [leadsMember, setLeadsMember] = useState(null);
  const [leadsData, setLeadsData] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [linksMember, setLinksMember] = useState(null);

  const token = localStorage.getItem('kaviar_admin_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const admin = JSON.parse(localStorage.getItem('kaviar_admin_data') || '{}');

  const fetchMembers = async () => { setLoading(true); try { const res = await fetch(`${API_BASE_URL}/api/admin/manager/finance/team`, { headers }); const d = await res.json(); if (d.success) setMembers(d.data); } catch {} setLoading(false); };
  const fetchAllComm = async () => { try { const res = await fetch(`${API_BASE_URL}/api/admin/manager/finance/team-commissions`, { headers }); const d = await res.json(); if (d.success) setAllComm(d.data); } catch {} };
  const fetchLeadStats = async () => { try { const res = await fetch(`${API_BASE_URL}/api/admin/manager/finance/team-lead-stats`, { headers }); const d = await res.json(); if (d.success) setLeadStats(d.data); } catch {} };
  useEffect(() => {
    fetchMembers();
    fetchAllComm();
    fetchLeadStats();
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

  const openCommissions = async (m) => {
    setCommMember(m);
    setCommLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/manager/finance/team/${m.id}/commissions`, { headers });
      const d = await res.json();
      if (d.success) setCommissions(d.data);
    } catch {}
    setCommLoading(false);
  };

  const handleCommCreate = async () => {
    if (!commForm.description.trim() || !commForm.amount) return setSnack('Descrição e valor obrigatórios');
    const amount_cents = Math.round(parseFloat(commForm.amount) * 100);
    if (amount_cents <= 0) return setSnack('Valor deve ser maior que zero');
    const res = await fetch(`${API_BASE_URL}/api/admin/manager/finance/team/${commMember.id}/commissions`, { method: 'POST', headers, body: JSON.stringify({ description: commForm.description, amount_cents, reference_month: commForm.reference_month || null, notes: commForm.notes || null }) });
    const d = await res.json();
    if (d.success) { setCommFormOpen(false); setCommForm({ description: '', amount: '', reference_month: '', notes: '' }); openCommissions(commMember); fetchAllComm(); setSnack('Comissão registrada!'); } else setSnack(d.error || 'Erro');
  };

  const updateCommStatus = async (id, status) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/manager/finance/team/commissions/${id}`, { method: 'PATCH', headers, body: JSON.stringify({ status }) });
    const d = await res.json();
    if (d.success) { openCommissions(commMember); fetchAllComm(); setSnack(`Status: ${COMMISSION_STATUS[status]?.label}`); } else setSnack(d.error || 'Erro');
  };

  const isManager = admin.role === 'TERRITORIAL_MANAGER';

  const openLeadsMember = async (m) => {
    setLeadsMember(m);
    setLeadsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/crm/leads?captured_by_member_id=${m.id}&limit=50`, { headers });
      const d = await res.json();
      if (d.success) setLeadsData(d.data);
    } catch {}
    setLeadsLoading(false);
  };

  const openLinks = async (m) => {
    if (!m.public_referral_code) {
      const res = await fetch(`${API_BASE_URL}/api/admin/manager/finance/team/${m.id}/generate-code`, { method: 'POST', headers });
      const d = await res.json();
      if (d.success) { m.public_referral_code = d.data.public_referral_code; fetchMembers(); }
      else { setSnack(d.error || 'Erro ao gerar código'); return; }
    }
    setLinksMember(m);
  };

  const captarUrl = (code) => `https://app.kaviar.com.br/captar/${code}`;
  const copyLink = (url) => navigator.clipboard.writeText(url).then(() => setSnack('Link copiado!')).catch(() => setSnack('Erro ao copiar'));
  const shareWA = (url, tipo) => window.open(`https://wa.me/?text=${encodeURIComponent(`Cadastre-se na rede KAVIAR (${tipo}):\n${url}`)}`, '_blank');

  const filteredComm = commMonth ? allComm.filter(c => c.reference_month === commMonth) : allComm;
  const sumBy = (arr, status) => arr.filter(c => c.status === status).reduce((s, c) => s + c.amount_cents, 0);
  const commSummary = { pending: sumBy(filteredComm, 'pending'), agreed: sumBy(filteredComm, 'agreed'), paid: sumBy(filteredComm, 'paid_by_manager'), canceled: sumBy(filteredComm, 'canceled'), total: filteredComm.reduce((s, c) => s + c.amount_cents, 0) };
  const fmt = (cents) => `R$ ${(cents / 100).toFixed(2)}`;

  const copyReport = () => {
    const lines = [`Relatório interno do Gestor Territorial.`, `Os valores abaixo representam registros informativos de acordos internos entre gestor e membros da equipe. O KAVIAR não realiza pagamento automático, não retém valores e não se responsabiliza por esses acordos.`, '', `Período: ${commMonth || 'Todos'}`, `Gestor: ${admin.name || '—'}`, `Território: ${territoryName || '—'}`, '', `Pendente: ${fmt(commSummary.pending)}`, `Combinado: ${fmt(commSummary.agreed)}`, `Pago pelo Gestor: ${fmt(commSummary.paid)}`, `Cancelado: ${fmt(commSummary.canceled)}`, `Total geral: ${fmt(commSummary.total)}`, ''];
    const byMember = {};
    filteredComm.forEach(c => { const n = c.member?.name || 'Sem nome'; byMember[n] = (byMember[n] || 0) + c.amount_cents; });
    Object.entries(byMember).forEach(([name, total]) => lines.push(`  ${name}: ${fmt(total)}`));
    navigator.clipboard.writeText(lines.join('\n')).then(() => setSnack('Relatório copiado!')).catch(() => setSnack('Erro ao copiar'));
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FAFAF8', pt: 2, pb: 6 }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box><Typography variant="h6" sx={{ fontWeight: 700 }}><span style={{ color: GOLD }}>👥</span> Minha Equipe</Typography><Typography sx={{ color: '#6B7280', fontSize: 12 }}>Cadastro interno do Gestor Territorial</Typography></Box>
          <Button variant="contained" size="small" startIcon={<Add />} onClick={openNew} sx={{ bgcolor: GOLD, textTransform: 'none' }}>Novo Membro</Button>
        </Box>

        <Alert severity="info" sx={{ mb: 2, fontSize: 11 }}>Este cadastro é um controle interno do Gestor Territorial. O KAVIAR não realiza pagamentos automáticos aos membros da equipe do gestor e não cria vínculo financeiro direto com esses membros nesta fase.</Alert>

        {allComm.length > 0 && (
          <Card sx={{ mb: 2, bgcolor: '#fff', border: '1px solid #E8E5DE', borderRadius: 2 }}><CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Resumo Comissões Internas</Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField size="small" type="month" label="Filtrar mês" InputLabelProps={{ shrink: true }} value={commMonth} onChange={e => setCommMonth(e.target.value)} sx={{ width: 160 }} />
                {commMonth && <Button size="small" onClick={() => setCommMonth('')} sx={{ textTransform: 'none', fontSize: 10 }}>Limpar</Button>}
                <Button size="small" startIcon={<ContentCopy />} onClick={copyReport} sx={{ textTransform: 'none', fontSize: 10 }}>Copiar relatório</Button>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {[{ label: 'Pendente', value: commSummary.pending, color: '#F59E0B' }, { label: 'Combinado', value: commSummary.agreed, color: '#3B82F6' }, { label: 'Pago pelo Gestor', value: commSummary.paid, color: '#10B981' }, { label: 'Cancelado', value: commSummary.canceled, color: '#EF4444' }, { label: 'Total Geral', value: commSummary.total, color: GOLD }].map(s => (
                <Box key={s.label} sx={{ textAlign: 'center', minWidth: 90 }}>
                  <Typography sx={{ fontSize: 16, fontWeight: 800, color: s.color }}>{fmt(s.value)}</Typography>
                  <Typography sx={{ fontSize: 9, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</Typography>
                </Box>
              ))}
            </Box>
          </CardContent></Card>
        )}

        {members.length > 0 && (() => {
          const active = members.filter(m => m.status === 'active').length;
          const inactive = members.filter(m => m.status !== 'active').length;
          const termPending = members.filter(m => m.contract_status === 'pending').length;
          const termDelivered = members.filter(m => m.contract_status === 'delivered').length;
          const termSigned = members.filter(m => m.contract_status === 'signed').length;
          const byRole = ROLES.map(r => ({ ...r, count: members.filter(m => m.role_type === r.value).length })).filter(r => r.count > 0);

          const teamReportText = () => {
            const lines = ['Relatório interno da equipe do Gestor Territorial. Este relatório possui finalidade operacional e gerencial. Não representa vínculo empregatício, pagamento automático, comissão obrigatória ou obrigação financeira do KAVIAR.', '', `Gestor: ${admin.name || '—'}`, `Território: ${territoryName || '—'}`, `Data: ${new Date().toLocaleDateString('pt-BR')}`, '', `Total: ${members.length} | Ativos: ${active} | Inativos: ${inactive}`, `Termo Pendente: ${termPending} | Entregue: ${termDelivered} | Assinado: ${termSigned}`, '', 'Por função:'];
            byRole.forEach(r => lines.push(`  ${r.label}: ${r.count}`));
            lines.push('', 'Membros:');
            members.forEach(m => lines.push(`  ${m.name} | ${ROLES.find(r => r.value === m.role_type)?.label || m.role_type} | ${STATUS_MAP[m.status]?.label || m.status} | Termo: ${CONTRACT_MAP[m.contract_status]?.label || 'Pendente'}`));
            return lines.join('\n');
          };

          const copyTeamReport = () => navigator.clipboard.writeText(teamReportText()).then(() => setSnack('Relatório copiado!')).catch(() => setSnack('Erro ao copiar'));
          const printTeamReport = () => { const w = window.open('', '_blank'); w.document.write(`<html><head><title>Equipe - ${admin.name}</title><style>body{font-family:Arial,sans-serif;padding:40px;white-space:pre-wrap;line-height:1.6;font-size:13px;}</style></head><body>${teamReportText().replace(/\n/g, '<br>')}</body></html>`); w.document.close(); w.print(); };

          return (
            <Card sx={{ mb: 2, bgcolor: '#fff', border: '1px solid #E8E5DE', borderRadius: 2 }}><CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Resumo da Equipe</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" startIcon={<ContentCopy />} onClick={copyTeamReport} sx={{ textTransform: 'none', fontSize: 10 }}>Copiar relatório</Button>
                  <Button size="small" startIcon={<Print />} onClick={printTeamReport} sx={{ textTransform: 'none', fontSize: 10 }}>Imprimir</Button>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
                {[{ label: 'Total', value: members.length, color: GOLD }, { label: 'Ativos', value: active, color: '#10B981' }, { label: 'Inativos', value: inactive, color: '#6B7280' }, { label: 'Termo Pendente', value: termPending, color: '#F59E0B' }, { label: 'Termo Entregue', value: termDelivered, color: '#3B82F6' }, { label: 'Termo Assinado', value: termSigned, color: '#10B981' }].map(s => (
                  <Box key={s.label} sx={{ textAlign: 'center', minWidth: 70 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</Typography>
                    <Typography sx={{ fontSize: 9, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</Typography>
                  </Box>
                ))}
              </Box>
              {byRole.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {byRole.map(r => <Chip key={r.value} label={`${r.label}: ${r.count}`} size="small" sx={{ fontSize: 10 }} />)}
                </Box>
              )}
            </CardContent></Card>
          );
        })()}

        {loading ? <CircularProgress sx={{ color: GOLD }} /> : members.length > 0 ? (
          <Card sx={{ bgcolor: '#fff', border: '1px solid #E8E5DE', borderRadius: 2 }}><CardContent sx={{ p: 2 }}>
            <Table size="small"><TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 11, color: '#6B7280', textTransform: 'uppercase' } }}>
              <TableCell>Nome</TableCell><TableCell>Função</TableCell><TableCell>Telefone</TableCell><TableCell>Status</TableCell><TableCell>Termo</TableCell><TableCell>Leads</TableCell><TableCell>Ações</TableCell>
            </TableRow></TableHead><TableBody>
              {members.map(m => (
                <TableRow key={m.id} hover>
                  <TableCell><Typography sx={{ fontWeight: 600, fontSize: 13 }}>{m.name}</Typography>{m.cpf && <Typography sx={{ fontSize: 10, color: '#6B7280' }}>CPF: {m.cpf}</Typography>}</TableCell>
                  <TableCell><Chip label={ROLES.find(r => r.value === m.role_type)?.label || m.role_type} size="small" sx={{ fontSize: 10 }} /></TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{m.phone || '—'}</TableCell>
                  <TableCell><Chip label={STATUS_MAP[m.status]?.label || m.status} size="small" sx={{ bgcolor: `${STATUS_MAP[m.status]?.color}15`, color: STATUS_MAP[m.status]?.color, fontSize: 10 }} /></TableCell>
                  <TableCell><Chip label={CONTRACT_MAP[m.contract_status]?.label || 'Pendente'} size="small" sx={{ bgcolor: `${CONTRACT_MAP[m.contract_status]?.color || '#F59E0B'}15`, color: CONTRACT_MAP[m.contract_status]?.color || '#F59E0B', fontSize: 10 }} /></TableCell>
                  <TableCell><Chip label={`${leadStats.find(s => s.member_id === m.id)?.total_leads || 0} leads`} size="small" onClick={() => openLeadsMember(m)} sx={{ cursor: 'pointer', fontSize: 10, bgcolor: (leadStats.find(s => s.member_id === m.id)?.total_leads || 0) > 0 ? '#EEF2FF' : undefined, color: (leadStats.find(s => s.member_id === m.id)?.total_leads || 0) > 0 ? '#4F46E5' : '#6B7280' }} /></TableCell>
                  <TableCell>
                    <Button size="small" startIcon={<LinkIcon />} onClick={() => openLinks(m)} sx={{ textTransform: 'none', fontSize: 10, color: '#8B5CF6' }}>Links</Button>
                    <Button size="small" startIcon={<Description />} onClick={() => setTermoMember(m)} sx={{ textTransform: 'none', fontSize: 10, color: GOLD }}>Ver Termo</Button>
                    <Button size="small" startIcon={<AccountBalance />} onClick={() => openCommissions(m)} sx={{ textTransform: 'none', fontSize: 10, color: '#6366F1' }}>Comissões</Button>
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

      {/* Links Modal */}
      <Dialog open={!!linksMember} onClose={() => setLinksMember(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinkIcon sx={{ color: '#8B5CF6' }} /> Links de Captação — {linksMember?.name}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 11, color: '#6B7280', mb: 2 }}>Código: <strong>{linksMember?.public_referral_code}</strong></Typography>
          {linksMember?.public_referral_code && [
            { tipo: 'Motorista', value: 'DRIVER' },
            { tipo: 'Passageiro', value: 'PASSENGER' },
            { tipo: 'Comércio Local', value: 'LOCAL_BUSINESS' },
            { tipo: 'Associação', value: 'ASSOCIATION' },
            { tipo: 'Parceiro', value: 'PARTNER' },
          ].map(t => {
            const url = captarUrl(linksMember.public_referral_code);
            return (
              <Box key={t.value} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #F3F4F6' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{t.tipo}</Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Button size="small" startIcon={<ContentCopy />} onClick={() => copyLink(url)} sx={{ textTransform: 'none', fontSize: 10 }}>Copiar</Button>
                  <Button size="small" startIcon={<Share />} onClick={() => shareWA(url, t.tipo)} sx={{ textTransform: 'none', fontSize: 10, color: '#25D366' }}>WhatsApp</Button>
                </Box>
              </Box>
            );
          })}
        </DialogContent>
        <DialogActions><Button onClick={() => setLinksMember(null)} sx={{ textTransform: 'none' }}>Fechar</Button></DialogActions>
      </Dialog>

      {/* Leads por Membro Modal */}
      <Dialog open={!!leadsMember} onClose={() => setLeadsMember(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Leads captados — {leadsMember?.name}</DialogTitle>
        <DialogContent>
          {leadsLoading ? <CircularProgress size={20} /> : leadsData.length > 0 ? (
            <Table size="small">
              <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 10, color: '#6B7280', textTransform: 'uppercase' } }}>
                <TableCell>Nome</TableCell><TableCell>Tipo</TableCell><TableCell>Status</TableCell><TableCell>Origem</TableCell><TableCell>Criado</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {leadsData.map(l => (
                  <TableRow key={l.id} hover>
                    <TableCell sx={{ fontSize: 12 }}>{l.name}{l.business_name && <Typography sx={{ fontSize: 10, color: '#6B7280' }}>{l.business_name}</Typography>}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{l.lead_type}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{l.status}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{l.source}</TableCell>
                    <TableCell sx={{ fontSize: 11, color: '#6B7280' }}>{l.created_at ? new Date(l.created_at).toLocaleDateString('pt-BR') : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <Typography sx={{ fontSize: 12, color: '#6B7280' }}>Nenhum lead captado por este membro.</Typography>}
        </DialogContent>
        <DialogActions><Button onClick={() => setLeadsMember(null)} sx={{ textTransform: 'none' }}>Fechar</Button></DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />

      {/* Commissions Modal */}
      <Dialog open={!!commMember} onClose={() => { setCommMember(null); setCommFormOpen(false); }} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountBalance sx={{ color: '#6366F1' }} /> Comissões — {commMember?.name}
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, fontSize: 10 }} icon={false}>
            ⚠️ Os valores registrados aqui são informativos e representam acordos internos entre o Gestor Territorial e os membros de sua equipe. O KAVIAR não realiza pagamento automático, não retém valores e não se responsabiliza por esses acordos. Este registro não substitui contrato, recibo, nota fiscal ou orientação contábil.
          </Alert>

          {commissions.length > 0 && (
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              {[{ label: 'Pendente', s: 'pending', color: '#F59E0B' }, { label: 'Combinado', s: 'agreed', color: '#3B82F6' }, { label: 'Pago', s: 'paid_by_manager', color: '#10B981' }, { label: 'Cancelado', s: 'canceled', color: '#EF4444' }].map(x => (
                <Box key={x.s} sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: x.color }}>{fmt(commissions.filter(c => c.status === x.s).reduce((s, c) => s + c.amount_cents, 0))}</Typography>
                  <Typography sx={{ fontSize: 9, color: '#6B7280' }}>{x.label}</Typography>
                </Box>
              ))}
            </Box>
          )}

          {isManager && (
            commMember?.contract_status !== 'signed'
              ? <Tooltip title="Membro deve ter termo assinado"><span><Button variant="contained" size="small" disabled startIcon={<Add />} sx={{ mb: 2, textTransform: 'none' }}>Registrar comissão</Button></span></Tooltip>
              : <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setCommFormOpen(true)} sx={{ mb: 2, bgcolor: '#6366F1', textTransform: 'none' }}>Registrar comissão</Button>
          )}

          {commFormOpen && (
            <Card sx={{ mb: 2, p: 2, border: '1px solid #E8E5DE' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <TextField label="Descrição *" size="small" value={commForm.description} onChange={e => setCommForm(f => ({ ...f, description: e.target.value }))} />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField label="Valor (R$) *" size="small" type="number" inputProps={{ step: '0.01', min: '0.01' }} value={commForm.amount} onChange={e => setCommForm(f => ({ ...f, amount: e.target.value }))} sx={{ width: 150 }} />
                  <TextField label="Mês referência" size="small" type="month" InputLabelProps={{ shrink: true }} value={commForm.reference_month} onChange={e => setCommForm(f => ({ ...f, reference_month: e.target.value }))} sx={{ width: 180 }} />
                </Box>
                <TextField label="Observações" size="small" multiline rows={1} value={commForm.notes} onChange={e => setCommForm(f => ({ ...f, notes: e.target.value }))} />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="contained" size="small" onClick={handleCommCreate} sx={{ bgcolor: '#6366F1', textTransform: 'none' }}>Salvar</Button>
                  <Button size="small" onClick={() => setCommFormOpen(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
                </Box>
              </Box>
            </Card>
          )}

          {commLoading ? <CircularProgress size={20} /> : commissions.length > 0 ? (
            <Table size="small">
              <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 10, color: '#6B7280', textTransform: 'uppercase' } }}>
                <TableCell>Descrição</TableCell><TableCell>Valor</TableCell><TableCell>Ref.</TableCell><TableCell>Status</TableCell>{isManager && <TableCell>Ações</TableCell>}
              </TableRow></TableHead>
              <TableBody>
                {commissions.map(c => (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ fontSize: 12 }}>{c.description}{c.notes && <Typography sx={{ fontSize: 10, color: '#9CA3AF' }}>{c.notes}</Typography>}</TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>R$ {(c.amount_cents / 100).toFixed(2)}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{c.reference_month || '—'}</TableCell>
                    <TableCell><Chip label={COMMISSION_STATUS[c.status]?.label || c.status} size="small" sx={{ bgcolor: `${COMMISSION_STATUS[c.status]?.color || '#6B7280'}15`, color: COMMISSION_STATUS[c.status]?.color || '#6B7280', fontSize: 10 }} /></TableCell>
                    {isManager && <TableCell>
                      {c.status === 'pending' && <Button size="small" onClick={() => updateCommStatus(c.id, 'agreed')} sx={{ textTransform: 'none', fontSize: 9, color: '#3B82F6' }}>Marcar como combinado</Button>}
                      {(c.status === 'pending' || c.status === 'agreed') && <Button size="small" onClick={() => updateCommStatus(c.id, 'paid_by_manager')} sx={{ textTransform: 'none', fontSize: 9, color: '#10B981' }}>Registrar como pago pelo gestor</Button>}
                      {c.status !== 'canceled' && c.status !== 'paid_by_manager' && <Button size="small" onClick={() => updateCommStatus(c.id, 'canceled')} sx={{ textTransform: 'none', fontSize: 9, color: '#EF4444' }}>Cancelar registro</Button>}
                    </TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <Typography sx={{ fontSize: 12, color: '#6B7280' }}>Nenhuma comissão registrada.</Typography>}
        </DialogContent>
        <DialogActions><Button onClick={() => { setCommMember(null); setCommFormOpen(false); }} sx={{ textTransform: 'none' }}>Fechar</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
