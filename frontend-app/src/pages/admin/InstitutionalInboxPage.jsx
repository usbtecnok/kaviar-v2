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
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import api from '../../api';

const PAGE_SIZE = 15;
const STATUS_OPTIONS = ['ALL', 'NEW', 'READ', 'ARCHIVED'];

function buildFriendlyError(error, fallback) {
  const status = error?.response?.status;
  const apiMessage = error?.response?.data?.error;

  if (status === 401) return 'Sessao expirada. Faca login novamente.';
  if (status === 403) return 'Voce nao tem permissao para acessar a caixa institucional.';
  if (status === 404) return apiMessage || 'Registro nao encontrado.';
  if (status === 503) return apiMessage || 'Inbox temporariamente indisponivel (migration pendente).';

  return apiMessage || fallback;
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
}

function formatSubject(subject) {
  if (typeof subject !== 'string') return '(sem assunto)';
  const trimmed = subject.trim();
  return trimmed || '(sem assunto)';
}

function StatusChip({ status }) {
  const map = {
    NEW: { label: 'Novo', color: '#1D4ED8', bg: '#DBEAFE' },
    READ: { label: 'Lido', color: '#166534', bg: '#DCFCE7' },
    ARCHIVED: { label: 'Arquivado', color: '#6B7280', bg: '#F3F4F6' },
  };
  const cfg = map[status] || { label: status || 'N/A', color: '#374151', bg: '#E5E7EB' };

  return (
    <Chip
      size="small"
      label={cfg.label}
      sx={{
        fontWeight: 700,
        color: cfg.color,
        backgroundColor: cfg.bg,
        borderRadius: '8px',
      }}
    />
  );
}

function BodyBlock({ label, value }) {
  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#374151', mb: 0.5 }}>{label}</Typography>
      <Box
        sx={{
          p: 1.2,
          borderRadius: 1.5,
          border: '1px solid #E5E7EB',
          backgroundColor: '#FAFAFA',
          maxHeight: 260,
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 12,
          color: '#111827',
        }}
      >
        {value || '-'}
      </Box>
    </Box>
  );
}

