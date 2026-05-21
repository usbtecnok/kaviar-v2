import { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Alert, CircularProgress, Switch } from '@mui/material';
import { API_BASE_URL } from '../../config/api';

const RECIPIENT_LABELS = { individual: 'Pessoa Física', company: 'Pessoa Jurídica', association: 'Associação' };
const STATUS_COLORS = { calculated: '#D97706', approved: '#2563EB', paid: '#059669', canceled: '#DC2626', pending: '#6B7280', verified: '#059669', rejected: '#DC2626' };

export default function TerritorialPayoutsPage() {
  const [tab, setTab] = useState(0);
  const [operators, setOperators] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('kaviar_admin_token');

  // Operator form
  const [opOpen, setOpOpen] = useState(false);
  const [opForm, setOpForm] = useState({ admin_id: '', territory_id: '', recipient_type: 'individual', display_name: '', full_name: '', document_cpf: '', company_name: '', document_cnpj: '', legal_representative_name: '', legal_representative_cpf: '', pix_key: '', pix_key_type: 'cpf', email: '', phone: '' });
  const [opSaving, setOpSaving] = useState(false);
  const [opError, setOpError] = useState('');

  // Payout calculate
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcForm, setCalcForm] = useState({ territory_id: '', reference_month: new Date().toISOString().slice(0, 7) });
  const [calcSaving, setCalcSaving] = useState(false);
  const [calcError, setCalcError] = useState('');

  // Pay modal
  const [payOpen, setPayOpen] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState({ payment_method: 'pix', payment_ref: '', receipt_url: '', fiscal_document_url: '', fiscal_document_ref: '', fiscal_notes: '' });
  const [paySaving, setPaySaving] = useState(false);

  // Admins for operator creation (loaded per territory)
  const [territoryAdmins, setTerritoryAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchAll = async () => {
    try {
      const [opRes, payRes, terRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/territorial-payouts/operators`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/territorial-payouts/payouts`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/territories`, { headers }),
      ]);
      const [opData, payData, terData] = await Promise.all([opRes.json(), payRes.json(), terRes.json()]);
      if (opData.success) setOperators(opData.data);
      if (payData.success) setPayouts(payData.data);
      if (terData.success) setTerritories(terData.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Fetch admins when territory changes in operator form
  useEffect(() => {
    if (!opForm.territory_id) { setTerritoryAdmins([]); return; }
    setLoadingAdmins(true);
    fetch(`${API_BASE_URL}/api/admin/territories/${opForm.territory_id}`, { headers })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data.admin_access) {
          setTerritoryAdmins(d.data.admin_access.map(a => a.admin).filter(a => a.is_active));
        } else { setTerritoryAdmins([]); }
      })
      .catch(() => setTerritoryAdmins([]))
      .finally(() => setLoadingAdmins(false));
    setOpForm(f => ({ ...f, admin_id: '' }));
  }, [opForm.territory_id]);

  // Operator actions
  const handleCreateOperator = async () => {
    setOpSaving(true); setOpError('');
    const res = await fetch(`${API_BASE_URL}/api/admin/territorial-payouts/operators`, { method: 'POST', headers, body: JSON.stringify(opForm) });
    const d = await res.json();
    if (d.success) { setOpOpen(false); fetchAll(); } else setOpError(d.error);
    setOpSaving(false);
  };

  const handleVerify = async (id) => {
    await fetch(`${API_BASE_URL}/api/admin/territorial-payouts/operators/${id}`, { method: 'PATCH', headers, body: JSON.stringify({ document_status: 'verified', is_active: true }) });
    fetchAll();
  };

  // Payout actions
  const handleCalculate = async () => {
    setCalcSaving(true); setCalcError('');
    const res = await fetch(`${API_BASE_URL}/api/admin/territorial-payouts/payouts/calculate`, { method: 'POST', headers, body: JSON.stringify(calcForm) });
    const d = await res.json();
    if (d.success) { setCalcOpen(false); fetchAll(); } else setCalcError(d.error);
    setCalcSaving(false);
  };

  const handleApprove = async (id) => {
    if (!confirm('Aprovar este repasse?')) return;
    await fetch(`${API_BASE_URL}/api/admin/territorial-payouts/payouts/${id}/approve`, { method: 'PATCH', headers, body: JSON.stringify({}) });
    fetchAll();
  };

  const handlePay = async () => {
    setPaySaving(true);
    await fetch(`${API_BASE_URL}/api/admin/territorial-payouts/payouts/${payTarget.id}/pay`, { method: 'PATCH', headers, body: JSON.stringify(payForm) });
    setPayOpen(false); setPaySaving(false); fetchAll();
  };

  const handleCancel = async (id) => {
    const reason = prompt('Motivo do cancelamento:');
    if (!reason) return;
    await fetch(`${API_BASE_URL}/api/admin/territorial-payouts/payouts/${id}/cancel`, { method: 'PATCH', headers, body: JSON.stringify({ cancel_reason: reason }) });
    fetchAll();
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress sx={{ color: '#B8942E' }} /></Box>;

  return (
    <Box>
      <Typography variant="h5" sx={{ color: '#C8A84E', fontWeight: 800, mb: 1 }}>💰 Repasses Territoriais</Typography>
      <Alert severity="warning" sx={{ mb: 2, bgcolor: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.3)' }}>Repasse manual. O sistema não faz Pix automático, split, saque ou pagamento automático.</Alert>
      <Alert severity="info" sx={{ mb: 3, bgcolor: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.2)' }}>Este registro não substitui orientação contábil, contrato ou obrigação fiscal. Consulte o contador antes de repasses recorrentes.</Alert>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 600, color: '#9CA3AF' }, '& .Mui-selected': { color: '#C8A84E !important' }, '& .MuiTabs-indicator': { bgcolor: '#B8942E' } }}>
        <Tab label={`Operadores (${operators.length})`} />
        <Tab label={`Repasses (${payouts.length})`} />
      </Tabs>

      {tab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" onClick={() => setOpOpen(true)} sx={{ bgcolor: '#B8942E', '&:hover': { bgcolor: '#9A7B24' } }}>+ Cadastrar Operador</Button>
          </Box>
          <TableContainer component={Paper} sx={{ border: '1px solid #E8E5DE' }}>
            <Table size="small">
              <TableHead><TableRow sx={{ bgcolor: '#FAFAF8' }}><TableCell sx={{ fontWeight: 700 }}>Nome</TableCell><TableCell>Tipo</TableCell><TableCell>Território</TableCell><TableCell>Pix</TableCell><TableCell>Doc</TableCell><TableCell>Contrato</TableCell><TableCell>Ativo</TableCell><TableCell>Ações</TableCell></TableRow></TableHead>
              <TableBody>
                {operators.map(o => (
                  <TableRow key={o.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{o.display_name}</TableCell>
                    <TableCell><Chip label={RECIPIENT_LABELS[o.recipient_type]} size="small" /></TableCell>
                    <TableCell>{o.territory?.name}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{o.pix_key || '—'}</TableCell>
                    <TableCell><Chip label={o.document_status} size="small" sx={{ color: STATUS_COLORS[o.document_status], bgcolor: `${STATUS_COLORS[o.document_status]}15` }} /></TableCell>
                    <TableCell><Chip label={o.contract_status} size="small" /></TableCell>
                    <TableCell><Chip label={o.is_active ? 'Ativo' : 'Inativo'} size="small" color={o.is_active ? 'success' : 'default'} /></TableCell>
                    <TableCell>{o.document_status === 'pending' && <Button size="small" onClick={() => handleVerify(o.id)} sx={{ color: '#059669' }}>Verificar</Button>}</TableCell>
                  </TableRow>
                ))}
                {!operators.length && <TableRow><TableCell colSpan={8} sx={{ textAlign: 'center', color: '#6B7280', py: 4 }}>Nenhum operador cadastrado</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" onClick={() => setCalcOpen(true)} sx={{ bgcolor: '#B8942E', '&:hover': { bgcolor: '#9A7B24' } }}>Calcular Repasse</Button>
          </Box>
          <TableContainer component={Paper} sx={{ border: '1px solid #E8E5DE' }}>
            <Table size="small">
              <TableHead><TableRow sx={{ bgcolor: '#FAFAF8' }}><TableCell sx={{ fontWeight: 700 }}>Território</TableCell><TableCell>Mês</TableCell><TableCell>Operador</TableCell><TableCell>Calculado</TableCell><TableCell>Aprovado</TableCell><TableCell>Status</TableCell><TableCell>Fiscal</TableCell><TableCell>Ações</TableCell></TableRow></TableHead>
              <TableBody>
                {payouts.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{p.territory?.name}</TableCell>
                    <TableCell>{p.reference_month}</TableCell>
                    <TableCell>{p.operator?.display_name}</TableCell>
                    <TableCell>R$ {Number(p.calculated_amount).toFixed(2)}</TableCell>
                    <TableCell>{p.approved_amount ? `R$ ${Number(p.approved_amount).toFixed(2)}` : '—'}</TableCell>
                    <TableCell><Chip label={p.status} size="small" sx={{ color: STATUS_COLORS[p.status], bgcolor: `${STATUS_COLORS[p.status]}15`, fontWeight: 600 }} /></TableCell>
                    <TableCell>{p.fiscal_document_required ? <Chip label="Exige doc" size="small" color="warning" /> : '—'}</TableCell>
                    <TableCell sx={{ display: 'flex', gap: 0.5 }}>
                      {p.status === 'calculated' && <Button size="small" onClick={() => handleApprove(p.id)} sx={{ color: '#2563EB' }}>Aprovar</Button>}
                      {p.status === 'approved' && <Button size="small" onClick={() => { setPayTarget(p); setPayOpen(true); }} sx={{ color: '#059669' }}>Pagar</Button>}
                      {(p.status === 'calculated' || p.status === 'approved') && <Button size="small" color="error" onClick={() => handleCancel(p.id)}>Cancelar</Button>}
                    </TableCell>
                  </TableRow>
                ))}
                {!payouts.length && <TableRow><TableCell colSpan={8} sx={{ textAlign: 'center', color: '#6B7280', py: 4 }}>Nenhum repasse calculado</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Modal Criar Operador */}
      <Dialog open={opOpen} onClose={() => setOpOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1A1A24', color: '#E5E7EB' } }}>
        <DialogTitle sx={{ color: '#C8A84E', fontWeight: 700 }}>Cadastrar Operador Territorial</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {opError && <Alert severity="error">{opError}</Alert>}
          <Box><Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 0.5 }}>Tipo</Typography>
            <TextField select value={opForm.recipient_type} onChange={e => setOpForm({ ...opForm, recipient_type: e.target.value })} fullWidth size="small" InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.05)', color: '#E5E7EB', '& fieldset': { borderColor: 'rgba(184,148,46,0.3)' } } }}>
              <MenuItem value="individual">Pessoa Física</MenuItem><MenuItem value="company">Pessoa Jurídica</MenuItem><MenuItem value="association">Associação</MenuItem>
            </TextField></Box>
          <Box><Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 0.5 }}>Território</Typography>
            <TextField select value={opForm.territory_id} onChange={e => setOpForm({ ...opForm, territory_id: e.target.value })} fullWidth size="small" InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.05)', color: '#E5E7EB', '& fieldset': { borderColor: 'rgba(184,148,46,0.3)' } } }}>
              {territories.map(t => <MenuItem key={t.id} value={t.id}>{t.name} ({t.level})</MenuItem>)}
            </TextField></Box>
          <Box><Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 0.5 }}>Nome de exibição</Typography>
            <TextField value={opForm.display_name} onChange={e => setOpForm({ ...opForm, display_name: e.target.value })} fullWidth size="small" InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.05)', color: '#E5E7EB', '& fieldset': { borderColor: 'rgba(184,148,46,0.3)' } } }} /></Box>
          {opForm.recipient_type === 'individual' && <>
            <Box><Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 0.5 }}>Nome completo</Typography><TextField value={opForm.full_name} onChange={e => setOpForm({ ...opForm, full_name: e.target.value })} fullWidth size="small" InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.05)', color: '#E5E7EB', '& fieldset': { borderColor: 'rgba(184,148,46,0.3)' } } }} /></Box>
            <Box><Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 0.5 }}>CPF</Typography><TextField value={opForm.document_cpf} onChange={e => setOpForm({ ...opForm, document_cpf: e.target.value })} fullWidth size="small" InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.05)', color: '#E5E7EB', '& fieldset': { borderColor: 'rgba(184,148,46,0.3)' } } }} /></Box>
          </>}
          {(opForm.recipient_type === 'company' || opForm.recipient_type === 'association') && <>
            <Box><Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 0.5 }}>{opForm.recipient_type === 'company' ? 'Razão Social' : 'Nome da Associação'}</Typography><TextField value={opForm.company_name} onChange={e => setOpForm({ ...opForm, company_name: e.target.value })} fullWidth size="small" InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.05)', color: '#E5E7EB', '& fieldset': { borderColor: 'rgba(184,148,46,0.3)' } } }} /></Box>
            <Box><Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 0.5 }}>CNPJ</Typography><TextField value={opForm.document_cnpj} onChange={e => setOpForm({ ...opForm, document_cnpj: e.target.value })} fullWidth size="small" InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.05)', color: '#E5E7EB', '& fieldset': { borderColor: 'rgba(184,148,46,0.3)' } } }} /></Box>
            <Box><Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 0.5 }}>Responsável legal</Typography><TextField value={opForm.legal_representative_name} onChange={e => setOpForm({ ...opForm, legal_representative_name: e.target.value })} fullWidth size="small" InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.05)', color: '#E5E7EB', '& fieldset': { borderColor: 'rgba(184,148,46,0.3)' } } }} /></Box>
            <Box><Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 0.5 }}>CPF do responsável</Typography><TextField value={opForm.legal_representative_cpf} onChange={e => setOpForm({ ...opForm, legal_representative_cpf: e.target.value })} fullWidth size="small" InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.05)', color: '#E5E7EB', '& fieldset': { borderColor: 'rgba(184,148,46,0.3)' } } }} /></Box>
          </>}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}><Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 0.5 }}>Pix</Typography><TextField value={opForm.pix_key} onChange={e => setOpForm({ ...opForm, pix_key: e.target.value })} fullWidth size="small" InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.05)', color: '#E5E7EB', '& fieldset': { borderColor: 'rgba(184,148,46,0.3)' } } }} /></Box>
            <Box sx={{ width: 140 }}><Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 0.5 }}>Tipo Pix</Typography><TextField select value={opForm.pix_key_type} onChange={e => setOpForm({ ...opForm, pix_key_type: e.target.value })} fullWidth size="small" InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.05)', color: '#E5E7EB', '& fieldset': { borderColor: 'rgba(184,148,46,0.3)' } } }}>
              <MenuItem value="cpf">CPF</MenuItem><MenuItem value="cnpj">CNPJ</MenuItem><MenuItem value="email">Email</MenuItem><MenuItem value="phone">Telefone</MenuItem><MenuItem value="random">Aleatória</MenuItem>
            </TextField></Box>
          </Box>
          <Box><Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 0.5 }}>Admin Regional vinculado</Typography>
            {opForm.territory_id && !loadingAdmins && territoryAdmins.length === 0 && (
              <Alert severity="warning" sx={{ mb: 1 }}>Cadastre ou vincule um Admin Regional a este território antes de criar o Operador Territorial.</Alert>
            )}
            {loadingAdmins ? <CircularProgress size={20} sx={{ color: '#B8942E' }} /> : (
              <TextField select value={opForm.admin_id} onChange={e => setOpForm({ ...opForm, admin_id: e.target.value })} fullWidth size="small" disabled={!opForm.territory_id || territoryAdmins.length === 0} InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.05)', color: '#E5E7EB', '& fieldset': { borderColor: 'rgba(184,148,46,0.3)' } } }}>
                {territoryAdmins.map(a => <MenuItem key={a.id} value={a.id}>{a.name} — {a.email} ({a.role})</MenuItem>)}
              </TextField>
            )}</Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpOpen(false)} sx={{ color: '#9CA3AF' }}>Cancelar</Button>
          <Button onClick={handleCreateOperator} disabled={opSaving || !opForm.display_name || !opForm.territory_id || !opForm.admin_id} variant="contained" sx={{ bgcolor: '#B8942E', '&:hover': { bgcolor: '#9A7B24' } }}>{opSaving ? 'Salvando...' : 'Cadastrar'}</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Calcular Repasse */}
      <Dialog open={calcOpen} onClose={() => setCalcOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: '#1A1A24', color: '#E5E7EB' } }}>
        <DialogTitle sx={{ color: '#C8A84E', fontWeight: 700 }}>Calcular Repasse</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {calcError && <Alert severity="error">{calcError}</Alert>}
          <Box><Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 0.5 }}>Território</Typography>
            <TextField select value={calcForm.territory_id} onChange={e => setCalcForm({ ...calcForm, territory_id: e.target.value })} fullWidth size="small" InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.05)', color: '#E5E7EB', '& fieldset': { borderColor: 'rgba(184,148,46,0.3)' } } }}>
              {territories.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </TextField></Box>
          <Box><Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 0.5 }}>Mês (YYYY-MM)</Typography>
            <TextField value={calcForm.reference_month} onChange={e => setCalcForm({ ...calcForm, reference_month: e.target.value })} fullWidth size="small" placeholder="2026-05" InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.05)', color: '#E5E7EB', '& fieldset': { borderColor: 'rgba(184,148,46,0.3)' } } }} /></Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCalcOpen(false)} sx={{ color: '#9CA3AF' }}>Cancelar</Button>
          <Button onClick={handleCalculate} disabled={calcSaving || !calcForm.territory_id || !calcForm.reference_month} variant="contained" sx={{ bgcolor: '#B8942E' }}>{calcSaving ? 'Calculando...' : 'Calcular'}</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Registrar Pagamento */}
      <Dialog open={payOpen} onClose={() => setPayOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#1A1A24', color: '#E5E7EB' } }}>
        <DialogTitle sx={{ color: '#C8A84E', fontWeight: 700 }}>Registrar Pagamento Manual</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {payTarget && <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1, border: '1px solid rgba(184,148,46,0.2)' }}>
            <Typography variant="body2" sx={{ color: '#C8A84E' }}>Valor aprovado: R$ {Number(payTarget.approved_amount || payTarget.calculated_amount).toFixed(2)}</Typography>
            <Typography variant="body2" sx={{ color: '#9CA3AF' }}>Operador: {payTarget.operator?.display_name}</Typography>
            <Typography variant="body2" sx={{ color: '#9CA3AF', fontFamily: 'monospace' }}>Pix: {payTarget.operator?.pix_key || 'Não informado'}</Typography>
            {payTarget.fiscal_document_required && <Alert severity="warning" sx={{ mt: 1 }}>⚠️ Este repasse exige documento fiscal (NFS-e recomendada para PJ)</Alert>}
          </Box>}
          <Box><Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 0.5 }}>Método</Typography>
            <TextField select value={payForm.payment_method} onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })} fullWidth size="small" InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.05)', color: '#E5E7EB', '& fieldset': { borderColor: 'rgba(184,148,46,0.3)' } } }}>
              <MenuItem value="pix">Pix</MenuItem><MenuItem value="transfer">Transferência</MenuItem><MenuItem value="other">Outro</MenuItem>
            </TextField></Box>
          <Box><Typography variant="caption" sx={{ color: '#F87171', display: 'block', mb: 0.5 }}>Referência do pagamento *</Typography>
            <TextField value={payForm.payment_ref} onChange={e => setPayForm({ ...payForm, payment_ref: e.target.value })} fullWidth size="small" placeholder="ID da transação Pix / comprovante" InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.05)', color: '#E5E7EB', '& fieldset': { borderColor: 'rgba(184,148,46,0.3)' } } }} /></Box>
          <Box><Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 0.5 }}>URL comprovante (opcional)</Typography>
            <TextField value={payForm.receipt_url} onChange={e => setPayForm({ ...payForm, receipt_url: e.target.value })} fullWidth size="small" InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.05)', color: '#E5E7EB', '& fieldset': { borderColor: 'rgba(184,148,46,0.3)' } } }} /></Box>
          {payTarget?.fiscal_document_required && <>
            <Box><Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 0.5 }}>Documento fiscal (URL/ref)</Typography>
              <TextField value={payForm.fiscal_document_url} onChange={e => setPayForm({ ...payForm, fiscal_document_url: e.target.value })} fullWidth size="small" InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.05)', color: '#E5E7EB', '& fieldset': { borderColor: 'rgba(184,148,46,0.3)' } } }} /></Box>
            <Box><Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block', mb: 0.5 }}>Nº documento fiscal</Typography>
              <TextField value={payForm.fiscal_document_ref} onChange={e => setPayForm({ ...payForm, fiscal_document_ref: e.target.value })} fullWidth size="small" InputProps={{ sx: { bgcolor: 'rgba(255,255,255,0.05)', color: '#E5E7EB', '& fieldset': { borderColor: 'rgba(184,148,46,0.3)' } } }} /></Box>
          </>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPayOpen(false)} sx={{ color: '#9CA3AF' }}>Cancelar</Button>
          <Button onClick={handlePay} disabled={paySaving || !payForm.payment_ref} variant="contained" sx={{ bgcolor: '#059669' }}>{paySaving ? 'Registrando...' : 'Confirmar Pagamento'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
