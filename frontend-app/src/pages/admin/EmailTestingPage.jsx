import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
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
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import api from '../../api';

const TEST_SENDER_OPTIONS = [
  { label: 'KAVIAR <contato@kaviar.com.br>', value: 'KAVIAR <contato@kaviar.com.br>' },
  { label: 'KAVIAR Suporte <suporte@kaviar.com.br>', value: 'KAVIAR Suporte <suporte@kaviar.com.br>' },
  { label: 'KAVIAR Financeiro <financeiro@kaviar.com.br>', value: 'KAVIAR Financeiro <financeiro@kaviar.com.br>' },
  { label: 'KAVIAR Notificações <no-reply@kaviar.com.br>', value: 'KAVIAR Notificações <no-reply@kaviar.com.br>' },
];

const OFFICIAL_SENDER_OPTIONS = [
  { label: 'KAVIAR <contato@kaviar.com.br>', value: 'KAVIAR <contato@kaviar.com.br>' },
  { label: 'KAVIAR Suporte <suporte@kaviar.com.br>', value: 'KAVIAR Suporte <suporte@kaviar.com.br>' },
  { label: 'KAVIAR Financeiro <financeiro@kaviar.com.br>', value: 'KAVIAR Financeiro <financeiro@kaviar.com.br>' },
];

const TEMPLATE_OPTIONS = [
  {
    value: 'test',
    label: 'test',
    payload: { template: 'test' },
    description: 'Template padrao de validacao do backend.',
  },
  {
    value: 'suporte',
    label: 'suporte',
    payload: {
      template: 'operational',
      title: 'Suporte KAVIAR',
      message: 'Mensagem operacional de teste enviada pelo alias de suporte da KAVIAR.',
    },
    description: 'Usa template operational com texto padrao de suporte.',
  },
  {
    value: 'financeiro',
    label: 'financeiro',
    payload: {
      template: 'operational',
      title: 'Financeiro KAVIAR',
      message: 'Mensagem operacional de teste enviada pelo alias financeiro da KAVIAR.',
    },
    description: 'Usa template operational com texto padrao de financeiro.',
  },
  {
    value: 'notificacao',
    label: 'notificacao',
    payload: {
      template: 'operational',
      title: 'Notificacao KAVIAR',
      message: 'Mensagem operacional de teste enviada pelo alias no-reply da KAVIAR.',
    },
    description: 'Usa template operational com texto padrao de notificacao.',
  },
];

function buildFriendlyError(error) {
  const status = error?.response?.status;
  const apiMessage = error?.response?.data?.error;

  if (status === 401) {
    return 'Sessao expirada. Faca login novamente para continuar.';
  }

  if (status === 403) {
    if (apiMessage?.toLowerCase().includes('destinatario')) {
      return 'Destinatario nao permitido para teste. Use um email da allowlist configurada no backend.';
    }
    return 'Voce nao tem permissao para acessar esta funcionalidade.';
  }

  if (status === 400) {
    return apiMessage || 'Os dados enviados sao invalidos. Revise remetente, destinatario e template.';
  }

  if (status === 502) {
    return apiMessage || 'O backend nao conseguiu enviar o email no provider configurado.';
  }

  return apiMessage || 'Nao foi possivel enviar o email de teste agora. Tente novamente.';
}

