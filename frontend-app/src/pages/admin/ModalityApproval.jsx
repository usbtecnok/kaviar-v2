import { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Button, Chip, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tabs, Tab, Snackbar } from '@mui/material';
import { CheckCircle, Cancel, Pause, DirectionsCar, TwoWheeler, DeliveryDining } from '@mui/icons-material';
import { adminApi } from '../../services/adminApi';

const GOLD = '#B8942E';
const MODALITY_MAP = {
  CAR: { label: 'Motorista de Carro', icon: DirectionsCar, color: '#3B82F6' },
  MOTO_DELIVERY: { label: 'Moto Entrega', icon: DeliveryDining, color: '#F59E0B' },
  MOTO_PASSENGER: { label: 'Moto Passageiro', icon: TwoWheeler, color: '#8B5CF6' },
};
const STATUS_MAP = {
  PENDING_REVIEW: { label: 'Pendente', color: 'warning' },
  APPROVED: { label: 'Aprovado', color: 'success' },
  REJECTED: { label: 'Reprovado', color: 'error' },
  SUSPENDED: { label: 'Suspenso', color: 'default' },
};

export default function ModalityApproval() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('PENDING_REVIEW');
  const [snack, setSnack] = useState('');
  const [dialog, setDialog] = useState({ open: false, item: null, action: null });
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getModalityQueue({ status: tab });
      if (res.success) setItems(res.data);
    } catch { setSnack('Erro ao carregar fila'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  const handleAction = async () => {
    const { item, action } = dialog;
    if (!item) return;
    setActing(true);
    try {
      if (action === 'approve') await adminApi.approveModality(item.id);
      else if (action === 'reject') await adminApi.rejectModality(item.id, reason);
      else if (action === 'suspend') await adminApi.suspendModality(item.id, reason);
      setSnack(action === 'approve' ? 'Modalidade aprovada!' : action === 'reject' ? 'Modalidade reprovada' : 'Modalidade suspensa');
      setDialog({ open: false, item: null, action: null });
      setReason('');
      load();
    } catch { setSnack('Erro na operação'); }
    setActing(false);
  };

  const openAction = (item, action) => { setDialog({ open: true, item, action }); setReason(''); };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontWeight: 800, color: GOLD, mb: 2 }}>Aprovação de Modalidades</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}>
        <Tab value="PENDING_REVIEW" label="Pendentes" />
        <Tab value="APPROVED" label="Aprovados" />
        <Tab value="REJECTED" label="Reprovados" />
      </Tabs>

      {loading ? <CircularProgress sx={{ color: GOLD }} /> : items.length === 0 ? (
        <Alert severity="info">Nenhuma modalidade {tab === 'PENDING_REVIEW' ? 'pendente' : tab === 'APPROVED' ? 'aprovada' : 'reprovada'}</Alert>
      ) : items.map(item => {
        const mod = MODALITY_MAP[item.modality] || { label: item.modality, icon: DirectionsCar, color: '#6B7280' };
        const Icon = mod.icon;
        const st = STATUS_MAP[item.status] || { label: item.status, color: 'default' };
        return (
          <Card key={item.id} sx={{ mb: 1.5, border: '1px solid #E5E7EB' }}>
            <CardContent sx={{ py: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Icon sx={{ color: mod.color, fontSize: 28 }} />
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{item.driver?.name || '—'}</Typography>
                <Typography sx={{ fontSize: 12, color: '#6B7280' }}>{item.driver?.phone} • CPF: {item.driver?.document_cpf || '—'}</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                  <Chip label={mod.label} size="small" sx={{ bgcolor: `${mod.color}15`, color: mod.color, fontWeight: 600, fontSize: 11 }} />
                  <Chip label={st.label} size="small" color={st.color} sx={{ fontSize: 11 }} />
                </Box>
              </Box>
              <Box sx={{ minWidth: 160 }}>
                <Typography sx={{ fontSize: 12, color: '#6B7280' }}>
                  {[item.vehicle_brand, item.vehicle_model, item.vehicle_color].filter(Boolean).join(' ') || 'Veículo não informado'}
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#6B7280' }}>Placa: {item.vehicle_plate || '—'}</Typography>
                {item.cnh_category && <Typography sx={{ fontSize: 12, color: '#6B7280' }}>CNH: {item.cnh_category}</Typography>}
                {item.has_extra_helmet && <Chip label="Capacete extra ✓" size="small" color="success" sx={{ fontSize: 10, mt: 0.5 }} />}
              </Box>
              {tab === 'PENDING_REVIEW' && (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Button size="small" variant="contained" color="success" startIcon={<CheckCircle sx={{ fontSize: 16 }} />} onClick={() => openAction(item, 'approve')} sx={{ textTransform: 'none', fontSize: 12 }}>Aprovar</Button>
                  <Button size="small" variant="outlined" color="error" startIcon={<Cancel sx={{ fontSize: 16 }} />} onClick={() => openAction(item, 'reject')} sx={{ textTransform: 'none', fontSize: 12 }}>Reprovar</Button>
                  <Button size="small" color="warning" startIcon={<Pause sx={{ fontSize: 16 }} />} onClick={() => openAction(item, 'suspend')} sx={{ textTransform: 'none', fontSize: 12 }}>Suspender</Button>
                </Box>
              )}
              {item.rejected_reason && <Typography sx={{ fontSize: 11, color: '#EF4444', width: '100%' }}>Motivo: {item.rejected_reason}</Typography>}
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, item: null, action: null })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {dialog.action === 'approve' ? '✅ Aprovar Modalidade' : dialog.action === 'reject' ? '❌ Reprovar Modalidade' : '⏸️ Suspender Modalidade'}
        </DialogTitle>
        <DialogContent>
          {dialog.item && <Typography sx={{ mb: 2, fontSize: 14 }}>{dialog.item.driver?.name} — {MODALITY_MAP[dialog.item.modality]?.label}</Typography>}
          {dialog.action !== 'approve' && <TextField label="Motivo / Observação" fullWidth multiline rows={2} size="small" value={reason} onChange={e => setReason(e.target.value)} placeholder={dialog.action === 'reject' ? 'Informe o motivo da reprovação' : 'Observação (opcional)'} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, item: null, action: null })}>Cancelar</Button>
          <Button variant="contained" onClick={handleAction} disabled={acting || (dialog.action === 'reject' && !reason.trim())}
            color={dialog.action === 'approve' ? 'success' : dialog.action === 'reject' ? 'error' : 'warning'}
            sx={{ textTransform: 'none' }}>{acting ? 'Processando...' : dialog.action === 'approve' ? 'Confirmar Aprovação' : dialog.action === 'reject' ? 'Confirmar Reprovação' : 'Confirmar Suspensão'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}
