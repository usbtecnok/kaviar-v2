import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Edit, Email } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import api from '../../api';

const STATUS_OPTIONS = [
  'NOT_STARTED',
  'CONTACTED',
  'WAITING_RESPONSE',
  'RESPONSE_RECEIVED',
  'DOCUMENTS_REQUESTED',
  'READY_TO_PROTOCOL',
  'PROTOCOL_SENT',
  'APPROVED',
  'REJECTED',
  'PAUSED',
];

const STATUS_LABELS = {
  NOT_STARTED: 'Não iniciado',
  CONTACTED: 'Contatado',
  WAITING_RESPONSE: 'Aguardando resposta',
  RESPONSE_RECEIVED: 'Resposta recebida',
  DOCUMENTS_REQUESTED: 'Documentos solicitados',
  READY_TO_PROTOCOL: 'Pronto para protocolo',
  PROTOCOL_SENT: 'Protocolo enviado',
  APPROVED: 'Aprovado',
  REJECTED: 'Indeferido',
  PAUSED: 'Pausado',
};

const STATUS_COLORS = {
  NOT_STARTED: { bg: '#F3F4F6', color: '#374151' },
  CONTACTED: { bg: '#DBEAFE', color: '#1E40AF' },
  WAITING_RESPONSE: { bg: '#FEF3C7', color: '#92400E' },
  RESPONSE_RECEIVED: { bg: '#DCFCE7', color: '#166534' },
  DOCUMENTS_REQUESTED: { bg: '#FCE7F3', color: '#9D174D' },
  READY_TO_PROTOCOL: { bg: '#EDE9FE', color: '#5B21B6' },
  PROTOCOL_SENT: { bg: '#CCFBF1', color: '#0F766E' },
  APPROVED: { bg: '#D1FAE5', color: '#065F46' },
  REJECTED: { bg: '#FEE2E2', color: '#991B1B' },
  PAUSED: { bg: '#E5E7EB', color: '#374151' },
};

const PAGE_SIZE = 12;

const EMPTY_FORM = {
  city: '',
  state: '',
  status: 'NOT_STARTED',
  department_name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  last_sent_at: '',
  last_response_at: '',
  next_follow_up_at: '',
  next_action: '',
  notes: '',
};

const EMPTY_COMMUNICATIONS = {
  city: null,
  contactEmail: null,
  sent: [],
  received: [],
};

function toDatetimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

function toPayloadDatetime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
}

function getCommunicationDate(item) {
  return item?.receivedAt || item?.sentAt || item?.createdAt || null;
}

function StatusTag({ status }) {
  const cfg = STATUS_COLORS[status] || { bg: '#F3F4F6', color: '#374151' };
  return (
    <Chip
      size="small"
      label={STATUS_LABELS[status] || status}
      sx={{
        fontWeight: 700,
        backgroundColor: cfg.bg,
        color: cfg.color,
        borderRadius: '8px',
      }}
    />
  );
}

