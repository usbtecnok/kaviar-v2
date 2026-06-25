import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Drawer,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import { Refresh, Close } from '@mui/icons-material';
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

const SEVERITY_COLORS = {
  info: '#2196F3',
  success: '#25D366',
  warning: '#FF9800',
  critical: '#f44336',
};

function fmtTime(seconds) {
  if (seconds == null) return 'Indisponivel';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function fmtMoney(value) {
  if (value == null) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [rideDetail, setRideDetail] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTerritoryId = searchParams.get('territory_id') || '';
  const token = localStorage.getItem('kaviar_admin_token');
  const adminData = localStorage.getItem('kaviar_admin_data');
  const admin = adminData ? JSON.parse(adminData) : null;
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';

  const load = useCallback(async () => {
    try {
      setError('');
      const query = selectedTerritoryId ? `?territory_id=${encodeURIComponent(selectedTerritoryId)}` : '';
      const res = await fetch(`${API_BASE_URL}/api/admin/operations/cockpit${query}`, {
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
  }, [token, selectedTerritoryId]);

  const openRideDetail = async (rideId) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError('');
    setRideDetail(null);

    try {
      const query = selectedTerritoryId ? `?territory_id=${encodeURIComponent(selectedTerritoryId)}` : '';
      const res = await fetch(`${API_BASE_URL}/api/admin/operations/rides/${rideId}${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Erro ao carregar detalhe operacional');
      }
      setRideDetail(body.data);
    } catch (err) {
      console.error('[OPS_RIDE_DETAIL]', err);
      setDetailError(err.message || 'Erro ao carregar detalhe operacional');
    } finally {
      setDetailLoading(false);
    }
  };

  const changeTerritory = (territoryId) => {
    const next = new URLSearchParams(searchParams);
    if (territoryId) next.set('territory_id', territoryId);
    else next.delete('territory_id');
    setSearchParams(next, { replace: true });
  };

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
  const territory = data?.territory || {};
  const territories = territory.territories || [];
  const selectedTerritory = territory.active_territory || territories.find(item => item.id === selectedTerritoryId) || null;
  const scopeLabel = territory.scope_label || (selectedTerritory ? `Visualizando: ${selectedTerritory.name}` : 'Visualizando todos os territorios');
  const hasTerritoryFilter = Boolean(selectedTerritoryId);

  return (
    <Box sx={{ maxWidth: 1320, mx: 'auto', px: 2, py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, gap: 2 }}>
        <Box>
          <Typography sx={{ color: '#f0f4f8', fontSize: 22, fontWeight: 800 }}>Cockpit Operacional</Typography>
          <Typography sx={{ color: '#8a9aaa', fontSize: 12, mt: 0.5 }}>
            Piloto territorial do dia, atualizado automaticamente a cada 30 segundos
          </Typography>
          <Typography sx={{ color: '#FFD700', fontSize: 12, mt: 0.7, fontWeight: 750 }}>
            {scopeLabel}
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


      <Box sx={{ ...sectionSx, mb: 3, display: 'flex', alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        <Box>
          <Typography sx={{ color: '#f0f4f8', fontSize: 14, fontWeight: 800 }}>Filtro operacional</Typography>
          <Typography sx={{ color: '#66788a', fontSize: 11, mt: 0.4 }}>
            {hasTerritoryFilter ? 'Cards, listas e detalhe seguem o territorio selecionado.' : 'Visao consolidada dos territorios permitidos para este usuario.'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: { xs: '100%', md: 420 } }}>
          <FormControl size="small" fullWidth sx={{ '& .MuiOutlinedInput-root': { color: '#e8eef5', bgcolor: '#0b1118', '& fieldset': { borderColor: '#243444' }, '&:hover fieldset': { borderColor: '#3a4c5f' } }, '& .MuiInputLabel-root': { color: '#8193a5' } }}>
            <InputLabel id="territory-filter-label">Territorio</InputLabel>
            <Select
              labelId="territory-filter-label"
              value={selectedTerritoryId}
              label="Territorio"
              onChange={(event) => changeTerritory(event.target.value)}
              disabled={loading && !data}
            >
              <MenuItem value="">Todos os territorios</MenuItem>
              {territories.map(item => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name}{item.city_name ? ` - ${item.city_name}` : ''}{item.uf ? `/${item.uf}` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {hasTerritoryFilter && (
            <Button variant="outlined" size="small" onClick={() => changeTerritory('')} sx={{ borderColor: '#2b3d4e', color: '#c9d3dc', whiteSpace: 'nowrap', textTransform: 'none' }}>
              Limpar
            </Button>
          )}
        </Box>
      </Box>

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
          <SectionTitle title="Corridas recentes e ativas" subtitle="Clique em uma corrida para ver a timeline operacional somente leitura." />
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
                  <TableRow
                    key={ride.id}
                    hover
                    onClick={() => openRideDetail(ride.id)}
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#111a22' } }}
                  >
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
                {activeRides.length === 0 && <EmptyRow columns={8} label={hasTerritoryFilter ? 'Nenhuma corrida ativa neste territorio.' : 'Nenhuma corrida ativa agora'} />}
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
                {onlineDrivers.length === 0 && <EmptyRow columns={5} label={hasTerritoryFilter ? 'Nenhum motorista online neste territorio.' : 'Nenhum motorista online agora'} />}
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
            <EmptyBox label={hasTerritoryFilter ? 'Nenhuma demanda sem atendimento neste territorio hoje.' : 'Nenhuma demanda sem atendimento registrada hoje'} />
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

      <RideDetailDrawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        loading={detailLoading}
        error={detailError}
        detail={rideDetail}
        isSuperAdmin={isSuperAdmin}
      />
    </Box>
  );
}

function RideDetailDrawer({ open, onClose, loading, error, detail, isSuperAdmin }) {
  const ride = detail?.ride;
  const values = ride?.values || {};

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', md: 620 }, bgcolor: '#0b0f14', color: '#e8eef5' } }}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 2 }}>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 850 }}>Detalhe operacional</Typography>
            <Typography sx={{ color: '#6f8192', fontSize: 12 }}>{ride?.id ? `Corrida ${shortId(ride.id)}` : 'Cockpit somente leitura'}</Typography>
          </Box>
          <IconButton onClick={onClose} size="small"><Close sx={{ color: '#8ea0b2' }} /></IconButton>
        </Box>

        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: '#FFD700' }} /></Box>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!loading && !error && detail && (
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Panel title="Dados basicos">
              <InfoGrid items={[
                ['Status', <StatusChip key="status" status={ride.status} />],
                ['Passageiro', ride.passenger?.name || '-'],
                ['Motorista', ride.driver?.name || '-'],
                ['Regiao', ride.region || '-'],
                ['Origem', ride.origin_text || '-'],
                ['Destino', ride.destination_text || '-'],
              ]} />
            </Panel>

            <Panel title="Horarios principais">
              <InfoGrid items={[
                ['Solicitada', fmtDateTime(ride.requested_at)],
                ['Ofertada', fmtDateTime(ride.offered_at)],
                ['Aceita', fmtDateTime(ride.accepted_at)],
                ['Chegada', fmtDateTime(ride.arrived_at)],
                ['Inicio', fmtDateTime(ride.started_at)],
                ['Finalizacao', fmtDateTime(ride.completed_at)],
                ['Cancelamento', fmtDateTime(ride.canceled_at)],
              ]} />
            </Panel>

            <Panel title="Valores existentes">
              <InfoGrid items={[
                ['Estimado', fmtMoney(values.quoted_price)],
                ['Travado', fmtMoney(values.locked_price)],
                ['Ajustado', fmtMoney(values.adjusted_price)],
                ['Final', fmtMoney(values.final_price)],
                ['Taxa', fmtMoney(values.platform_fee)],
                ['Motorista', fmtMoney(values.driver_earnings)],
              ]} />
            </Panel>

            <Panel title="Alertas">
              {detail.attention_flags.length > 0 ? (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {detail.attention_flags.map(flag => (
                    <Chip key={flag.code} label={flag.label} size="small" sx={{ bgcolor: `${SEVERITY_COLORS[flag.severity] || '#777'}22`, color: SEVERITY_COLORS[flag.severity] || '#aaa' }} />
                  ))}
                </Box>
              ) : <EmptyBox label="Nenhum alerta operacional neste momento" />}
            </Panel>

            <Panel title="Timeline operacional">
              <Box sx={{ display: 'grid', gap: 1.2 }}>
                {detail.timeline.map((event, index) => (
                  <Box key={`${event.type}-${event.at}-${index}`} sx={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 1.5 }}>
                    <Typography sx={{ color: '#6f8192', fontSize: 11, pt: 0.2 }}>{fmtHour(event.at)}</Typography>
                    <Box sx={{ borderLeft: `2px solid ${SEVERITY_COLORS[event.severity] || '#263442'}`, pl: 1.5, pb: 1.2 }}>
                      <Typography sx={{ color: '#e5edf5', fontSize: 13, fontWeight: 750 }}>{event.title}</Typography>
                      {event.description && <Typography sx={{ color: '#7f91a3', fontSize: 12, mt: 0.2 }}>{event.description}</Typography>}
                    </Box>
                  </Box>
                ))}
                {detail.timeline.length === 0 && <EmptyBox label="Sem eventos de timeline" />}
              </Box>
            </Panel>

            <Panel title="Mensagens rapidas">
              <SimpleRows
                rows={detail.messages}
                empty="Nenhuma mensagem rapida registrada"
                render={message => (
                  <Box key={message.id} sx={rowSx}>
                    <Typography sx={{ color: '#d8e0e8', fontSize: 12, fontWeight: 700 }}>{message.sender_type}{' -> '}{message.recipient_type}</Typography>
                    <Typography sx={{ color: '#9aabbc', fontSize: 12 }}>{message.message_text}</Typography>
                    <Typography sx={{ color: '#586b7d', fontSize: 11 }}>{fmtDateTime(message.created_at)} {message.read_at ? `- lida ${fmtHour(message.read_at)}` : ''}</Typography>
                  </Box>
                )}
              />
            </Panel>

            <Panel title="Ofertas">
              <SimpleRows
                rows={detail.offers}
                empty="Nenhuma oferta registrada"
                render={offer => (
                  <Box key={offer.id} sx={rowSx}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                      <Typography sx={{ color: '#d8e0e8', fontSize: 12, fontWeight: 700 }}>{offer.driver?.name || 'Motorista nao informado'}</Typography>
                      <Chip label={offer.status} size="small" sx={{ height: 20, fontSize: 10, bgcolor: '#2196F322', color: '#64B5F6' }} />
                    </Box>
                    <Typography sx={{ color: '#7f91a3', fontSize: 11 }}>Enviada {fmtDateTime(offer.sent_at)} {offer.responded_at ? `- resposta ${fmtDateTime(offer.responded_at)}` : ''}</Typography>
                    {offer.territory_tier && <Typography sx={{ color: '#586b7d', fontSize: 11 }}>Territorio: {offer.territory_tier}</Typography>}
                  </Box>
                )}
              />
            </Panel>

            <Panel title="Emergencias">
              <Typography sx={{ color: '#9aabbc', fontSize: 12, mb: 1 }}>
                Total: {detail.emergencies.total} | Ativas: {detail.emergencies.active}
              </Typography>
              {isSuperAdmin ? (
                <SimpleRows
                  rows={detail.emergencies.items}
                  empty="Nenhuma emergencia vinculada"
                  render={(event, index) => (
                    <Box key={event.id || index} sx={rowSx}>
                      <Typography sx={{ color: '#d8e0e8', fontSize: 12, fontWeight: 700 }}>{event.status}</Typography>
                      <Typography sx={{ color: '#9aabbc', fontSize: 12 }}>{event.triggered_by_type || 'origem nao informada'} - {event.trigger_source || '-'}</Typography>
                      <Typography sx={{ color: '#586b7d', fontSize: 11 }}>{fmtDateTime(event.created_at)} | pontos: {event.trail_points ?? '-'}</Typography>
                    </Box>
                  )}
                />
              ) : (
                <EmptyBox label={detail.emergencies.total > 0 ? 'Ha emergencia vinculada. Detalhes restritos ao Super Admin.' : 'Nenhuma emergencia vinculada'} />
              )}
            </Panel>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}

function Panel({ title, children }) {
  return (
    <Box sx={{ bgcolor: '#0f151d', border: '1px solid #1d2a38', borderRadius: 2, p: 2 }}>
      <Typography sx={{ color: '#7f91a3', fontSize: 11, fontWeight: 850, textTransform: 'uppercase', mb: 1.5 }}>{title}</Typography>
      {children}
    </Box>
  );
}

function InfoGrid({ items }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.2 }}>
      {items.map(([label, value]) => (
        <Box key={label}>
          <Typography sx={{ color: '#5f7285', fontSize: 10, textTransform: 'uppercase', fontWeight: 800 }}>{label}</Typography>
          <Typography component="div" sx={{ color: '#d8e0e8', fontSize: 13, mt: 0.3, overflowWrap: 'anywhere' }}>{value}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function SimpleRows({ rows, empty, render }) {
  if (!rows || rows.length === 0) return <EmptyBox label={empty} />;
  return <Box sx={{ display: 'grid', gap: 1 }}>{rows.map(render)}</Box>;
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
    <Box sx={{ border: '1px dashed #223142', borderRadius: 2, py: 4, px: 2, textAlign: 'center' }}>
      <Typography sx={{ color: '#506070', fontSize: 12 }}>{label}</Typography>
    </Box>
  );
}

const rowSx = {
  border: '1px solid #1d2a38',
  borderRadius: 1.5,
  p: 1.2,
  bgcolor: '#0b1118',
};

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
