import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Chip, CircularProgress, IconButton, Tooltip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const PERIODS = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
];

const STATUS_COLORS = {
  completed: '#4CAF50', canceled_by_passenger: '#FF9800', canceled_by_driver: '#FF9800',
  no_driver: '#f44336', requested: '#2196F3', offered: '#2196F3',
  accepted: '#25D366', arrived: '#25D366', in_progress: '#25D366',
};
const STATUS_LABELS = {
  completed: 'Concluída', canceled_by_passenger: 'Canc. passageiro', canceled_by_driver: 'Canc. motorista',
  no_driver: 'Sem motorista', requested: 'Solicitada', offered: 'Ofertada',
  accepted: 'Aceita', arrived: 'Chegou', in_progress: 'Em andamento',
};
const TIER_COLORS = { COMMUNITY: '#25D366', NEIGHBORHOOD: '#2196F3', OUTSIDE: '#FF9800' };
const TIER_LABELS = { COMMUNITY: 'Comunidade', NEIGHBORHOOD: 'Bairro', OUTSIDE: 'Fora' };

function fmtTime(s) { if (s == null) return '—'; if (s < 60) return `${s}s`; return `${Math.floor(s / 60)}m ${s % 60}s`; }
function fmtHour(d) { if (!d) return '—'; return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }

