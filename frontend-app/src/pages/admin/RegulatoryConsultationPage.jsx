import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Download, ContentCopy, Send, Refresh } from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const GOLD = '#B8942E';

const initialForm = {
  organizationName: '',
  municipalityName: '',
  destinationPhone: '',
  recipientName: '',
  cnpj: '',
  legalRepresentative: '',
  documentVersion: 'v1.0',
  observation: '',
};

function statusChip(status) {
  if (!status) return <Chip size="small" label="-" />;
  const map = {
    queued: { label: 'Na fila', color: '#64748B' },
    sent: { label: 'Enviado', color: '#0F766E' },
    delivered: { label: 'Entregue', color: '#15803D' },
    read: { label: 'Lido', color: '#0369A1' },
    failed: { label: 'Falhou', color: '#B91C1C' },
    undelivered: { label: 'Nao entregue', color: '#B45309' },
  };
  const cfg = map[status] || { label: status, color: '#6B7280' };
  return (
    <Chip
      size="small"
      label={cfg.label}
      sx={{
        bgcolor: `${cfg.color}15`,
        color: cfg.color,
        border: `1px solid ${cfg.color}30`,
        fontWeight: 600,
      }}
    />
  );
}

export default function RegulatoryConsultationPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(null);
  const [preview, setPreview] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const token = localStorage.getItem('kaviar_admin_token');

  const headers = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/regulatory-consultation/config`, { headers });
      const json = await res.json();
      if (json.success) setConfig(json.data);
    } catch {
      setFeedback({ type: 'error', message: 'Erro ao carregar configuracao do modulo.' });
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/regulatory-consultation/logs?limit=20`, { headers });
      const json = await res.json();
      if (json.success) setLogs(json.data || []);
    } catch {
      setFeedback({ type: 'error', message: 'Erro ao carregar logs.' });
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchLogs();
  }, []);

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const generatePreview = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/regulatory-consultation/preview`, {
        method: 'POST',
        headers,
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) {
        setFeedback({ type: 'error', message: json.error || 'Falha ao gerar previa.' });
      } else {
        setPreview(json.data);
        setFeedback({ type: 'success', message: 'Previa gerada com sucesso.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erro de conexao ao gerar previa.' });
    } finally {
      setLoading(false);
    }
  };

  const copyPreview = async () => {
    if (!preview?.text) return;
    try {
      await navigator.clipboard.writeText(preview.text);
      setFeedback({ type: 'success', message: 'Texto copiado para a area de transferencia.' });
    } catch {
      setFeedback({ type: 'error', message: 'Nao foi possivel copiar o texto.' });
    }
  };

  const downloadPdf = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const payload = {
        ...form,
        protocolCode: preview?.protocolCode || undefined,
      };
      const res = await fetch(`${API_BASE_URL}/api/admin/regulatory-consultation/pdf`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json();
        setFeedback({ type: 'error', message: json.error || 'Falha ao gerar PDF.' });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeCode = (preview?.protocolCode || 'consulta-regulatoria').replace(/[^A-Za-z0-9-]/g, '');
      a.href = url;
      a.download = `consulta-regulatoria-${safeCode}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setFeedback({ type: 'success', message: 'PDF baixado com sucesso.' });
    } catch {
      setFeedback({ type: 'error', message: 'Erro ao baixar PDF.' });
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsApp = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const payload = {
        ...form,
        protocolCode: preview?.protocolCode || undefined,
      };
      const res = await fetch(`${API_BASE_URL}/api/admin/regulatory-consultation/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setFeedback({ type: 'error', message: json.error || 'Falha ao enviar WhatsApp.' });
      } else {
        setPreview((prev) => ({ ...prev, protocolCode: json.data?.protocolCode || prev?.protocolCode }));
        setFeedback({ type: 'success', message: 'Consulta enviada ao WhatsApp com registro de auditoria.' });
        fetchLogs();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erro de conexao ao enviar WhatsApp.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 1320, mx: 'auto' }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ color: GOLD, fontWeight: 800 }}>
          Consulta Regulatoria Municipal - KAVIAR
        </Typography>
        <Typography sx={{ color: '#6B7280', fontSize: 13 }}>
          Modulo autenticado para gerar documento institucional, baixar PDF, copiar texto e enviar via template WhatsApp aprovado no Twilio.
        </Typography>
      </Box>

      {!config?.template?.ready && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {config?.template?.error || 'Template Twilio ainda nao configurado para este modulo.'}
        </Alert>
      )}

      {feedback.message && (
        <Alert severity={feedback.type || 'info'} sx={{ mb: 2 }} onClose={() => setFeedback({ type: '', message: '' })}>
          {feedback.message}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Card sx={{ border: '1px solid #E8E5DE' }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Dados da Consulta</Typography>
              <Stack spacing={1.2}>
                <TextField label="Organizacao" size="small" value={form.organizationName} onChange={(e) => updateField('organizationName', e.target.value)} required />
                <TextField label="Municipio" size="small" value={form.municipalityName} onChange={(e) => updateField('municipalityName', e.target.value)} required />
                <TextField label="Telefone destino (WhatsApp)" size="small" value={form.destinationPhone} onChange={(e) => updateField('destinationPhone', e.target.value)} placeholder="(21) 99999-9999" required />
                <TextField label="Destinatario / Setor" size="small" value={form.recipientName} onChange={(e) => updateField('recipientName', e.target.value)} />
                <TextField label="CNPJ informado" size="small" value={form.cnpj} onChange={(e) => updateField('cnpj', e.target.value)} />
                <TextField label="Representante legal" size="small" value={form.legalRepresentative} onChange={(e) => updateField('legalRepresentative', e.target.value)} />
                <TextField label="Versao do documento" size="small" value={form.documentVersion} onChange={(e) => updateField('documentVersion', e.target.value)} />
                <TextField
                  label="Observacao operacional"
                  size="small"
                  value={form.observation}
                  onChange={(e) => updateField('observation', e.target.value)}
                  multiline
                  minRows={3}
                />
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
                <Button variant="contained" onClick={generatePreview} disabled={loading} sx={{ bgcolor: GOLD, '&:hover': { bgcolor: '#9C7C25' } }}>
                  Gerar previa
                </Button>
                <Button variant="outlined" startIcon={<ContentCopy />} onClick={copyPreview} disabled={!preview?.text || loading}>
                  Copiar texto
                </Button>
                <Button variant="outlined" startIcon={<Download />} onClick={downloadPdf} disabled={loading}>
                  Baixar PDF
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <Send />}
                  onClick={sendWhatsApp}
                  disabled={loading || !config?.template?.ready}
                >
                  Enviar WhatsApp
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ border: '1px solid #E8E5DE', height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.2 }}>
                <Typography sx={{ fontWeight: 700 }}>Previa do Documento</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip size="small" label={`Versao: ${preview?.documentVersion || form.documentVersion || 'v1.0'}`} />
                  <Chip size="small" label={`Protocolo: ${preview?.protocolCode || '-'}`} />
                </Box>
              </Box>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#FAFAFA', minHeight: 360, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.55 }}>
                {preview?.text || 'Clique em "Gerar previa" para montar o texto institucional da consulta regulatoria.'}
              </Paper>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 2.2, border: '1px solid #E8E5DE' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography sx={{ fontWeight: 700 }}>Historico de Envios</Typography>
            <Button size="small" startIcon={<Refresh />} onClick={fetchLogs} disabled={logsLoading}>
              Atualizar
            </Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Organizacao</TableCell>
                <TableCell>Destino</TableCell>
                <TableCell>Protocolo</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Twilio SID</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logsLoading && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                      <CircularProgress size={20} sx={{ color: GOLD }} />
                    </Box>
                  </TableCell>
                </TableRow>
              )}
              {!logsLoading && logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ color: '#9CA3AF' }}>
                    Nenhum envio registrado ate o momento.
                  </TableCell>
                </TableRow>
              )}
              {!logsLoading && logs.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.createdAt ? new Date(row.createdAt).toLocaleString('pt-BR') : '-'}</TableCell>
                  <TableCell>{row.organizationName || '-'}</TableCell>
                  <TableCell>{row.destinationPhone || '-'}</TableCell>
                  <TableCell>{row.protocolCode || '-'}</TableCell>
                  <TableCell>{statusChip(row.twilioStatus)}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{row.twilioMessageSid || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}
