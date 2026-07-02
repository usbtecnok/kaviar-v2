import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Select, MenuItem, FormControl, InputLabel, Button, IconButton, Drawer, Divider,
  CircularProgress, Alert, Pagination, Dialog, DialogTitle, DialogContent, DialogActions,
  Snackbar, Tooltip, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import { Add, Download, Close, Phone, Email, Business, AccessTime, FilterList, Store, Apartment, Warning, LocationOn, WhatsApp } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';
import { formatDate } from '../../utils/formatDate';
import { openDriverWhatsAppInvite, openPassengerWhatsAppInvite } from '../../utils/whatsappInvite';

const GOLD = '#B8942E';

const STATUS_MAP = {
  NEW: { label: '📥 Entrada', color: '#3B82F6' },
  CONTACTED: { label: '📞 Em contato', color: '#8B5CF6' },
  INTERESTED: { label: '🤝 Interessado', color: '#F59E0B' },
  WAITING_DOCUMENTS: { label: '📄 Aguard. Docs', color: '#F97316' },
  WAITING_CONTRACT: { label: '📝 Aguard. Contrato', color: '#EC4899' },
  WAITING_APPROVAL: { label: '⏳ Aguard. Aprovação', color: '#6366F1' },
  ACTIVE: { label: '✅ Ativo', color: '#10B981' },
  LOST: { label: '❌ Perdido', color: '#6B7280' },
  REJECTED: { label: '🚫 Rejeitado', color: '#EF4444' },
  PAUSED: { label: '⏸️ Pausado', color: '#9CA3AF' },
};

const PRIORITY_MAP = {
  LOW: { label: 'Baixa', color: '#9CA3AF', icon: '○' },
  NORMAL: { label: 'Normal', color: '#6B7280', icon: '●' },
  HIGH: { label: 'Alta', color: '#F59E0B', icon: '▲' },
  URGENT: { label: 'Urgente', color: '#EF4444', icon: '🔴' },
};

const LEAD_TYPES = [
  { value: 'TERRITORIAL_MANAGER', label: 'Gestor Territorial' },
  { value: 'ASSOCIATION', label: 'Associação' },
  { value: 'DRIVER', label: 'Motorista' },
  { value: 'PASSENGER', label: 'Passageiro' },
  { value: 'LOCAL_BUSINESS', label: 'Comércio Local' },
  { value: 'RESTAURANT', label: 'Restaurante' },
  { value: 'BAKERY', label: 'Padaria' },
  { value: 'PIZZERIA', label: 'Pizzaria' },
  { value: 'SNACK_BAR', label: 'Lanchonete' },
  { value: 'MARKET', label: 'Mercado' },
  { value: 'PHARMACY', label: 'Farmácia' },
  { value: 'PET_SHOP', label: 'Pet Shop' },
  { value: 'BEAUTY_SALON', label: 'Salão de Beleza' },
  { value: 'WORKSHOP', label: 'Oficina' },
  { value: 'PRIVATE_RIDE_CLIENT', label: 'Cliente Particular' },
  { value: 'PET_DRIVER', label: 'Motorista Pet' },
  { value: 'PARTNER', label: 'Parceiro' },
  { value: 'ADVERTISER', label: 'Anunciante' },
  { value: 'SUPPORT_POINT', label: 'Ponto de Apoio' },
  { value: 'OTHER', label: 'Outro' },
];

const SOURCES = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'MANAGER_REFERRAL', label: 'Indicação Gestor' },
  { value: 'TEAM_MEMBER_REFERRAL', label: 'Indicação da Equipe' },
  { value: 'PET_FORM', label: 'Formulário Pet' },
  { value: 'PRIVATE_RIDE', label: 'Corrida Particular' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'ASSOCIATION', label: 'Associação' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'LOCAL_VISIT', label: 'Visita Local' },
  { value: 'LOCAL_BUSINESS_PROSPECTION', label: 'Prospecção Comércio' },
  { value: 'OTHER', label: 'Outro' },
];

const ROLES_SHORT = { captador_motorista: 'Mot.', captador_passageiro: 'Pass.', captador_comercio: 'Com.', captador_associacao: 'Assoc.', parceiro_local: 'Parc.', suporte_local: 'Sup.', outro: 'Outro' };

