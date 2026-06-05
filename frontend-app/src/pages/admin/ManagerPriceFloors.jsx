import { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Card, CardContent, Grid, Chip, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tabs, Tab,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField
} from '@mui/material';
import { Add, Schedule, CheckCircle, Cancel } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const GOLD = '#B8942E';
const STATUS_LABELS = { active: 'Ativo', pending_approval: 'Pendente', rejected: 'Rejeitado', archived: 'Arquivado', draft: 'Rascunho' };
const STATUS_COLORS = { active: '#10B981', pending_approval: '#F59E0B', rejected: '#EF4444', archived: '#6B7280', draft: '#8B5CF6' };
const STATUS_ICONS = { pending_approval: Schedule, active: CheckCircle, rejected: Cancel };

export default function ManagerPriceFloors() {
  const [tab, setTab] = useState(0);
  const [floors, setFloors] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [proposeDialog, setProposeDialog] = useState(false);
  const [form, setForm] = useState({ origin_label: '', dest_label: '', floor_price: '', surcharge: '0', notes: '' });

  const token = localStorage.getItem('kaviar_admin_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [floorsRes, proposalsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/manager/territory-floors`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/manager/territory-floors/proposals`, { headers }),
      ]);

      if (floorsRes.status === 403) {
        setError('Sem território vinculado. Solicite acesso ao administrador.');
        setLoading(false);
        return;
      }

      const floorsData = await floorsRes.json();
      const proposalsData = await proposalsRes.json();

      if (floorsData.success) setFloors(floorsData.data || []);
      if (proposalsData.success) setProposals(proposalsData.data || []);
    } catch (e) {
      setError('Erro ao carregar dados. Verifique sua conexão.');
    }
    setLoading(false);
  };

  const handlePropose = async () => {
    if (!form.origin_label || !form.dest_label || !form.floor_price || !form.notes) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }
    if (Number(form.floor_price) > 200) {
      setError('Preço máximo permitido: R$ 200,00');
      return;
    }
    if (Number(form.surcharge) > 30) {
      setError('Acréscimo máximo: R$ 30,00');
      return;
    }
    if (form.notes.length < 5) {
      setError('Justificativa deve ter pelo menos 5 caracteres');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/manager/territory-floors/propose`, {
        method: 'POST', headers,
        body: JSON.stringify({
          origin_label: form.origin_label,
          dest_label: form.dest_label,
          floor_price: Number(form.floor_price),
          surcharge: Number(form.surcharge || 0),
          notes: form.notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess('Proposta enviada para aprovação do administrador');
        setProposeDialog(false);
        setForm({ origin_label: '', dest_label: '', floor_price: '', surcharge: '0', notes: '' });
        fetchAll();
      } else {
        setError(data.error || 'Erro ao enviar proposta');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    }
  };

  const fmt = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;

  if (loading) {
    return (
      <Box sx={{ bgcolor: '#FAFAF8', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress sx={{ color: GOLD, mb: 2 }} />
          <Typography sx={{ color: '#6B7280', fontSize: 13 }}>Carregando tabela de preços...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: '#FAFAF8', minHeight: '100vh', py: 3 }}>
      <Container maxWidth="lg">
        <Typography variant="h5" sx={{ color: '#1A1A1A', fontWeight: 800, mb: 0.5 }}>
          Tabela de Preços do Território
        </Typography>
        <Typography sx={{ color: '#6B7280', fontSize: 13, mb: 3 }}>
          Pisos mínimos de preço por rota. Para solicitar alteração, use o botão abaixo.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

        {/* Tabs + action button */}
        <Card sx={{ border: '1px solid #E8E5DE', borderRadius: 2, bgcolor: '#FFFFFF' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E8E5DE', px: 2, pr: 3 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { fontWeight: 600, fontSize: 13, textTransform: 'none', color: '#6B7280' }, '& .Mui-selected': { color: `${GOLD} !important` }, '& .MuiTabs-indicator': { bgcolor: GOLD } }}>
              <Tab label={`Preços Ativos (${floors.length})`} />
              <Tab label={`Minhas Propostas (${proposals.length})`} />
            </Tabs>
            <Button startIcon={<Add />} variant="contained" size="small" onClick={() => setProposeDialog(true)} sx={{ bgcolor: GOLD, '&:hover': { bgcolor: '#9A7B24' }, fontSize: 12, fontWeight: 600 }}>
              Solicitar Novo Preço
            </Button>
          </Box>

          <CardContent sx={{ p: 3 }}>
            {/* Tab 0: Preços ativos (somente leitura) */}
            {tab === 0 && (
              floors.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <Typography sx={{ color: '#6B7280', fontSize: 14, mb: 1, fontWeight: 600 }}>
                    Nenhum preço territorial cadastrado para o seu território.
                  </Typography>
                  <Typography sx={{ color: '#9CA3AF', fontSize: 12, mb: 2 }}>
                    Você pode solicitar a criação de pisos mínimos clicando em "Solicitar Novo Preço".
                  </Typography>
                  <Typography sx={{ color: '#9CA3AF', fontSize: 11 }}>
                    Após envio, o administrador analisará e aprovará sua proposta.
                  </Typography>
                </Box>
              ) : (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E8E5DE', borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#F9FAFB' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }}>Origem</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }}>Destino</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }} align="right">Piso Mínimo</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }} align="right">Acréscimo</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }} align="right">Total</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }}>Observação</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {floors.map(f => (
                        <TableRow key={f.id} hover sx={{ '&:hover': { bgcolor: '#FFFDF7' } }}>
                          <TableCell sx={{ fontSize: 12, color: '#1F2937' }}>{f.origin_label}</TableCell>
                          <TableCell sx={{ fontSize: 12, color: '#1F2937' }}>{f.dest_label}</TableCell>
                          <TableCell sx={{ fontSize: 12, color: '#1F2937' }} align="right">{fmt(f.floor_price)}</TableCell>
                          <TableCell sx={{ fontSize: 12, color: '#6B7280' }} align="right">{f.surcharge > 0 ? fmt(f.surcharge) : '—'}</TableCell>
                          <TableCell sx={{ fontSize: 12, fontWeight: 700, color: GOLD }} align="right">{fmt(f.total_floor)}</TableCell>
                          <TableCell sx={{ fontSize: 11, color: '#6B7280', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.notes || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )
            )}

            {/* Tab 1: Minhas propostas */}
            {tab === 1 && (
              proposals.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <Typography sx={{ color: '#6B7280', fontSize: 14, fontWeight: 600 }}>
                    Você ainda não enviou nenhuma proposta de preço.
                  </Typography>
                  <Typography sx={{ color: '#9CA3AF', fontSize: 12, mt: 1 }}>
                    Clique em "Solicitar Novo Preço" para enviar sua primeira proposta.
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {proposals.map(p => {
                    const StatusIcon = STATUS_ICONS[p.status] || Schedule;
                    return (
                      <Grid item xs={12} sm={6} md={4} key={p.id}>
                        <Card sx={{ border: `1px solid ${STATUS_COLORS[p.status] || '#E8E5DE'}40`, borderRadius: 2, borderTop: `3px solid ${STATUS_COLORS[p.status] || '#E8E5DE'}`, bgcolor: '#FFFFFF' }}>
                          <CardContent sx={{ py: 2, px: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography sx={{ fontWeight: 700, fontSize: 12, color: '#1F2937' }}>{p.origin_label} → {p.dest_label}</Typography>
                              <Chip
                                icon={<StatusIcon sx={{ fontSize: 14 }} />}
                                label={STATUS_LABELS[p.status] || p.status}
                                size="small"
                                sx={{ bgcolor: `${STATUS_COLORS[p.status] || '#6B7280'}15`, color: STATUS_COLORS[p.status] || '#6B7280', fontWeight: 600, fontSize: 10 }}
                              />
                            </Box>
                            <Typography sx={{ fontSize: 14, color: GOLD, fontWeight: 700, mb: 0.5 }}>
                              {fmt(p.total_floor)}
                              {p.surcharge > 0 && <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 400 }}> (piso {fmt(p.floor_price)} + {fmt(p.surcharge)})</span>}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: '#6B7280', mb: 0.5 }}>Justificativa: {p.notes}</Typography>
                            {p.review_reason && (
                              <Alert severity={p.status === 'rejected' ? 'error' : 'info'} sx={{ mt: 1, py: 0, fontSize: 11, borderRadius: 1 }}>
                                Resposta: {p.review_reason}
                              </Alert>
                            )}
                            <Typography sx={{ fontSize: 10, color: '#9CA3AF', mt: 1 }}>
                              Enviada em {new Date(p.created_at).toLocaleDateString('pt-BR')}
                              {p.reviewed_at && ` · Revisada em ${new Date(p.reviewed_at).toLocaleDateString('pt-BR')}`}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )
            )}
          </CardContent>
        </Card>

        {/* Dialog: Propor novo preço */}
        <Dialog open={proposeDialog} onClose={() => setProposeDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, color: '#1F2937' }}>Solicitar Novo Preço</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2, fontSize: 11, borderRadius: 2 }}>
              Sua proposta será enviada para aprovação do administrador. Preço máximo: R$ 200. Acréscimo máximo: R$ 30.
            </Alert>
            <TextField fullWidth label="Origem (ex: Rocinha, Vidigal)" value={form.origin_label} onChange={e => setForm(f => ({ ...f, origin_label: e.target.value }))} sx={{ mb: 2, mt: 1 }} size="small" required />
            <TextField fullWidth label="Destino (ex: Leblon, Copacabana, Aeroporto)" value={form.dest_label} onChange={e => setForm(f => ({ ...f, dest_label: e.target.value }))} sx={{ mb: 2 }} size="small" required />
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <TextField fullWidth label="Preço Piso (R$)" type="number" value={form.floor_price} onChange={e => setForm(f => ({ ...f, floor_price: e.target.value }))} size="small" required inputProps={{ min: 0.01, max: 200, step: 0.50 }} helperText="Máx: R$ 200" />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Acréscimo (R$)" type="number" value={form.surcharge} onChange={e => setForm(f => ({ ...f, surcharge: e.target.value }))} size="small" inputProps={{ min: 0, max: 30, step: 1 }} helperText="Máx: R$ 30 (área difícil)" />
              </Grid>
            </Grid>
            <TextField fullWidth label="Justificativa (obrigatório)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} multiline rows={3} size="small" required helperText="Explique o motivo do preço proposto (mín. 5 caracteres)" />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setProposeDialog(false)} sx={{ color: '#6B7280' }}>Cancelar</Button>
            <Button onClick={handlePropose} variant="contained" sx={{ bgcolor: GOLD, fontWeight: 600, '&:hover': { bgcolor: '#9A7B24' } }}>Enviar Proposta</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
