import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Typography, Box, Button, Table, TableBody, TableCell, TableHead, TableRow, Chip, IconButton, TextField, MenuItem, Alert, Tooltip } from '@mui/material';
import { Add, Edit, CheckCircle, Block } from '@mui/icons-material';
import { adminApi } from '../../../services/adminApi';

const TYPES = { commerce: 'Comércio', association: 'Associação', condo: 'Condomínio', tourism: 'Turismo', service: 'Serviço', notice: 'Aviso' };

const fieldSx = {
  minWidth: 140,
  '& .MuiOutlinedInput-root': { color: '#E8E3D5', bgcolor: '#111827', '& fieldset': { borderColor: '#2A2A45' }, '&:hover fieldset': { borderColor: '#C8A84E88' }, '&.Mui-focused fieldset': { borderColor: '#C8A84E' } },
  '& .MuiInputLabel-root': { color: '#9CA3AF', '&.Mui-focused': { color: '#C8A84E' } },
  '& .MuiSelect-icon': { color: '#9CA3AF' },
};
const headSx = { color: '#9CA3AF', borderColor: '#1A1A2E', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' };
const cellSx = { color: '#E8E3D5', borderColor: '#1A1A2E' };

export default function VitrineLocalList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      const data = await adminApi.getShowcaseItems(params);
      setItems(data.data || []);
      setError('');
    } catch (err) { setError('Erro ao carregar vitrine'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter, typeFilter]);

  const toggleActive = async (item) => {
    try {
      await adminApi.patchShowcaseItem(item.id, { is_active: !item.is_active });
      load();
    } catch { setError('Erro ao atualizar status'); }
  };

  const approve = async (item) => {
    try {
      await adminApi.patchShowcaseItem(item.id, { approved: true });
      load();
    } catch { setError('Erro ao aprovar'); }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ color: '#C8A84E' }}>📍 Vitrine Local</Typography>
        <Button variant="contained" startIcon={<Add />} component={Link} to="/admin/vitrine-local/new">Novo anúncio</Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField select size="small" label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={fieldSx}>
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="active">Ativos</MenuItem>
          <MenuItem value="inactive">Inativos</MenuItem>
        </TextField>
        <TextField select size="small" label="Tipo" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} sx={fieldSx}>
          <MenuItem value="">Todos</MenuItem>
          {Object.entries(TYPES).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
        </TextField>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? <Typography>Carregando...</Typography> : items.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary" gutterBottom>Nenhum anúncio cadastrado</Typography>
          <Button variant="outlined" component={Link} to="/admin/vitrine-local/new">Criar primeiro anúncio</Button>
        </Box>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={headSx}>Título</TableCell>
              <TableCell sx={headSx}>Tipo</TableCell>
              <TableCell sx={headSx}>Status</TableCell>
              <TableCell sx={headSx}>Aprovado</TableCell>
              <TableCell sx={headSx}>Validade</TableCell>
              <TableCell sx={headSx}>Prioridade</TableCell>
              <TableCell sx={headSx}>Exposições</TableCell>
              <TableCell sx={headSx}>Cliques</TableCell>
              <TableCell sx={headSx}>CTR</TableCell>
              <TableCell align="right" sx={headSx}>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell sx={cellSx}><Typography variant="body2" fontWeight={600} sx={{ color: '#E8E3D5' }}>{item.icon} {item.title}</Typography></TableCell>
                <TableCell sx={cellSx}><Chip label={TYPES[item.type] || item.type} size="small" sx={{ bgcolor: '#1A1A2E', color: '#E8E3D5', border: '1px solid #2A2A45' }} /></TableCell>
                <TableCell sx={cellSx}><Chip label={item.is_active ? 'Ativo' : 'Inativo'} size="small" sx={item.is_active ? { bgcolor: 'rgba(34,197,94,0.18)', color: '#86EFAC', border: '1px solid rgba(34,197,94,0.35)' } : { bgcolor: 'rgba(148,163,184,0.14)', color: '#CBD5E1', border: '1px solid rgba(148,163,184,0.28)' }} /></TableCell>
                <TableCell sx={cellSx}>{item.approved_at ? <Chip label="Aprovado" size="small" sx={{ bgcolor: 'rgba(56,189,248,0.15)', color: '#7DD3FC', border: '1px solid rgba(56,189,248,0.3)' }} /> : <Chip label="Pendente" size="small" sx={{ bgcolor: 'rgba(251,191,36,0.15)', color: '#FCD34D', border: '1px solid rgba(251,191,36,0.3)' }} />}</TableCell>
                <TableCell sx={cellSx}><Typography variant="caption" sx={{ color: '#9CA3AF' }}>{fmtDate(item.starts_at)} — {fmtDate(item.ends_at)}</Typography></TableCell>
                <TableCell sx={cellSx}>{item.priority}</TableCell>
                <TableCell sx={cellSx}><Typography variant="caption" sx={{ color: '#E8E3D5' }}>{item.exposure_used ?? 0}{item.exposure_quota != null ? ` / ${item.exposure_quota}` : ' / ∞'}</Typography></TableCell>
                <TableCell sx={cellSx}><Typography variant="caption" sx={{ color: '#E8E3D5' }}>{item.clicks_count ?? 0}</Typography></TableCell>
                <TableCell sx={cellSx}><Typography variant="caption" sx={{ color: '#9CA3AF' }}>{(item.exposure_used || 0) > 0 ? ((item.clicks_count || 0) / item.exposure_used * 100).toFixed(1) + '%' : '—'}</Typography></TableCell>
                <TableCell align="right" sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', borderColor: '#1A1A2E' }}>
                  {!item.approved_at && <Tooltip title="Aprovar"><IconButton size="small" onClick={() => approve(item)} sx={{ color: '#42A5F5', '&:hover': { bgcolor: 'rgba(66,165,245,0.12)' } }}><CheckCircle fontSize="small" /></IconButton></Tooltip>}
                  <Tooltip title={item.is_active ? 'Desativar' : 'Ativar'}><IconButton size="small" onClick={() => toggleActive(item)} sx={{ color: item.is_active ? '#FFA726' : '#66BB6A', '&:hover': { bgcolor: item.is_active ? 'rgba(255,167,38,0.12)' : 'rgba(102,187,106,0.12)' } }}><Block fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Editar anúncio"><IconButton size="small" component={Link} to={`/admin/vitrine-local/${item.id}/edit`} sx={{ color: '#C8A84E', '&:hover': { bgcolor: 'rgba(200,168,78,0.12)' } }}><Edit fontSize="small" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Container>
  );
}