const EVENT_TYPES = [
  { value: 'NOTE', label: 'Observação' },
  { value: 'CALL', label: 'Ligação' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'LOCAL_VISIT', label: 'Visita Local' },
  { value: 'PROPOSAL_SENT', label: 'Proposta Enviada' },
  { value: 'DOCUMENT_RECEIVED', label: 'Documento Recebido' },
  { value: 'CONTRACT_SENT', label: 'Contrato Enviado' },
  { value: 'PARTNERSHIP_DISCUSSION', label: 'Discussão Parceria' },
  { value: 'SHOWCASE_DISCUSSION', label: 'Discussão Vitrine' },
  { value: 'OTHER', label: 'Outro' },
];

function isOverdue(d) { return d && new Date(d) < new Date(); }
function isMissing(v) { return !v || v.trim() === ''; }

export default function CrmPage() {
  const [stats, setStats] = useState({});
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');

  // Filters
  const [filters, setFilters] = useState({ status: '', lead_type: '', source: '', search: '', priority: '', date_from: '', date_to: '', captured_by_member_id: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [periodFilter, setPeriodFilter] = useState('');

  // Drawer
  const [selectedLead, setSelectedLead] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [interactions, setInteractions] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', business_name: '', phone: '', email: '', lead_type: 'OTHER', source: 'MANUAL', priority: 'NORMAL', business_category: '', business_address: '', contact_person: '', notes: '', next_action: '', captured_by_member_id: '' });

  // Interaction dialog
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [interactionForm, setInteractionForm] = useState({ event_type: 'NOTE', description: '' });

  // Status change dialog
  const [statusOpen, setStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  const adminData = localStorage.getItem('kaviar_admin_data');
  const admin = adminData ? JSON.parse(adminData) : null;
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';
  const token = localStorage.getItem('kaviar_admin_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const [teamMembers, setTeamMembers] = useState([]);
  const [territoryInfo, setTerritoryInfo] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/crm/stats`, { headers });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch {}
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30' });
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await fetch(`${API_BASE_URL}/api/admin/crm/leads?${params}`, { headers });
      const data = await res.json();
      if (data.success) { setLeads(data.data); setTotal(data.total); }
      else setError(data.error || 'Erro');
    } catch { setError('Erro de conexão'); }
    setLoading(false);
  }, [page, filters]);

  useEffect(() => { fetchStats(); fetch(`${API_BASE_URL}/api/admin/manager/finance/team`, { headers }).then(r => r.json()).then(d => { if (d.success) setTeamMembers(d.data); }).catch(() => {}); if (!isSuperAdmin) { fetch(`${API_BASE_URL}/api/admin/territory-floors?territory_id=${admin?.territory_id || ''}`, { headers }).catch(() => {}); fetch(`${API_BASE_URL}/api/admin/my-operator-profile/territory-info`, { headers }).then(r => r.json()).then(d => { if (d.success) setTerritoryInfo(d.data); }).catch(() => {}); } }, [fetchStats]);
  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Period filter helper
  const applyPeriod = (period) => {
    setPeriodFilter(period);
    const now = new Date();
    let date_from = '';
    if (period === 'today') {
      date_from = now.toISOString().slice(0, 10);
    } else if (period === 'week') {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      date_from = d.toISOString().slice(0, 10);
    }
    setFilters(f => ({ ...f, date_from, date_to: '' }));
    setPage(1);
  };

  const openDetail = async (lead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/crm/leads/${lead.id}`, { headers });
      const data = await res.json();
      if (data.success) { setSelectedLead(data.data); setInteractions(data.data.interactions || []); }
    } catch {}
    setLoadingDetail(false);
  };

  const openCreateWith = (preset) => {
    setCreateForm({ name: '', business_name: '', phone: '', email: '', lead_type: 'OTHER', source: 'MANUAL', priority: 'NORMAL', business_category: '', business_address: '', contact_person: '', notes: '', next_action: '', captured_by_member_id: '', ...preset });
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) return setSnack('Nome é obrigatório');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/crm/leads`, { method: 'POST', headers, body: JSON.stringify(createForm) });
      const data = await res.json();
      if (data.success) { setCreateOpen(false); fetchLeads(); fetchStats(); setSnack('Lead criado!'); }
      else setSnack(data.error || 'Erro');
    } catch { setSnack('Erro de conexão'); }
  };

  const handleStatusChange = async () => {
    if (!newStatus || !selectedLead) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/crm/leads/${selectedLead.id}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status: newStatus }) });
      const data = await res.json();
      if (data.success) { setStatusOpen(false); setSelectedLead({ ...selectedLead, status: newStatus }); fetchLeads(); fetchStats(); setSnack('Status atualizado!'); }
      else setSnack(data.error || 'Erro');
    } catch { setSnack('Erro'); }
  };

  const handleAddInteraction = async () => {
    if (!interactionForm.event_type || !selectedLead) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/crm/leads/${selectedLead.id}/interactions`, { method: 'POST', headers, body: JSON.stringify(interactionForm) });
      const data = await res.json();
      if (data.success) { setInteractionOpen(false); setInteractionForm({ event_type: 'NOTE', description: '' }); setInteractions([data.data, ...interactions]); setSnack('Interação registrada!'); }
      else setSnack(data.error || 'Erro');
    } catch { setSnack('Erro'); }
  };

  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await fetch(`${API_BASE_URL}/api/admin/crm/export?${params}`, { headers });
      if (!res.ok) return setSnack('Erro ao exportar');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `crm_leads_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { setSnack('Erro ao exportar'); }
  };

  const statusChip = (status) => {
    const s = STATUS_MAP[status] || { label: status, color: '#6B7280' };
    return <Chip label={s.label} size="small" sx={{ bgcolor: `${s.color}15`, color: s.color, fontWeight: 600, fontSize: 11, border: `1px solid ${s.color}30` }} />;
  };

  const priorityChip = (priority) => {
    const p = PRIORITY_MAP[priority] || PRIORITY_MAP.NORMAL;
    return <Chip label={`${p.icon} ${p.label}`} size="small" sx={{ bgcolor: `${p.color}15`, color: p.color, fontWeight: 600, fontSize: 10 }} />;
  };

  const fmtDate = (d) => { if (!d) return '—'; const dt = new Date(d); return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('pt-BR'); };
  const openInviteForLead = (event, lead, inviteType) => {
    event.stopPropagation();
    if (inviteType === 'driver') openDriverWhatsAppInvite(lead.phone);
    else openPassengerWhatsAppInvite(lead.phone);
  };

  const totalLeads = Object.entries(stats).filter(([k]) => k !== 'LOCAL_BUSINESSES').reduce((sum, [, v]) => sum + v, 0);

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 1400, mx: 'auto', color: '#E5E7EB', '& .MuiInputBase-root': { color: '#E5E7EB', bgcolor: 'rgba(255,255,255,0.05)', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' }, '&:hover fieldset': { borderColor: 'rgba(184,148,46,0.5)' }, '&.Mui-focused fieldset': { borderColor: '#B8942E' } }, '& .MuiInputLabel-root': { color: '#9CA3AF' }, '& .MuiSelect-icon': { color: '#9CA3AF' }, '& .MuiToggleButton-root': { color: '#9CA3AF', borderColor: 'rgba(255,255,255,0.15)', '&.Mui-selected': { color: '#FFD700', bgcolor: 'rgba(184,148,46,0.15)' } }, '& .MuiTableCell-root': { color: '#D1D5DB', borderColor: 'rgba(255,255,255,0.08)' }, '& .MuiTableCell-head': { color: '#94A3B8' } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ color: GOLD, fontWeight: 800 }}>📋 CRM KAVIAR</Typography>
          <Typography sx={{ fontSize: 12, color: '#6B7280' }}>
            {isSuperAdmin ? `${totalLeads} leads no total · Visão completa` : `Meus leads · Visão territorial`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button size="small" variant="outlined" onClick={() => { window.location.href = '/admin/regulatory-consultation'; }} sx={{ borderColor: '#2563EB', color: '#2563EB', textTransform: 'none' }}>
            Consulta Regulatória
          </Button>
          {isSuperAdmin && <Button size="small" startIcon={<Download />} onClick={handleExportCsv} sx={{ color: '#6B7280', textTransform: 'none' }}>CSV</Button>}
          <Button size="small" variant="outlined" startIcon={<Store />} onClick={() => openCreateWith({ lead_type: 'LOCAL_BUSINESS', source: 'LOCAL_BUSINESS_PROSPECTION', business_category: '' })} sx={{ borderColor: '#059669', color: '#059669', textTransform: 'none' }}>+ Comércio</Button>
          <Button size="small" variant="outlined" startIcon={<Apartment />} onClick={() => openCreateWith({ lead_type: 'ASSOCIATION', source: 'LOCAL_VISIT' })} sx={{ borderColor: '#7C3AED', color: '#7C3AED', textTransform: 'none' }}>+ Associação</Button>
          <Button variant="contained" size="small" startIcon={<Add />} onClick={() => openCreateWith({})} sx={{ bgcolor: GOLD, '&:hover': { bgcolor: '#96782A' }, textTransform: 'none' }}>Novo Lead</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Card: Minha Área de Atuação */}
      {!isSuperAdmin && territoryInfo && (
        <Card sx={{ mb: 2.5, border: `1px solid ${GOLD}30`, background: 'linear-gradient(135deg, rgba(184,148,46,0.05) 0%, rgba(0,0,0,0) 100%)' }}>
          <CardContent sx={{ py: 2, px: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <LocationOn sx={{ color: GOLD, fontSize: 22 }} />
              <Typography sx={{ color: GOLD, fontWeight: 800, fontSize: 15 }}>Minha Área de Atuação</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 1.5 }}>
              <Box>
                <Typography sx={{ fontSize: 11, color: '#6B7280' }}>Território</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#E5E7EB' }}>{territoryInfo.territory_name}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, color: '#6B7280' }}>Bairros</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#E5E7EB' }}>{territoryInfo.neighborhoods?.length || 0}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
              {territoryInfo.neighborhoods?.map((n, i) => (
                <Chip key={i} label={n} size="small" sx={{ fontSize: 10, bgcolor: 'rgba(184,148,46,0.12)', color: '#E5E7EB', border: '1px solid rgba(184,148,46,0.25)' }} />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label="Piso urbano R$20" size="small" sx={{ fontSize: 10, bgcolor: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }} />
              <Chip label="Motorista fica com 82%" size="small" sx={{ fontSize: 10, bgcolor: 'rgba(99,102,241,0.12)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.3)' }} />
            </Box>
            <Typography sx={{ fontSize: 10, color: '#4B5563', mt: 1 }}>Você vê e recebe apenas sobre corridas originadas nesta área.</Typography>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <Grid container spacing={1} sx={{ mb: 2.5 }}>
        {Object.entries(STATUS_MAP).slice(0, 7).map(([key, val]) => (
          <Grid item xs={6} sm={4} md={3} lg key={key}>
            <Card sx={{ cursor: 'pointer', border: filters.status === key ? `2px solid ${val.color}` : '1px solid #E8E5DE', transition: 'all .15s', '&:hover': { borderColor: val.color, transform: 'translateY(-1px)' } }} onClick={() => { setFilters(f => ({ ...f, status: f.status === key ? '' : key })); setPage(1); }}>
              <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                <Typography sx={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{val.label}</Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: val.color }}>{stats[key] || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
        <Grid item xs={6} sm={4} md={3} lg>
          <Card sx={{ border: '1px solid #E8E5DE', '&:hover': { borderColor: '#059669' } }}>
            <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
              <Typography sx={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase' }}>🏪 Comércios</Typography>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{stats.LOCAL_BUSINESSES || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="Buscar nome, telefone, email..." value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }} sx={{ minWidth: 200, maxWidth: 280 }} />
        <ToggleButtonGroup size="small" exclusive value={periodFilter} onChange={(_, v) => applyPeriod(v || '')}>
          <ToggleButton value="today" sx={{ textTransform: 'none', fontSize: 12 }}>Hoje</ToggleButton>
          <ToggleButton value="week" sx={{ textTransform: 'none', fontSize: 12 }}>7 dias</ToggleButton>
        </ToggleButtonGroup>
        <IconButton size="small" onClick={() => setShowFilters(!showFilters)} sx={{ color: showFilters ? GOLD : '#6B7280' }}><FilterList /></IconButton>
        {(filters.status || filters.lead_type || filters.source || filters.priority || filters.date_from || filters.captured_by_member_id) && (
          <Button size="small" onClick={() => { setFilters({ status: '', lead_type: '', source: '', search: '', priority: '', date_from: '', date_to: '', captured_by_member_id: '' }); setPeriodFilter(''); setPage(1); }} sx={{ color: '#EF4444', textTransform: 'none', fontSize: 12 }}>Limpar</Button>
        )}
      </Box>
      {showFilters && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Status</InputLabel>
            <Select value={filters.status} label="Status" onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}>
              <MenuItem value="">Todos</MenuItem>
              {Object.entries(STATUS_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Tipo</InputLabel>
            <Select value={filters.lead_type} label="Tipo" onChange={e => { setFilters(f => ({ ...f, lead_type: e.target.value })); setPage(1); }}>
              <MenuItem value="">Todos</MenuItem>
              {LEAD_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Origem</InputLabel>
            <Select value={filters.source} label="Origem" onChange={e => { setFilters(f => ({ ...f, source: e.target.value })); setPage(1); }}>
              <MenuItem value="">Todas</MenuItem>
              {SOURCES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Prioridade</InputLabel>
            <Select value={filters.priority} label="Prioridade" onChange={e => { setFilters(f => ({ ...f, priority: e.target.value })); setPage(1); }}>
              <MenuItem value="">Todas</MenuItem>
              {Object.entries(PRIORITY_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v.icon} {v.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Captador</InputLabel>
            <Select value={filters.captured_by_member_id} label="Captador" onChange={e => { setFilters(f => ({ ...f, captured_by_member_id: e.target.value })); setPage(1); }}>
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="none">Não informado</MenuItem>
              <MenuItem value="my_team"><strong>Minha equipe</strong></MenuItem>
              {teamMembers.map(m => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Table */}
      {loading ? <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress sx={{ color: GOLD }} /></Box> : (
        <>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 11, color: '#6B7280', textTransform: 'uppercase', whiteSpace: 'nowrap' } }}>
                  <TableCell>Nome</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Prior.</TableCell>
                  <TableCell>Captado por</TableCell>
                  <TableCell>Próxima Ação</TableCell>
                  <TableCell>Último Contato</TableCell>
                  <TableCell>Criado</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leads.map(lead => {
                  const overdue = isOverdue(lead.next_action_at);
                  const noAction = isMissing(lead.next_action);
                  return (
                    <TableRow key={lead.id} hover sx={{ cursor: 'pointer', bgcolor: overdue ? '#FEF2F2' : noAction ? '#FFFBEB' : 'inherit' }} onClick={() => openDetail(lead)}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {(overdue || noAction) && <Tooltip title={overdue ? 'Ação vencida!' : 'Sem próxima ação'}><Warning sx={{ fontSize: 14, color: overdue ? '#EF4444' : '#F59E0B' }} /></Tooltip>}
                          <Box>
                            <Typography sx={{ fontWeight: 600, fontSize: 13, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</Typography>
                            {lead.business_name && <Typography sx={{ fontSize: 11, color: '#6B7280' }}>{lead.business_name}</Typography>}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell><Chip label={LEAD_TYPES.find(t => t.value === lead.lead_type)?.label || lead.lead_type} size="small" sx={{ fontSize: 10 }} /></TableCell>
                      <TableCell>{statusChip(lead.status)}</TableCell>
                      <TableCell>{priorityChip(lead.priority)}</TableCell>
                      <TableCell sx={{ fontSize: 11, color: lead.captured_by_member ? '#374151' : '#9CA3AF' }}>{lead.captured_by_member?.name || 'Não informado'}</TableCell>
                      <TableCell sx={{ fontSize: 12, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: overdue ? '#EF4444' : '#374151' }}>{lead.next_action || <span style={{ color: '#F59E0B', fontStyle: 'italic' }}>definir...</span>}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: '#6B7280' }}>{fmtDate(lead.last_contact_at)}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: '#6B7280' }}>{fmtDate(lead.created_at)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          <Tooltip title="WhatsApp Motorista">
                            <Button size="small" variant="outlined" startIcon={<WhatsApp fontSize="small" />} onClick={(event) => openInviteForLead(event, lead, 'driver')} sx={{ borderColor: '#25D36666', color: '#25D366', textTransform: 'none', fontSize: 11, whiteSpace: 'nowrap' }}>
                              WhatsApp Motorista
                            </Button>
                          </Tooltip>
                          <Tooltip title="WhatsApp Passageiro">
                            <Button size="small" variant="outlined" startIcon={<WhatsApp fontSize="small" />} onClick={(event) => openInviteForLead(event, lead, 'passenger')} sx={{ borderColor: '#25D36666', color: '#25D366', textTransform: 'none', fontSize: 11, whiteSpace: 'nowrap' }}>
                              WhatsApp Passageiro
                            </Button>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {leads.length === 0 && <TableRow><TableCell colSpan={9} sx={{ textAlign: 'center', py: 4, color: '#9CA3AF' }}>Nenhum lead encontrado</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Box>
          {total > 30 && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}><Pagination count={Math.ceil(total / 30)} page={page} onChange={(_, v) => setPage(v)} size="small" /></Box>}
        </>
      )}

      {/* Detail Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: { xs: '100%', md: 520 }, p: 3 } }}>
        {selectedLead && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{selectedLead.name}</Typography>
              <IconButton onClick={() => setDrawerOpen(false)}><Close /></IconButton>
            </Box>

            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
              {statusChip(selectedLead.status)}
              <Chip label={LEAD_TYPES.find(t => t.value === selectedLead.lead_type)?.label || selectedLead.lead_type} size="small" />
              {priorityChip(selectedLead.priority)}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {selectedLead.phone && <Typography sx={{ fontSize: 13 }}><Phone sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />{selectedLead.phone}</Typography>}
              {selectedLead.email && <Typography sx={{ fontSize: 13 }}><Email sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />{selectedLead.email}</Typography>}
              {selectedLead.business_name && <Typography sx={{ fontSize: 13 }}><Business sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />{selectedLead.business_name} {selectedLead.business_category && `(${selectedLead.business_category})`}</Typography>}
              {selectedLead.business_address && <Typography sx={{ fontSize: 12, color: '#6B7280', ml: 2.5 }}>{selectedLead.business_address}</Typography>}
              {selectedLead.contact_person && <Typography sx={{ fontSize: 12, color: '#6B7280' }}>Contato: {selectedLead.contact_person}</Typography>}
              <Box sx={{ mt: 1 }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Captado por</InputLabel>
                  <Select value={selectedLead.captured_by_member_id || ''} label="Captado por" onChange={async (e) => {
                    const val = e.target.value || null;
                    const res = await fetch(`${API_BASE_URL}/api/admin/crm/leads/${selectedLead.id}`, { method: 'PATCH', headers, body: JSON.stringify({ captured_by_member_id: val }) });
                    const d = await res.json();
                    if (d.success) { setSelectedLead(sl => ({ ...sl, captured_by_member_id: val, captured_by_member: val ? teamMembers.find(m => m.id === val) : null })); fetchLeads(); setSnack('Captador atualizado'); } else setSnack(d.error || 'Erro');
                  }}>
                    <MenuItem value="">Não informado</MenuItem>
                    {teamMembers.map(m => <MenuItem key={m.id} value={m.id}>{m.name} ({ROLES_SHORT[m.role_type] || m.role_type})</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
              {selectedLead.next_action && (
                <Typography sx={{ fontSize: 13, mt: 1, p: 1, borderRadius: 1, bgcolor: isOverdue(selectedLead.next_action_at) ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${isOverdue(selectedLead.next_action_at) ? '#FECACA' : '#BBF7D0'}` }}>
                  <AccessTime sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                  <strong>Próxima ação:</strong> {selectedLead.next_action} {selectedLead.next_action_at && `(${fmtDate(selectedLead.next_action_at)})`}
                  {isOverdue(selectedLead.next_action_at) && <Chip label="VENCIDA" size="small" sx={{ ml: 1, bgcolor: '#EF4444', color: '#fff', fontSize: 9, height: 18 }} />}
                </Typography>
              )}
              {!selectedLead.next_action && <Alert severity="warning" sx={{ mt: 1, py: 0, fontSize: 12 }}>Sem próxima ação definida</Alert>}
              {selectedLead.notes && <Typography sx={{ fontSize: 12, mt: 1, p: 1, bgcolor: '#F9FAFB', borderRadius: 1, color: '#374151' }}>{selectedLead.notes}</Typography>}
            </Box>

            {(selectedLead.wants_showcase || selectedLead.wants_delivery_support || selectedLead.wants_partnership || selectedLead.wants_ads) && (
              <Box sx={{ mt: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {selectedLead.wants_showcase && <Chip label="Vitrine" size="small" color="success" variant="outlined" />}
                {selectedLead.wants_delivery_support && <Chip label="Entregas" size="small" color="info" variant="outlined" />}
                {selectedLead.wants_partnership && <Chip label="Parceria" size="small" color="warning" variant="outlined" />}
                {selectedLead.wants_ads && <Chip label="Anúncios" size="small" color="secondary" variant="outlined" />}
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1, mt: 3, flexWrap: 'wrap' }}>
              <Button size="small" variant="outlined" onClick={() => { setNewStatus(selectedLead.status); setStatusOpen(true); }}>Alterar Status</Button>
              <Button size="small" variant="outlined" onClick={() => setInteractionOpen(true)}>+ Observação</Button>
              <Button size="small" variant="outlined" startIcon={<WhatsApp />} onClick={() => openDriverWhatsAppInvite(selectedLead.phone)} sx={{ borderColor: '#25D36666', color: '#25D366', textTransform: 'none' }}>WhatsApp Motorista</Button>
              <Button size="small" variant="outlined" startIcon={<WhatsApp />} onClick={() => openPassengerWhatsAppInvite(selectedLead.phone)} sx={{ borderColor: '#25D36666', color: '#25D366', textTransform: 'none' }}>WhatsApp Passageiro</Button>
              {(isSuperAdmin || admin?.role === 'TERRITORIAL_MANAGER') && ['ACTIVE','INTERESTED','WAITING_DOCUMENTS','WAITING_CONTRACT','WAITING_APPROVAL'].includes(selectedLead.status) && ['LOCAL_BUSINESS','RESTAURANT','BAKERY','PIZZERIA','SNACK_BAR','MARKET','PHARMACY','PET_SHOP','BEAUTY_SALON','WORKSHOP'].includes(selectedLead.lead_type) && (
                <Button size="small" variant="contained" startIcon={<Store />} sx={{ bgcolor: '#059669', textTransform: 'none', '&:hover': { bgcolor: '#047857' } }}
                  onClick={async () => {
                    try {
                      const res = await fetch(`${API_BASE_URL}/api/admin/commerce/accounts`, { method: 'POST', headers, body: JSON.stringify({ crm_lead_id: selectedLead.id, name: selectedLead.business_name || selectedLead.name, trade_name: selectedLead.business_name || null, category: selectedLead.business_category || selectedLead.lead_type?.toLowerCase() || 'outro', phone: selectedLead.phone, email: selectedLead.email, address: selectedLead.business_address, territory_id: selectedLead.territory_id, neighborhood_id: selectedLead.neighborhood_id }) });
                      const data = await res.json();
                      if (data.success) setSnack('✅ Conta de comércio criada! Acesse /admin/commerce para ativar.');
                      else setSnack(data.error || 'Erro ao converter');
                    } catch { setSnack('Erro de conexão ao converter lead'); }
                  }}>Converter em Comércio</Button>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1 }}>Histórico</Typography>
            {loadingDetail ? <CircularProgress size={20} /> : (
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {interactions.map(i => (
                  <Box key={i.id} sx={{ mb: 1.5, p: 1, bgcolor: '#F9FAFB', borderRadius: 1, borderLeft: `3px solid ${i.event_type === 'STATUS_CHANGE' ? '#8B5CF6' : '#D1D5DB'}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Chip label={EVENT_TYPES.find(e => e.value === i.event_type)?.label || i.event_type} size="small" sx={{ fontSize: 10 }} />
                      <Typography sx={{ fontSize: 10, color: '#9CA3AF' }}>{formatDate(i.created_at, { showTime: true })}</Typography>
                    </Box>
                    {i.description && <Typography sx={{ fontSize: 12, mt: 0.5, color: '#374151' }}>{i.description}</Typography>}
                    {i.old_status && i.new_status && <Typography sx={{ fontSize: 11, color: '#6B7280', mt: 0.3 }}>{STATUS_MAP[i.old_status]?.label || i.old_status} → {STATUS_MAP[i.new_status]?.label || i.new_status}</Typography>}
                  </Box>
                ))}
                {interactions.length === 0 && <Typography sx={{ color: '#9CA3AF', fontSize: 12 }}>Nenhuma interação</Typography>}
              </Box>
            )}
          </Box>
        )}
      </Drawer>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {createForm.lead_type === 'LOCAL_BUSINESS' ? '🏪 Novo Comércio Local' : createForm.lead_type === 'ASSOCIATION' ? '🏛️ Nova Associação' : '📋 Novo Lead'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="Nome *" size="small" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField label="Telefone" size="small" fullWidth value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} />
            <TextField label="Email" size="small" fullWidth value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select value={createForm.lead_type} label="Tipo" onChange={e => setCreateForm(f => ({ ...f, lead_type: e.target.value }))}>
                {LEAD_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Prioridade</InputLabel>
              <Select value={createForm.priority} label="Prioridade" onChange={e => setCreateForm(f => ({ ...f, priority: e.target.value }))}>
                {Object.entries(PRIORITY_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v.icon} {v.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Origem</InputLabel>
              <Select value={createForm.source} label="Origem" onChange={e => setCreateForm(f => ({ ...f, source: e.target.value }))}>
                {SOURCES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Captado por</InputLabel>
              <Select value={createForm.captured_by_member_id} label="Captado por" onChange={e => setCreateForm(f => ({ ...f, captured_by_member_id: e.target.value }))}>
                <MenuItem value="">Não informado</MenuItem>
                {teamMembers.map(m => <MenuItem key={m.id} value={m.id}>{m.name} ({ROLES_SHORT[m.role_type] || m.role_type})</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <TextField label="Nome do Comércio" size="small" value={createForm.business_name} onChange={e => setCreateForm(f => ({ ...f, business_name: e.target.value }))} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField label="Categoria" size="small" fullWidth value={createForm.business_category} onChange={e => setCreateForm(f => ({ ...f, business_category: e.target.value }))} placeholder="padaria, restaurante..." />
            <TextField label="Contato" size="small" fullWidth value={createForm.contact_person} onChange={e => setCreateForm(f => ({ ...f, contact_person: e.target.value }))} />
          </Box>
          <TextField label="Endereço" size="small" value={createForm.business_address} onChange={e => setCreateForm(f => ({ ...f, business_address: e.target.value }))} />
          <TextField label="Observações" size="small" multiline rows={2} value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} />
          <TextField label="Próxima Ação" size="small" value={createForm.next_action} onChange={e => setCreateForm(f => ({ ...f, next_action: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate} sx={{ bgcolor: GOLD }}>Criar</Button>
        </DialogActions>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusOpen} onClose={() => setStatusOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Alterar Status</DialogTitle>
        <DialogContent>
          <FormControl size="small" fullWidth sx={{ mt: 1 }}>
            <InputLabel>Novo Status</InputLabel>
            <Select value={newStatus} label="Novo Status" onChange={e => setNewStatus(e.target.value)}>
              {Object.entries(STATUS_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleStatusChange} sx={{ bgcolor: GOLD }}>Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* Interaction Dialog */}
      <Dialog open={interactionOpen} onClose={() => setInteractionOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar Interação</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Tipo</InputLabel>
            <Select value={interactionForm.event_type} label="Tipo" onChange={e => setInteractionForm(f => ({ ...f, event_type: e.target.value }))}>
              {EVENT_TYPES.map(e => <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Descrição" size="small" multiline rows={3} value={interactionForm.description} onChange={e => setInteractionForm(f => ({ ...f, description: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInteractionOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleAddInteraction} sx={{ bgcolor: GOLD }}>Registrar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}