export default function EmailTestingPage() {
  const [mode, setMode] = useState('test');

  const [from, setFrom] = useState(TEST_SENDER_OPTIONS[0].value);
  const [to, setTo] = useState('');
  const [templateKey, setTemplateKey] = useState(TEMPLATE_OPTIONS[0].value);

  const [officialFrom, setOfficialFrom] = useState(OFFICIAL_SENDER_OPTIONS[0].value);
  const [officialTo, setOfficialTo] = useState('');
  const [officialSubject, setOfficialSubject] = useState('');
  const [officialMessage, setOfficialMessage] = useState('');

  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedTemplate = useMemo(
    () => TEMPLATE_OPTIONS.find((option) => option.value === templateKey) || TEMPLATE_OPTIONS[0],
    [templateKey]
  );

  const handleSendTest = async (event) => {
    event.preventDefault();
    setSending(true);
    setErrorMessage('');
    setResult(null);

    try {
      const payload = {
        to: to.trim(),
        from,
        ...selectedTemplate.payload,
      };

      const response = await api.post('/api/admin/email/test', payload);
      setResult(response.data?.data || null);
    } catch (error) {
      setErrorMessage(buildFriendlyError(error));
      setResult(error?.response?.data?.data ? { ...error.response.data.data, failed: true } : null);
    } finally {
      setSending(false);
    }
  };

  const handleOfficialSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setResult(null);

    if (!officialTo.trim() || !officialSubject.trim() || !officialMessage.trim()) {
      setErrorMessage('Preencha destinatario, assunto e mensagem para envio real.');
      return;
    }

    setConfirmOpen(true);
  };

  const confirmOfficialSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    setErrorMessage('');
    setResult(null);

    try {
      const payload = {
        to: officialTo.trim(),
        from: officialFrom,
        subject: officialSubject.trim(),
        message: officialMessage.trim(),
      };

      const response = await api.post('/api/admin/email/send', payload);
      setResult(response.data?.data || null);
    } catch (error) {
      setErrorMessage(buildFriendlyError(error));
      setResult(error?.response?.data?.data ? { ...error.response.data.data, failed: true } : null);
    } finally {
      setSending(false);
    }
  };

  const resetFeedback = () => {
    setErrorMessage('');
    setResult(null);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={3} maxWidth={860}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A1A', mb: 1 }}>
            E-mails KAVIAR
          </Typography>
          <Typography sx={{ color: '#6B7280', maxWidth: 720 }}>
            Esta tela chama somente o backend KAVIAR. Nenhum token Cloudflare vai para o navegador.
          </Typography>
        </Box>

        <Tabs
          value={mode}
          onChange={(_, value) => {
            setMode(value);
            resetFeedback();
          }}
          sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 700 } }}
        >
          <Tab value="test" label="Teste interno" />
          <Tab value="official" label="Envio real" />
        </Tabs>

        <Card sx={{ borderRadius: 3, border: '1px solid #E8E5DE', boxShadow: '0 4px 18px rgba(0,0,0,0.04)' }}>
          <CardContent>
            {mode === 'test' ? (
              <Box component="form" onSubmit={handleSendTest}>
                <Stack spacing={2.5}>
                  <Alert severity="info">
                    Modo interno usa <strong>/api/admin/email/test</strong> com validacao por allowlist EMAIL_TEST_ALLOWED_TO.
                  </Alert>

                  <FormControl fullWidth>
                    <InputLabel id="email-from-label">Remetente</InputLabel>
                    <Select
                      labelId="email-from-label"
                      label="Remetente"
                      value={from}
                      onChange={(event) => setFrom(event.target.value)}
                    >
                      {TEST_SENDER_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    label="Destinatario"
                    type="email"
                    placeholder="contato@kaviar.com.br"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    required
                  />

                  <FormControl fullWidth>
                    <InputLabel id="email-template-label">Template</InputLabel>
                    <Select
                      labelId="email-template-label"
                      label="Template"
                      value={templateKey}
                      onChange={(event) => setTemplateKey(event.target.value)}
                    >
                      {TEMPLATE_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#FAFAF8', border: '1px solid #EEE8D9' }}>
                    <Typography sx={{ fontWeight: 700, color: '#1A1A1A', mb: 0.5 }}>Resumo do envio interno</Typography>
                    <Typography variant="body2" sx={{ color: '#6B7280' }}>
                      Template backend: {selectedTemplate.payload.template}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6B7280' }}>
                      {selectedTemplate.description}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <Button type="submit" variant="contained" disabled={sending || !to.trim()} sx={{ minWidth: 180, textTransform: 'none', fontWeight: 700 }}>
                      {sending ? <CircularProgress size={22} color="inherit" /> : 'Enviar teste'}
                    </Button>
                  </Box>
                </Stack>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleOfficialSubmit}>
                <Stack spacing={2.5}>
                  <Alert severity="warning">
                    Este envio sera entregue a destinatario externo em nome da KAVIAR.
                  </Alert>

                  <FormControl fullWidth>
                    <InputLabel id="official-from-label">Remetente oficial</InputLabel>
                    <Select
                      labelId="official-from-label"
                      label="Remetente oficial"
                      value={officialFrom}
                      onChange={(event) => setOfficialFrom(event.target.value)}
                    >
                      {OFFICIAL_SENDER_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    label="Destinatario externo"
                    type="email"
                    placeholder="contato@prefeitura.gov.br"
                    value={officialTo}
                    onChange={(event) => setOfficialTo(event.target.value)}
                    required
                  />

                  <TextField
                    fullWidth
                    label="Assunto"
                    value={officialSubject}
                    onChange={(event) => setOfficialSubject(event.target.value)}
                    required
                  />

                  <TextField
                    fullWidth
                    multiline
                    minRows={6}
                    label="Mensagem"
                    value={officialMessage}
                    onChange={(event) => setOfficialMessage(event.target.value)}
                    required
                  />

                  <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="warning"
                      disabled={sending || !officialTo.trim() || !officialSubject.trim() || !officialMessage.trim()}
                      sx={{ minWidth: 180, textTransform: 'none', fontWeight: 700 }}
                    >
                      {sending ? <CircularProgress size={22} color="inherit" /> : 'Enviar email real'}
                    </Button>
                  </Box>
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>

        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        {result && (
          <Card sx={{ borderRadius: 3, border: '1px solid #E8E5DE', boxShadow: '0 4px 18px rgba(0,0,0,0.04)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Resultado do envio
              </Typography>

              <Stack spacing={1}>
                <Typography><strong>Status:</strong> {result.failed ? 'falha' : 'sucesso'}</Typography>
                <Typography><strong>Provider usado:</strong> {result.provider || 'nao informado'}</Typography>
                <Typography><strong>Provider padrao:</strong> {result.providerDefault || 'nao informado'}</Typography>
                <Typography><strong>From usado:</strong> {result.from || (mode === 'test' ? from : officialFrom)}</Typography>
                <Typography><strong>Destinatario:</strong> {result.to || (mode === 'test' ? to.trim() : officialTo.trim())}</Typography>
                {result.template && <Typography><strong>Template:</strong> {result.template}</Typography>}
                {result.subject && <Typography><strong>Assunto:</strong> {result.subject}</Typography>}
                {result.messageId && <Typography><strong>Message ID:</strong> {result.messageId}</Typography>}
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar envio real</DialogTitle>
        <DialogContent>
          <Stack spacing={1.2} sx={{ mt: 0.5 }}>
            <Typography><strong>Remetente:</strong> {officialFrom}</Typography>
            <Typography><strong>Destinatario:</strong> {officialTo.trim()}</Typography>
            <Typography><strong>Assunto:</strong> {officialSubject.trim()}</Typography>
            <Alert severity="warning" sx={{ mt: 1 }}>
              Este envio sera entregue a destinatario externo em nome da KAVIAR.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="inherit">Cancelar</Button>
          <Button onClick={confirmOfficialSend} variant="contained" color="warning">Confirmar envio</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}