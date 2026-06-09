import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Typography, Box, Card, CardContent, Grid, Button, CircularProgress, Alert, TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Chip } from '@mui/material';
import { DirectionsCar, Explore, Handshake, Apartment, Description, PersonAdd, AddBusiness, GroupAdd, AccountBalance, Star, Pets, Shield, Storefront } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const GOLD = '#B8942E';
const PARTNER_TYPES = [
  { value: 'association', label: 'Associação' },
  { value: 'condominium', label: 'Condomínio' },
  { value: 'business', label: 'Comércio/Empresa' },
  { value: 'community_leader', label: 'Liderança Comunitária' },
  { value: 'institution', label: 'Instituição' },
  { value: 'other', label: 'Outro' },
];

export default function ManagerHome() {
  const [metrics, setMetrics] = useState(null);
  const [territory, setTerritoryData] = useState(null);
  const [referral, setReferral] = useState(null);
  const [drafts, setDrafts] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [partnerDialog, setPartnerDialog] = useState(false);
  const [operatorDialog, setOperatorDialog] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  const adminData = localStorage.getItem('kaviar_admin_data');
  const admin = adminData ? JSON.parse(adminData) : null;
  const token = localStorage.getItem('kaviar_admin_token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [metricsRes, territoryRes, referralRes, draftsRes, teamStatsRes, teamRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/dashboard/metrics`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/dashboard/territory`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/operator/referrals`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/manager/drafts`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/manager/finance/team-lead-stats`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/manager/finance/team`, { headers }),
      ]);

      if (metricsRes.status === 403) {
        setError('Sem território vinculado. Solicite acesso ao administrador.');
        return;
      }

      const metricsData = await metricsRes.json();
      const territoryData = await territoryRes.json();
      const referralData = await referralRes.json();
      const draftsData = await draftsRes.json();
      const teamStatsData = await teamStatsRes.json();
      const teamData = await teamRes.json();

      if (metricsData.success !== false) setMetrics(metricsData.metrics || metricsData);
      if (territoryData.success) setTerritoryData(territoryData.data);
      if (referralData.success) setReferral(referralData.data);
      if (draftsData.success) setDrafts(draftsData.data);
      if (teamStatsData.success) setTeamStats(teamStatsData);
      if (teamData.success) setTeamMembers(teamData.data);
    } catch { setError('Erro ao carregar dados do território'); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('kaviar_admin_token');
    localStorage.removeItem('kaviar_admin_data');
    window.location.href = '/admin/login';
  };

  if (loading) return (
    <Container maxWidth="lg" sx={{ mt: 6, textAlign: 'center' }}>
      <CircularProgress sx={{ color: GOLD }} />
      <Typography sx={{ mt: 2, color: '#6B7280' }}>Carregando território...</Typography>
    </Container>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FAFAF8', pt: 2, pb: 6 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, p: 2, bgcolor: '#fff', borderRadius: 2, border: '1px solid #E8E5DE', borderTop: `3px solid ${GOLD}` }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              <span style={{ color: GOLD }}>KAVIAR</span> Gestor Territorial
            </Typography>
            <Typography sx={{ color: '#6B7280', fontSize: 12 }}>{admin?.name || 'Gestor'} — acesso operacional do território</Typography>
          </Box>
          <Button onClick={handleLogout} variant="outlined" size="small" sx={{ borderColor: '#E8E5DE', color: '#6B7280', '&:hover': { borderColor: GOLD, color: GOLD } }}>
            Sair
          </Button>
        </Box>

        {error && <Alert severity="warning" sx={{ mb: 3 }}>{error}</Alert>}
        {submitMsg && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSubmitMsg('')}>{submitMsg}</Alert>}

        {/* KPIs */}
        {metrics && (
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            {[
              { label: 'Motoristas', value: metrics.drivers?.total ?? 0 },
              { label: 'Online', value: metrics.drivers?.online ?? 0 },
              { label: 'Passageiros', value: metrics.passengers?.total ?? 0 },
              { label: 'Corridas', value: metrics.rides?.total ?? 0 },
            ].map(k => (
              <Grid item xs={6} sm={3} key={k.label}>
                <Card sx={{ bgcolor: '#fff', borderTop: `3px solid ${GOLD}`, border: '1px solid #E8E5DE', borderRadius: 2 }}>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#1A1A1A' }}>{k.value}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>{k.label}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Territory metrics */}
        {territory && territory.total > 0 && (
          <Card sx={{ mb: 3, bgcolor: '#fff', border: '1px solid #E8E5DE', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 1 }}>Corridas por Território</Typography>
              <Grid container spacing={1}>
                {[
                  { label: 'Local', value: territory.local },
                  { label: 'Vizinho', value: territory.adjacent },
                  { label: 'Externo', value: territory.external },
                  { label: 'Retorno', value: territory.homebound },
                  { label: 'Total', value: territory.total },
                ].map(t => (
                  <Grid item xs key={t.label}>
                    <Box sx={{ textAlign: 'center', py: 1, bgcolor: '#FAFAF8', borderRadius: 1 }}>
                      <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#1A1A1A' }}>{t.value}</Typography>
                      <Typography sx={{ fontSize: 9, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>{t.label}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Referral quick stats */}
        {referral?.has_code && (
          <Card sx={{ mb: 3, bgcolor: '#fff', border: '1px solid #E8E5DE', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography sx={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Captação</Typography>
                <Typography sx={{ fontSize: 11, color: GOLD, fontFamily: 'monospace' }}>{referral.referral_code}</Typography>
              </Box>
              <Grid container spacing={1}>
                {[
                  { label: 'Indicados', value: referral.stats.total },
                  { label: 'Pendentes', value: referral.stats.pending },
                  { label: 'Aprovados', value: referral.stats.qualified },
                ].map(s => (
                  <Grid item xs={4} key={s.label}>
                    <Box sx={{ textAlign: 'center', py: 0.5 }}>
                      <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A' }}>{s.value}</Typography>
                      <Typography sx={{ fontSize: 9, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Equipe & Captação */}
        {teamMembers.length > 0 && (
          <Card sx={{ mb: 3, bgcolor: '#fff', border: '1px solid #E8E5DE', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 1.5 }}>Equipe & Captação</Typography>
              <Grid container spacing={1} sx={{ mb: 1.5 }}>
                {[
                  { label: 'Leads Hoje', value: teamStats?.leads_today ?? 0, color: GOLD },
                  { label: 'Leads Mês', value: teamStats?.leads_month ?? 0, color: '#3B82F6' },
                  { label: 'Total Leads', value: teamStats?.data?.reduce((s, m) => s + m.total_leads, 0) ?? 0, color: '#6366F1' },
                  { label: 'Ativos', value: teamMembers.filter(m => m.status === 'active').length, color: '#10B981' },
                  { label: 'Inativos', value: teamMembers.filter(m => m.status !== 'active').length, color: '#6B7280' },
                  { label: 'Termos ✓', value: teamMembers.filter(m => m.contract_status === 'signed').length, color: '#10B981' },
                  { label: 'Termos ⏳', value: teamMembers.filter(m => m.contract_status !== 'signed').length, color: '#F59E0B' },
                ].map(k => (
                  <Grid item xs={4} sm key={k.label}>
                    <Box sx={{ textAlign: 'center', py: 0.5 }}>
                      <Typography sx={{ fontSize: 18, fontWeight: 800, color: k.color }}>{k.value}</Typography>
                      <Typography sx={{ fontSize: 9, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>{k.label}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
              {teamStats?.by_type && Object.keys(teamStats.by_type).length > 0 && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography sx={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', mb: 0.5 }}>Por Tipo</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {Object.entries(teamStats.by_type).map(([type, count]) => (
                      <Chip key={type} label={`${type}: ${count}`} size="small" sx={{ fontSize: 10 }} />
                    ))}
                  </Box>
                </Box>
              )}
              {teamStats?.data?.length > 0 && (
                <Box>
                  <Typography sx={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', mb: 0.5 }}>Ranking Captadores</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {teamStats.data.filter(m => m.total_leads > 0).sort((a, b) => b.total_leads - a.total_leads).map((m, i) => (
                      <Chip key={m.member_id} label={`${i + 1}. ${m.member_name}: ${m.total_leads}`} size="small" sx={{ fontSize: 10, bgcolor: i === 0 ? `${GOLD}20` : undefined, color: i === 0 ? GOLD : undefined }} />
                    ))}
                  </Box>
                </Box>
              )}
              {teamMembers.some(m => m.contract_status !== 'signed' && m.status === 'active') && (
                <Alert severity="warning" sx={{ mt: 1.5, py: 0, fontSize: 11 }}>
                  ⚠️ {teamMembers.filter(m => m.contract_status !== 'signed' && m.status === 'active').length} membro(s) ativo(s) sem termo assinado
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modules */}
        <Typography sx={{ fontSize: 12, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 1.5, fontWeight: 600 }}>Módulos</Typography>
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          {[
            { Icon: DirectionsCar, title: 'Motoristas', desc: 'Motoristas do território', to: '/admin/drivers' },
            { Icon: Explore, title: 'Corridas', desc: 'Corridas do território', to: '/admin/rides' },
            { Icon: PersonAdd, title: 'Indicações', desc: 'Link de captação e indicados', to: '/admin/manager-referrals' },
            { Icon: Handshake, title: 'Parceiros', desc: 'Parceiros territoriais', to: '/admin/territorial-partners' },
            { Icon: Apartment, title: 'Associações', desc: 'Operadores e associações locais', to: '/admin/local-operators' },
            { Icon: AccountBalance, title: 'Financeiro', desc: 'Extrato territorial estimado', to: '/admin/manager-finance' },
            { Icon: Description, title: 'Tabela de Preços', desc: 'Pisos mínimos e propostas', to: '/admin/manager-territory-floors' },
            { Icon: Star, title: 'Reputação', desc: 'Avaliações dos motoristas', to: '/admin/manager-reputation' },
            { Icon: Pets, title: 'KAVIAR Pet', desc: 'Pedidos Pet assistidos', to: '/admin/private-rides' },
            { Icon: Description, title: 'Meu Contrato', desc: 'Perfil e termos', to: '/admin/meu-contrato' },
            { Icon: Description, title: 'Plano Gestor', desc: 'Proposta, termo e FAQ do Gestor Fundador', to: '/admin/comercial-gestor' },
            { Icon: AddBusiness, title: 'CRM KAVIAR', desc: 'Leads, prospecção e comércios locais', to: '/admin/crm' },
            { Icon: Storefront, title: 'Comércios do Território', desc: 'Cadastre, organize e acompanhe os negócios locais', to: '/admin/commerce' },
            { Icon: Shield, title: 'Alertas do Território', desc: 'Acompanhe alertas de emergência do seu território', to: '/admin/manager-emergency-alerts' },
            { Icon: GroupAdd, title: 'Minha Equipe', desc: 'Cadastro interno de captadores e operadores', to: '/admin/manager-team' },
          ].map(c => (
            <Grid item xs={12} sm={6} md={4} key={c.title}>
              <Card component={Link} to={c.to} sx={{ bgcolor: '#fff', border: '1px solid #E8E5DE', borderRadius: 2, textDecoration: 'none', display: 'block', '&:hover': { borderColor: GOLD, transform: 'translateY(-1px)', boxShadow: `0 2px 8px rgba(184,148,46,0.1)` }, transition: 'all 0.2s' }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, px: 2 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: 'rgba(184,148,46,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <c.Icon sx={{ fontSize: 18, color: GOLD }} />
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#1A1A1A', fontWeight: 600, fontSize: 13 }}>{c.title}</Typography>
                    <Typography sx={{ color: '#6B7280', fontSize: 11 }}>{c.desc}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Cadastro Pendente */}
        <Typography sx={{ fontSize: 12, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 1.5, fontWeight: 600 }}>Cadastrar para Análise</Typography>
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Card onClick={() => setPartnerDialog(true)} sx={{ bgcolor: '#fff', border: '1px solid #E8E5DE', borderRadius: 2, cursor: 'pointer', '&:hover': { borderColor: GOLD, transform: 'translateY(-1px)', boxShadow: `0 2px 8px rgba(184,148,46,0.1)` }, transition: 'all 0.2s' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, px: 2 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: 'rgba(184,148,46,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AddBusiness sx={{ fontSize: 18, color: GOLD }} />
                </Box>
                <Box>
                  <Typography sx={{ color: '#1A1A1A', fontWeight: 600, fontSize: 13 }}>Indicar Parceiro</Typography>
                  <Typography sx={{ color: '#6B7280', fontSize: 11 }}>Cadastrar parceiro territorial para análise</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Card onClick={() => setOperatorDialog(true)} sx={{ bgcolor: '#fff', border: '1px solid #E8E5DE', borderRadius: 2, cursor: 'pointer', '&:hover': { borderColor: GOLD, transform: 'translateY(-1px)', boxShadow: `0 2px 8px rgba(184,148,46,0.1)` }, transition: 'all 0.2s' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, px: 2 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: 'rgba(184,148,46,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GroupAdd sx={{ fontSize: 18, color: GOLD }} />
                </Box>
                <Box>
                  <Typography sx={{ color: '#1A1A1A', fontWeight: 600, fontSize: 13 }}>Indicar Associação</Typography>
                  <Typography sx={{ color: '#6B7280', fontSize: 11 }}>Cadastrar associação/entidade para análise</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Drafts list */}
        {drafts && (drafts.partners?.length > 0 || drafts.operators?.length > 0) && (
          <Card sx={{ mb: 3, bgcolor: '#fff', border: '1px solid #E8E5DE', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 1.5 }}>Meus Cadastros Pendentes</Typography>
              {drafts.partners?.map(p => (
                <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px solid #F3F4F6' }}>
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{p.name}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#6B7280' }}>{p.responsible_name} • {p.partner_type}</Typography>
                  </Box>
                  <Chip label="Parceiro" size="small" sx={{ bgcolor: 'rgba(184,148,46,0.1)', color: GOLD, fontSize: 10, height: 22 }} />
                </Box>
              ))}
              {drafts.operators?.map(o => (
                <Box key={o.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px solid #F3F4F6' }}>
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>{o.organization_name}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#6B7280' }}>{o.responsible_name} • {o.responsible_role}</Typography>
                  </Box>
                  <Chip label="Associação" size="small" sx={{ bgcolor: 'rgba(46,148,184,0.1)', color: '#2E94B8', fontSize: 10, height: 22 }} />
                </Box>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <Box sx={{ textAlign: 'center', pt: 2, borderTop: '1px solid #E8E5DE' }}>
          <Typography sx={{ color: '#9CA3AF', fontSize: 10 }}>
            KAVIAR é produto da USB Tecnok Manutenção e Instalação de Computadores Ltda — CNPJ 07.710.691/0001-66
          </Typography>
          <Typography sx={{ color: '#D1D5DB', fontSize: 9, mt: 0.5 }}>
            Gestor Territorial — acesso operacional restrito ao território vinculado
          </Typography>
        </Box>

        {/* Dialog: Parceiro */}
        <PartnerDraftDialog open={partnerDialog} onClose={() => setPartnerDialog(false)} headers={headers} onSuccess={(msg) => { setPartnerDialog(false); setSubmitMsg(msg); fetchData(); }} />

        {/* Dialog: Associação */}
        <OperatorDraftDialog open={operatorDialog} onClose={() => setOperatorDialog(false)} headers={headers} onSuccess={(msg) => { setOperatorDialog(false); setSubmitMsg(msg); fetchData(); }} />
      </Container>
    </Box>
  );
}

// ─── Partner Draft Dialog ────────────────────────────────────────────────────
function PartnerDraftDialog({ open, onClose, headers, onSuccess }) {
  const [form, setForm] = useState({ name: '', partner_type: 'association', responsible_name: '', responsible_role: '', phone: '', email: '', address: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.responsible_name.trim()) { setErr('Nome do parceiro e responsável são obrigatórios'); return; }
    setSubmitting(true); setErr('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/manager/partners/draft`, { method: 'POST', headers, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok || !data.success) { setErr(data.error || 'Erro ao enviar'); return; }
      setForm({ name: '', partner_type: 'association', responsible_name: '', responsible_role: '', phone: '', email: '', address: '', notes: '' });
      onSuccess('Parceiro cadastrado para análise da central KAVIAR.');
    } catch { setErr('Erro de conexão'); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Indicar Parceiro para Análise</DialogTitle>
      <DialogContent sx={{ pt: '8px !important' }}>
        <Typography sx={{ fontSize: 12, color: '#6B7280', mb: 2 }}>O cadastro será enviado para revisão da central KAVIAR. O território será atribuído automaticamente.</Typography>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Grid container spacing={1.5}>
          <Grid item xs={12}><TextField fullWidth size="small" label="Nome do parceiro *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" select label="Tipo" value={form.partner_type} onChange={e => setForm(f => ({ ...f, partner_type: e.target.value }))}>{PARTNER_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Cargo do responsável" value={form.responsible_role} onChange={e => setForm(f => ({ ...f, responsible_role: e.target.value }))} /></Grid>
          <Grid item xs={12}><TextField fullWidth size="small" label="Nome do responsável *" value={form.responsible_name} onChange={e => setForm(f => ({ ...f, responsible_name: e.target.value }))} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Telefone/WhatsApp" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Grid>
          <Grid item xs={12}><TextField fullWidth size="small" label="Endereço / Bairro" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></Grid>
          <Grid item xs={12}><TextField fullWidth size="small" label="Observação" multiline rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: '#6B7280' }}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={submitting} variant="contained" sx={{ bgcolor: GOLD, '&:hover': { bgcolor: '#9A7A24' } }}>
          {submitting ? 'Enviando...' : 'Enviar para Análise'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Operator Draft Dialog ───────────────────────────────────────────────────
function OperatorDraftDialog({ open, onClose, headers, onSuccess }) {
  const [form, setForm] = useState({ organization_name: '', responsible_name: '', responsible_role: '', phone: '', email: '', neighborhood: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async () => {
    if (!form.organization_name.trim() || !form.responsible_name.trim() || !form.responsible_role.trim()) { setErr('Nome da entidade, responsável e cargo são obrigatórios'); return; }
    setSubmitting(true); setErr('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/manager/operators/draft`, { method: 'POST', headers, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok || !data.success) { setErr(data.error || 'Erro ao enviar'); return; }
      setForm({ organization_name: '', responsible_name: '', responsible_role: '', phone: '', email: '', neighborhood: '', notes: '' });
      onSuccess('Associação/entidade cadastrada para análise da central KAVIAR.');
    } catch { setErr('Erro de conexão'); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Indicar Associação/Entidade para Análise</DialogTitle>
      <DialogContent sx={{ pt: '8px !important' }}>
        <Typography sx={{ fontSize: 12, color: '#6B7280', mb: 2 }}>O cadastro será enviado para revisão da central KAVIAR. A cidade será atribuída automaticamente pelo seu território.</Typography>
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        <Grid container spacing={1.5}>
          <Grid item xs={12}><TextField fullWidth size="small" label="Nome da associação/entidade *" value={form.organization_name} onChange={e => setForm(f => ({ ...f, organization_name: e.target.value }))} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Nome do responsável *" value={form.responsible_name} onChange={e => setForm(f => ({ ...f, responsible_name: e.target.value }))} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Cargo/Função *" value={form.responsible_role} onChange={e => setForm(f => ({ ...f, responsible_role: e.target.value }))} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Telefone/WhatsApp" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Grid>
          <Grid item xs={12}><TextField fullWidth size="small" label="Bairro / Localidade" value={form.neighborhood} onChange={e => setForm(f => ({ ...f, neighborhood: e.target.value }))} /></Grid>
          <Grid item xs={12}><TextField fullWidth size="small" label="Observação" multiline rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: '#6B7280' }}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={submitting} variant="contained" sx={{ bgcolor: GOLD, '&:hover': { bgcolor: '#9A7A24' } }}>
          {submitting ? 'Enviando...' : 'Enviar para Análise'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
