import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Chip, Alert, Switch, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { API_BASE_URL } from '../../config/api';
import { formatDate } from '../../utils/formatDate';

const STATUS_CONFIG = {
  PENDING: { label: 'Pendente', color: '#6B7280', bg: '#F3F4F6' },
  SUBMITTED: { label: 'Enviado', color: '#D97706', bg: '#FEF3C7' },
  APPROVED: { label: 'Aprovado', color: '#059669', bg: '#D1FAE5' },
  REJECTED: { label: 'Rejeitado', color: '#DC2626', bg: '#FEE2E2' },
};

export default function MotoPassengerCompliance({ territoryId, motoPassengerEnabled, isSuperAdmin, onTerritoryUpdate }) {
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ municipality_name: '', consultation_date: '', prefecture_notes: '', protocol_number: '', document_url: '' });
  const [saving, setSaving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');
  const token = localStorage.getItem('kaviar_admin_token');

  const fetchCompliance = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/territories/${territoryId}/moto-passenger-compliance`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setCompliance(data.data);
      else setCompliance(null);
    } catch { setCompliance(null); }
    setLoading(false);
  };

  useEffect(() => { fetchCompliance(); }, [territoryId]);

  const handleSubmit = async () => {
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/territories/${territoryId}/moto-passenger-compliance`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) { fetchCompliance(); setForm({ municipality_name: '', consultation_date: '', prefecture_notes: '', protocol_number: '', document_url: '' }); }
      else setError(data.error || 'Erro ao salvar');
    } catch { setError('Erro de conexão'); }
    setSaving(false);
  };

  const handleApprove = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/territories/${territoryId}/moto-passenger-compliance`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'APPROVED' }),
      });
      if ((await res.json()).success) fetchCompliance();
    } catch { setError('Erro ao aprovar compliance'); }
  };

  const handleReject = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/territories/${territoryId}/moto-passenger-compliance`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'REJECTED', rejection_reason: rejectReason }),
      });
      if ((await res.json()).success) { setRejectOpen(false); setRejectReason(''); fetchCompliance(); }
    } catch { setError('Erro ao rejeitar compliance'); }
  };

  const handleToggleMotoPassenger = async (enabled) => {
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/territories/${territoryId}`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ moto_passenger_enabled: enabled }),
      });
      const data = await res.json();
      if (data.success) { if (onTerritoryUpdate) onTerritoryUpdate(); }
      else if (data.error === 'MOTO_PASSENGER_COMPLIANCE_NOT_APPROVED') { setError('Moto Passageiro só pode ser ativado após compliance municipal aprovado pelo Super Admin.'); }
      else setError(data.error || 'Erro ao alterar');
    } catch { setError('Erro de conexão'); }
  };

  if (loading) return null;

  const status = compliance?.status || 'PENDING';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const canEnable = compliance?.status === 'APPROVED';

  return (
    <Box sx={{ mt: 3, p: 2, border: '1px solid #E8E5DE', borderRadius: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>🏍️ Moto Passageiro — Compliance Municipal</Typography>
        <Chip label={cfg.label} size="small" sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 600 }} />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Toggle */}
      <FormControlLabel
        control={<Switch checked={motoPassengerEnabled} onChange={(e) => handleToggleMotoPassenger(e.target.checked)} disabled={!isSuperAdmin || (!canEnable && !motoPassengerEnabled)} />}
        label={motoPassengerEnabled ? 'Moto Passageiro ATIVO' : 'Moto Passageiro desativado'}
        sx={{ mb: 2 }}
      />
      {!canEnable && !motoPassengerEnabled && (
        <Alert severity="info" sx={{ mb: 2 }}>Moto Passageiro só pode ser ativado após compliance municipal aprovado pelo Super Admin.</Alert>
      )}

      {/* Compliance details */}
      {compliance && (
        <Box sx={{ mb: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
          {compliance.municipality_name && <Box><Typography variant="caption" sx={{ color: '#6B7280' }}>Município</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{compliance.municipality_name}</Typography></Box>}
          {compliance.consultation_date && <Box><Typography variant="caption" sx={{ color: '#6B7280' }}>Data da consulta</Typography><Typography variant="body2">{formatDate(compliance.consultation_date)}</Typography></Box>}
          {compliance.protocol_number && <Box><Typography variant="caption" sx={{ color: '#6B7280' }}>Protocolo</Typography><Typography variant="body2">{compliance.protocol_number}</Typography></Box>}
          {compliance.document_url && <Box><Typography variant="caption" sx={{ color: '#6B7280' }}>Documento</Typography><Typography variant="body2"><a href={compliance.document_url} target="_blank" rel="noopener noreferrer">Ver documento</a></Typography></Box>}
          {compliance.prefecture_notes && <Box sx={{ gridColumn: '1 / -1' }}><Typography variant="caption" sx={{ color: '#6B7280' }}>Observações da prefeitura</Typography><Typography variant="body2">{compliance.prefecture_notes}</Typography></Box>}
          {compliance.approved_by_admin_id && <Box><Typography variant="caption" sx={{ color: '#6B7280' }}>Aprovado por</Typography><Typography variant="body2">{compliance.approved_by_admin_id}</Typography></Box>}
          {compliance.approved_at && <Box><Typography variant="caption" sx={{ color: '#6B7280' }}>Data aprovação</Typography><Typography variant="body2">{formatDate(compliance.approved_at, { showTime: true })}</Typography></Box>}
          {compliance.rejection_reason && <Box sx={{ gridColumn: '1 / -1' }}><Typography variant="caption" sx={{ color: '#DC2626' }}>Motivo rejeição</Typography><Typography variant="body2" sx={{ color: '#DC2626' }}>{compliance.rejection_reason}</Typography></Box>}
        </Box>
      )}

      {/* Super Admin actions */}
      {isSuperAdmin && compliance && (compliance.status === 'SUBMITTED' || compliance.status === 'REJECTED') && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button variant="contained" size="small" sx={{ bgcolor: '#059669' }} onClick={handleApprove}>Aprovar Compliance</Button>
          <Button variant="outlined" size="small" color="error" onClick={() => setRejectOpen(true)}>Rejeitar</Button>
        </Box>
      )}

      {/* Submit form (when no compliance or needs resubmission) */}
      {(!compliance || compliance.status === 'REJECTED' || compliance.status === 'PENDING') && (
        <Box sx={{ mt: 2, p: 2, bgcolor: '#FAFAF8', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>Registrar consulta municipal</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField label="Município" size="small" value={form.municipality_name} onChange={(e) => setForm({ ...form, municipality_name: e.target.value })} />
            <TextField label="Data da consulta" type="date" size="small" value={form.consultation_date} onChange={(e) => setForm({ ...form, consultation_date: e.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField label="Protocolo" size="small" value={form.protocol_number} onChange={(e) => setForm({ ...form, protocol_number: e.target.value })} />
            <TextField label="URL do documento" size="small" value={form.document_url} onChange={(e) => setForm({ ...form, document_url: e.target.value })} />
          </Box>
          <TextField label="Observações da prefeitura" size="small" fullWidth multiline rows={2} sx={{ mt: 2 }} value={form.prefecture_notes} onChange={(e) => setForm({ ...form, prefecture_notes: e.target.value })} />
          <Button variant="contained" size="small" sx={{ mt: 2, bgcolor: '#B8942E' }} onClick={handleSubmit} disabled={saving || !form.municipality_name}>{saving ? 'Salvando...' : 'Enviar para aprovação'}</Button>
        </Box>
      )}

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)}>
        <DialogTitle>Rejeitar Compliance</DialogTitle>
        <DialogContent><TextField label="Motivo da rejeição" fullWidth multiline rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} sx={{ mt: 1 }} /></DialogContent>
        <DialogActions><Button onClick={() => setRejectOpen(false)}>Cancelar</Button><Button color="error" onClick={handleReject}>Rejeitar</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