export default function InstitutionalInboxPage() {
  const [filters, setFilters] = useState({
    status: 'ALL',
    to: '',
    from: '',
    q: '',
    dateFrom: '',
    dateTo: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  const [statusSaving, setStatusSaving] = useState(false);

  const listParams = useMemo(() => {
    const params = {
      page,
      limit: PAGE_SIZE,
    };

    if (filters.status !== 'ALL') params.status = filters.status;
    if (filters.to.trim()) params.to = filters.to.trim();
    if (filters.from.trim()) params.from = filters.from.trim();
    if (filters.q.trim()) params.q = filters.q.trim();
    if (filters.dateFrom) params.date_from = filters.dateFrom;
    if (filters.dateTo) params.date_to = filters.dateTo;

    return params;
  }, [filters, page]);

  const loadList = async (targetPage = 1, append = false) => {
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await api.get('/api/admin/inbound-emails', {
        params: {
          ...listParams,
          page: targetPage,
        },
      });

      const incoming = Array.isArray(response.data?.data) ? response.data.data : [];
      const totalPages = Number(response.data?.pagination?.totalPages || 0);
      const currentPage = Number(response.data?.pagination?.page || targetPage);

      setItems((prev) => (append ? [...prev, ...incoming] : incoming));
      setPage(currentPage);
      setHasMore(totalPages > 0 ? currentPage < totalPages : incoming.length >= PAGE_SIZE);
      setWarningMessage(response.data?.warning || '');
    } catch (error) {
      setErrorMessage(buildFriendlyError(error, 'Nao foi possivel carregar os emails recebidos.'));
      if (!append) setItems([]);
      setHasMore(false);
      setWarningMessage('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList(1, false);
  }, [filters]);

  const openDetails = async (id) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError('');
    setSelectedEmail(null);

    try {
      const response = await api.get(`/api/admin/inbound-emails/${id}`);
      setSelectedEmail(response.data?.data || null);
    } catch (error) {
      setDetailsError(buildFriendlyError(error, 'Nao foi possivel carregar os detalhes do email.'));
    } finally {
      setDetailsLoading(false);
    }
  };

  const applyStatus = async (status) => {
    if (!selectedEmail?.id) return;

    setStatusSaving(true);
    setDetailsError('');

    try {
      const response = await api.patch(`/api/admin/inbound-emails/${selectedEmail.id}`, { status });
      const updated = response.data?.data;
      if (updated) {
        setSelectedEmail(updated);
        setItems((prev) => prev.map((item) => (item.id === updated.id ? { ...item, status: updated.status, updated_at: updated.updated_at } : item)));
      }
    } catch (error) {
      setDetailsError(buildFriendlyError(error, 'Nao foi possivel atualizar o status.'));
    } finally {
      setStatusSaving(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      status: 'ALL',
      to: '',
      from: '',
      q: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5} maxWidth={1100}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', mb: 0.5 }}>
            Caixa de Entrada Institucional
          </Typography>
          <Typography sx={{ color: '#6B7280' }}>
            Visualizacao somente leitura de respostas recebidas pelos aliases oficiais da KAVIAR.
          </Typography>
        </Box>

        <Card sx={{ borderRadius: 3, border: '1px solid #E8E5DE', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="inbox-status-label">Status</InputLabel>
                <Select
                  labelId="inbox-status-label"
                  label="Status"
                  value={filters.status}
                  onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                size="small"
                label="Para"
                placeholder="suporte@kaviar.com.br"
                value={filters.to}
                onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
              />

              <TextField
                size="small"
                label="De"
                placeholder="cliente@email.com"
                value={filters.from}
                onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
              />

              <TextField
                size="small"
                label="Busca"
                placeholder="assunto ou remetente"
                value={filters.q}
                onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
              />

              <TextField
                size="small"
                label="Data inicial"
                type="date"
                value={filters.dateFrom}
                onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                size="small"
                label="Data final"
                type="date"
                value={filters.dateTo}
                onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />

              <Button variant="outlined" onClick={clearFilters}>
                Limpar
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {warningMessage && <Alert severity="warning">{warningMessage}</Alert>}
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        <Card sx={{ borderRadius: 3, border: '1px solid #E8E5DE', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <CardContent>
            <Stack spacing={1.2}>
              {loading && items.length === 0 ? (
                <Box sx={{ py: 5, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
              ) : null}

              {!loading && items.length === 0 ? (
                <Alert severity="info">Nenhum email encontrado com os filtros atuais.</Alert>
              ) : null}

              {items.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    border: '1px solid #E5E7EB',
                    borderRadius: 2,
                    p: 1.4,
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontWeight: 700, color: '#111827' }}>{formatSubject(item.subject)}</Typography>
                      <Typography sx={{ color: '#6B7280', fontSize: 13 }}>
                        De: {item.from_name ? `${item.from_name} <${item.from_email}>` : item.from_email}
                      </Typography>
                      <Typography sx={{ color: '#6B7280', fontSize: 13 }}>
                        Para: {item.to_email}
                      </Typography>
                      <Typography sx={{ color: '#6B7280', fontSize: 12 }}>
                        Recebido em: {formatDateTime(item.received_at)}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                      <StatusChip status={item.status} />
                      <Chip size="small" label={item.has_attachments ? `Anexos: ${item.attachment_count || 0}` : 'Sem anexos'} />
                      <Button variant="outlined" size="small" onClick={() => openDetails(item.id)}>
                        Ver detalhes
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              ))}

              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
                <Button
                  variant="contained"
                  onClick={() => loadList(page + 1, true)}
                  disabled={loading || !hasMore}
                >
                  {loading && items.length > 0 ? 'Carregando...' : hasMore ? 'Carregar mais' : 'Fim da lista'}
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Detalhes do email recebido</DialogTitle>
        <DialogContent dividers>
          {detailsLoading ? (
            <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
          ) : null}

          {detailsError && <Alert severity="error" sx={{ mb: 1 }}>{detailsError}</Alert>}

          {selectedEmail && !detailsLoading ? (
            <Stack spacing={1}>
              <Typography><strong>Remetente:</strong> {selectedEmail.from_name ? `${selectedEmail.from_name} <${selectedEmail.from_email}>` : selectedEmail.from_email}</Typography>
              <Typography><strong>Destinatario:</strong> {selectedEmail.to_email}</Typography>
              <Typography><strong>Assunto:</strong> {formatSubject(selectedEmail.subject)}</Typography>
              <Typography><strong>Recebido em:</strong> {formatDateTime(selectedEmail.received_at)}</Typography>
              <Typography><strong>Status:</strong> {selectedEmail.status}</Typography>
              <Typography><strong>Message ID:</strong> {selectedEmail.message_id || '-'}</Typography>
              <Typography><strong>In-Reply-To:</strong> {selectedEmail.in_reply_to || '-'}</Typography>
              <Typography><strong>References:</strong> {selectedEmail.references_header || '-'}</Typography>
              <Typography><strong>Provedor:</strong> {selectedEmail.provider || '-'}</Typography>

              <BodyBlock label="Corpo (texto)" value={selectedEmail.text_body} />
              <BodyBlock label="Corpo normalizado" value={selectedEmail.normalized_body} />
              <BodyBlock label="Corpo HTML (exibido como texto por seguranca)" value={selectedEmail.html_body} />

              <Box sx={{ mt: 1.5 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#374151', mb: 0.5 }}>
                  Anexos (metadados)
                </Typography>
                <Box
                  sx={{
                    p: 1.2,
                    borderRadius: 1.5,
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#FAFAFA',
                    fontSize: 12,
                    color: '#111827',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {JSON.stringify(selectedEmail.attachments_metadata || [], null, 2)}
                </Box>
              </Box>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 2 }}>
          <Stack direction="row" spacing={1}>
            <Button onClick={() => applyStatus('NEW')} disabled={statusSaving || !selectedEmail}>Voltar para novo</Button>
            <Button onClick={() => applyStatus('READ')} disabled={statusSaving || !selectedEmail}>Marcar como lido</Button>
            <Button onClick={() => applyStatus('ARCHIVED')} disabled={statusSaving || !selectedEmail}>Arquivar</Button>
          </Stack>
          <Button onClick={() => setDetailsOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
