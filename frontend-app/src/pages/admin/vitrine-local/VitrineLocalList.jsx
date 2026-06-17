import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Container, Typography, Box, Button, Table, TableBody, TableCell, TableHead,
  TableRow, Chip, IconButton, TextField, MenuItem, Alert, Tooltip,
} from '@mui/material';
import { Add, Edit, ToggleOn, ToggleOff } from '@mui/icons-material';
import { API_BASE_URL } from '../../../config/api';

const CATEGORIES = {
  bar: 'Bar',
  mercearia: 'Mercearia',
  alimentacao: 'Alimentação',
  servicos: 'Serviços',
  outro: 'Outro',
};

const fieldSx = {
  minWidth: 160,
  '& .MuiOutlinedInput-root': {
    color: '#E8E3D5', bgcolor: '#111827',
    '& fieldset': { borderColor: '#2A2A45' },
    '&:hover fieldset': { borderColor: '#C8A84E88' },
    '&.Mui-focused fieldset': { borderColor: '#C8A84E' },
  },
  '& .MuiInputLabel-root': { color: '#9CA3AF', '&.Mui-focused': { color: '#C8A84E' } },
  '& .MuiSelect-icon': { color: '#9CA3AF' },
};
const headSx = {
  color: '#9CA3AF', borderColor: '#1A1A2E', fontWeight: 600,
  fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em',
};
const cellSx = { color: '#E8E3D5', borderColor: '#1A1A2E' };

export default function VitrineLocalList() {
  const [items, setItems] = useState([]);
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');

  const token = localStorage.getItem('kaviar_admin_token');
  const adminData = localStorage.getItem('kaviar_admin_data');
  const admin = adminData ? JSON.parse(adminData) : null;
  const isManager = admin?.role === 'TERRITORIAL_MANAGER';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = async () => {
    try {
      setLoading(true);
      const terrUrl = isManager
        ? `${API_BASE_URL}/api/admin/commerce/my-territories`
        : `${API_BASE_URL}/api/admin/territories`;
      const [accRes, terrRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/commerce/accounts`, { headers }),
        fetch(terrUrl, { headers }),
      ]);
      const accData = await accRes.json();
      const terrData = await terrRes.json();
      setItems(accData.data || []);
      const active = (terrData.data || []).filter(t => t.is_active !== false);
      setTerritories(active);
      setError('');
    } catch {
      setError('Erro ao carregar comércios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (item) => {
    try {
      await fetch(`${API_BASE_URL}/api/admin/commerce/accounts/${item.id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      load();
    } catch {
      setError('Erro ao atualizar status');
    }
  };

  const terrMap = Object.fromEntries(territories.map(t => [t.id, `${t.name}${t.uf ? ` (${t.uf})` : ''}`]));

  const filtered = items.filter((i) => {
    if (statusFilter === 'active' && !i.is_active) return false;
    if (statusFilter === 'inactive' && i.is_active) return false;
    if (categoryFilter && i.category !== categoryFilter) return false;
    if (regionFilter && i.territory_id !== regionFilter) return false;
    return true;
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 11, color: '#6B6045', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.3 }}>
            KAVIAR Local
          </Typography>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#C8A84E' }}>📍 Comércios — KAVIAR Local</Typography>
          <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
            Comércios cadastrados aqui aparecem no app passageiro
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          component={Link}
          to="/admin/vitrine-local/new"
          sx={{ bgcolor: '#C8A84E', color: '#0D0D1A', fontWeight: 700, '&:hover': { bgcolor: '#B8982E' } }}
        >
          Novo comércio
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          select size="small" label="Status"
          value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          sx={fieldSx}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="active">Ativos</MenuItem>
          <MenuItem value="inactive">Inativos</MenuItem>
        </TextField>
        <TextField
          select size="small" label="Categoria"
          value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          sx={fieldSx}
        >
          <MenuItem value="">Todas</MenuItem>
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <MenuItem key={k} value={k}>{v}</MenuItem>
          ))}
        </TextField>
        <TextField
          select size="small" label="Território"
          value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}
          sx={fieldSx}
        >
          <MenuItem value="">Todos</MenuItem>
          {territories.map((t) => (
            <MenuItem key={t.id} value={t.id}>{t.name}{t.uf ? ` (${t.uf})` : ''}</MenuItem>
          ))}
        </TextField>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Typography sx={{ color: '#9CA3AF' }}>Carregando...</Typography>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography color="text.secondary" gutterBottom>
            {items.length === 0 ? 'Nenhum comércio cadastrado' : 'Nenhum comércio encontrado com estes filtros'}
          </Typography>
          {items.length === 0 && (
            <Button variant="outlined" component={Link} to="/admin/vitrine-local/new">
              Cadastrar primeiro comércio
            </Button>
          )}
        </Box>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={headSx}>Nome</TableCell>
              <TableCell sx={headSx}>Categoria</TableCell>
              <TableCell sx={headSx}>Território</TableCell>
              <TableCell sx={headSx}>Telefone</TableCell>
              <TableCell sx={headSx}>Status</TableCell>
              <TableCell align="right" sx={headSx}>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell sx={cellSx}>
                  <Typography variant="body2" fontWeight={600} sx={{ color: '#E8E3D5' }}>
                    {item.trade_name || item.name}
                  </Typography>
                  {item.address && (
                    <Typography variant="caption" sx={{ color: '#9CA3AF', display: 'block' }}>
                      {item.address.length > 60 ? item.address.slice(0, 60) + '…' : item.address}
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={cellSx}>
                  <Chip
                    label={CATEGORIES[item.category] || item.category || '—'}
                    size="small"
                    sx={{ bgcolor: '#1A1A2E', color: '#E8E3D5', border: '1px solid #2A2A45' }}
                  />
                </TableCell>
                <TableCell sx={cellSx}>
                  <Typography variant="caption" sx={{ color: '#E8E3D5' }}>
                    {terrMap[item.territory_id] || '—'}
                  </Typography>
                </TableCell>
                <TableCell sx={cellSx}>
                  <Typography variant="caption" sx={{ color: '#9CA3AF' }}>{item.phone || '—'}</Typography>
                </TableCell>
                <TableCell sx={cellSx}>
                  <Chip
                    label={item.is_active ? 'Ativo' : 'Inativo'}
                    size="small"
                    sx={item.is_active
                      ? { bgcolor: 'rgba(34,197,94,0.18)', color: '#86EFAC', border: '1px solid rgba(34,197,94,0.35)' }
                      : { bgcolor: 'rgba(148,163,184,0.14)', color: '#CBD5E1', border: '1px solid rgba(148,163,184,0.28)' }}
                  />
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', borderColor: '#1A1A2E' }}
                >
                  <Tooltip title={item.is_active ? 'Desativar' : 'Ativar'}>
                    <IconButton
                      size="small"
                      onClick={() => toggleActive(item)}
                      sx={{
                        color: item.is_active ? '#FFA726' : '#66BB6A',
                        '&:hover': {
                          bgcolor: item.is_active ? 'rgba(255,167,38,0.12)' : 'rgba(102,187,106,0.12)',
                        },
                      }}
                    >
                      {item.is_active ? <ToggleOn fontSize="small" /> : <ToggleOff fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Editar">
                    <IconButton
                      size="small"
                      component={Link}
                      to={`/admin/vitrine-local/${item.id}/edit`}
                      sx={{ color: '#C8A84E', '&:hover': { bgcolor: 'rgba(200,168,78,0.12)' } }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Container>
  );
}
