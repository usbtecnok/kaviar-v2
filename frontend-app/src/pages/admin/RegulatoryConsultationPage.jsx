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
const OFFICIAL_LOGO_SRC = '/kaviar-logo-oficial.png';

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
    undelivered: { label: 'Não entregue', color: '#B45309' },
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

function formatCnpj(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 14);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function isBrazilWhatsapp(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return false;
  if (digits.length === 10 || digits.length === 11) return true;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) return true;
  return false;
}

export default function RegulatoryConsultationPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(null);
  const [preview, setPreview] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [logoError, setLogoError] = useState(false);

  const token = localStorage.getItem('kaviar_admin_token');
  const phoneValid = isBrazilWhatsapp(form.destinationPhone);

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
      setFeedback({ type: 'error', message: 'Erro ao carregar configuração do módulo.' });
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
        setFeedback({ type: 'error', message: json.error || 'Falha ao gerar prévia.' });
      } else {
        setPreview(json.data);
        setFeedback({ type: 'success', message: 'Prévia gerada com sucesso.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erro de conexão ao gerar prévia.' });
    } finally {
      setLoading(false);
    }
  };

  const copyPreview = async () => {
    if (!preview?.text) return;
    try {
      await navigator.clipboard.writeText(preview.text);
      setFeedback({ type: 'success', message: 'Texto copiado para a área de transferência.' });
    } catch {
      setFeedback({ type: 'error', message: 'Não foi possível copiar o texto.' });
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
    if (!phoneValid) {
      setFeedback({ type: 'error', message: 'Informe um WhatsApp válido com DDD. Ex.: +55 21 96864-8777.' });
      return;
    }
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
      setFeedback({ type: 'error', message: 'Erro de conexão ao enviar WhatsApp.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 1320, mx: 'auto' }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ color: GOLD, fontWeight: 800 }}>
          Consulta Regulatória Municipal — KAVIAR
        </Typography>
        <Typography sx={{ color: '#6B7280', fontSize: 13 }}>
          Módulo autenticado para gerar documento institucional, baixar PDF, copiar texto e enviar via template WhatsApp aprovado no Twilio.
        </Typography>
      </Box>

      {!config?.template?.ready && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {config?.template?.error || 'Template Twilio ainda não configurado para este módulo.'}
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
                <TextField label="Organização" size="small" value={form.organizationName} onChange={(e) => updateField('organizationName', e.target.value)} required />
                <TextField label="Município" size="small" value={form.municipalityName} onChange={(e) => updateField('municipalityName', e.target.value)} required />
                <TextField
                  label="Telefone destino (WhatsApp)"
                  size="small"
                  value={form.destinationPhone}
                  onChange={(e) => updateField('destinationPhone', e.target.value)}
                  placeholder="+55 21 96864-8777"
                  helperText={form.destinationPhone ? (phoneValid ? 'Formato válido para envio via WhatsApp.' : 'Use DDD com 10 ou 11 dígitos. Ex.: +55 21 96864-8777.') : 'Informe o número com DDD; pode incluir +55.'}
                  error={Boolean(form.destinationPhone) && !phoneValid}
                  inputProps={{ inputMode: 'tel' }}
                  required
                />
                <TextField label="Destinatário / Setor" size="small" value={form.recipientName} onChange={(e) => updateField('recipientName', e.target.value)} />
                <TextField label="CNPJ informado" size="small" value={form.cnpj} onChange={(e) => updateField('cnpj', formatCnpj(e.target.value))} placeholder="00.000.000/0000-00" />
                <TextField label="Representante legal" size="small" value={form.legalRepresentative} onChange={(e) => updateField('legalRepresentative', e.target.value)} />
                <TextField label="Versão do documento" size="small" value={form.documentVersion} onChange={(e) => updateField('documentVersion', e.target.value)} />
                <TextField
                  label="Observação operacional"
                  size="small"
                  value={form.observation}
                  onChange={(e) => updateField('observation', e.target.value)}
                  multiline
                  minRows={3}
                />
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
                <Button variant="contained" onClick={generatePreview} disabled={loading} sx={{ bgcolor: GOLD, '&:hover': { bgcolor: '#9C7C25' } }}>
                  Gerar prévia
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
                  disabled={loading || !config?.template?.ready || !phoneValid}
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
                <Typography sx={{ fontWeight: 700 }}>Prévia do Documento</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip size="small" label={`Versão: ${preview?.documentVersion || form.documentVersion || 'v1.0'}`} />
                  <Chip size="small" label={`Protocolo: ${preview?.protocolCode || '-'}`} />
                </Box>
              </Box>
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 1.5, md: 2.4 },
                  bgcolor: '#FCFBF8',
                  minHeight: 420,
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid #ECE5D5',
                }}
              >
                <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
                  <Typography sx={{ fontSize: { xs: 42, md: 72 }, fontWeight: 800, color: 'rgba(184,148,46,0.08)', letterSpacing: 6, transform: 'rotate(-24deg)', userSelect: 'none' }}>
                    KAVIAR
                  </Typography>
                </Box>

                <Box sx={{ position: 'relative', zIndex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.2 }}>
                    {!logoError ? (
                      <Box component="img" src={OFFICIAL_LOGO_SRC} alt="KAVIAR" onError={() => setLogoError(true)} sx={{ width: 54, height: 54, objectFit: 'contain' }} />
                    ) : (
                      <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>KAVIAR</Typography>
                    )}
                    <Box>
                      <Typography sx={{ fontWeight: 700, color: '#111827', fontSize: 13 }}>KAVIAR TECNOLOGIA E SERVICOS DIGITAIS LTDA</Typography>
                      <Typography sx={{ color: '#4B5563', fontSize: 12 }}>CNPJ: {preview?.company?.cnpj || '67.783.601/0001-99'}</Typography>
                      <Typography sx={{ color: '#4B5563', fontSize: 11.5 }}>contato@kaviar.com.br | +55 21 96864-8777</Typography>
                      <Typography sx={{ color: '#4B5563', fontSize: 11.5 }}>https://kaviar.com.br</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ borderTop: '1px solid #D1D5DB', pt: 1.2, mb: 1.3 }}>
                    <Typography sx={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>Consulta Regulatória Municipal — KAVIAR</Typography>
                    <Typography sx={{ color: '#374151', fontSize: 12 }}>Protocolo: {preview?.protocolCode || '-'}</Typography>
                    <Typography sx={{ color: '#374151', fontSize: 12 }}>Versão: {preview?.documentVersion || form.documentVersion || 'v1.0'}</Typography>
                  </Box>

                  <Box sx={{ color: '#1F2937', fontSize: 13, lineHeight: 1.65, fontFamily: 'Georgia, "Times New Roman", serif' }}>
                    {preview?.text
                      ? preview.text.split('\n').map((line, idx) => (
                        <Typography
                          key={`${line}-${idx}`}
                          sx={{
                            fontSize: 13,
                            lineHeight: 1.65,
                            fontFamily: 'Georgia, "Times New Roman", serif',
                            color: '#1F2937',
                            minHeight: line ? 'auto' : 12,
                            mb: line ? 0.15 : 0,
                          }}
                        >
                          {line || ' '}
                        </Typography>
                      ))
                      : (
                        <Typography sx={{ fontSize: 13, color: '#6B7280' }}>
                          Clique em "Gerar prévia" para montar o documento institucional da consulta regulatória.
                        </Typography>
                      )}
                  </Box>

                  <Box sx={{ mt: 2, pt: 1.2, borderTop: '1px solid #E5E7EB' }}>
                    <Typography sx={{ fontSize: 12, color: '#6B7280', textAlign: 'center' }}>
                      Documento institucional informativo. Não substitui parecer jurídico ou ato administrativo competente.
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 2.2, border: '1px solid #E8E5DE' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography sx={{ fontWeight: 700 }}>Histórico de Envios</Typography>
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
                    Nenhum envio registrado até o momento.
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
