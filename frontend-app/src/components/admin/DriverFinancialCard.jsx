import { useState, useEffect } from 'react';
import {
  Paper, Typography, Box, ToggleButtonGroup, ToggleButton,
  CircularProgress, Grid, Chip
} from '@mui/material';
import { TrendingUp, TrendingDown, AccountBalanceWallet, Home, Map } from '@mui/icons-material';
import api from '../../api/index';

const TERRITORY_LABELS = {
  COMMUNITY: 'Da comunidade', NEIGHBORHOOD: 'Do bairro', OUTSIDE: 'Fora do território',
  local: 'Do território', adjacent: 'Bairro vizinho', external: 'Fora do território', UNKNOWN: 'N/C',
};

const fmt = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;

export function DriverFinancialCard({ driverId }) {
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    api.get(`/api/admin/drivers/${driverId}/financial-summary?period=${period}`)
      .then(res => setData(res.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [driverId, period]);

  return (
    <Paper sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Resumo Financeiro</Typography>
        <ToggleButtonGroup size="small" value={period} exclusive onChange={(_, v) => v && setPeriod(v)}>
          <ToggleButton value="today">Hoje</ToggleButton>
          <ToggleButton value="7d">7 dias</ToggleButton>
          <ToggleButton value="30d">30 dias</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress size={28} /></Box>
      ) : error ? (
        <Typography color="error" variant="body2">Erro ao carregar resumo financeiro</Typography>
      ) : data ? (
        <Grid container spacing={2}>
          {/* Financial */}
          <Grid item xs={6} sm={3}>
            <StatBox icon={<TrendingUp fontSize="small" color="success" />} label="Bruto" value={fmt(data.financial.gross)} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatBox icon={<TrendingDown fontSize="small" color="error" />} label="Taxa plataforma" value={fmt(data.financial.platform_fee)} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatBox label="Líquido" value={fmt(data.financial.net)} highlight />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatBox label="Ticket médio" value={fmt(data.financial.avg_ticket)} />
          </Grid>

          {/* Rides */}
          <Grid item xs={6} sm={3}>
            <StatBox label="Concluídas" value={data.rides.completed} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatBox label="Canceladas" value={data.rides.canceled} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatBox icon={<Home fontSize="small" color="info" />} label="Homebound" value={data.homebound} />
          </Grid>

          {/* Credits */}
          <Grid item xs={6} sm={3}>
            <StatBox icon={<AccountBalanceWallet fontSize="small" color="primary" />} label="Créditos" value={`${data.credits.consumed} usados · ${data.credits.balance} saldo`} small />
          </Grid>

          {/* Territory */}
          {Object.keys(data.territory).length > 0 && (
            <Grid item xs={12}>
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <Map fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">Corridas por território:</Typography>
                {Object.entries(data.territory).map(([k, v]) => (
                  <Chip key={k} size="small" label={`${TERRITORY_LABELS[k] || k}: ${v}`} variant="outlined" />
                ))}
              </Box>
            </Grid>
          )}
        </Grid>
      ) : null}
    </Paper>
  );
}

function StatBox({ icon, label, value, highlight, small }) {
  return (
    <Box sx={{ p: 1.5, bgcolor: highlight ? 'success.50' : 'grey.50', borderRadius: 1, border: highlight ? '1px solid' : 'none', borderColor: 'success.light' }}>
      <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
        {icon}
        <Typography variant="caption" color="text.secondary">{label}</Typography>
      </Box>
      <Typography variant={small ? 'body2' : 'h6'} fontWeight={highlight ? 800 : 600} color={highlight ? 'success.dark' : 'text.primary'}>
        {value}
      </Typography>
    </Box>
  );
}
