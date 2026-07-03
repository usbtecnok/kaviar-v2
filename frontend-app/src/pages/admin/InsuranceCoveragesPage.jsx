import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Refresh } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const MODALITIES = [
  { value: 'CAR_PASSENGER', label: 'Carro Passageiro' },
  { value: 'MOTO_PASSENGER', label: 'Moto Passageiro' },
  { value: 'MOTO_DELIVERY', label: 'Moto Delivery' },
];

const COVERAGE_TYPES = [
  { value: 'APP', label: 'APP' },
  { value: 'RC_F', label: 'RC-F' },
  { value: 'PERSONAL_ACCIDENT', label: 'Acidente Pessoal' },
  { value: 'CARGO', label: 'Carga' },
  { value: 'OTHER', label: 'Outro' },
];

const STATUSES = [
  { value: 'DRAFT', label: 'Rascunho', color: '#6B7280' },
  { value: 'ACTIVE', label: 'Ativa', color: '#15803D' },
  { value: 'EXPIRED', label: 'Expirada', color: '#B91C1C' },
  { value: 'SUSPENDED', label: 'Suspensa', color: '#B45309' },
];

const emptyForm = {
  territory_id: 'GLOBAL',
  modality: 'MOTO_PASSENGER',
  provider_name: '',
  policy_number: '',
  coverage_type: 'APP',
  coverage_description: '',
  coverage_amount_death: '',
  coverage_amount_disability: '',
  coverage_amount_medical: '',
  valid_from: '',
  valid_until: '',
  status: 'DRAFT',
  document_url: '',
  notes: '',
};

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR');
}

function modalityLabel(value) {
  return MODALITIES.find((m) => m.value === value)?.label || value;
}

function statusChip(value) {
  const cfg = STATUSES.find((s) => s.value === value) || { label: value, color: '#6B7280' };
  return (
    <Chip
      size="small"
      label={cfg.label}
      sx={{
        bgcolor: `${cfg.color}15`,
        color: cfg.color,
        border: `1px solid ${cfg.color}30`,
        fontWeight: 600,
      }}
    />
  );
}

function daysTo(dateValue) {
  if (!dateValue) return null;
  const today = new Date();
  const end = new Date(dateValue);
  const ms = end.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.floor(ms / 86400000);
}

function toPayload(form) {
  return {
    territory_id: form.territory_id === 'GLOBAL' ? null : form.territory_id,
    modality: form.modality,
    provider_name: form.provider_name.trim(),
    policy_number: form.policy_number.trim(),
    coverage_type: form.coverage_type,
    coverage_description: form.coverage_description.trim() || null,
    coverage_amount_death: form.coverage_amount_death === '' ? null : Number(form.coverage_amount_death),
    coverage_amount_disability: form.coverage_amount_disability === '' ? null : Number(form.coverage_amount_disability),
    coverage_amount_medical: form.coverage_amount_medical === '' ? null : Number(form.coverage_amount_medical),
    valid_from: form.valid_from,
    valid_until: form.valid_until,
    status: form.status,
    document_url: form.document_url.trim() || null,
    notes: form.notes.trim() || null,
  };
}

