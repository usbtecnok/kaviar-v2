import { useState, useEffect, useRef } from 'react';
import { Container, Typography, Box, Card, CardContent, Grid, Chip, TextField, CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, MenuItem, Select, FormControl, InputLabel, Table, TableBody, TableCell, TableHead, TableRow, Tabs, Tab } from '@mui/material';
import { Add, Edit, Close, People, AttachMoney, CheckCircle, LinkOff } from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import { API_BASE_URL } from '../../config/api';

const TYPE_MAP = {
  association: { label: 'Associação', color: 'primary' },
  condominium: { label: 'Condomínio', color: 'secondary' },
  business: { label: 'Comércio', color: 'info' },
  community_leader: { label: 'Liderança', color: 'warning' },
  institution: { label: 'Instituição', color: 'default' },
  other: { label: 'Outro', color: 'default' },
};

const STATUS_MAP = {
  active: { label: 'Ativo', color: 'success' },
  paused: { label: 'Pausado', color: 'warning' },
  inactive: { label: 'Inativo', color: 'error' },
  archived: { label: 'Arquivado', color: 'default' },
};

const BILLING_MAP = {
  current: { label: 'Em dia', color: 'success' },
  pending: { label: 'Pendente', color: 'warning' },
  overdue: { label: 'Atrasado', color: 'error' },
  blocked: { label: 'Bloqueado', color: 'error' },
  canceled: { label: 'Cancelado', color: 'default' },
};

const emptyForm = { name: '', partner_type: 'association', address: '', responsible_name: '', responsible_role: 'presidente', responsible_phone: '', responsible_email: '', commission_percent: 5, monthly_fee_cents: '', billing_due_day: '', notes: '' };

