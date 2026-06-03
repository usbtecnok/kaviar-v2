import { useState, useEffect } from 'react';
import { Box, Container, Typography, Card, CardContent, Grid, Chip, Alert, CircularProgress, ToggleButtonGroup, ToggleButton, Button } from '@mui/material';
import { Download } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';
import { downloadCsv } from '../../utils/exportCsv';

const GOLD = '#B8942E';
const STATUS_MAP = { calculated: 'Em apuração', approved: 'Aprovado', paid: 'Pago', canceled: 'Cancelado' };
const STATUS_COLOR = { calculated: '#F59E0B', approved: '#3B82F6', paid: '#10B981', canceled: '#EF4444' };

export default function ManagerFinance() {
  const [summary, setSummary] = useState(null);
  const [payouts, setPayouts] = useState(null);
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const token = localStorage.getItem('kaviar_admin_token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { load(); }, [period]);

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, pRes, rRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/manager/finance/summary?period=${period}`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/manager/finance/payouts`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/manager/finance/rules`, { headers }),
      ]);
      const sData = await sRes.json();
      const pData = await pRes.json();
      const rData = await rRes.json();
      if (sData.success) setSummary(sData.data);
      if (pData.success) setPayouts(pData.data);
      if (rData.success) setRules(rData.data);
    } catch {}
    setLoading(false);
  };

  const fmt = (v) => v != null ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

  if (loading) return <Container maxWidth="md" sx={{ mt: 6, textAlign: 'center' }}><CircularProgress sx={{ color: GOLD }} /></Container>;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FAFAF8', pt: 2, pb: 6 }}>
      <Container maxWidth="md">
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          <span style={{ color: GOLD }}>💰</span> Financeiro do Território
        </Typography>
        <Typography sx={{ color: '#6B7280', fontSize: 12, mb: 2 }}>Visão informativa — somente leitura</Typography>

        {summary && !summary.empty && (
          <Button size="small" startIcon={<Download />} onClick={() => {
            const headers = ['Período', 'Corridas', 'Bruto Estimado', 'Taxa Plataforma', 'Participação Territorial', 'Comissões Parceiros', 'Líquido Estimado'];
            const rows = [[summary.period, summary.rides_completed, summary.gross_estimated, summary.platform_fee, summary.regional_estimated, summary.partner_commissions, summary.net_estimated]];
            if (payouts?.length) {
              rows.push([]);
              rows.push(['Mês Referência', 'Valor', 'Status', '', '', '', '']);
              payouts.forEach(p => rows.push([p.reference_month, Number(p.approved_amount || p.calculated_amount), STATUS_MAP[p.status] || p.status, '', '', '', '']));
            }
            downloadCsv(headers, rows, `kaviar-financeiro-${new Date().toISOString().split('T')[0]}.csv`);
          }} sx={{ mb: 2, color: '#6B7280', borderColor: '#E8E5DE' }} variant="outlined">Exportar CSV</Button>
        )}

        {/* Period selector */}
        <ToggleButtonGroup value={period} exclusive onChange={(_, v) => v && setPeriod(v)} size="small" sx={{ mb: 2 }}>
          <ToggleButton value="7d" sx={{ fontSize: 11 }}>7 dias</ToggleButton>
          <ToggleButton value="30d" sx={{ fontSize: 11 }}>30 dias</ToggleButton>
          <ToggleButton value="90d" sx={{ fontSize: 11 }}>90 dias</ToggleButton>
        </ToggleButtonGroup>

        {/* KPIs */}
        {summary && !summary.empty ? (
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            {[
              { label: 'Corridas', value: summary.rides_completed },
              { label: 'Bruto estimado', value: fmt(summary.gross_estimated) },
              { label: 'Taxa plataforma', value: fmt(summary.platform_fee) },
              { label: 'Participação territorial', value: fmt(summary.regional_estimated) },
            ].map(k => (
              <Grid item xs={6} sm={3} key={k.label}>
                <Card sx={{ bgcolor: '#fff', borderTop: `3px solid ${GOLD}`, border: '1px solid #E8E5DE', borderRadius: 2 }}>
                  <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A' }}>{k.value}</Typography>
                    <Typography sx={{ fontSize: 10, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>{k.label}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Alert severity="info" sx={{ mb: 3 }}>Ainda não há dados financeiros calculados para este território.</Alert>
        )}

        {/* Net estimated */}
        {summary && !summary.empty && summary.has_rule && (
          <Card sx={{ mb: 3, bgcolor: '#fff', border: '1px solid #E8E5DE', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase' }}>Comissões parceiros</Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 700 }}>{fmt(summary.partner_commissions)}</Typography>
                </Grid>
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase' }}>Líquido estimado</Typography>
                  <Typography sx={{ fontSize: 20, fontWeight: 800, color: GOLD }}>{fmt(summary.net_estimated)}</Typography>
                </Grid>
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase' }}>% Regional</Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 700 }}>{summary.regional_percent}%</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Payouts */}
        {payouts && payouts.length > 0 && (
          <Card sx={{ mb: 3, bgcolor: '#fff', border: '1px solid #E8E5DE', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 1.5 }}>Histórico de Repasses</Typography>
              {payouts.map(p => (
                <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75, borderBottom: '1px solid #F3F4F6' }}>
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{p.reference_month}</Typography>
                    <Typography sx={{ fontSize: 11, color: '#6B7280' }}>
                      {fmt(p.approved_amount || p.calculated_amount)}
                      {p.paid_at && ` • ${p.payment_method || 'PIX'} em ${new Date(p.paid_at).toLocaleDateString('pt-BR')}`}
                    </Typography>
                  </Box>
                  <Chip label={STATUS_MAP[p.status] || p.status} size="small" sx={{ bgcolor: `${STATUS_COLOR[p.status] || '#6B7280'}15`, color: STATUS_COLOR[p.status] || '#6B7280', fontSize: 10, height: 22, fontWeight: 600 }} />
                </Box>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Rules */}
        {rules && (
          <Card sx={{ mb: 3, bgcolor: '#fff', border: '1px solid #E8E5DE', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', mb: 1 }}>Regra Financeira Vigente</Typography>
              <Grid container spacing={1}>
                <Grid item xs={4} sx={{ textAlign: 'center' }}><Typography sx={{ fontSize: 20, fontWeight: 800 }}>{Number(rules.regional_share_percent)}%</Typography><Typography sx={{ fontSize: 9, color: '#6B7280', textTransform: 'uppercase' }}>Regional</Typography></Grid>
                <Grid item xs={4} sx={{ textAlign: 'center' }}><Typography sx={{ fontSize: 20, fontWeight: 800 }}>{Number(rules.matrix_share_percent)}%</Typography><Typography sx={{ fontSize: 9, color: '#6B7280', textTransform: 'uppercase' }}>Matriz</Typography></Grid>
                <Grid item xs={4} sx={{ textAlign: 'center' }}><Typography sx={{ fontSize: 20, fontWeight: 800 }}>{Number(rules.partner_commission_percent)}%</Typography><Typography sx={{ fontSize: 9, color: '#6B7280', textTransform: 'uppercase' }}>Parceiros</Typography></Grid>
              </Grid>
              {rules.description && <Typography sx={{ fontSize: 11, color: '#6B7280', mt: 1 }}>{rules.description}</Typography>}
            </CardContent>
          </Card>
        )}

        {/* Disclaimer */}
        <Alert severity="warning" icon={false} sx={{ bgcolor: 'rgba(184,148,46,0.06)', border: '1px solid #E8E5DE', '& .MuiAlert-message': { color: '#6B7280', fontSize: 11 } }}>
          Valores informativos e estimados. A apuração, aprovação e eventual repasse são feitos exclusivamente pela central KAVIAR/USB Tecnok, conforme contrato específico.
        </Alert>
      </Container>
    </Box>
  );
}