export default function InsuranceCoveragesPage() {
  const token = localStorage.getItem('kaviar_admin_token');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [list, setList] = useState([]);
  const [readiness, setReadiness] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({ id: '', status: 'DRAFT', valid_until: '', document_url: '', notes: '' });

  const territoryOptions = useMemo(() => {
    const fromReadiness = readiness?.territories || [];
    return [{ id: 'GLOBAL', name: 'GLOBAL (todas as operações)' }, ...fromReadiness.map((t) => ({ id: t.id, name: t.name }))];
  }, [readiness]);

  const fetchAll = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const [listRes, readinessRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/insurance-coverages`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/insurance-coverages/readiness`, { headers }),
      ]);
      const [listJson, readinessJson] = await Promise.all([listRes.json(), readinessRes.json()]);

      if (!listJson.success) throw new Error(listJson.error || 'Falha ao carregar coberturas.');
      if (!readinessJson.success) throw new Error(readinessJson.error || 'Falha ao calcular readiness.');

      setList(listJson.data || []);
      setReadiness(readinessJson.data || null);
    } catch (err) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao carregar dados.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const payload = toPayload(createForm);
      const res = await fetch(`${API_BASE_URL}/api/admin/insurance-coverages`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Falha ao criar cobertura.');
      setOpenCreate(false);
      setCreateForm(emptyForm);
      setFeedback({ type: 'success', message: 'Cobertura cadastrada com sucesso.' });
      fetchAll();
    } catch (err) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao cadastrar cobertura.' });
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (item) => {
    setEditForm({
      id: item.id,
      status: item.status || 'DRAFT',
      valid_until: item.valid_until ? String(item.valid_until).slice(0, 10) : '',
      document_url: item.document_url || '',
      notes: item.notes || '',
    });
    setOpenEdit(true);
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/insurance-coverages/${editForm.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status: editForm.status,
          valid_until: editForm.valid_until,
          document_url: editForm.document_url || null,
          notes: editForm.notes || null,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Falha ao atualizar cobertura.');
      setOpenEdit(false);
      setFeedback({ type: 'success', message: 'Cobertura atualizada com sucesso.' });
      fetchAll();
    } catch (err) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao atualizar cobertura.' });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 1380, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5" sx={{ color: '#B8942E', fontWeight: 800 }}>
            Seguro APP e Coberturas Operacionais
          </Typography>
          <Typography sx={{ color: '#6B7280', fontSize: 13 }}>
            Base interna de readiness para APP/RC-F por modalidade e território. Não aplica bloqueio operacional nesta fase.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={fetchAll}>
            Atualizar
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenCreate(true)} sx={{ bgcolor: '#B8942E', '&:hover': { bgcolor: '#9A7B24' } }}>
            Nova Cobertura
          </Button>
        </Stack>
      </Box>

      {feedback.message && (
        <Alert severity={feedback.type || 'info'} sx={{ mb: 2 }} onClose={() => setFeedback({ type: '', message: '' })}>
          {feedback.message}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ border: '1px solid #E8E5DE' }}>
            <CardContent>
              <Typography sx={{ color: '#6B7280', fontSize: 12 }}>Coberturas cadastradas</Typography>
              <Typography sx={{ color: '#1A1A1A', fontSize: 30, fontWeight: 800 }}>{readiness?.totals?.coverages ?? '-'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ border: '1px solid #E8E5DE' }}>
            <CardContent>
              <Typography sx={{ color: '#6B7280', fontSize: 12 }}>Ativas e vigentes</Typography>
              <Typography sx={{ color: '#15803D', fontSize: 30, fontWeight: 800 }}>{readiness?.totals?.activeNow ?? '-'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ border: '1px solid #E8E5DE' }}>
            <CardContent>
              <Typography sx={{ color: '#6B7280', fontSize: 12 }}>Vencendo em 30 dias</Typography>
              <Typography sx={{ color: '#B45309', fontSize: 30, fontWeight: 800 }}>{readiness?.totals?.expiringIn30Days ?? '-'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ border: '1px solid #E8E5DE' }}>
            <CardContent>
              <Typography sx={{ color: '#6B7280', fontSize: 12 }}>Alertas de ausência ativa</Typography>
              <Typography sx={{ color: '#B91C1C', fontSize: 30, fontWeight: 800 }}>{readiness?.missingAlerts?.length ?? '-'}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {Object.entries(readiness?.byModality || {}).map(([modality, stats]) => (
          <Grid item xs={12} md={4} key={modality}>
            <Card sx={{ border: '1px solid #E8E5DE', borderTop: '3px solid #2563EB' }}>
              <CardContent>
                <Typography sx={{ fontWeight: 700, color: '#1A1A1A', mb: 1 }}>{modalityLabel(modality)}</Typography>
                <Typography sx={{ fontSize: 13, color: '#6B7280' }}>Coberturas ativas: {stats.activeCoverageCount}</Typography>
                <Typography sx={{ fontSize: 13, color: '#6B7280' }}>Vencendo em 30 dias: {stats.expiringIn30Days}</Typography>
                <Typography sx={{ fontSize: 13, color: '#6B7280' }}>Territórios sem cobertura ativa: {stats.missingActiveTerritoryCount}</Typography>
                <Chip
                  size="small"
                  label={stats.hasActiveCoverage ? 'Readiness parcial OK' : 'Sem cobertura ativa'}
                  sx={{
                    mt: 1,
                    bgcolor: stats.hasActiveCoverage ? '#15803D15' : '#B91C1C15',
                    color: stats.hasActiveCoverage ? '#15803D' : '#B91C1C',
                    border: `1px solid ${stats.hasActiveCoverage ? '#15803D40' : '#B91C1C40'}`,
                    fontWeight: 600,
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {(readiness?.missingAlerts?.length || 0) > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Existem modalidades sem cobertura ativa em territórios operacionais. Revise os alertas abaixo para preparação da fase de gate.
        </Alert>
      )}

      {(readiness?.expiringCoverages?.length || 0) > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {readiness.expiringCoverages.length} cobertura(s) ativa(s) vencendo em até 30 dias.
        </Alert>
      )}

      <Card sx={{ border: '1px solid #E8E5DE' }}>
        <CardContent>
          <Typography sx={{ fontWeight: 700, mb: 1.2 }}>Coberturas cadastradas</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Território</TableCell>
                <TableCell>Modalidade</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Seguradora</TableCell>
                <TableCell>Apólice</TableCell>
                <TableCell>Vigência</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Typography sx={{ color: '#6B7280', py: 1 }}>Nenhuma cobertura cadastrada.</Typography>
                  </TableCell>
                </TableRow>
              )}
              {list.map((item) => {
                const d = daysTo(item.valid_until);
                return (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.territory?.name || 'GLOBAL'}</TableCell>
                    <TableCell>{modalityLabel(item.modality)}</TableCell>
                    <TableCell>{item.coverage_type}</TableCell>
                    <TableCell>{item.provider_name}</TableCell>
                    <TableCell>{item.policy_number}</TableCell>
                    <TableCell>
                      {formatDate(item.valid_from)} - {formatDate(item.valid_until)}
                      {d !== null && (
                        <Typography sx={{ fontSize: 11, color: d < 0 ? '#B91C1C' : d <= 30 ? '#B45309' : '#6B7280' }}>
                          {d < 0 ? `Vencida há ${Math.abs(d)} dia(s)` : `Vence em ${d} dia(s)`}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{statusChip(item.status)}</TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => openEditDialog(item)}>Editar</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nova Cobertura Operacional</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                label="Território"
                fullWidth
                value={createForm.territory_id}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, territory_id: e.target.value }))}
              >
                {territoryOptions.map((t) => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField select label="Modalidade" fullWidth value={createForm.modality} onChange={(e) => setCreateForm((prev) => ({ ...prev, modality: e.target.value }))}>
                {MODALITIES.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Seguradora" fullWidth value={createForm.provider_name} onChange={(e) => setCreateForm((prev) => ({ ...prev, provider_name: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Número da Apólice" fullWidth value={createForm.policy_number} onChange={(e) => setCreateForm((prev) => ({ ...prev, policy_number: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select label="Tipo de Cobertura" fullWidth value={createForm.coverage_type} onChange={(e) => setCreateForm((prev) => ({ ...prev, coverage_type: e.target.value }))}>
                {COVERAGE_TYPES.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField type="date" label="Válida de" InputLabelProps={{ shrink: true }} fullWidth value={createForm.valid_from} onChange={(e) => setCreateForm((prev) => ({ ...prev, valid_from: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField type="date" label="Válida até" InputLabelProps={{ shrink: true }} fullWidth value={createForm.valid_until} onChange={(e) => setCreateForm((prev) => ({ ...prev, valid_until: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField type="number" label="Cobertura óbito (R$)" fullWidth value={createForm.coverage_amount_death} onChange={(e) => setCreateForm((prev) => ({ ...prev, coverage_amount_death: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField type="number" label="Cobertura invalidez (R$)" fullWidth value={createForm.coverage_amount_disability} onChange={(e) => setCreateForm((prev) => ({ ...prev, coverage_amount_disability: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField type="number" label="Cobertura médica (R$)" fullWidth value={createForm.coverage_amount_medical} onChange={(e) => setCreateForm((prev) => ({ ...prev, coverage_amount_medical: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField select label="Status" fullWidth value={createForm.status} onChange={(e) => setCreateForm((prev) => ({ ...prev, status: e.target.value }))}>
                {STATUSES.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="URL do documento" fullWidth value={createForm.document_url} onChange={(e) => setCreateForm((prev) => ({ ...prev, document_url: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Descrição" fullWidth multiline minRows={2} value={createForm.coverage_description} onChange={(e) => setCreateForm((prev) => ({ ...prev, coverage_description: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Notas" fullWidth multiline minRows={2} value={createForm.notes} onChange={(e) => setCreateForm((prev) => ({ ...prev, notes: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={saving || !createForm.provider_name || !createForm.policy_number || !createForm.valid_from || !createForm.valid_until}
            sx={{ bgcolor: '#B8942E', '&:hover': { bgcolor: '#9A7B24' } }}
          >
            {saving ? 'Salvando...' : 'Salvar Cobertura'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Atualizar Cobertura</DialogTitle>
        <DialogContent sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField select label="Status" value={editForm.status} onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}>
            {STATUSES.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
          </TextField>
          <TextField type="date" label="Válida até" InputLabelProps={{ shrink: true }} value={editForm.valid_until} onChange={(e) => setEditForm((prev) => ({ ...prev, valid_until: e.target.value }))} />
          <TextField label="URL do documento" value={editForm.document_url} onChange={(e) => setEditForm((prev) => ({ ...prev, document_url: e.target.value }))} />
          <TextField label="Notas" multiline minRows={3} value={editForm.notes} onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleUpdate} disabled={updating || !editForm.valid_until} sx={{ bgcolor: '#B8942E', '&:hover': { bgcolor: '#9A7B24' } }}>
            {updating ? 'Atualizando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