export default function TerritorialPartners() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailTab, setDetailTab] = useState(0);
  const [contractDialog, setContractDialog] = useState({ open: false, partnerId: null, form: { contract_status: 'pending', contract_url: '', contract_signed_at: '', contract_notes: '' } });
  const [commissions, setCommissions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [linkRequests, setLinkRequests] = useState([]);
  const [mgmtMembers, setMgmtMembers] = useState([]);
  const [mgmtTransactions, setMgmtTransactions] = useState([]);
  const [mgmtMonth, setMgmtMonth] = useState(new Date().toISOString().slice(0, 7));
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount_cents: '', reference_month: '', paid_at: '', receipt_url: '', notes: '' });
  const [linkDriverId, setLinkDriverId] = useState('');
  const [driverFilter, setDriverFilter] = useState('all');
  const [driverSort, setDriverSort] = useState('rides');
  const [unlinkTarget, setUnlinkTarget] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportPeriod, setReportPeriod] = useState('month');
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [listFilter, setListFilter] = useState('active');

  const token = localStorage.getItem('kaviar_admin_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchPartners = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/territorial-partners`, { headers });
      const data = await res.json();
      if (data.success) setPartners(data.data);
      else setError('Erro ao carregar');
    } catch { setError('Erro de conexão'); }
    finally { setLoading(false); }
  };

  const fetchDetail = async (id) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/territorial-partners/${id}`, { headers });
    const data = await res.json();
    if (data.success) { setDetail(data.data); fetchCommissions(id); fetchPayments(id); fetchLinkRequests(id); }
  };

  const fetchCommissions = async (id) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/territorial-partners/${id}/commissions`, { headers });
    const data = await res.json();
    if (data.success) setCommissions(data.data);
  };

  const fetchPayments = async (id) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/territorial-partners/${id}/payments`, { headers });
    const data = await res.json();
    if (data.success) setPayments(data.data);
  };

  const fetchLinkRequests = async (id) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/territorial-partners/${id}/link-requests`, { headers });
    const data = await res.json();
    if (data.success) setLinkRequests(data.data);
  };

  const fetchMgmtMembers = async (id) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/territorial-partners/${id}/members`, { headers });
    const data = await res.json();
    if (data.success) setMgmtMembers(data.data);
  };

  const fetchMgmtTransactions = async (id, month) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/territorial-partners/${id}/transactions?reference_month=${month}`, { headers });
    const data = await res.json();
    if (data.success) setMgmtTransactions(data.data);
  };

  const handleApproveRequest = async (requestId) => {
    if (!detail) return;
    await fetch(`${API_BASE_URL}/api/admin/territorial-partners/${detail.id}/link-requests/${requestId}/approve`, { method: 'POST', headers });
    fetchDetail(detail.id);
  };

  const handleRejectRequest = async (requestId) => {
    if (!detail) return;
    await fetch(`${API_BASE_URL}/api/admin/territorial-partners/${detail.id}/link-requests/${requestId}/reject`, { method: 'POST', headers });
    fetchLinkRequests(detail.id);
  };

  const fetchReport = async (period) => {
    if (!detail) return;
    const res = await fetch(`${API_BASE_URL}/api/admin/territorial-partners/${detail.id}/report?period=${period}`, { headers });
    const data = await res.json();
    if (data.success) { setReportData(data.data); setReportOpen(true); }
  };

  useEffect(() => { fetchPartners(); }, []);

  const handleSave = async () => {
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${API_BASE_URL}/api/admin/territorial-partners/${editingId}` : `${API_BASE_URL}/api/admin/territorial-partners`;
    const body = { ...form, monthly_fee_cents: form.monthly_fee_cents ? Number(form.monthly_fee_cents) : null, commission_percent: Number(form.commission_percent), billing_due_day: form.billing_due_day ? Number(form.billing_due_day) : null };
    const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.success) { setDialogOpen(false); setForm(emptyForm); setEditingId(null); fetchPartners(); }
  };

  const handleStatusChange = async (id, status) => {
    await fetch(`${API_BASE_URL}/api/admin/territorial-partners/${id}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status }) });
    fetchPartners();
    if (detail?.id === id) fetchDetail(id);
  };

  const handleLinkDriver = async () => {
    if (!linkDriverId || !detail) return;
    await fetch(`${API_BASE_URL}/api/admin/territorial-partners/${detail.id}/drivers`, { method: 'POST', headers, body: JSON.stringify({ driver_id: linkDriverId }) });
    setLinkDriverId('');
    fetchDetail(detail.id);
  };

  const handleUnlinkDriver = async (driverId) => {
    if (!detail) return;
    await fetch(`${API_BASE_URL}/api/admin/territorial-partners/${detail.id}/drivers/${driverId}`, { method: 'DELETE', headers });
    setUnlinkTarget(null);
    fetchDetail(detail.id);
  };

  const handleMarkPaid = async (ids) => {
    if (!detail) return;
    await fetch(`${API_BASE_URL}/api/admin/territorial-partners/${detail.id}/commissions/mark-paid`, { method: 'POST', headers, body: JSON.stringify({ commission_ids: ids }) });
    fetchDetail(detail.id);
    fetchCommissions(detail.id);
  };

  const handleRegisterPayment = async () => {
    if (!detail || !paymentForm.amount_cents || !paymentForm.paid_at) return;
    await fetch(`${API_BASE_URL}/api/admin/territorial-partners/${detail.id}/payments`, { method: 'POST', headers, body: JSON.stringify(paymentForm) });
    setPaymentDialog(false);
    setPaymentForm({ amount_cents: '', reference_month: '', paid_at: '', receipt_url: '', notes: '' });
    fetchPayments(detail.id);
    fetchDetail(detail.id);
  };

  const handleArchive = async (id) => {
    await fetch(`${API_BASE_URL}/api/admin/territorial-partners/${id}/archive`, { method: 'POST', headers });
    setArchiveTarget(null); setDetail(null); fetchPartners();
  };

  const handleDelete = async (id) => {
    const res = await fetch(`${API_BASE_URL}/api/admin/territorial-partners/${id}`, { method: 'DELETE', headers });
    const data = await res.json();
    if (!data.success) { alert(data.error); return; }
    setDeleteTarget(null); setDeleteConfirm(''); setDetail(null); fetchPartners();
  };

  const openEdit = (p) => {
    setForm({ ...emptyForm, ...p, monthly_fee_cents: p.monthly_fee_cents || '', billing_due_day: p.billing_due_day || '' });
    setEditingId(p.id);
    setDialogOpen(true);
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  // Detail view
  if (detail) {
    const f = detail.financial || {};
    const pendingCommissions = commissions.filter(c => c.status === 'pending');
    return (
      <Container maxWidth="lg" sx={{ mt: 3, pb: 4 }}>
        <Button onClick={() => setDetail(null)} sx={{ mb: 2 }}>← Voltar</Button>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{detail.name}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              <Chip label={TYPE_MAP[detail.partner_type]?.label || detail.partner_type} color={TYPE_MAP[detail.partner_type]?.color || 'default'} size="small" />
              <Chip label={STATUS_MAP[detail.status]?.label} color={STATUS_MAP[detail.status]?.color} size="small" />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button variant="contained" size="small" onClick={() => fetchReport(reportPeriod)} sx={{ bgcolor: '#B8942E', '&:hover': { bgcolor: '#9A7B24' } }}>Gerar Relatório</Button>
            {JSON.parse(localStorage.getItem('kaviar_admin_data') || '{}').role === 'SUPER_ADMIN' && <Select size="small" value={detail.status} onChange={(e) => handleStatusChange(detail.id, e.target.value)}>
              <MenuItem value="active">Ativo</MenuItem>
            <MenuItem value="paused">Pausado</MenuItem>
            <MenuItem value="inactive">Inativo</MenuItem>
          </Select>}
          {JSON.parse(localStorage.getItem('kaviar_admin_data') || '{}').role === 'SUPER_ADMIN' && detail.status !== 'archived' && <Button size="small" color="warning" onClick={() => setArchiveTarget(detail)}>Arquivar</Button>}
          {JSON.parse(localStorage.getItem('kaviar_admin_data') || '{}').role === 'SUPER_ADMIN' && <Button size="small" color="error" onClick={() => setDeleteTarget(detail)}>Excluir</Button>}
        </Box>
        </Box>

        {/* Info cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}><Card><CardContent sx={{ textAlign: 'center' }}><Typography variant="h4">{f.total_rides || 0}</Typography><Typography variant="caption">Corridas</Typography></CardContent></Card></Grid>
          <Grid item xs={6} sm={3}><Card><CardContent sx={{ textAlign: 'center' }}><Typography variant="h4">R$ {Number(f.total_ride_value || 0).toFixed(0)}</Typography><Typography variant="caption">Movimentado</Typography></CardContent></Card></Grid>
          <Grid item xs={6} sm={3}><Card><CardContent sx={{ textAlign: 'center' }}><Typography variant="h4">R$ {Number(f.commission_total || 0).toFixed(2)}</Typography><Typography variant="caption">Comissão total</Typography></CardContent></Card></Grid>
          <Grid item xs={6} sm={3}><Card><CardContent sx={{ textAlign: 'center' }}><Typography variant="h4" color="warning.main">R$ {Number(f.commission_pending || 0).toFixed(2)}</Typography><Typography variant="caption">Pendente</Typography></CardContent></Card></Grid>
        </Grid>

        <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ mb: 2, '& .MuiTab-root': { color: '#B0B0B0', fontWeight: 500, fontSize: 14 }, '& .Mui-selected': { color: '#B8942E !important', fontWeight: 700 }, '& .MuiTabs-indicator': { backgroundColor: '#B8942E' } }}>
          <Tab label="Dados" />
          <Tab label={`Motoristas (${detail.drivers?.length || 0})`} />
          <Tab label={`Vínculos (${linkRequests.filter(r => r.status === 'pending').length})`} />
          <Tab label={`Comissões (${commissions.length})`} />
          <Tab label={`Mensalidades (${payments.length})`} />
          {detail.plan === 'management' && <Tab label="Gestão" />}
        </Tabs>

        {detailTab === 0 && (
          <Card><CardContent>
            {/* Logo do parceiro */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{ width: 64, height: 64, borderRadius: 2, border: '1px solid #E8E5DE', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', bgcolor: '#f9f9f7' }}>
                {detail.logo_url ? <img src={detail.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Typography sx={{ color: '#ccc', fontSize: 24 }}>🏢</Typography>}
              </Box>
              {JSON.parse(localStorage.getItem('kaviar_admin_data') || '{}').role === 'SUPER_ADMIN' && <Button size="small" variant="outlined" component="label">
                {detail.logo_url ? 'Trocar logo' : 'Adicionar logo'}
                <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) { alert('Máximo 2MB'); return; }
                  const form = new FormData();
                  form.append('logo', file);
                  const res = await fetch(`${API_BASE_URL}/api/admin/territorial-partners/${detail.id}/logo`, { method: 'POST', headers: { Authorization: headers.Authorization }, body: form });
                  const data = await res.json();
                  if (data.success) fetchDetail(detail.id);
                  else alert(data.error || 'Erro ao enviar logo');
                }} />
              </Button>}
            </Box>
            <Typography><strong>Responsável:</strong> {detail.responsible_name} ({detail.responsible_role})</Typography>
            {detail.responsible_phone && <Typography><strong>Telefone:</strong> {detail.responsible_phone}</Typography>}
            {detail.responsible_email && <Typography><strong>Email:</strong> {detail.responsible_email}</Typography>}
            {detail.address && <Typography><strong>Endereço:</strong> {detail.address}</Typography>}
            <Typography><strong>Comissão:</strong> {Number(detail.commission_percent)}%</Typography>
            {detail.referral_code && <Typography><strong>Código indicação:</strong> {detail.referral_code}</Typography>}
            {!detail.referral_code && (
              <Box sx={{ mt: 2 }}>
                <Button variant="outlined" size="small" onClick={async () => {
                  const res = await fetch(`${API_BASE_URL}/api/admin/territorial-partners/${detail.id}/generate-code`, { method: 'POST', headers });
                  const data = await res.json();
                  if (data.success) fetchDetail(detail.id);
                }}>Gerar código / QR Code</Button>
              </Box>
            )}
            {detail.monthly_fee_cents && <Typography><strong>Mensalidade:</strong> R$ {(detail.monthly_fee_cents / 100).toFixed(2)}</Typography>}
            {detail.billing_due_day && <Typography><strong>Vencimento:</strong> dia {detail.billing_due_day}</Typography>}
            <Typography><strong>Status financeiro:</strong> <Chip label={BILLING_MAP[detail.billing_status]?.label || detail.billing_status} color={BILLING_MAP[detail.billing_status]?.color || 'default'} size="small" /></Typography>
            {detail.last_payment_at && <Typography><strong>Último pagamento:</strong> {new Date(detail.last_payment_at).toLocaleDateString('pt-BR')}</Typography>}
            {detail.notes && <Typography sx={{ mt: 1 }}><strong>Notas:</strong> {detail.notes}</Typography>}

            {/* Links e Acesso — blocos organizados */}
            {detail.referral_code && (() => {
              const driverLink = `https://kaviar.com.br/driver/register?partner_code=${detail.referral_code}`;
              const portalLink = detail.public_token ? `https://kaviar.com.br/parceiro/${detail.referral_code}?token=${detail.public_token}` : null;
              return (
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Convite de motoristas */}
                  <Box sx={{ p: 2, border: '1px solid #E8E5DE', borderRadius: 2, display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Box sx={{ bgcolor: '#fff', p: 1.5, borderRadius: 1 }}>
                      <QRCodeSVG id="partner-qr" value={driverLink} size={120} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Convite de motoristas</Typography>
                      <Typography variant="body2" sx={{ mb: 1, wordBreak: 'break-all', color: '#666' }}>{driverLink}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button size="small" variant="outlined" onClick={() => navigator.clipboard.writeText(driverLink)}>Copiar convite</Button>
                        <Button size="small" variant="outlined" onClick={() => {
                          const svg = document.getElementById('partner-qr');
                          const svgData = new XMLSerializer().serializeToString(svg);
                          const canvas = document.createElement('canvas'); canvas.width = 300; canvas.height = 300;
                          const ctx = canvas.getContext('2d'); const img = new Image();
                          img.onload = () => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 300, 300); ctx.drawImage(img, 0, 0, 300, 300); const a = document.createElement('a'); a.download = `qr-${detail.referral_code}.png`; a.href = canvas.toDataURL('image/png'); a.click(); };
                          img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
                        }}>Baixar QR Code</Button>
                      </Box>
                    </Box>
                  </Box>

                  {/* Portal do parceiro */}
                  <Box sx={{ p: 2, border: '1px solid #E8E5DE', borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Portal do parceiro</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                      {detail.users?.length > 0 ? (<>
                        <Button size="small" variant="contained" sx={{ bgcolor: '#B8942E', '&:hover': { bgcolor: '#9A7B24' } }} onClick={() => window.open('https://kaviar.com.br/parceiro/portal', '_blank')}>Abrir portal</Button>
                        {portalLink && <Button size="small" variant="outlined" onClick={() => { navigator.clipboard.writeText(portalLink); alert('Link copiado!'); }}>Compartilhar acesso</Button>}
                        <Button size="small" variant="outlined" color="warning" onClick={async () => {
                          if (!confirm('Gerar nova senha temporária para este parceiro?')) return;
                          const res = await fetch(`${API_BASE_URL}/api/admin/territorial-partners/${detail.id}/reset-password`, { method: 'POST', headers });
                          const data = await res.json();
                          if (data.success) {
                            const msg = `Nova senha gerada!\n\nEmail: ${data.data.email}\nSenha temporária: ${data.data.temp_password}\n\nPortal: https://kaviar.com.br/parceiro/portal`;
                            alert(msg);
                            if (detail.responsible_phone && confirm('Enviar nova senha por WhatsApp?')) {
                              const phone = detail.responsible_phone.replace(/\D/g, '');
                              const wMsg = `Olá ${detail.responsible_name}! Sua senha do Portal KAVIAR foi redefinida.\n\n*Portal:* https://kaviar.com.br/parceiro/portal\n*Login:* ${data.data.email}\n*Nova senha:* ${data.data.temp_password}\n\nRecomendamos alterar a senha após o primeiro acesso.`;
                              window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(wMsg)}`, '_blank');
                            }
                          } else { alert(`Erro: ${data.error}`); }
                        }}>Redefinir senha</Button>
                        {detail.responsible_phone && <Button size="small" variant="outlined" color="success" onClick={() => {
                          const phone = detail.responsible_phone.replace(/\D/g, '');
                          const msg = `Olá ${detail.responsible_name}! Seguem seus links do KAVIAR:\n\n*Portal de gestão:*\nhttps://kaviar.com.br/parceiro/portal\nLogin: ${detail.users[0].email}\n\n*Convite para motoristas:*\n${driverLink}\n\n*App para passageiros:*\nhttps://downloads.kaviar.com.br/kaviar-passageiro.apk`;
                          window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                        }}>Enviar acesso</Button>}
                      </>) : (<>
                        <Button size="small" variant="contained" onClick={async () => {
                          const email = prompt('Email do parceiro (para login):');
                          if (!email) return;
                          const name = prompt('Nome:') || detail.responsible_name || 'Parceiro';
                          const res = await fetch(`${API_BASE_URL}/api/admin/territorial-partners/${detail.id}/users`, { method: 'POST', headers, body: JSON.stringify({ name, email }) });
                          const data = await res.json();
                          if (data.success) {
                            const msg = `Olá ${detail.responsible_name}! Seu acesso ao Portal Parceiro KAVIAR foi criado.\n\n*Portal de gestão:*\nhttps://kaviar.com.br/parceiro/portal\nLogin: ${data.data.email}\nSenha: ${data.data.temp_password}\n\n*Link para motoristas:*\n${driverLink}\n\n*Link para passageiros (app):*\nhttps://downloads.kaviar.com.br/kaviar-passageiro.apk`;
                            alert(`✅ Acesso criado!\n\n${msg}`);
                            fetchDetail(detail.id);
                            if (detail.responsible_phone && confirm('Enviar por WhatsApp?')) {
                              const phone = detail.responsible_phone.replace(/\D/g, '');
                              window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                            }
                          } else { alert(`Erro: ${data.error}`); }
                        }}>Criar acesso do parceiro</Button>
                        {detail.responsible_phone && <Button size="small" variant="outlined" color="success" onClick={() => {
                          const phone = detail.responsible_phone.replace(/\D/g, '');
                          const msg = `Olá ${detail.responsible_name}! Seguem os links do KAVIAR:\n\n*Portal de gestão:*\nhttps://kaviar.com.br/parceiro/portal\n\n*Convite para motoristas:*\n${driverLink}\n\n*App para passageiros:*\nhttps://downloads.kaviar.com.br/kaviar-passageiro.apk`;
                          window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                        }}>Enviar links</Button>}
                      </>)}
                    </Box>
                  </Box>
                </Box>
              );
            })()}

            {/* Seção Contrato */}
            <Box sx={{ mt: 3, p: 2, border: '1px solid #E8E5DE', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>📋 Contrato</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="body2"><strong>Status:</strong> <Chip label={detail.contract_status || 'pending'} size="small" color={detail.contract_status === 'signed' ? 'success' : detail.contract_status === 'not_required' ? 'default' : 'warning'} /></Typography>
                {detail.contract_signed_at && <Typography variant="body2"><strong>Assinado em:</strong> {new Date(detail.contract_signed_at).toLocaleDateString('pt-BR')}</Typography>}
              </Box>
              {detail.contract_url && (
                <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Button size="small" onClick={() => window.open(detail.contract_url, '_blank')} sx={{ textTransform: 'none' }}>Abrir contrato</Button>
                  <Button size="small" onClick={() => navigator.clipboard.writeText(detail.contract_url)} sx={{ textTransform: 'none', color: '#6B7280' }}>Copiar link</Button>
                </Box>
              )}
              {detail.contract_notes && <Typography variant="body2" sx={{ mt: 1, color: '#666' }}><strong>Obs:</strong> {detail.contract_notes}</Typography>}
              <Button size="small" variant="outlined" sx={{ mt: 1.5 }} onClick={() => { setContractDialog({ open: true, partnerId: detail.id, form: { contract_status: detail.contract_status || 'pending', contract_url: detail.contract_url || '', contract_signed_at: detail.contract_signed_at ? detail.contract_signed_at.slice(0, 10) : '', contract_notes: detail.contract_notes || '' } }); }}>Registrar Contrato</Button>
            </Box>
          </CardContent></Card>
        )}

        {detailTab === 1 && (
          <Card><CardContent>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <TextField size="small" label="ID do motorista" value={linkDriverId} onChange={(e) => setLinkDriverId(e.target.value)} sx={{ flex: 1, minWidth: 200 }} />
              <Button variant="contained" onClick={handleLinkDriver} disabled={!linkDriverId}>Vincular</Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 120 }}><InputLabel>Status</InputLabel><Select label="Status" value={driverFilter} onChange={(e) => setDriverFilter(e.target.value)}>
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="approved">Aprovado</MenuItem>
                <MenuItem value="pending">Pendente</MenuItem>
                <MenuItem value="suspended">Suspenso</MenuItem>
              </Select></FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }}><InputLabel>Ordenar</InputLabel><Select label="Ordenar" value={driverSort} onChange={(e) => setDriverSort(e.target.value)}>
                <MenuItem value="rides">Mais corridas</MenuItem>
                <MenuItem value="commission">Maior comissão</MenuItem>
                <MenuItem value="recent">Vínculo recente</MenuItem>
              </Select></FormControl>
            </Box>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>Nome</TableCell><TableCell>Status</TableCell><TableCell>Vínculo</TableCell><TableCell>Última corrida</TableCell><TableCell>Corridas</TableCell><TableCell>Comissão total</TableCell><TableCell>Pendente</TableCell><TableCell>Ações</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {(detail.drivers || [])
                  .filter(d => driverFilter === 'all' || d.status === driverFilter)
                  .sort((a, b) => {
                    if (driverSort === 'rides') return (b.rides || 0) - (a.rides || 0);
                    if (driverSort === 'commission') return (b.commission_value || 0) - (a.commission_value || 0);
                    return new Date(b.linked_at || 0) - new Date(a.linked_at || 0);
                  })
                  .map(d => (
                  <TableRow key={d.id}>
                    <TableCell><a href={`/admin/drivers/${d.id}`} style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 500 }}>{d.name}</a></TableCell>
                    <TableCell><Chip label={d.status} size="small" color={d.status === 'approved' ? 'success' : 'default'} /></TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{d.linked_at ? new Date(d.linked_at).toLocaleDateString('pt-BR') : '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{d.last_ride_at ? new Date(d.last_ride_at).toLocaleDateString('pt-BR') : '—'}</TableCell>
                    <TableCell>{d.rides || 0}</TableCell>
                    <TableCell>R$ {Number(d.commission_value || 0).toFixed(2)}</TableCell>
                    <TableCell sx={{ color: (d.commission_pending || 0) > 0 ? '#ed6c02' : 'inherit' }}>R$ {Number(d.commission_pending || 0).toFixed(2)}</TableCell>
                    <TableCell><Button size="small" color="error" onClick={() => setUnlinkTarget(d)}>Desvincular</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        )}

        {detailTab === 2 && (
          <Card><CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Código de indicação: <strong>{detail.referral_code || '—'}</strong></Typography>
            <Table size="small">
              <TableHead><TableRow><TableCell>Motorista</TableCell><TableCell>Telefone</TableCell><TableCell>Status motorista</TableCell><TableCell>Data</TableCell><TableCell>Status</TableCell><TableCell>Ações</TableCell></TableRow></TableHead>
              <TableBody>
                {linkRequests.map(r => (
                  <TableRow key={r.id}>
                    <TableCell><a href={`/admin/drivers/${r.driver_id}`} style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 500 }}>{r.driver?.name || r.driver_id.slice(0, 12)}</a></TableCell>
                    <TableCell>{r.driver?.phone || '—'}</TableCell>
                    <TableCell><Chip label={r.driver?.status || '?'} size="small" /></TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{new Date(r.created_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell><Chip label={r.status === 'pending' ? 'Pendente' : r.status === 'approved' ? 'Aprovado' : 'Rejeitado'} size="small" color={r.status === 'pending' ? 'warning' : r.status === 'approved' ? 'success' : 'default'} /></TableCell>
                    <TableCell>
                      {r.status === 'pending' && (<>
                        <Button size="small" variant="contained" color="success" onClick={() => handleApproveRequest(r.id)} sx={{ mr: 0.5 }}>Aprovar</Button>
                        <Button size="small" variant="outlined" color="error" onClick={() => handleRejectRequest(r.id)}>Rejeitar</Button>
                      </>)}
                      {r.status === 'approved' && (
                        <Button size="small" href={`/admin/drivers/${r.driver_id}`}>Ver motorista</Button>
                      )}
                      {r.status === 'rejected' && (
                        <Button size="small" onClick={() => handleApproveRequest(r.id)}>Reabrir</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {linkRequests.length === 0 && <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', color: '#999' }}>Nenhum pedido de vínculo</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        )}

        {detailTab === 3 && (
          <Card><CardContent>
            {pendingCommissions.length > 0 && (
              <Button variant="contained" color="success" sx={{ mb: 2 }} onClick={() => handleMarkPaid(pendingCommissions.map(c => c.id))}>
                Marcar {pendingCommissions.length} como pago
              </Button>
            )}
            <Table size="small">
              <TableHead><TableRow><TableCell>Data</TableCell><TableCell>Corrida</TableCell><TableCell>Valor corrida</TableCell><TableCell>%</TableCell><TableCell>Comissão</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
              <TableBody>
                {commissions.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{new Date(c.created_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{c.ride_id.slice(0, 8)}</TableCell>
                    <TableCell>R$ {Number(c.ride_final_price).toFixed(2)}</TableCell>
                    <TableCell>{Number(c.commission_percent)}%</TableCell>
                    <TableCell>R$ {Number(c.commission_amount).toFixed(2)}</TableCell>
                    <TableCell><Chip label={c.status === 'paid' ? 'Pago' : 'Pendente'} color={c.status === 'paid' ? 'success' : 'warning'} size="small" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        )}

        {detailTab === 4 && (
          <Card><CardContent>
            <Button variant="contained" sx={{ mb: 2 }} onClick={() => setPaymentDialog(true)}>Registrar Pagamento</Button>
            <Table size="small">
              <TableHead><TableRow><TableCell>Data</TableCell><TableCell>Referência</TableCell><TableCell>Valor</TableCell><TableCell>Comprovante</TableCell><TableCell>Obs</TableCell></TableRow></TableHead>
              <TableBody>
                {payments.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.paid_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{p.reference_month || '-'}</TableCell>
                    <TableCell>R$ {(p.amount_cents / 100).toFixed(2)}</TableCell>
                    <TableCell>{p.receipt_url ? <a href={p.receipt_url} target="_blank" rel="noreferrer">Ver</a> : '-'}</TableCell>
                    <TableCell>{p.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        )}

        {/* Tab 5: Gestão (management plan only) */}
        {detailTab === 5 && detail.plan === 'management' && (() => {
          if (mgmtMembers.length === 0 && mgmtTransactions.length === 0) {
            fetchMgmtMembers(detail.id);
            fetchMgmtTransactions(detail.id, mgmtMonth);
          }
          const income = mgmtTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount_cents, 0);
          const expense = mgmtTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount_cents, 0);
          return (
            <Box>
              {/* Associados */}
              <Card sx={{ mb: 2 }}><CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">Associados ({mgmtMembers.length})</Typography>
                  <Button size="small" variant="contained" onClick={() => {
                    const name = prompt('Nome do associado:');
                    if (!name) return;
                    const unit = prompt('Unidade/casa (opcional):') || '';
                    fetch(`${API_BASE_URL}/api/admin/territorial-partners/${detail.id}/members`, { method: 'POST', headers, body: JSON.stringify({ name, unit }) })
                      .then(() => fetchMgmtMembers(detail.id));
                  }}>+ Associado</Button>
                </Box>
                <Table size="small">
                  <TableHead><TableRow><TableCell>Nome</TableCell><TableCell>Unidade</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
                  <TableBody>
                    {mgmtMembers.map(m => (
                      <TableRow key={m.id}>
                        <TableCell>{m.name}</TableCell>
                        <TableCell>{m.unit || '—'}</TableCell>
                        <TableCell><Chip label={m.status} size="small" color={m.status === 'active' ? 'success' : 'default'} onClick={() => {
                          fetch(`${API_BASE_URL}/api/admin/territorial-partners/${detail.id}/members/${m.id}`, { method: 'PATCH', headers, body: JSON.stringify({ status: m.status === 'active' ? 'inactive' : 'active' }) })
                            .then(() => fetchMgmtMembers(detail.id));
                        }} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent></Card>

              {/* Transações */}
              <Card><CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="subtitle2">Movimentações</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField size="small" type="month" value={mgmtMonth} onChange={(e) => { setMgmtMonth(e.target.value); fetchMgmtTransactions(detail.id, e.target.value); }} InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
                    <Button size="small" variant="contained" color="success" onClick={() => {
                      const desc = prompt('Descrição da entrada:');
                      if (!desc) return;
                      const val = prompt('Valor em centavos (ex: 5000 = R$50):');
                      if (!val) return;
                      const cat = prompt('Categoria (mensalidade/doação/outro):') || 'outro';
                      fetch(`${API_BASE_URL}/api/admin/territorial-partners/${detail.id}/transactions`, { method: 'POST', headers, body: JSON.stringify({ type: 'income', amount_cents: Number(val), description: desc, category: cat, reference_month: mgmtMonth }) })
                        .then(() => fetchMgmtTransactions(detail.id, mgmtMonth));
                    }}>+ Entrada</Button>
                    <Button size="small" variant="contained" color="error" onClick={() => {
                      const desc = prompt('Descrição da saída:');
                      if (!desc) return;
                      const val = prompt('Valor em centavos (ex: 2000 = R$20):');
                      if (!val) return;
                      const cat = prompt('Categoria (manutencao/limpeza/evento/outro):') || 'outro';
                      fetch(`${API_BASE_URL}/api/admin/territorial-partners/${detail.id}/transactions`, { method: 'POST', headers, body: JSON.stringify({ type: 'expense', amount_cents: Number(val), description: desc, category: cat, reference_month: mgmtMonth }) })
                        .then(() => fetchMgmtTransactions(detail.id, mgmtMonth));
                    }}>+ Saída</Button>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Typography variant="body2" color="success.main">Entradas: R$ {(income / 100).toFixed(2)}</Typography>
                  <Typography variant="body2" color="error.main">Saídas: R$ {(expense / 100).toFixed(2)}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>Saldo: R$ {((income - expense) / 100).toFixed(2)}</Typography>
                </Box>
                <Table size="small">
                  <TableHead><TableRow><TableCell>Descrição</TableCell><TableCell>Categoria</TableCell><TableCell align="right">Valor</TableCell></TableRow></TableHead>
                  <TableBody>
                    {mgmtTransactions.map(t => (
                      <TableRow key={t.id}>
                        <TableCell>{t.description}</TableCell>
                        <TableCell>{t.category}</TableCell>
                        <TableCell align="right" sx={{ color: t.type === 'income' ? 'success.main' : 'error.main', fontWeight: 600 }}>{t.type === 'income' ? '+' : '-'} R$ {(t.amount_cents / 100).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent></Card>

              {/* Report */}
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button variant="contained" sx={{ bgcolor: '#B8942E', '&:hover': { bgcolor: '#9A7B24' } }} onClick={() => {
                  const el = document.getElementById('admin-mgmt-report');
                  if (el) { el.style.display = 'block'; window.print(); el.style.display = 'none'; }
                }}>Relatório do mês — Imprimir / PDF</Button>
              </Box>
              <Box id="admin-mgmt-report" sx={{ display: 'none', p: 3 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 18, textAlign: 'center' }}>KAVIAR</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'center' }}>{detail.name}</Typography>
                <Typography variant="body2" sx={{ textAlign: 'center', mb: 2 }}>Prestação de contas — {mgmtMonth}</Typography>
                <Typography variant="body2"><strong>Entradas:</strong> R$ {(income / 100).toFixed(2)} | <strong>Saídas:</strong> R$ {(expense / 100).toFixed(2)} | <strong>Saldo:</strong> R$ {((income - expense) / 100).toFixed(2)}</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}><strong>Associados ativos:</strong> {mgmtMembers.filter(m => m.status === 'active').length} | <strong>Pagaram:</strong> {(() => { const paidIds = new Set(mgmtTransactions.filter(t => t.type === 'income' && t.category === 'mensalidade' && t.member_id).map(t => t.member_id)); return paidIds.size; })()} | <strong>Inadimplentes:</strong> {(() => { const paidIds = new Set(mgmtTransactions.filter(t => t.type === 'income' && t.category === 'mensalidade' && t.member_id).map(t => t.member_id)); return mgmtMembers.filter(m => m.status === 'active' && !paidIds.has(m.id)).length; })()}</Typography>
                <Typography variant="subtitle2" sx={{ mt: 1 }}>Entradas:</Typography>
                {mgmtTransactions.filter(t => t.type === 'income').map(t => <Typography key={t.id} variant="body2">• {t.description} — R$ {(t.amount_cents / 100).toFixed(2)}</Typography>)}
                <Typography variant="subtitle2" sx={{ mt: 1 }}>Saídas:</Typography>
                {mgmtTransactions.filter(t => t.type === 'expense').map(t => <Typography key={t.id} variant="body2">• {t.description} — R$ {(t.amount_cents / 100).toFixed(2)}</Typography>)}
                <Typography variant="subtitle2" sx={{ mt: 1 }}>Mensalidades:</Typography>
                {mgmtMembers.filter(m => m.status === 'active').map(m => { const paid = mgmtTransactions.some(t => t.type === 'income' && t.category === 'mensalidade' && t.member_id === m.id); return <Typography key={m.id} variant="body2">{paid ? '✅' : '❌'} {m.name} {m.unit ? `(${m.unit})` : ''}</Typography>; })}
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 2, fontStyle: 'italic' }}>Controle interno da associação. Não substitui contabilidade oficial.</Typography>
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center' }}>Gerado em {new Date().toLocaleString('pt-BR')} • KAVIAR</Typography>
              </Box>
            </Box>
          );
        })()}

        {/* Payment registration dialog */}
        <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Registrar Pagamento Mensal</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField label="Valor (centavos)" type="number" value={paymentForm.amount_cents} onChange={(e) => setPaymentForm({ ...paymentForm, amount_cents: e.target.value })} helperText="Ex: 5000 = R$ 50,00" required />
            <TextField label="Mês referência" placeholder="2026-05" value={paymentForm.reference_month} onChange={(e) => setPaymentForm({ ...paymentForm, reference_month: e.target.value })} />
            <TextField label="Data do pagamento" type="date" value={paymentForm.paid_at} onChange={(e) => setPaymentForm({ ...paymentForm, paid_at: e.target.value })} InputLabelProps={{ shrink: true }} required />
            <TextField label="Link comprovante" value={paymentForm.receipt_url} onChange={(e) => setPaymentForm({ ...paymentForm, receipt_url: e.target.value })} />
            <TextField label="Observação" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
          </DialogContent>
          <DialogActions><Button onClick={() => setPaymentDialog(false)}>Cancelar</Button><Button variant="contained" onClick={handleRegisterPayment}>Registrar</Button></DialogActions>
        </Dialog>

        {/* Unlink confirmation */}
        <Dialog open={!!unlinkTarget} onClose={() => setUnlinkTarget(null)}>
          <DialogTitle>Confirmar desvínculo</DialogTitle>
          <DialogContent>
            <Typography>Deseja desvincular <strong>{unlinkTarget?.name}</strong> de <strong>{detail?.name}</strong>?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUnlinkTarget(null)}>Cancelar</Button>
            <Button variant="contained" color="error" onClick={() => handleUnlinkDriver(unlinkTarget?.id)}>Confirmar desvínculo</Button>
          </DialogActions>
        </Dialog>

        {/* Report Dialog */}
        <Dialog open={reportOpen} onClose={() => setReportOpen(false)} maxWidth="md" fullWidth>
          <DialogContent sx={{ bgcolor: '#0a0a0a', color: '#E8E3D5', p: 0 }}>
            <Box id="partner-report" sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                  <Typography sx={{ color: '#B8942E', fontWeight: 800, fontSize: 22 }}>KAVIAR</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>{reportData?.partner_name}</Typography>
                  <Typography variant="body2" sx={{ color: '#999' }}>Relatório operacional • {reportData?.period?.label === 'today' ? 'Hoje' : reportData?.period?.label === '7d' ? 'Últimos 7 dias' : reportData?.period?.label === 'month' ? 'Mês atual' : 'Personalizado'}</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Chip label={reportData?.billing_status} size="small" sx={{ mb: 0.5 }} />
                  <Typography variant="body2" sx={{ color: '#999' }}>Comissão: {Number(reportData?.commission_percent || 0)}%</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                {['today', '7d', 'month'].map(p => (
                  <Button key={p} size="small" variant={reportPeriod === p ? 'contained' : 'outlined'}
                    onClick={() => { setReportPeriod(p); fetchReport(p); }}
                    sx={{ borderColor: '#333', color: reportPeriod === p ? '#000' : '#B8942E', bgcolor: reportPeriod === p ? '#B8942E' : 'transparent', '&:hover': { bgcolor: '#1a1500', borderColor: '#B8942E' } }}>
                    {p === 'today' ? 'Hoje' : p === '7d' ? '7 dias' : 'Mês'}
                  </Button>
                ))}
              </Box>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                  { label: 'Motoristas', value: reportData?.total_drivers, sub: `${reportData?.active_drivers} ativos` },
                  { label: 'Corridas', value: reportData?.total_rides },
                  { label: 'Comissão gerada', value: `R$ ${Number(reportData?.total_commission || 0).toFixed(2)}` },
                  { label: 'Pendente', value: `R$ ${Number(reportData?.total_pending || 0).toFixed(2)}`, color: '#ff9800' },
                  { label: 'Pago', value: `R$ ${Number(reportData?.total_paid || 0).toFixed(2)}`, color: '#4caf50' },
                ].map(k => (
                  <Grid item xs={6} sm={4} md={2.4} key={k.label}>
                    <Box sx={{ textAlign: 'center', p: 1.5, border: '1px solid #222', borderRadius: 1 }}>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: k.color || '#B8942E' }}>{k.value}</Typography>
                      <Typography variant="caption" sx={{ color: '#999' }}>{k.label}</Typography>
                      {k.sub && <Typography variant="caption" sx={{ color: '#666', display: 'block', fontSize: 10 }}>{k.sub}</Typography>}
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Typography variant="subtitle2" sx={{ color: '#B8942E', mb: 1 }}>Motoristas</Typography>
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell sx={{ color: '#999', borderColor: '#222' }}>Nome</TableCell>
                  <TableCell align="right" sx={{ color: '#999', borderColor: '#222' }}>Corridas</TableCell>
                  <TableCell align="right" sx={{ color: '#999', borderColor: '#222' }}>Comissão</TableCell>
                  <TableCell align="right" sx={{ color: '#999', borderColor: '#222' }}>Última corrida</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {(reportData?.drivers || []).map((d, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ color: '#E8E3D5', borderColor: '#1a1a1a' }}>{d.name}</TableCell>
                      <TableCell align="right" sx={{ color: '#B8942E', fontWeight: 700, borderColor: '#1a1a1a' }}>{d.rides}</TableCell>
                      <TableCell align="right" sx={{ color: '#E8E3D5', borderColor: '#1a1a1a' }}>R$ {Number(d.commission || 0).toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ color: '#666', borderColor: '#1a1a1a', fontSize: 12 }}>{d.last_ride_at ? new Date(d.last_ride_at).toLocaleDateString('pt-BR') : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Typography variant="caption" sx={{ color: '#444', display: 'block', mt: 3, textAlign: 'center' }}>
                Gerado em {new Date().toLocaleString('pt-BR')} • KAVIAR Mobilidade Comunitária
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ bgcolor: '#0a0a0a', borderTop: '1px solid #222', px: 3, py: 1.5 }}>
            <Button onClick={() => setReportOpen(false)} sx={{ color: '#999' }}>Fechar</Button>
            <Button variant="contained" onClick={() => { window.print(); }} sx={{ bgcolor: '#B8942E', '&:hover': { bgcolor: '#9A7B24' } }}>Imprimir / PDF</Button>
          </DialogActions>
        </Dialog>

        {/* Archive confirmation */}
        <Dialog open={!!archiveTarget} onClose={() => setArchiveTarget(null)}>
          <DialogTitle>Arquivar parceiro</DialogTitle>
          <DialogContent>
            <Typography>Deseja arquivar <strong>{archiveTarget?.name}</strong>?</Typography>
            <Typography variant="body2" sx={{ mt: 1, color: '#666' }}>Motoristas serão desvinculados. Histórico de comissões e pagamentos será preservado.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setArchiveTarget(null)}>Cancelar</Button>
            <Button variant="contained" color="warning" onClick={() => handleArchive(archiveTarget?.id)}>Confirmar arquivamento</Button>
          </DialogActions>
        </Dialog>

        {/* Delete confirmation */}
        <Dialog open={!!deleteTarget} onClose={() => { setDeleteTarget(null); setDeleteConfirm(''); }}>
          <DialogTitle>Excluir parceiro</DialogTitle>
          <DialogContent>
            <Typography>Excluir definitivamente <strong>{deleteTarget?.name}</strong>?</Typography>
            <Typography variant="body2" sx={{ mt: 1, color: '#d32f2f' }}>Esta ação é irreversível. Só é permitida para parceiros sem comissões, pagamentos ou motoristas vinculados.</Typography>
            <TextField fullWidth size="small" sx={{ mt: 2 }} label='Digite "EXCLUIR" para confirmar' value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setDeleteTarget(null); setDeleteConfirm(''); }}>Cancelar</Button>
            <Button variant="contained" color="error" disabled={deleteConfirm !== 'EXCLUIR'} onClick={() => handleDelete(deleteTarget?.id)}>Excluir definitivamente</Button>
          </DialogActions>
        </Dialog>

        {/* Modal Registrar Contrato */}
        <Dialog open={contractDialog.open} onClose={() => setContractDialog({ ...contractDialog, open: false })} maxWidth="sm" fullWidth>
          <DialogTitle>Registrar Contrato</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Status do contrato</InputLabel>
              <Select value={contractDialog.form.contract_status} label="Status do contrato" onChange={e => setContractDialog({ ...contractDialog, form: { ...contractDialog.form, contract_status: e.target.value } })}>
                <MenuItem value="pending">Pendente</MenuItem><MenuItem value="signed">Assinado</MenuItem><MenuItem value="not_required">Não necessário</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Link do contrato assinado" value={contractDialog.form.contract_url} onChange={e => setContractDialog({ ...contractDialog, form: { ...contractDialog.form, contract_url: e.target.value } })} fullWidth size="small" placeholder="https://..." />
            <TextField label="Data de assinatura" type="date" value={contractDialog.form.contract_signed_at} onChange={e => setContractDialog({ ...contractDialog, form: { ...contractDialog.form, contract_signed_at: e.target.value } })} fullWidth size="small" InputLabelProps={{ shrink: true }} />
            <TextField label="Observações" value={contractDialog.form.contract_notes} onChange={e => setContractDialog({ ...contractDialog, form: { ...contractDialog.form, contract_notes: e.target.value } })} fullWidth size="small" multiline rows={2} />
            <Alert severity="info">Registro interno. Não substitui contrato jurídico formal nem orientação contábil.</Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setContractDialog({ ...contractDialog, open: false })}>Cancelar</Button>
            <Button variant="contained" sx={{ bgcolor: '#B8942E' }} onClick={async () => {
              const { partnerId, form } = contractDialog;
              const payload = { contract_status: form.contract_status };
              if (form.contract_url) payload.contract_url = form.contract_url;
              if (form.contract_signed_at) payload.contract_signed_at = new Date(form.contract_signed_at).toISOString();
              if (form.contract_notes) payload.contract_notes = form.contract_notes;
              const res = await fetch(`${API_BASE_URL}/api/admin/territorial-partners/${partnerId}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
              const d = await res.json();
              if (d.success) { setContractDialog({ ...contractDialog, open: false }); fetchDetail(partnerId); }
              else alert(d.error || 'Erro ao salvar contrato');
            }}>Salvar Contrato</Button>
          </DialogActions>
        </Dialog>
      </Container>
    );
  }

  // List view
  return (
    <Container maxWidth="lg" sx={{ mt: 3, pb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Parceiros Territoriais</Typography>
          <Typography variant="body2" color="text.secondary">Associações, condomínios e parceiros com comissão por corridas</Typography>
        </Box>
        {(() => { const a = JSON.parse(localStorage.getItem('kaviar_admin_data') || '{}'); return a.role === 'SUPER_ADMIN' ? <Button variant="contained" startIcon={<Add />} onClick={() => { setForm(emptyForm); setEditingId(null); setDialogOpen(true); }}>Novo Parceiro</Button> : null; })()}
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        {[['active', 'Ativos'], ['archived', 'Arquivados'], ['all', 'Todos']].map(([v, l]) => (
          <Button key={v} size="small" variant={listFilter === v ? 'contained' : 'outlined'} onClick={() => setListFilter(v)}>{l}</Button>
        ))}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        {partners.filter(p => listFilter === 'all' || (listFilter === 'active' ? p.status !== 'archived' : p.status === listFilter)).map(p => (
          <Grid item xs={12} sm={6} md={4} key={p.id}>
            <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }} onClick={() => fetchDetail(p.id)}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{p.name}</Typography>
                  {JSON.parse(localStorage.getItem('kaviar_admin_data') || '{}').role === 'SUPER_ADMIN' && <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEdit(p); }}><Edit fontSize="small" /></IconButton>}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                  <Chip label={TYPE_MAP[p.partner_type]?.label || p.partner_type} size="small" color={TYPE_MAP[p.partner_type]?.color || 'default'} />
                  <Chip label={STATUS_MAP[p.status]?.label} size="small" color={STATUS_MAP[p.status]?.color} />
                  {p.billing_status && p.billing_status !== 'current' && <Chip label={BILLING_MAP[p.billing_status]?.label} size="small" color={BILLING_MAP[p.billing_status]?.color} variant="outlined" />}
                </Box>
                <Typography variant="body2" color="text.secondary">{p.responsible_name} • {Number(p.commission_percent)}%</Typography>
                <Typography variant="body2" color="text.secondary"><People sx={{ fontSize: 14, mr: 0.5 }} />{p._count?.drivers || 0} motoristas • {p._count?.commissions || 0} comissões</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Editar Parceiro' : 'Novo Parceiro'}<IconButton onClick={() => setDialogOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}><Close /></IconButton></DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <FormControl><InputLabel>Tipo</InputLabel><Select label="Tipo" value={form.partner_type} onChange={(e) => setForm({ ...form, partner_type: e.target.value })}>
            {Object.entries(TYPE_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
          </Select></FormControl>
          <TextField label="Endereço" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <TextField label="Responsável" value={form.responsible_name} onChange={(e) => setForm({ ...form, responsible_name: e.target.value })} required />
          <TextField label="Cargo" value={form.responsible_role} onChange={(e) => setForm({ ...form, responsible_role: e.target.value })} />
          <TextField label="Telefone" value={form.responsible_phone} onChange={(e) => setForm({ ...form, responsible_phone: e.target.value })} />
          <TextField label="Email" value={form.responsible_email} onChange={(e) => setForm({ ...form, responsible_email: e.target.value })} />
          <TextField label="Comissão (%)" type="number" value={form.commission_percent} onChange={(e) => setForm({ ...form, commission_percent: e.target.value })} />
          <TextField label="Mensalidade (centavos)" type="number" value={form.monthly_fee_cents} onChange={(e) => setForm({ ...form, monthly_fee_cents: e.target.value })} helperText="Ex: 5000 = R$ 50,00" />
          <TextField label="Dia vencimento (1-28)" type="number" value={form.billing_due_day} onChange={(e) => setForm({ ...form, billing_due_day: e.target.value })} inputProps={{ min: 1, max: 28 }} />
          <TextField label="Notas" multiline rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </DialogContent>
        <DialogActions><Button onClick={() => setDialogOpen(false)}>Cancelar</Button><Button variant="contained" onClick={handleSave}>Salvar</Button></DialogActions>
      </Dialog>

    </Container>
  );
}