export default function OperationsMonitor() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');
  const token = localStorage.getItem('kaviar_admin_token');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/operations/monitor?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) setData(d);
    } catch (e) { console.error('[OPS]', e); }
    finally { setLoading(false); }
  }, [period, token]);

  useEffect(() => { setLoading(true); load(); }, [load]);
  useEffect(() => { const id = setInterval(load, 30000); return () => clearInterval(id); }, [load]);

  const cardSx = { bgcolor: '#111a22', borderRadius: 2.5, border: '1px solid #1a2332', p: 2.5, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', transition: 'border-color 0.2s', '&:hover': { borderColor: '#2a3a4a' } };
  const sectionSx = { bgcolor: '#0d1117', borderRadius: 3, border: '1px solid #1a2332', p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.25)' };

  if (loading && !data) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}><CircularProgress sx={{ color: '#FFD700' }} /></Box>;

  const { rides, offers, territory, timing, recent } = data || {};
  const tierTotal = territory ? Object.values(territory).reduce((a, b) => a + b, 0) : 0;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: 2, pt: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography sx={{ color: '#f0f4f8', fontSize: 20, fontWeight: 700 }}>Monitor Operacional</Typography>
          <Typography sx={{ color: '#8a9aaa', fontSize: 12, mt: 0.3 }}>Dispatch, território e performance em tempo real</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          {PERIODS.map(p => (
            <Chip key={p.value} label={p.label} size="small" onClick={() => setPeriod(p.value)}
              sx={{ height: 28, fontSize: 11, fontWeight: period === p.value ? 700 : 400, bgcolor: period === p.value ? '#FFD700' : 'transparent', color: period === p.value ? '#000' : '#7a8a9a', border: '1px solid #1a2332', cursor: 'pointer', '&:hover': { bgcolor: period === p.value ? '#FFD700' : '#111a22' } }} />
          ))}
          <Tooltip title="Atualizar"><IconButton size="small" onClick={() => { setLoading(true); load(); }}><Refresh sx={{ color: '#5a7a8a', fontSize: 16 }} /></IconButton></Tooltip>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1.5, mb: 3 }}>
        {[
          { n: rides?.requested, l: 'Solicitadas', c: '#e0e6ed' },
          { n: rides?.completed, l: 'Concluídas', c: '#4CAF50' },
          { n: (rides?.canceled_by_passenger || 0) + (rides?.canceled_by_driver || 0), l: 'Canceladas', c: '#FF9800' },
          { n: offers?.expired, l: 'Expiradas', c: '#f44336' },
          { n: rides?.no_driver, l: 'Sem motorista', c: '#f44336' },
          { n: rides?.active, l: 'Ativas agora', c: '#25D366' },
        ].map(k => (
          <Box key={k.l} sx={cardSx}>
            <Typography sx={{ fontSize: 32, fontWeight: 800, color: k.c, lineHeight: 1 }}>{k.n ?? 0}</Typography>
            <Typography sx={{ fontSize: 10, color: '#6a7a8a', textTransform: 'uppercase', letterSpacing: 0.8, mt: 0.8, fontWeight: 600 }}>{k.l}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 3 }}>
        {/* Territory */}
        <Box sx={sectionSx}>
          <Typography sx={{ fontSize: 11, color: '#5a7a8a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, mb: 2 }}>Distribuição Territorial</Typography>
          {tierTotal === 0 ? (
            <Typography sx={{ color: '#4a5a6a', fontSize: 12, py: 2, textAlign: 'center' }}>Sem dados territoriais no período selecionado</Typography>
          ) : (
            Object.entries(TIER_LABELS).map(([key, label]) => {
              const count = territory?.[key] || 0;
              const pct = tierTotal > 0 ? (count / tierTotal) * 100 : 0;
              return (
                <Box key={key} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: 12, color: '#c0c8d0', fontWeight: 600 }}>{label}</Typography>
                    <Typography sx={{ fontSize: 12, color: '#7a8a9a' }}>{count} ({Math.round(pct)}%)</Typography>
                  </Box>
                  <Box sx={{ height: 8, bgcolor: '#1a2332', borderRadius: 4, overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: TIER_COLORS[key], borderRadius: 4, transition: 'width 0.5s', boxShadow: `0 0 8px ${TIER_COLORS[key]}33` }} />
                  </Box>
                </Box>
              );
            })
          )}
        </Box>

        {/* Timing */}
        <Box sx={sectionSx}>
          <Typography sx={{ fontSize: 11, color: '#5a7a8a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, mb: 2 }}>Tempos Operacionais</Typography>
          {[
            { l: 'Aceite médio', v: timing?.avg_accept_seconds, icon: '⚡' },
            { l: 'Até primeira oferta', v: timing?.avg_to_offer_seconds, icon: '📡' },
            { l: 'Até sem motorista', v: timing?.avg_to_no_driver_seconds, icon: '⏱️' },
          ].map(t => (
            <Box key={t.l} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.2, borderBottom: '1px solid #1a2332' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: 14 }}>{t.icon}</Typography>
                <Typography sx={{ fontSize: 12, color: '#c0c8d0' }}>{t.l}</Typography>
              </Box>
              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#f0f4f8' }}>{fmtTime(t.v)}</Typography>
            </Box>
          ))}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1.5 }}>
            <Typography sx={{ fontSize: 12, color: '#c0c8d0' }}>Ofertas aceitas / total</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#FFD700' }}>
              {offers?.accepted || 0} / {offers?.total || 0}
              {offers?.total > 0 && <Typography component="span" sx={{ fontSize: 11, color: '#7a8a9a', ml: 0.5 }}>({Math.round((offers.accepted / offers.total) * 100)}%)</Typography>}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Recent rides */}
      <Box sx={sectionSx}>
        <Typography sx={{ fontSize: 11, color: '#5a7a8a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, mb: 2 }}>Corridas Recentes</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Hora', 'Status', 'Origem', 'Destino', 'Motorista', 'Território', 'Aceite', 'Duração'].map(h => (
                  <TableCell key={h} sx={{ color: '#5a7a8a', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', borderColor: '#1a2332', py: 1 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(recent || []).map((r, idx) => (
                <TableRow key={r.id} sx={{ '&:hover': { bgcolor: '#111a22' }, bgcolor: idx % 2 === 0 ? 'transparent' : 'rgba(17,26,34,0.4)' }}>
                  <TableCell sx={{ color: '#c0c8d0', fontSize: 12, borderColor: '#1a2332', py: 1 }}>{fmtHour(r.requested_at)}</TableCell>
                  <TableCell sx={{ borderColor: "#1a2332", py: 1 }}>
                    <Chip label={STATUS_LABELS[r.status] || r.status} size="small" sx={{ height: 20, fontSize: 10, bgcolor: (STATUS_COLORS[r.status] || '#666') + '22', color: STATUS_COLORS[r.status] || '#666' }} />
                  </TableCell>
                  <TableCell sx={{ color: '#c0c8d0', fontSize: 11, borderColor: "#1a2332", py: 1, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.origin_text || '—'}</TableCell>
                  <TableCell sx={{ color: '#c0c8d0', fontSize: 11, borderColor: "#1a2332", py: 1, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.destination_text || '—'}</TableCell>
                  <TableCell sx={{ color: '#e0e6ed', fontSize: 12, fontWeight: 500, borderColor: "#1a2332", py: 1 }}>{r.driver_name || '—'}</TableCell>
                  <TableCell sx={{ borderColor: "#1a2332", py: 1 }}>
                    {r.territory_tier ? <Chip label={TIER_LABELS[r.territory_tier] || r.territory_tier} size="small" sx={{ height: 18, fontSize: 9, bgcolor: (TIER_COLORS[r.territory_tier] || '#666') + '22', color: TIER_COLORS[r.territory_tier] || '#666' }} /> : <Typography sx={{ color: '#3a4a5a', fontSize: 11 }}>—</Typography>}
                  </TableCell>
                  <TableCell sx={{ color: '#c0c8d0', fontSize: 12, borderColor: "#1a2332", py: 1 }}>{r.accept_time_seconds != null ? `${r.accept_time_seconds}s` : '—'}</TableCell>
                  <TableCell sx={{ color: '#c0c8d0', fontSize: 12, borderColor: "#1a2332", py: 1 }}>{r.total_time_minutes != null ? `${r.total_time_minutes}m` : '—'}</TableCell>
                </TableRow>
              ))}
              {(!recent || recent.length === 0) && (
                <TableRow><TableCell colSpan={8} sx={{ textAlign: 'center', color: '#4a5a6a', borderColor: '#1a2332', py: 4, fontSize: 12 }}>Nenhuma corrida registrada no período selecionado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}
