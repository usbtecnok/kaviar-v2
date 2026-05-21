import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Button, CircularProgress, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem } from '@mui/material';
import { ArrowBack, Edit, PersonAdd, Delete } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const STATUS_COLORS = { planning: '#6B7280', preparation: '#D97706', active: '#059669', inactive: '#DC2626' };
const STATUS_LABELS = { planning: 'Planejamento', preparation: 'Preparação', active: 'Ativo', inactive: 'Inativo' };

export default function TerritoryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [territory, setTerritory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem('kaviar_admin_token');

  const fetchTerritory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/territories/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setTerritory(data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchTerritory(); }, [id]);

  const handleEdit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/territories/${id}`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(editForm),
      });
      if ((await res.json()).success) { setEditOpen(false); fetchTerritory(); }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleUnlinkAdmin = async (adminId, territoryId) => {
    if (!confirm('Remover acesso deste admin ao território?')) return;
    await fetch(`${API_BASE_URL}/api/admin/territories/regional-admins/${adminId}/territories/${territoryId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchTerritory();
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress sx={{ color: '#B8942E' }} /></Box>;
  if (!territory) return <Typography>Território não encontrado</Typography>;

  const t = territory;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/admin/territories')}><ArrowBack /></IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" sx={{ color: '#C8A84E', fontWeight: 800 }}>{t.name}</Typography>
          <Typography variant="body2" sx={{ color: '#6B7280' }}>{t.level}{t.uf ? ` • ${t.uf}` : ''}{t.parent?.name ? ` • Pai: ${t.parent.name}` : ''}</Typography>
        </Box>
        <Chip label={STATUS_LABELS[t.status]} sx={{ bgcolor: `${STATUS_COLORS[t.status]}15`, color: STATUS_COLORS[t.status], fontWeight: 600 }} />
        <Button startIcon={<Edit />} onClick={() => { setEditForm({ name: t.name, status: t.status, uf: t.uf || '', city_name: t.city_name || '', notes: t.notes || '' }); setEditOpen(true); }} sx={{ color: '#B8942E' }}>Editar</Button>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 600 }, '& .Mui-selected': { color: '#B8942E' }, '& .MuiTabs-indicator': { bgcolor: '#B8942E' } }}>
        <Tab label="Visão Geral" />
        <Tab label={`Bairros (${t.neighborhoods?.length || 0})`} />
        <Tab label={`Parceiros (${t.territorial_partners?.length || 0})`} />
        <Tab label={`Admins (${t.admin_access?.length || 0})`} />
        <Tab label="Finance" />
      </Tabs>

      {tab === 0 && (
        <Card sx={{ border: '1px solid #E8E5DE' }}>
          <CardContent>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3 }}>
              <Box><Typography variant="caption" sx={{ color: '#6B7280' }}>Nome</Typography><Typography sx={{ fontWeight: 600 }}>{t.name}</Typography></Box>
              <Box><Typography variant="caption" sx={{ color: '#6B7280' }}>Tipo</Typography><Typography sx={{ fontWeight: 600 }}>{t.level}</Typography></Box>
              <Box><Typography variant="caption" sx={{ color: '#6B7280' }}>Status</Typography><Typography sx={{ fontWeight: 600 }}>{STATUS_LABELS[t.status]}</Typography></Box>
              <Box><Typography variant="caption" sx={{ color: '#6B7280' }}>UF</Typography><Typography sx={{ fontWeight: 600 }}>{t.uf || '—'}</Typography></Box>
              <Box><Typography variant="caption" sx={{ color: '#6B7280' }}>Cidade</Typography><Typography sx={{ fontWeight: 600 }}>{t.city_name || '—'}</Typography></Box>
              <Box><Typography variant="caption" sx={{ color: '#6B7280' }}>Bairros</Typography><Typography sx={{ fontWeight: 600, color: '#B8942E' }}>{t.neighborhoods?.length || 0}</Typography></Box>
              <Box><Typography variant="caption" sx={{ color: '#6B7280' }}>Parceiros</Typography><Typography sx={{ fontWeight: 600, color: '#B8942E' }}>{t.territorial_partners?.length || 0}</Typography></Box>
              <Box><Typography variant="caption" sx={{ color: '#6B7280' }}>Admins Regionais</Typography><Typography sx={{ fontWeight: 600, color: '#B8942E' }}>{t.admin_access?.length || 0}</Typography></Box>
              <Box><Typography variant="caption" sx={{ color: '#6B7280' }}>Criado em</Typography><Typography sx={{ fontWeight: 600 }}>{new Date(t.created_at).toLocaleDateString('pt-BR')}</Typography></Box>
            </Box>
            {t.notes && <Box sx={{ mt: 2, p: 2, bgcolor: '#FAFAF8', borderRadius: 1 }}><Typography variant="caption" sx={{ color: '#6B7280' }}>Observações</Typography><Typography>{t.notes}</Typography></Box>}
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <TableContainer component={Paper} sx={{ border: '1px solid #E8E5DE' }}>
          <Table size="small">
            <TableHead><TableRow sx={{ bgcolor: '#FAFAF8' }}><TableCell sx={{ fontWeight: 700 }}>Bairro</TableCell><TableCell>Cidade</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
            <TableBody>
              {(t.neighborhoods || []).map((n) => (
                <TableRow key={n.id}><TableCell>{n.name}</TableCell><TableCell>{n.city}</TableCell><TableCell><Chip label={n.is_active ? 'Ativo' : 'Inativo'} size="small" color={n.is_active ? 'success' : 'default'} /></TableCell></TableRow>
              ))}
              {!t.neighborhoods?.length && <TableRow><TableCell colSpan={3} sx={{ textAlign: 'center', color: '#6B7280' }}>Nenhum bairro vinculado</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 2 && (
        <TableContainer component={Paper} sx={{ border: '1px solid #E8E5DE' }}>
          <Table size="small">
            <TableHead><TableRow sx={{ bgcolor: '#FAFAF8' }}><TableCell sx={{ fontWeight: 700 }}>Parceiro</TableCell><TableCell>Tipo</TableCell><TableCell>Plano</TableCell><TableCell>Status</TableCell><TableCell>Contato</TableCell></TableRow></TableHead>
            <TableBody>
              {(t.territorial_partners || []).map((p) => (
                <TableRow key={p.id}><TableCell>{p.name}</TableCell><TableCell>{p.partner_type}</TableCell><TableCell>{p.plan}</TableCell><TableCell><Chip label={p.status} size="small" /></TableCell><TableCell>{p.responsible_name}</TableCell></TableRow>
              ))}
              {!t.territorial_partners?.length && <TableRow><TableCell colSpan={5} sx={{ textAlign: 'center', color: '#6B7280' }}>Nenhum parceiro vinculado</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 3 && (
        <TableContainer component={Paper} sx={{ border: '1px solid #E8E5DE' }}>
          <Table size="small">
            <TableHead><TableRow sx={{ bgcolor: '#FAFAF8' }}><TableCell sx={{ fontWeight: 700 }}>Admin</TableCell><TableCell>Email</TableCell><TableCell>Role</TableCell><TableCell>Acesso</TableCell><TableCell>Status</TableCell><TableCell>Ações</TableCell></TableRow></TableHead>
            <TableBody>
              {(t.admin_access || []).map((a) => (
                <TableRow key={a.id}><TableCell>{a.admin?.name}</TableCell><TableCell>{a.admin?.email}</TableCell><TableCell>{a.admin?.role}</TableCell><TableCell>{a.access_level}</TableCell><TableCell><Chip label={a.admin?.is_active ? 'Ativo' : 'Inativo'} size="small" color={a.admin?.is_active ? 'success' : 'default'} /></TableCell>
                  <TableCell><IconButton size="small" color="error" onClick={() => handleUnlinkAdmin(a.admin?.id, t.id)}><Delete fontSize="small" /></IconButton></TableCell></TableRow>
              ))}
              {!t.admin_access?.length && <TableRow><TableCell colSpan={6} sx={{ textAlign: 'center', color: '#6B7280' }}>Nenhum admin regional vinculado</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 4 && <FinanceTab territoryId={id} token={token} />}

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#C8A84E', fontWeight: 700 }}>Editar Território</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Nome" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} fullWidth />
          <TextField label="Status" select value={editForm.status || ''} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} fullWidth>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </TextField>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="UF" value={editForm.uf || ''} onChange={(e) => setEditForm({ ...editForm, uf: e.target.value.toUpperCase().slice(0, 2) })} sx={{ width: 100 }} />
            <TextField label="Cidade" value={editForm.city_name || ''} onChange={(e) => setEditForm({ ...editForm, city_name: e.target.value })} fullWidth />
          </Box>
          <TextField label="Observações" value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} multiline rows={2} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
          <Button onClick={handleEdit} disabled={saving} variant="contained" sx={{ bgcolor: '#B8942E' }}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function FinanceTab({ territoryId, token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/territories/${territoryId}/finance`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [territoryId]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: '#B8942E' }} /></Box>;

  const fmt = (v) => typeof v === 'number' ? v.toLocaleString('pt-BR') : '—';
  const fmtBRL = (v) => typeof v === 'number' ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';
  const fmtCents = (v) => typeof v === 'number' ? `R$ ${(v / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

  const d = data || {};
  const cards = [
    { label: 'Corridas Total', value: fmt(d.rides?.total), color: '#B8942E' },
    { label: 'Concluídas', value: fmt(d.rides?.completed), color: '#059669' },
    { label: 'Canceladas', value: fmt(d.rides?.canceled), color: '#DC2626' },
    { label: 'Sem Motorista', value: fmt(d.rides?.no_driver), color: '#D97706' },
    { label: 'Motoristas', value: fmt(d.entities?.drivers), color: '#B8942E' },
    { label: 'Passageiros', value: fmt(d.entities?.passengers), color: '#B8942E' },
    { label: 'Parceiros', value: fmt(d.entities?.partners), color: '#B8942E' },
    { label: 'Créditos Comprados', value: fmt(d.credits?.purchased), color: '#059669' },
    { label: 'Créditos Consumidos', value: fmt(d.credits?.consumed), color: '#D97706' },
    { label: 'Receita Bruta Estimada', value: fmtBRL(d.revenue?.gross_estimated), color: '#059669' },
    { label: 'Compensações', value: `${fmt(d.compensations?.total)} (${fmtCents(d.compensations?.amount_cents)})`, color: '#6B7280' },
    { label: 'Comissões Parceiros', value: fmtBRL(d.partner_finance?.commissions_total), color: '#B8942E' },
    { label: 'Pagamentos Parceiros', value: fmtCents(d.partner_finance?.payments_total), color: '#6B7280' },
    { label: 'Mensalidades', value: fmtCents(d.partner_finance?.mensalidades_total), color: '#6B7280' },
  ];

  return (
    <Card sx={{ border: '1px solid #E8E5DE', borderTop: '3px solid #B8942E' }}>
      <CardContent>
        <Typography variant="h6" sx={{ color: '#C8A84E', fontWeight: 700, mb: 1 }}>💰 KAVIAR Finance — Territorial</Typography>
        <Typography variant="caption" sx={{ color: '#6B7280', display: 'block', mb: 3 }}>Financeiro territorial em modo leitura. Não há repasse, split ou movimentação financeira automática nesta fase.</Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2, mb: 3 }}>
          {cards.map((c) => (
            <Box key={c.label} sx={{ p: 2, bgcolor: '#FAFAF8', borderRadius: 1, border: '1px solid #E8E5DE' }}>
              <Typography variant="caption" sx={{ color: '#6B7280' }}>{c.label}</Typography>
              <Typography variant="h6" sx={{ color: c.color, fontWeight: 700 }}>{c.value}</Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ p: 2, bgcolor: '#FAFAF8', borderRadius: 2, border: '1px dashed #E8E5DE' }}>
          <Typography variant="subtitle2" sx={{ color: '#9CA3AF', mb: 1 }}>📋 Em preparação</Typography>
          <Typography variant="body2" sx={{ color: '#9CA3AF' }}>Repasses • Saldo pendente • Participação do operador regional • Financeiro ativo por território</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
