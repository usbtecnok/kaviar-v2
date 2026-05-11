import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Box, Typography, CircularProgress, Grid, Tabs, Tab, Table, TableBody, TableCell, TableHead, TableRow, Chip } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { API_BASE_URL } from '../config/api';

const gold = '#B8942E';

export default function PartnerPublicView() {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [data, setData] = useState(null);
  const [mgmt, setMgmt] = useState(null);
  const [tab, setTab] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    if (!code || !token) { setError('Link inválido'); setLoading(false); return; }
    fetch(`${API_BASE_URL}/api/public/partners/${code}/report?token=${token}`)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); else setError(d.error || 'Erro'); })
      .catch(() => setError('Erro de conexão'))
      .finally(() => setLoading(false));
  }, [code, token]);

  useEffect(() => {
    if (!code || !token || tab !== 1) return;
    fetch(`${API_BASE_URL}/api/public/partners/${code}/management?token=${token}&month=${month}`)
      .then(r => r.json())
      .then(d => { if (d.success) setMgmt(d.data); })
      .catch(() => {});
  }, [code, token, tab, month]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#0a0a0a' }}><CircularProgress sx={{ color: gold }} /></Box>;
  if (error) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#0a0a0a' }}><Typography sx={{ color: '#ef5350' }}>{error}</Typography></Box>;

  const registerLink = `https://kaviar.com.br/driver/register?partner_code=${data.referral_code}`;
  const statusLabel = { active: 'Ativo', paused: 'Pausado', inactive: 'Inativo' }[data.status] || data.status;
  const hasMgmt = data.partner_type && true; // management tab loads dynamically

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0a', color: '#E8E3D5', p: 2 }}>
      <Box sx={{ maxWidth: 600, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography sx={{ color: gold, fontWeight: 800, fontSize: 18, letterSpacing: 2 }}>KAVIAR</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>{data.name}</Typography>
          <Typography variant="body2" sx={{ color: '#999', mt: 0.3 }}>Parceiro Territorial • {statusLabel}</Typography>
        </Box>

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} centered sx={{ mb: 2, '& .MuiTab-root': { color: '#888', fontSize: 13 }, '& .Mui-selected': { color: `${gold} !important` }, '& .MuiTabs-indicator': { backgroundColor: gold } }}>
          <Tab label="Corridas" />
          <Tab label="Gestão" />
        </Tabs>

        {/* Tab 0: Corridas */}
        {tab === 0 && (<>
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            {[
              { label: 'Motoristas indicados', value: data.total_drivers },
              { label: 'Motoristas aprovados', value: data.approved_drivers },
              { label: 'Aguardando aprovação', value: data.pending_requests },
              { label: 'Corridas no mês', value: data.rides_this_month },
            ].map(k => (
              <Grid item xs={6} key={k.label}>
                <Box sx={{ textAlign: 'center', p: 1.5, border: '1px solid #222', borderRadius: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: gold }}>{k.value}</Typography>
                  <Typography variant="caption" sx={{ color: '#999' }}>{k.label}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ p: 2, border: '1px solid #222', borderRadius: 2, mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: gold, mb: 1 }}>Comissão ({Number(data.commission_percent)}%)</Typography>
            <Grid container spacing={1}>
              {[
                { label: 'Total', value: `R$ ${data.commission_total.toFixed(2)}`, color: '#E8E3D5' },
                { label: 'Pago', value: `R$ ${data.commission_paid.toFixed(2)}`, color: '#4caf50' },
                { label: 'Pendente', value: `R$ ${data.commission_pending.toFixed(2)}`, color: '#ff9800' },
              ].map(k => (
                <Grid item xs={4} key={k.label}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontWeight: 700, color: k.color, fontSize: 16 }}>{k.value}</Typography>
                    <Typography variant="caption" sx={{ color: '#666', fontSize: 10 }}>{k.label}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #222', borderRadius: 2, mb: 3 }}>
            <Typography variant="subtitle2" sx={{ color: gold, mb: 1.5 }}>Cadastre motoristas</Typography>
            <Box sx={{ bgcolor: '#fff', display: 'inline-block', p: 1.5, borderRadius: 1 }}>
              <QRCodeSVG value={registerLink} size={140} />
            </Box>
            <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 1 }}>
              Código: <strong style={{ color: gold }}>{data.referral_code}</strong>
            </Typography>
          </Box>
        </>)}

        {/* Tab 1: Gestão */}
        {tab === 1 && (
          mgmt ? (
            <Box>
              {/* Month selector */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
                  style={{ background: '#111', border: '1px solid #333', color: '#E8E3D5', padding: '6px 12px', borderRadius: 4, fontSize: 14 }} />
              </Box>

              {/* Summary */}
              <Grid container spacing={1.5} sx={{ mb: 3 }}>
                <Grid item xs={4}><Box sx={{ textAlign: 'center', p: 1.5, border: '1px solid #222', borderRadius: 2 }}><Typography variant="h5" sx={{ fontWeight: 800, color: '#4caf50' }}>R$ {(mgmt.income_total / 100).toFixed(2)}</Typography><Typography variant="caption" sx={{ color: '#999' }}>Entradas</Typography></Box></Grid>
                <Grid item xs={4}><Box sx={{ textAlign: 'center', p: 1.5, border: '1px solid #222', borderRadius: 2 }}><Typography variant="h5" sx={{ fontWeight: 800, color: '#ef5350' }}>R$ {(mgmt.expense_total / 100).toFixed(2)}</Typography><Typography variant="caption" sx={{ color: '#999' }}>Saídas</Typography></Box></Grid>
                <Grid item xs={4}><Box sx={{ textAlign: 'center', p: 1.5, border: '1px solid #222', borderRadius: 2 }}><Typography variant="h5" sx={{ fontWeight: 800, color: mgmt.balance >= 0 ? gold : '#ef5350' }}>R$ {(mgmt.balance / 100).toFixed(2)}</Typography><Typography variant="caption" sx={{ color: '#999' }}>Saldo</Typography></Box></Grid>
              </Grid>

              {/* Members */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ color: gold, mb: 1 }}>Associados ({mgmt.members_active} ativos / {mgmt.members_total} total)</Typography>
                <Table size="small">
                  <TableHead><TableRow><TableCell sx={{ color: '#888', borderColor: '#222' }}>Nome</TableCell><TableCell sx={{ color: '#888', borderColor: '#222' }}>Unidade</TableCell><TableCell sx={{ color: '#888', borderColor: '#222' }}>Status</TableCell></TableRow></TableHead>
                  <TableBody>
                    {mgmt.members.map(m => (
                      <TableRow key={m.id}><TableCell sx={{ color: '#E8E3D5', borderColor: '#1a1a1a' }}>{m.name}</TableCell><TableCell sx={{ color: '#999', borderColor: '#1a1a1a' }}>{m.unit || '—'}</TableCell><TableCell sx={{ borderColor: '#1a1a1a' }}><Chip label={m.status === 'active' ? 'Ativo' : 'Inativo'} size="small" sx={{ bgcolor: m.status === 'active' ? '#1b5e20' : '#333', color: '#fff', fontSize: 10 }} /></TableCell></TableRow>
                    ))}
                    {mgmt.members.length === 0 && <TableRow><TableCell colSpan={3} sx={{ color: '#555', borderColor: '#1a1a1a', textAlign: 'center' }}>Nenhum associado cadastrado</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </Box>

              {/* Transactions */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ color: gold, mb: 1 }}>Movimentações — {month}</Typography>
                <Table size="small">
                  <TableHead><TableRow><TableCell sx={{ color: '#888', borderColor: '#222' }}>Descrição</TableCell><TableCell sx={{ color: '#888', borderColor: '#222' }}>Categoria</TableCell><TableCell align="right" sx={{ color: '#888', borderColor: '#222' }}>Valor</TableCell></TableRow></TableHead>
                  <TableBody>
                    {mgmt.transactions.map(t => (
                      <TableRow key={t.id}><TableCell sx={{ color: '#E8E3D5', borderColor: '#1a1a1a' }}>{t.description}</TableCell><TableCell sx={{ color: '#999', borderColor: '#1a1a1a', fontSize: 11 }}>{t.category}</TableCell><TableCell align="right" sx={{ color: t.type === 'income' ? '#4caf50' : '#ef5350', fontWeight: 700, borderColor: '#1a1a1a' }}>{t.type === 'income' ? '+' : '-'} R$ {(t.amount_cents / 100).toFixed(2)}</TableCell></TableRow>
                    ))}
                    {mgmt.transactions.length === 0 && <TableRow><TableCell colSpan={3} sx={{ color: '#555', borderColor: '#1a1a1a', textAlign: 'center' }}>Nenhuma movimentação no período</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </Box>

              <Typography variant="caption" sx={{ color: '#444', display: 'block', textAlign: 'center', fontStyle: 'italic' }}>
                Controle interno da associação. Não substitui contabilidade oficial.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography sx={{ color: '#666' }}>Módulo não disponível neste plano.</Typography>
            </Box>
          )
        )}

        {/* Footer */}
        <Typography variant="caption" sx={{ color: '#333', display: 'block', textAlign: 'center', mt: 3 }}>
          KAVIAR Mobilidade Comunitária
        </Typography>
      </Box>
    </Box>
  );
}