export default function RegulatoryCitiesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState({
    q: '',
    city: '',
    state: '',
    status: 'ALL',
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expandedCommunicationsId, setExpandedCommunicationsId] = useState(null);
  const [communicationsByCity, setCommunicationsByCity] = useState({});
  const [communicationsLoadingId, setCommunicationsLoadingId] = useState(null);
  const [communicationsErrors, setCommunicationsErrors] = useState({});

  const params = useMemo(() => {
    const next = {
      page,
      limit: PAGE_SIZE,
    };

    if (filters.q.trim()) next.q = filters.q.trim();
    if (filters.city.trim()) next.city = filters.city.trim();
    if (filters.state.trim()) next.state = filters.state.trim().toUpperCase();
    if (filters.status !== 'ALL') next.status = filters.status;

    return next;
  }, [filters, page]);

  const loadCases = async (targetPage = 1) => {
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await api.get('/api/admin/regulatory/cities', {
        params: {
          ...params,
          page: targetPage,
        },
      });

      const list = Array.isArray(response.data?.data) ? response.data.data : [];
      const pages = Number(response.data?.pagination?.totalPages || 1);
      const current = Number(response.data?.pagination?.page || targetPage);

      setItems(list);
      setTotalPages(Math.max(1, pages));
      setPage(current);
    } catch (error) {
      const message = error?.response?.data?.error || 'Não foi possível carregar os casos regulatórios.';
      setErrorMessage(message);
      setItems([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases(1);
  }, [filters]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      city: item.city || '',
      state: item.state || '',
      status: item.status || 'NOT_STARTED',
      department_name: item.department_name || '',
      contact_name: item.contact_name || '',
      contact_email: item.contact_email || '',
      contact_phone: item.contact_phone || '',
      last_sent_at: toDatetimeLocal(item.last_sent_at),
      last_response_at: toDatetimeLocal(item.last_response_at),
      next_follow_up_at: toDatetimeLocal(item.next_follow_up_at),
      next_action: item.next_action || '',
      notes: item.notes || '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
  };

  const submitForm = async () => {
    setSaving(true);
    setErrorMessage('');

    try {
      const payload = {
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
        status: form.status,
        department_name: form.department_name || null,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        last_sent_at: toPayloadDatetime(form.last_sent_at),
        last_response_at: toPayloadDatetime(form.last_response_at),
        next_follow_up_at: toPayloadDatetime(form.next_follow_up_at),
        next_action: form.next_action || null,
        notes: form.notes || null,
      };

      if (editingId) {
        await api.patch(`/api/admin/regulatory/cities/${editingId}`, payload);
      } else {
        await api.post('/api/admin/regulatory/cities', payload);
      }

      setDialogOpen(false);
      await loadCases(page);
    } catch (error) {
      const message = error?.response?.data?.error || 'Não foi possível salvar o caso regulatório.';
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  const loadCommunications = async (cityId) => {
    setCommunicationsLoadingId(cityId);
    setCommunicationsErrors((prev) => ({ ...prev, [cityId]: '' }));

    try {
      const response = await api.get(`/api/admin/regulatory/cities/${cityId}/communications`);
      setCommunicationsByCity((prev) => ({
        ...prev,
        [cityId]: response.data?.data || EMPTY_COMMUNICATIONS,
      }));
    } catch (error) {
      const message = error?.response?.data?.error || 'Não foi possível carregar as comunicações vinculadas.';
      setCommunicationsErrors((prev) => ({ ...prev, [cityId]: message }));
    } finally {
      setCommunicationsLoadingId((current) => (current === cityId ? null : current));
    }
  };

  const toggleCommunications = async (cityId) => {
    if (expandedCommunicationsId === cityId) {
      setExpandedCommunicationsId(null);
      return;
    }

    setExpandedCommunicationsId(cityId);
    if (!communicationsByCity[cityId]) {
      await loadCommunications(cityId);
    }
  };

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5} maxWidth={1100} sx={{ mx: 'auto' }}>
        <Box
          sx={{
            '& .admin-page-title': {
              color: '#F8FAFC !important',
              fontWeight: 800,
            },
            '& .admin-page-title:hover': {
              color: '#F8FAFC !important',
            },
            '& .admin-page-title *': {
              color: 'inherit !important',
            },
            '& .admin-page-subtitle': {
              color: '#CBD5E1 !important',
            },
            '& .admin-page-subtitle:hover': {
              color: '#CBD5E1 !important',
            },
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            className="admin-page-title"
            sx={{ fontWeight: 800, color: '#F8FAFC !important', mb: 0.5 }}
            style={{ color: '#F8FAFC' }}
          >
            <span style={{ color: 'inherit' }}>Regulatório por Cidade</span>
          </Typography>
          <Typography className="admin-page-subtitle" sx={{ color: '#CBD5E1 !important' }} style={{ color: '#CBD5E1' }}>
            Acompanhar cadastro, protocolo e autorizações municipais da KAVIAR.
          </Typography>
        </Box>

        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        <Card sx={{ borderRadius: 3, border: '1px solid #E8E5DE', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <TextField
                size="small"
                label="Busca"
                placeholder="Cidade, setor, e-mail, observação"
                value={filters.q}
                onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
              />

              <TextField
                size="small"
                label="Cidade"
                value={filters.city}
                onChange={(event) => setFilters((prev) => ({ ...prev, city: event.target.value }))}
              />

              <TextField
                size="small"
                label="UF"
                inputProps={{ maxLength: 2 }}
                value={filters.state}
                onChange={(event) => setFilters((prev) => ({ ...prev, state: event.target.value.toUpperCase() }))}
              />

              <FormControl size="small" sx={{ minWidth: 210 }}>
                <InputLabel id="reg-city-status-filter">Status</InputLabel>
                <Select
                  labelId="reg-city-status-filter"
                  label="Status"
                  value={filters.status}
                  onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                >
                  <MenuItem value="ALL">Todos</MenuItem>
                  {STATUS_OPTIONS.map((status) => (
                    <MenuItem key={status} value={status}>{STATUS_LABELS[status]}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ flex: 1 }} />

              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={openCreate}
                sx={{ bgcolor: '#B8942E', '&:hover': { bgcolor: '#9A7B24' }, fontWeight: 700 }}
              >
                Nova cidade
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: '#B8942E' }} />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {items.map((item) => (
              <Grid item xs={12} md={6} key={item.id}>
                <Card sx={{ borderRadius: 2.5, border: '1px solid #E8E5DE', height: '100%', boxShadow: '0 6px 18px rgba(15,23,42,0.06)' }}>
                  <CardContent sx={{ p: 2.25 }}>
                    <Stack spacing={1.2}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontWeight: 800, color: '#1A1A1A', fontSize: 17 }}>
                          {item.city}/{item.state}
                        </Typography>
                        <StatusTag status={item.status} />
                      </Box>

                      <Typography sx={{ color: '#4B5563', fontSize: 13 }}>
                        <strong>Setor:</strong> {item.department_name || '-'}
                      </Typography>
                      <Typography sx={{ color: '#4B5563', fontSize: 13 }}>
                        <strong>E-mail de contato:</strong> {item.contact_email || '-'}
                      </Typography>
                      <Typography sx={{ color: '#4B5563', fontSize: 13 }}>
                        <strong>Último envio:</strong> {formatDateTime(item.last_sent_at)}
                      </Typography>
                      <Typography sx={{ color: '#4B5563', fontSize: 13 }}>
                        <strong>Última resposta:</strong> {formatDateTime(item.last_response_at)}
                      </Typography>
                      <Typography sx={{ color: '#4B5563', fontSize: 13 }}>
                        <strong>Próxima ação:</strong> {item.next_action || '-'}
                      </Typography>
                      <Typography sx={{ color: '#4B5563', fontSize: 13 }}>
                        <strong>Próximo acompanhamento:</strong> {formatDateTime(item.next_follow_up_at)}
                      </Typography>

                      <Stack direction="row" spacing={1} sx={{ pt: 0.6, flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Edit fontSize="small" />}
                          onClick={() => openEdit(item)}
                        >
                          Ver detalhes / Editar
                        </Button>

                        {item.contact_email && (
                          <Button
                            size="small"
                            component={Link}
                            to="/admin/inbox"
                            startIcon={<Email fontSize="small" />}
                            sx={{ color: '#1D4ED8' }}
                          >
                            Ver e-mails recebidos
                          </Button>
                        )}

                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => toggleCommunications(item.id)}
                          disabled={communicationsLoadingId === item.id}
                          sx={{ bgcolor: '#111827', color: '#F8FAFC', '&:hover': { bgcolor: '#0F172A' } }}
                        >
                          {communicationsLoadingId === item.id ? 'Carregando...' : 'Ver comunicações'}
                        </Button>
                      </Stack>

                      {expandedCommunicationsId === item.id && (
                        <Box
                          sx={{
                            mt: 1,
                            borderRadius: 2,
                            bgcolor: '#0F172A',
                            color: '#E5E7EB',
                            border: '1px solid rgba(148,163,184,0.18)',
                            p: 1.5,
                          }}
                        >
                          <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: 14, mb: 1.25 }}>
                            Comunicações vinculadas
                          </Typography>

                          {communicationsErrors[item.id] && (
                            <Alert severity="error" sx={{ mb: 1.25 }}>
                              {communicationsErrors[item.id]}
                            </Alert>
                          )}

                          {!communicationsErrors[item.id] && communicationsLoadingId === item.id && !communicationsByCity[item.id] && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                              <CircularProgress size={22} sx={{ color: '#B8942E' }} />
                            </Box>
                          )}

                          {!communicationsErrors[item.id] && communicationsByCity[item.id] && (
                            <Stack spacing={1.25}>
                              {!communicationsByCity[item.id].contactEmail ? (
                                <Typography sx={{ color: '#CBD5E1', fontSize: 13 }}>
                                  Cadastre um e-mail de contato para vincular comunicações.
                                </Typography>
                              ) : (
                                <>
                                  <Typography sx={{ color: '#94A3B8', fontSize: 12 }}>
                                    E-mail vinculado: {communicationsByCity[item.id].contactEmail}
                                  </Typography>

                                  {communicationsByCity[item.id].sent.length === 0 && communicationsByCity[item.id].received.length === 0 ? (
                                    <Typography sx={{ color: '#CBD5E1', fontSize: 13 }}>
                                      Nenhuma comunicação vinculada a este e-mail ainda.
                                    </Typography>
                                  ) : (
                                    <Grid container spacing={1.25}>
                                      {[
                                        { title: 'Enviados', items: communicationsByCity[item.id].sent },
                                        { title: 'Recebidos', items: communicationsByCity[item.id].received },
                                      ].map((group) => (
                                        <Grid item xs={12} md={6} key={group.title}>
                                          <Box sx={{ borderRadius: 1.5, bgcolor: 'rgba(15,23,42,0.55)', border: '1px solid rgba(148,163,184,0.14)', p: 1.25, height: '100%' }}>
                                            <Typography sx={{ color: '#F8FAFC', fontWeight: 700, fontSize: 13, mb: 1 }}>
                                              {group.title}
                                            </Typography>

                                            {group.items.length === 0 ? (
                                              <Typography sx={{ color: '#94A3B8', fontSize: 12 }}>
                                                Nenhum {group.title === 'Enviados' ? 'envio' : 'recebimento'} vinculado.
                                              </Typography>
                                            ) : (
                                              <Stack spacing={1}>
                                                {group.items.map((comm) => (
                                                  <Box key={comm.id} sx={{ borderRadius: 1.5, bgcolor: 'rgba(30,41,59,0.88)', p: 1.1, border: '1px solid rgba(148,163,184,0.1)' }}>
                                                    <Typography sx={{ color: '#F8FAFC', fontWeight: 600, fontSize: 12.5, lineHeight: 1.35 }}>
                                                      {comm.subject || '(sem assunto)'}
                                                    </Typography>
                                                    <Typography sx={{ color: '#94A3B8', fontSize: 11, mt: 0.35 }}>
                                                      {group.title === 'Enviados' ? `Para: ${comm.to || '-'}` : `De: ${comm.from || '-'}`}
                                                    </Typography>
                                                    <Typography sx={{ color: '#94A3B8', fontSize: 11, mt: 0.15 }}>
                                                      {formatDateTime(getCommunicationDate(comm))}
                                                    </Typography>
                                                    {comm.snippet && (
                                                      <Typography sx={{ color: '#CBD5E1', fontSize: 11.5, mt: 0.65, lineHeight: 1.45 }}>
                                                        {comm.snippet}
                                                      </Typography>
                                                    )}
                                                    <Stack direction="row" spacing={0.75} sx={{ mt: 0.8, flexWrap: 'wrap' }}>
                                                      {comm.status && (
                                                        <Chip
                                                          size="small"
                                                          label={comm.status}
                                                          sx={{ height: 22, fontSize: 10, color: '#E2E8F0', bgcolor: 'rgba(148,163,184,0.18)' }}
                                                        />
                                                      )}
                                                      {comm.hasAttachments && (
                                                        <Chip
                                                          size="small"
                                                          label="Anexos"
                                                          sx={{ height: 22, fontSize: 10, color: '#F8FAFC', bgcolor: 'rgba(184,148,46,0.28)' }}
                                                        />
                                                      )}
                                                    </Stack>
                                                  </Box>
                                                ))}
                                              </Stack>
                                            )}
                                          </Box>
                                        </Grid>
                                      ))}
                                    </Grid>
                                  )}
                                </>
                              )}
                            </Stack>
                          )}
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}

            {!items.length && (
              <Grid item xs={12}>
                <Card sx={{ borderRadius: 2, border: '1px dashed #D1D5DB' }}>
                  <CardContent>
                    <Typography sx={{ color: '#6B7280' }}>
                      Nenhum caso cadastrado ainda. Clique em Nova cidade para iniciar.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        )}

        <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
          <Typography sx={{ color: '#9CA3AF', fontSize: 12 }}>
            Página {page} de {totalPages}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            disabled={page <= 1 || loading}
            onClick={() => loadCases(page - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outlined"
            size="small"
            disabled={page >= totalPages || loading}
            onClick={() => loadCases(page + 1)}
          >
            Próxima
          </Button>
        </Stack>
      </Stack>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="md">
        <DialogTitle>{editingId ? 'Editar cidade' : 'Nova cidade'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Cidade"
                value={form.city}
                onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Estado"
                inputProps={{ maxLength: 2 }}
                value={form.state}
                onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value.toUpperCase() }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="reg-city-status">Status</InputLabel>
                <Select
                  labelId="reg-city-status"
                  label="Status"
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <MenuItem key={status} value={status}>{STATUS_LABELS[status]}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome do setor"
                value={form.department_name}
                onChange={(event) => setForm((prev) => ({ ...prev, department_name: event.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome do contato"
                value={form.contact_name}
                onChange={(event) => setForm((prev) => ({ ...prev, contact_name: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="E-mail de contato"
                type="email"
                value={form.contact_email}
                onChange={(event) => setForm((prev) => ({ ...prev, contact_email: event.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Telefone"
                value={form.contact_phone}
                onChange={(event) => setForm((prev) => ({ ...prev, contact_phone: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Último envio"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={form.last_sent_at}
                onChange={(event) => setForm((prev) => ({ ...prev, last_sent_at: event.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Última resposta"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={form.last_response_at}
                onChange={(event) => setForm((prev) => ({ ...prev, last_response_at: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Data de próximo acompanhamento"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={form.next_follow_up_at}
                onChange={(event) => setForm((prev) => ({ ...prev, next_follow_up_at: event.target.value }))}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Próxima ação"
                value={form.next_action}
                onChange={(event) => setForm((prev) => ({ ...prev, next_action: event.target.value }))}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={4}
                label="Observações"
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>Cancelar</Button>
          <Button onClick={submitForm} variant="contained" disabled={saving} sx={{ bgcolor: '#B8942E', '&:hover': { bgcolor: '#9A7B24' } }}>
            {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar cidade'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
