import { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Card, CardContent, Grid, Chip, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tabs, Tab,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, IconButton, ListSubheader
} from '@mui/material';
import { CheckCircle, Cancel, Archive, Add } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';
import { formatDate } from '../../utils/formatDate';

const GOLD = '#B8942E';
const STATUS_LABELS = { active: 'Ativo', pending_approval: 'Pendente', rejected: 'Rejeitado', archived: 'Arquivado', draft: 'Rascunho' };
const STATUS_COLORS = { active: '#10B981', pending_approval: '#F59E0B', rejected: '#EF4444', archived: '#6B7280', draft: '#8B5CF6' };
const LEVEL_LABELS = { country: 'País', state: 'Estado', city: 'Cidade', region: 'Região', operation: 'Operação' };

export default function TerritoryPriceFloors() {
  const [tab, setTab] = useState(0);
  const [floors, setFloors] = useState([]);
  const [pending, setPending] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [territoryFloorCounts, setTerritoryFloorCounts] = useState({});
  const [selectedTerritory, setSelectedTerritory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reviewDialog, setReviewDialog] = useState({ open: false, item: null, action: '' });
  const [reviewReason, setReviewReason] = useState('');
  const [createDialog, setCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ origin_label: '', dest_label: '', floor_price: '', surcharge: '0', notes: '' });

  const token = localStorage.getItem('kaviar_admin_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => { fetchTerritories(); fetchPending(); }, []);
  useEffect(() => { if (selectedTerritory) fetchFloors(); }, [selectedTerritory]);

  const fetchTerritories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/territories`, { headers });
      const data = await res.json();
      if (data.success && data.data) {
        const active = data.data.filter(t => t.is_active);
        setTerritories(active);

        // Count floors per territory to identify which have data
        const counts = {};
        for (const t of active) {
          try {
            const fRes = await fetch(`${API_BASE_URL}/api/admin/territory-floors?territory_id=${t.id}&status=active`, { headers });
            const fData = await fRes.json();
            if (fData.success) counts[t.id] = (fData.data || []).filter(f => f.status === 'active' && f.is_active).length;
            else counts[t.id] = 0;
          } catch { counts[t.id] = 0; }
        }
        setTerritoryFloorCounts(counts);

        // Pre-select territory with most floors
        const withFloors = Object.entries(counts).filter(([_, c]) => c > 0).sort((a, b) => b[1] - a[1]);
        if (withFloors.length > 0) {
          setSelectedTerritory(withFloors[0][0]);
        } else if (active.length > 0) {
          setSelectedTerritory(active[0].id);
        }
      }
    } catch {}
  };

  const fetchFloors = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/territory-floors?territory_id=${selectedTerritory}`, { headers });
      const data = await res.json();
      if (data.success) setFloors(data.data || []);
      else setError(data.error || 'Erro ao carregar pisos');
    } catch (e) { setError('Erro de conexão'); }
    setLoading(false);
  };

  const fetchPending = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/territory-floors/pending`, { headers });
      const data = await res.json();
      if (data.success) setPending(data.data || []);
    } catch {}
  };

  const handleReview = async () => {
    const { item, action } = reviewDialog;
    if (!item || !reviewReason.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/territory-floors/${item.id}/${action}`, {
        method: 'PUT', headers, body: JSON.stringify({ reason: reviewReason }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Proposta ${action === 'approve' ? 'aprovada' : action === 'reject' ? 'rejeitada' : 'arquivada'} com sucesso`);
        setReviewDialog({ open: false, item: null, action: '' });
        setReviewReason('');
        fetchPending();
        if (selectedTerritory) fetchFloors();
      } else setError(data.error || 'Erro ao processar');
    } catch { setError('Erro de conexão'); }
  };

  const handleCreate = async () => {
    if (!createForm.origin_label || !createForm.dest_label || !createForm.floor_price || !createForm.notes) {
      setError('Preencha todos os campos obrigatórios'); return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/territory-floors`, {
        method: 'POST', headers,
        body: JSON.stringify({
          territory_id: selectedTerritory,
          origin_label: createForm.origin_label,
          dest_label: createForm.dest_label,
          floor_price: Number(createForm.floor_price),
          surcharge: Number(createForm.surcharge || 0),
          notes: createForm.notes,
          status: 'active',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Piso territorial criado com sucesso');
        setCreateDialog(false);
        setCreateForm({ origin_label: '', dest_label: '', floor_price: '', surcharge: '0', notes: '' });
        fetchFloors();
      } else setError(data.error || 'Erro ao criar piso');
    } catch { setError('Erro de conexão'); }
  };

  const fmt = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;

  const activeFloors = floors.filter(f => f.status === 'active' && f.is_active);
  const archivedFloors = floors.filter(f => f.status !== 'active' || !f.is_active);

  // Group territories by level for organized dropdown
  const groupedTerritories = territories.reduce((acc, t) => {
    const level = t.level || 'other';
    if (!acc[level]) acc[level] = [];
    acc[level].push(t);
    return acc;
  }, {});

  const selectedTerritoryName = territories.find(t => t.id === selectedTerritory)?.name || '';

  return (
    <Box sx={{ bgcolor: '#FAFAF8', minHeight: '100vh', py: 3 }}>
      <Container maxWidth="lg">
        <Typography variant="h5" sx={{ color: '#1A1A1A', fontWeight: 800, mb: 0.5 }}>
          Tabela Territorial de Preços
        </Typography>
        <Typography sx={{ color: '#6B7280', fontSize: 13, mb: 3 }}>
          Gerencie pisos mínimos por rota. Regra: preço final = MAX(calculado, piso territorial)
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

        {/* Territory selector */}
        <Card sx={{ mb: 3, border: '1px solid #E8E5DE', borderRadius: 2, bgcolor: '#FFFFFF' }}>
          <CardContent sx={{ py: 2, px: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 320 }}>
                <InputLabel sx={{ color: '#6B7280' }}>Selecionar Território</InputLabel>
                <Select
                  value={selectedTerritory}
                  label="Selecionar Território"
                  onChange={e => setSelectedTerritory(e.target.value)}
                  sx={{ bgcolor: '#fff' }}
                >
                  {['operation', 'region', 'city', 'state', 'country'].map(level => {
                    const items = groupedTerritories[level];
                    if (!items || items.length === 0) return null;
                    return [
                      <ListSubheader key={`header-${level}`} sx={{ bgcolor: '#F3F4F6', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: '#6B7280' }}>
                        {LEVEL_LABELS[level] || level}
                      </ListSubheader>,
                      ...items.sort((a, b) => (territoryFloorCounts[b.id] || 0) - (territoryFloorCounts[a.id] || 0)).map(t => (
                        <MenuItem key={t.id} value={t.id}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <Typography sx={{ fontSize: 13 }}>{t.name}</Typography>
                            {territoryFloorCounts[t.id] > 0 && (
                              <Chip label={`${territoryFloorCounts[t.id]} pisos`} size="small" sx={{ ml: 1, bgcolor: '#ECFDF5', color: '#059669', fontWeight: 600, fontSize: 10, height: 20 }} />
                            )}
                          </Box>
                        </MenuItem>
                      ))
                    ];
                  })}
                </Select>
              </FormControl>

              <Chip label={`${activeFloors.length} ativos`} size="small" sx={{ bgcolor: '#ECFDF5', color: '#059669', fontWeight: 600 }} />
              {pending.length > 0 && <Chip label={`${pending.length} pendentes`} size="small" sx={{ bgcolor: '#FFFBEB', color: '#D97706', fontWeight: 600 }} />}
              {selectedTerritoryName && (
                <Typography sx={{ fontSize: 12, color: '#9CA3AF', ml: 'auto' }}>
                  ID: <code style={{ fontSize: 10 }}>{selectedTerritory.slice(0, 8)}...</code>
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Card sx={{ border: '1px solid #E8E5DE', borderRadius: 2, bgcolor: '#FFFFFF' }}>
          <Box sx={{ borderBottom: '1px solid #E8E5DE', px: 2 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { fontWeight: 600, fontSize: 13, textTransform: 'none', color: '#6B7280' }, '& .Mui-selected': { color: `${GOLD} !important` }, '& .MuiTabs-indicator': { bgcolor: GOLD } }}>
              <Tab label={`Pisos Ativos (${activeFloors.length})`} />
              <Tab label={`Propostas Pendentes (${pending.length})`} />
              <Tab label={`Histórico (${archivedFloors.length})`} />
            </Tabs>
          </Box>

          <CardContent sx={{ p: 3 }}>
            {/* Tab 0: Pisos ativos */}
            {tab === 0 && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button startIcon={<Add />} variant="contained" size="small" onClick={() => setCreateDialog(true)} disabled={!selectedTerritory} sx={{ bgcolor: GOLD, '&:hover': { bgcolor: '#9A7B24' }, fontWeight: 600 }}>
                    Novo Piso
                  </Button>
                </Box>
                {loading ? <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress sx={{ color: GOLD }} /></Box> : activeFloors.length === 0 ? (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 13, mb: 0.5 }}>Nenhum piso cadastrado para "{selectedTerritoryName}"</Typography>
                    <Typography sx={{ fontSize: 12, color: '#6B7280' }}>
                      {Object.values(territoryFloorCounts).some(c => c > 0)
                        ? 'Selecione outro território no dropdown acima — territórios com pisos cadastrados mostram o número ao lado do nome.'
                        : 'Clique em "Novo Piso" para criar o primeiro piso territorial.'}
                    </Typography>
                  </Alert>
                ) : (
                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E8E5DE', borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#F9FAFB' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }}>Origem</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }}>Destino</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }} align="right">Piso</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }} align="right">Acréscimo</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }} align="right">Total</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }}>Obs.</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }} align="center">Ações</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {activeFloors.map(f => (
                          <TableRow key={f.id} hover sx={{ '&:hover': { bgcolor: '#FFFDF7' } }}>
                            <TableCell sx={{ fontSize: 12, color: '#1F2937' }}>{f.origin_label}</TableCell>
                            <TableCell sx={{ fontSize: 12, color: '#1F2937' }}>{f.dest_label}</TableCell>
                            <TableCell sx={{ fontSize: 12, color: '#1F2937' }} align="right">{fmt(f.floor_price)}</TableCell>
                            <TableCell sx={{ fontSize: 12, color: '#6B7280' }} align="right">{f.surcharge > 0 ? fmt(f.surcharge) : '—'}</TableCell>
                            <TableCell sx={{ fontSize: 12, fontWeight: 700, color: GOLD }} align="right">{fmt(f.total_floor)}</TableCell>
                            <TableCell sx={{ fontSize: 11, color: '#6B7280', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.notes || '—'}</TableCell>
                            <TableCell align="center">
                              <IconButton size="small" title="Arquivar" onClick={() => setReviewDialog({ open: true, item: f, action: 'archive' })}>
                                <Archive fontSize="small" sx={{ color: '#6B7280' }} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            )}

            {/* Tab 1: Propostas pendentes */}
            {tab === 1 && (
              pending.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>Nenhuma proposta pendente de aprovação.</Alert>
              ) : (
                <Grid container spacing={2}>
                  {pending.map(p => (
                    <Grid item xs={12} sm={6} key={p.id}>
                      <Card sx={{ border: '1px solid #FDE68A', borderRadius: 2, bgcolor: '#FFFDF7' }}>
                        <CardContent sx={{ py: 2, px: 2.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#1F2937' }}>{p.origin_label} → {p.dest_label}</Typography>
                            <Chip label="Pendente" size="small" sx={{ bgcolor: '#FFFBEB', color: '#D97706', fontWeight: 600, fontSize: 10 }} />
                          </Box>
                          <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                            <Typography sx={{ fontSize: 12, color: '#374151' }}>Piso: <strong>{fmt(p.floor_price)}</strong></Typography>
                            {p.surcharge > 0 && <Typography sx={{ fontSize: 12, color: '#374151' }}>Acréscimo: <strong>{fmt(p.surcharge)}</strong></Typography>}
                            <Typography sx={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>Total: {fmt(p.total_floor)}</Typography>
                          </Box>
                          <Typography sx={{ fontSize: 11, color: '#6B7280', mb: 1 }}>Motivo: {p.notes || '—'}</Typography>
                          {p.territory_name && <Typography sx={{ fontSize: 10, color: '#9CA3AF' }}>Território: {p.territory_name}</Typography>}
                          <Typography sx={{ fontSize: 10, color: '#9CA3AF', mb: 1.5 }}>Proposto em: {formatDate(p.created_at, { showTime: true })}</Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button size="small" variant="contained" startIcon={<CheckCircle />} onClick={() => setReviewDialog({ open: true, item: p, action: 'approve' })} sx={{ bgcolor: '#10B981', fontSize: 11, fontWeight: 600, '&:hover': { bgcolor: '#059669' } }}>Aprovar</Button>
                            <Button size="small" variant="outlined" startIcon={<Cancel />} onClick={() => setReviewDialog({ open: true, item: p, action: 'reject' })} sx={{ borderColor: '#EF4444', color: '#EF4444', fontSize: 11, fontWeight: 600 }}>Rejeitar</Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )
            )}

            {/* Tab 2: Histórico */}
            {tab === 2 && (
              archivedFloors.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>Nenhum registro arquivado, rejeitado ou inativo.</Alert>
              ) : (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E8E5DE', borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#F9FAFB' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }}>Origem</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }}>Destino</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }} align="right">Piso</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }}>Motivo</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#374151' }}>Data</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {archivedFloors.map(f => (
                        <TableRow key={f.id}>
                          <TableCell sx={{ fontSize: 12, color: '#1F2937' }}>{f.origin_label}</TableCell>
                          <TableCell sx={{ fontSize: 12, color: '#1F2937' }}>{f.dest_label}</TableCell>
                          <TableCell sx={{ fontSize: 12, color: '#1F2937' }} align="right">{fmt(f.total_floor)}</TableCell>
                          <TableCell><Chip label={STATUS_LABELS[f.status] || f.status} size="small" sx={{ bgcolor: `${STATUS_COLORS[f.status] || '#6B7280'}20`, color: STATUS_COLORS[f.status] || '#6B7280', fontWeight: 600, fontSize: 10 }} /></TableCell>
                          <TableCell sx={{ fontSize: 11, color: '#6B7280' }}>{f.review_reason || f.notes || '—'}</TableCell>
                          <TableCell sx={{ fontSize: 11, color: '#9CA3AF' }}>{formatDate(f.updated_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )
            )}
          </CardContent>
        </Card>

        {/* Dialog: Approve/Reject/Archive */}
        <Dialog open={reviewDialog.open} onClose={() => setReviewDialog({ open: false, item: null, action: '' })} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, color: '#1F2937' }}>
            {reviewDialog.action === 'approve' ? 'Aprovar Proposta' : reviewDialog.action === 'reject' ? 'Rejeitar Proposta' : 'Arquivar Piso'}
          </DialogTitle>
          <DialogContent>
            {reviewDialog.item && (
              <Box sx={{ mb: 2, p: 2, bgcolor: '#F9FAFB', borderRadius: 2, border: '1px solid #E8E5DE' }}>
                <Typography sx={{ fontSize: 13, color: '#1F2937' }}><strong>{reviewDialog.item.origin_label}</strong> → <strong>{reviewDialog.item.dest_label}</strong></Typography>
                <Typography sx={{ fontSize: 14, color: GOLD, fontWeight: 700, mt: 0.5 }}>Total: {fmt(reviewDialog.item.total_floor)}</Typography>
              </Box>
            )}
            <TextField fullWidth label="Motivo (obrigatório)" value={reviewReason} onChange={e => setReviewReason(e.target.value)} multiline rows={2} sx={{ mt: 1 }} helperText="Mínimo 3 caracteres" />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { setReviewDialog({ open: false, item: null, action: '' }); setReviewReason(''); }} sx={{ color: '#6B7280' }}>Cancelar</Button>
            <Button onClick={handleReview} variant="contained" disabled={reviewReason.trim().length < 3} sx={{ bgcolor: reviewDialog.action === 'approve' ? '#10B981' : reviewDialog.action === 'reject' ? '#EF4444' : '#6B7280', fontWeight: 600, '&:hover': { opacity: 0.9 } }}>
              {reviewDialog.action === 'approve' ? 'Aprovar' : reviewDialog.action === 'reject' ? 'Rejeitar' : 'Arquivar'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog: Criar novo piso */}
        <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, color: '#1F2937' }}>Novo Piso Territorial</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2, fontSize: 11, borderRadius: 2 }}>
              Máximo: R$ 200 por piso, R$ 30 de acréscimo. O piso será ativado imediatamente.
            </Alert>
            <TextField fullWidth label="Origem (ex: Rocinha, Vidigal)" value={createForm.origin_label} onChange={e => setCreateForm(f => ({ ...f, origin_label: e.target.value }))} sx={{ mb: 2, mt: 1 }} size="small" />
            <TextField fullWidth label="Destino (ex: Leblon, Copacabana)" value={createForm.dest_label} onChange={e => setCreateForm(f => ({ ...f, dest_label: e.target.value }))} sx={{ mb: 2 }} size="small" />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField fullWidth label="Preço Piso (R$)" type="number" value={createForm.floor_price} onChange={e => setCreateForm(f => ({ ...f, floor_price: e.target.value }))} size="small" inputProps={{ min: 0.01, max: 200, step: 0.50 }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Acréscimo (R$)" type="number" value={createForm.surcharge} onChange={e => setCreateForm(f => ({ ...f, surcharge: e.target.value }))} size="small" inputProps={{ min: 0, max: 30, step: 1 }} />
              </Grid>
            </Grid>
            <TextField fullWidth label="Motivo/Observação (obrigatório)" value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} multiline rows={2} sx={{ mt: 2 }} size="small" />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreateDialog(false)} sx={{ color: '#6B7280' }}>Cancelar</Button>
            <Button onClick={handleCreate} variant="contained" sx={{ bgcolor: GOLD, fontWeight: 600, '&:hover': { bgcolor: '#9A7B24' } }}>Criar Piso</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
