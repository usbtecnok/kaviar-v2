import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const STATUS_COLORS = {
  completed: '#4CAF50',
  canceled_by_passenger: '#FF9800',
  canceled_by_driver: '#FF9800',
  no_driver: '#f44336',
  requested: '#2196F3',
  offered: '#2196F3',
  accepted: '#25D366',
  arrived: '#25D366',
  in_progress: '#25D366',
};

const STATUS_LABELS = {
  completed: 'Concluida',
  canceled_by_passenger: 'Canc. passageiro',
  canceled_by_driver: 'Canc. motorista',
  no_driver: 'Sem motorista',
  requested: 'Solicitada',
  offered: 'Ofertada',
  accepted: 'Aceita',
  arrived: 'Chegou',
  in_progress: 'Em andamento',
};

const AVAILABILITY_LABELS = {
  online: 'Online',
  busy: 'Em corrida',
  offline: 'Offline',
};

function fmtTime(seconds) {
  if (seconds == null) return 'Indisponivel';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function fmtHour(date) {
  if (!date) return '-';
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDateTime(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function shortId(id) {
  if (!id) return '-';
  return id.slice(0, 8);
}

export default function OperationsMonitor() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = localStorage.getItem('kaviar_admin_token');
  const adminData = localStorage.getItem('kaviar_admin_data');
  const admin = adminData ? JSON.parse(adminData) : null;
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await fetch(`${API_BASE_URL}/api/admin/operations/cockpit`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Erro ao carregar cockpit operacional');
      }
      setData(body);
    } catch (err) {
      console.error('[OPS_COCKPIT]', err);
      setError(err.message || 'Erro ao carregar cockpit operacional');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const cardSx = {
    bgcolor: '#111a22',
    borderRadius: 2.5,
    border: '1px solid #1a2332',
    p: 2.5,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  };
  const sectionSx = {
    bgcolor: '#0d1117',
    borderRadius: 3,
    border: '1px solid #1a2332',
    p: 3,
    boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
  };

  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}>
        <CircularProgress sx={{ color: '#FFD700' }} />
      </Box>
    );
  }

  const cards = data?.cards || {};
  const activeRides = data?.active_rides || [];
  const onlineDrivers = data?.online_drivers || [];
  const demand = data?.demand_unserved || { total: 0, by_region: [], recent: [] };
  const emergencies = data?.emergencies || [];

  return (
    <Box sx={{ maxWidth: 1320, mx: 'auto', px: 2, py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, gap: 2 }}>
        <Box>
          <Typography sx={{ color: '#f0f4f8', fontSize: 22, fontWeight: 800 }}>Cockpit Operacional</Typography>
          <Typography sx={{ color: '#8a9aaa', fontSize: 12, mt: 0.5 }}>
            Piloto territorial do dia, atualizado automaticamente a cada 30 segundos
          </Typography>
          {data?.generated_at && (
            <Typography sx={{ color: '#4f6172', fontSize: 11, mt: 0.5 }}>
              Ultima atualizacao: {fmtDateTime(data.generated_at)}
            </Typography>
          )}
        </Box>
        <Tooltip title="Atualizar agora">
          <IconButton size="small" onClick={() => { setLoading(true); load(); }}>
            <Refresh sx={{ color: '#FFD700', fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 1.5, mb: 3 }}>
        {[
          { value: cards.drivers_online, label: 'Motoristas online', color: '#25D366' },
          { value: cards.active_rides, label: 'Corridas ativas', color: '#2196F3' },
          { value: cards.no_driver_today, label: 'Sem motorista hoje', color: '#f44336' },
          { value: cards.canceled_today, label: 'Canceladas hoje', color: '#FF9800' },
          { value: cards.active_emergencies, label: 'Emergencias ativas', color: cards.active_emergencies > 0 ? '#f44336' : '#25D366' },
          { value: fmtTime(cards.avg_to_offer_seconds), label: 'Media ate 1a oferta', color: '#FFD700', isText: true },
        ].map(card => (
          <Box key={card.label} sx={cardSx}>
            <Typography sx={{ fontSize: card.isText ? 24 : 34, fontWeight: 850, color: card.color, lineHeight: 1 }}>
              {card.value ?? 0}
            </Typography>
            <Typography sx={{ fontSize: 10, color: '#7a8a9a', textTransform: 'uppercase', mt: 1, fontWeight: 700 }}>
              {card.label}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 0.8fr)', gap: 1.5, mb: 3 }}>
        <Box sx={sectionSx}>
          <SectionTitle title="Corridas recentes e ativas" subtitle="Indicadores de atencao aparecem quando uma corrida permanece tempo demais em estado sensivel." />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Status', 'Origem', 'Destino', 'Passageiro', 'Motorista', 'Regiao', 'Tempo', 'Atencao'].map(h => (
                    <TableCell key={h} sx={headCellSx}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {activeRides.map(ride => (
                  <TableRow key={ride.id} sx={{ '&:hover': { bgcolor: '#111a22' } }}>
                    <TableCell sx={bodyCellSx}>
                      <StatusChip status={ride.status} />
                    </TableCell>
                    <CompactCell value={ride.origin_text} />
                    <CompactCell value={ride.destination_text} />
                    <TableCell sx={bodyCellSx}>{ride.passenger_name || '-'}</TableCell>
                    <TableCell sx={bodyCellSx}>{ride.driver_name || '-'}</TableCell>
                    <TableCell sx={bodyCellSx}>{ride.region || '-'}</TableCell>
                    <TableCell sx={bodyCellSx}>{ride.minutes_since_request} min</TableCell>
                    <TableCell sx={bodyCellSx}>
                      {ride.attention ? (
                        <Chip label={ride.attention_reason || 'Revisar'} size="small" sx={{ height: 22, fontSize: 10, bgcolor: '#f4433622', color: '#ff8a80' }} />
                      ) : (
                        <Typography sx={{ color: '#506070', fontSize: 12 }}>Normal</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {activeRides.length === 0 && <EmptyRow columns={8} label="Nenhuma corrida ativa agora" />}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Box sx={sectionSx}>
          <SectionTitle title="Motoristas online" subtitle="Ultima atualizacao operacional informada pelo app motorista." />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Motorista', 'Telefone', 'Base', 'Status', 'Atualizado'].map(h => (
                    <TableCell key={h} sx={headCellSx}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {onlineDrivers.map(driver => (
                  <TableRow key={driver.id} sx={{ '&:hover': { bgcolor: '#111a22' } }}>
                    <TableCell sx={bodyCellSx}>{driver.name}</TableCell>
                    <TableCell sx={bodyCellSx}>{driver.phone || '-'}</TableCell>
                    <TableCell sx={bodyCellSx}>{driver.base || '-'}</TableCell>
                    <TableCell sx={bodyCellSx}>
                      <Chip
                        label={AVAILABILITY_LABELS[driver.availability] || driver.availability}
                        size="small"
                        sx={{ height: 21, fontSize: 10, bgcolor: driver.availability === 'busy' ? '#2196F322' : '#25D36622', color: driver.availability === 'busy' ? '#64B5F6' : '#25D366' }}
                      />
                    </TableCell>
                    <TableCell sx={bodyCellSx}>{fmtHour(driver.last_seen_at)}</TableCell>
                  </TableRow>
                ))}
                {onlineDrivers.length === 0 && <EmptyRow columns={5} label="Nenhum motorista online agora" />}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 1.5 }}>
        <Box sx={sectionSx}>
          <SectionTitle title="Demanda sem atendimento" subtitle="Pedidos encerrados como sem motorista hoje, agrupados por regiao de origem." />
          {demand.by_region.length > 0 ? (
            <Box sx={{ display: 'grid', gap: 1 }}>
              {demand.by_region.map(region => (
                <Box key={region.region} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a2332', py: 1 }}>
                  <Box>
                    <Typography sx={{ color: '#d8e0e8', fontSize: 13, fontWeight: 650 }}>{region.region}</Typography>
                    <Typography sx={{ color: '#647586', fontSize: 11 }}>Ultimo pedido: {fmtHour(region.last_requested_at)}</Typography>
                  </Box>
                  <Chip label={`${region.count} hoje`} size="small" sx={{ bgcolor: '#f4433622', color: '#ff8a80', fontSize: 10 }} />
                </Box>
              ))}
            </Box>
          ) : (
            <EmptyBox label="Nenhuma demanda sem atendimento registrada hoje" />
          )}
        </Box>

        <Box sx={sectionSx}>
          <SectionTitle title="Emergencias ativas" subtitle={isSuperAdmin ? 'Eventos ativos do botao de emergencia.' : 'Detalhes disponiveis apenas para Super Admin.'} />
          {isSuperAdmin && emergencies.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Evento', 'Origem', 'Passageiro', 'Motorista', 'Criado', 'Rastro'].map(h => (
                      <TableCell key={h} sx={headCellSx}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {emergencies.map(event => (
                    <TableRow key={event.id} sx={{ '&:hover': { bgcolor: '#111a22' } }}>
                      <TableCell sx={bodyCellSx}>{shortId(event.id)}</TableCell>
                      <TableCell sx={bodyCellSx}>{event.triggered_by_type}</TableCell>
                      <TableCell sx={bodyCellSx}>{event.passenger_name || '-'}</TableCell>
                      <TableCell sx={bodyCellSx}>{event.driver_name || '-'}</TableCell>
                      <TableCell sx={bodyCellSx}>{fmtHour(event.created_at)}</TableCell>
                      <TableCell sx={bodyCellSx}>{event.trail_points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <EmptyBox label={cards.active_emergencies > 0 ? `${cards.active_emergencies} emergencia(s) ativa(s)` : 'Nenhuma emergencia ativa agora'} />
          )}
        </Box>
      </Box>
    </Box>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={{ fontSize: 12, color: '#7f91a3', fontWeight: 800, textTransform: 'uppercase' }}>{title}</Typography>
      <Typography sx={{ color: '#526577', fontSize: 11, mt: 0.3 }}>{subtitle}</Typography>
    </Box>
  );
}

function StatusChip({ status }) {
  return (
    <Chip
      label={STATUS_LABELS[status] || status}
      size="small"
      sx={{ height: 21, fontSize: 10, bgcolor: `${STATUS_COLORS[status] || '#666'}22`, color: STATUS_COLORS[status] || '#999' }}
    />
  );
}

function CompactCell({ value }) {
  return (
    <TableCell sx={{ ...bodyCellSx, maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {value || '-'}
    </TableCell>
  );
}

function EmptyRow({ columns, label }) {
  return (
    <TableRow>
      <TableCell colSpan={columns} sx={{ textAlign: 'center', color: '#506070', borderColor: '#1a2332', py: 4, fontSize: 12 }}>
        {label}
      </TableCell>
    </TableRow>
  );
}

function EmptyBox({ label }) {
  return (
    <Box sx={{ border: '1px dashed #223142', borderRadius: 2, py: 4, textAlign: 'center' }}>
      <Typography sx={{ color: '#506070', fontSize: 12 }}>{label}</Typography>
    </Box>
  );
}

const headCellSx = {
  color: '#607487',
  fontSize: 10,
  fontWeight: 800,
  textTransform: 'uppercase',
  borderColor: '#1a2332',
  py: 1,
};

const bodyCellSx = {
  color: '#c9d3dc',
  fontSize: 12,
  borderColor: '#1a2332',
  py: 1,
};
