/**
 * Retorno Familiar KAVIAR — Card para home do motorista web
 *
 * Consulta GET /api/v2/drivers/me/retorno-familiar
 * Permite solicitar via POST /api/v2/drivers/me/retorno-familiar/request
 *
 * Não altera: credit_balance, driver_credit_ledger, driver_credit_purchases.
 * Não usa Expo/EAS. Apenas frontend web.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Alert } from '@mui/material';
import { Paid, Schedule, CheckCircle, Cancel, Info } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const GOLD = '#B8942E';
const DISCLAIMER = 'O Retorno Familiar KAVIAR é um programa voluntário de reconhecimento, sujeito a regras vigentes, disponibilidade financeira e aprovação administrativa. Não constitui salário, comissão, 13º, obrigação automática ou direito adquirido.';

const STATUS_CONFIG = {
  requested: { label: 'Solicitação enviada', color: '#F59E0B', icon: Schedule, msg: 'Sua solicitação está aguardando análise do administrador.' },
  in_review: { label: 'Em análise', color: '#8B5CF6', icon: Schedule, msg: 'Sua solicitação está sendo analisada.' },
  approved: { label: 'Aprovado', color: '#10B981', icon: CheckCircle, msg: 'Sua solicitação foi aprovada. O pagamento será registrado pelo administrador.' },
  rejected: { label: 'Rejeitado', color: '#EF4444', icon: Cancel, msg: 'Sua solicitação não foi aprovada.' },
  paid: { label: 'Pagamento registrado', color: GOLD, icon: Paid, msg: 'Este status representa o registro administrativo do pagamento pelo KAVIAR.' },
  canceled: { label: 'Cancelado', color: '#6B7280', icon: Cancel, msg: 'Esta solicitação foi cancelada.' },
};

export default function FamilyBonusCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const token = localStorage.getItem('kaviar_driver_token');

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v2/drivers/me/retorno-familiar`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) { setLoading(false); return; }
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {}
    setLoading(false);
  };

  const handleRequest = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/v2/drivers/me/retorno-familiar/request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (json.success) {
        setConfirmOpen(false);
        fetchData();
      } else {
        setSubmitError(json.error || 'Erro ao enviar solicitação');
      }
    } catch {
      setSubmitError('Erro de conexão. Tente novamente.');
    }
    setSubmitting(false);
  };

  // Don't render if no token, loading, or no data
  if (!token) return null;
  if (loading) return (
    <Card sx={{ mb: 3, border: '1px solid #E8E5DE', borderRadius: 2, bgcolor: '#FFFFFF' }}>
      <CardContent sx={{ textAlign: 'center', py: 3 }}>
        <CircularProgress size={24} sx={{ color: GOLD }} />
      </CardContent>
    </Card>
  );
  if (!data) return null;

  const fmt = (cents) => `R$ ${(Number(cents) / 100).toFixed(2).replace('.', ',')}`;

  // State: no policy active
  if (!data.available) {
    return (
      <Card sx={{ mb: 3, border: '1px solid #E8E5DE', borderRadius: 2, bgcolor: '#FAFAF8' }}>
        <CardContent sx={{ py: 2, px: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Info sx={{ color: '#9CA3AF', fontSize: 20 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#6B7280' }}>Retorno Familiar KAVIAR</Typography>
          </Box>
          <Typography sx={{ fontSize: 12, color: '#9CA3AF' }}>{data.message || 'Nenhum programa ativo no momento.'}</Typography>
        </CardContent>
      </Card>
    );
  }

  const { summary, policy, existing_request, within_window } = data;
  const req = existing_request;

  // State: has existing request (show status)
  if (req) {
    const config = STATUS_CONFIG[req.status] || STATUS_CONFIG.requested;
    const StatusIcon = config.icon;
    const approvedAmount = req.approved_amount_cents || summary?.estimated_return_cents;

    return (
      <Card sx={{ mb: 3, border: `1px solid ${config.color}30`, borderTop: `3px solid ${config.color}`, borderRadius: 2, bgcolor: '#FFFFFF' }}>
        <CardContent sx={{ py: 2.5, px: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#1A1A1A' }}>Retorno Familiar KAVIAR</Typography>
            <Chip icon={<StatusIcon sx={{ fontSize: 14 }} />} label={config.label} size="small" sx={{ bgcolor: `${config.color}15`, color: config.color, fontWeight: 600, fontSize: 10 }} />
          </Box>

          <Typography sx={{ fontSize: 12, color: '#6B7280', mb: 1.5 }}>{config.msg}</Typography>

          {(req.status === 'approved' || req.status === 'paid') && approvedAmount && (
            <Box sx={{ p: 1.5, bgcolor: '#F9FAFB', borderRadius: 1.5, mb: 1.5 }}>
              <Typography sx={{ fontSize: 11, color: '#6B7280' }}>Valor</Typography>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: GOLD }}>{fmt(approvedAmount)}</Typography>
            </Box>
          )}

          {req.status === 'rejected' && req.review_reason && (
            <Alert severity="error" sx={{ fontSize: 11, py: 0, mb: 1 }}>Motivo: {req.review_reason}</Alert>
          )}

          <Typography sx={{ fontSize: 10, color: '#9CA3AF', mt: 1 }}>{DISCLAIMER}</Typography>
        </CardContent>
      </Card>
    );
  }

  // State: eligible, no request yet
  return (
    <Card sx={{ mb: 3, border: '1px solid #E8E5DE', borderTop: `3px solid ${GOLD}`, borderRadius: 2, bgcolor: '#FFFFFF' }}>
      <CardContent sx={{ py: 2.5, px: 2.5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#1A1A1A', mb: 1 }}>Retorno Familiar KAVIAR</Typography>

        <Box sx={{ p: 1.5, bgcolor: '#FFFDF7', borderRadius: 1.5, mb: 2, border: '1px solid #FDE68A' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography sx={{ fontSize: 11, color: '#6B7280' }}>Créditos pagos no ano</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1F2937' }}>{fmt(summary.total_paid_cents)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography sx={{ fontSize: 11, color: '#6B7280' }}>Percentual vigente</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1F2937' }}>{policy.percent_rate}%</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 11, color: '#6B7280' }}>Retorno estimado</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: GOLD }}>{fmt(summary.estimated_return_cents)}</Typography>
          </Box>
        </Box>

        <Typography sx={{ fontSize: 10, color: '#9CA3AF', mb: 1.5 }}>
          Período de solicitação: {policy.request_start} a {policy.request_end}
        </Typography>

        {within_window ? (
          <Button
            fullWidth
            variant="contained"
            size="small"
            onClick={() => setConfirmOpen(true)}
            sx={{ bgcolor: GOLD, fontWeight: 700, fontSize: 12, py: 1, '&:hover': { bgcolor: '#9A7B24' } }}
          >
            Solicitar Análise
          </Button>
        ) : (
          <Alert severity="info" sx={{ fontSize: 11, py: 0 }}>
            Fora do período de solicitação. Aguarde a abertura.
          </Alert>
        )}

        <Typography sx={{ fontSize: 9, color: '#9CA3AF', mt: 1.5, lineHeight: 1.4 }}>{DISCLAIMER}</Typography>
      </CardContent>

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onClose={() => { if (!submitting) setConfirmOpen(false); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 15, color: '#1F2937' }}>Confirmar Solicitação</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 1.5, bgcolor: '#FFFDF7', borderRadius: 1.5, mb: 2, border: '1px solid #FDE68A' }}>
            <Typography sx={{ fontSize: 12, color: '#6B7280' }}>Retorno estimado:</Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: GOLD }}>{fmt(summary.estimated_return_cents)}</Typography>
          </Box>
          <Typography sx={{ fontSize: 11, color: '#6B7280', lineHeight: 1.6 }}>{DISCLAIMER}</Typography>
          {submitError && <Alert severity="error" sx={{ mt: 2, fontSize: 11 }}>{submitError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={submitting} sx={{ color: '#6B7280', fontSize: 12 }}>Cancelar</Button>
          <Button onClick={handleRequest} variant="contained" disabled={submitting} sx={{ bgcolor: GOLD, fontWeight: 700, fontSize: 12, '&:hover': { bgcolor: '#9A7B24' } }}>
            {submitting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Solicitar Análise'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
