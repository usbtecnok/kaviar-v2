import { useRef, useState } from 'react';
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
  TextField,
  Typography,
} from '@mui/material';
import api from '../../api';

const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_ATTACHMENT_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

const OFFICIAL_SENDER_OPTIONS = [
  { label: 'KAVIAR <contato@kaviar.com.br>', value: 'KAVIAR <contato@kaviar.com.br>' },
  { label: 'KAVIAR Suporte <suporte@kaviar.com.br>', value: 'KAVIAR Suporte <suporte@kaviar.com.br>' },
  { label: 'KAVIAR Financeiro <financeiro@kaviar.com.br>', value: 'KAVIAR Financeiro <financeiro@kaviar.com.br>' },
];

function buildFriendlyError(error) {
  const status = error?.response?.status;
  const apiMessage = error?.response?.data?.error;

  if (status === 401) {
    return 'Sessao expirada. Faca login novamente para continuar.';
  }

  if (status === 403) {
    return 'Voce nao tem permissao para acessar esta funcionalidade.';
  }

  if (status === 400) {
    return apiMessage || 'Os dados enviados sao invalidos. Revise remetente, destinatario e template.';
  }

  if (status === 502) {
    return apiMessage || 'O backend nao conseguiu enviar o email no provider configurado.';
  }

  return apiMessage || 'Nao foi possivel enviar o email agora. Tente novamente.';
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isAllowedAttachment(file) {
  const mime = (file.type || '').toLowerCase();
  const lowerName = (file.name || '').toLowerCase();
  const ext = lowerName.includes('.') ? lowerName.slice(lowerName.lastIndexOf('.')) : '';
  const mimeAllowed = ALLOWED_ATTACHMENT_MIME_TYPES.includes(mime);
  const extAllowed = ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext);
  return mimeAllowed && extAllowed;
}

export default function EmailTestingPage() {
  const [officialFrom, setOfficialFrom] = useState(OFFICIAL_SENDER_OPTIONS[0].value);
  const [officialTo, setOfficialTo] = useState('');
  const [officialSubject, setOfficialSubject] = useState('');
  const [officialMessage, setOfficialMessage] = useState('');
  const [officialAttachments, setOfficialAttachments] = useState([]);

  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const officialAttachmentsInputRef = useRef(null);

  const handleOfficialSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setResult(null);

    if (!officialTo.trim() || !officialSubject.trim() || !officialMessage.trim()) {
      setErrorMessage('Preencha destinatario, assunto e mensagem para envio real.');
      return;
    }

    if (officialAttachments.length > MAX_ATTACHMENTS) {
      setErrorMessage('Voce pode enviar no maximo 3 anexos por email.');
      return;
    }

    for (const file of officialAttachments) {
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        setErrorMessage(`O arquivo ${file.name} excede 5 MB.`);
        return;
      }
      if (!isAllowedAttachment(file)) {
        setErrorMessage(`Tipo nao permitido para ${file.name}. Use apenas PDF, JPG, JPEG ou PNG.`);
        return;
      }
    }

    setConfirmOpen(true);
  };

  const confirmOfficialSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    setErrorMessage('');
    setResult(null);

    try {
      const hasAttachments = officialAttachments.length > 0;
      let response;

      if (hasAttachments) {
        const formData = new FormData();
        formData.append('to', officialTo.trim());
        formData.append('from', officialFrom);
        formData.append('subject', officialSubject.trim());
        formData.append('message', officialMessage.trim());
        officialAttachments.forEach((file) => {
          formData.append('attachments', file);
        });

        response = await api.post('/api/admin/email/send', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        const payload = {
          to: officialTo.trim(),
          from: officialFrom,
          subject: officialSubject.trim(),
          message: officialMessage.trim(),
        };
        response = await api.post('/api/admin/email/send', payload);
      }

      setResult(response.data?.data || null);

      // Evita reenvio acidental: limpa formulario real apos sucesso.
      setOfficialTo('');
      setOfficialSubject('');
      setOfficialMessage('');
      setOfficialAttachments([]);
      if (officialAttachmentsInputRef.current) {
        officialAttachmentsInputRef.current.value = '';
      }
      setConfirmOpen(false);
    } catch (error) {
      setErrorMessage(buildFriendlyError(error));
      setResult(error?.response?.data?.data ? { ...error.response.data.data, failed: true } : null);
    } finally {
      setSending(false);
    }
  };

  const handleAttachmentChange = (event) => {
    const incomingFiles = Array.from(event.target.files || []);
    if (!incomingFiles.length) return;

    const next = [...officialAttachments, ...incomingFiles];
    if (next.length > MAX_ATTACHMENTS) {
      setErrorMessage('Voce pode enviar no maximo 3 anexos por email.');
      event.target.value = '';
      return;
    }

    for (const file of incomingFiles) {
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        setErrorMessage(`O arquivo ${file.name} excede 5 MB.`);
        event.target.value = '';
        return;
      }
      if (!isAllowedAttachment(file)) {
        setErrorMessage(`Tipo nao permitido para ${file.name}. Use apenas PDF, JPG, JPEG ou PNG.`);
        event.target.value = '';
        return;
      }
    }

    setOfficialAttachments(next);
    setErrorMessage('');
    event.target.value = '';
  };

  const removeAttachment = (indexToRemove) => {
    setOfficialAttachments((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleNewSend = () => {
    setResult(null);
    setErrorMessage('');
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={3} maxWidth={860}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A1A', mb: 1 }}>
            E-mails KAVIAR
          </Typography>
          <Typography sx={{ color: '#6B7280', maxWidth: 720 }}>
            Envio real de comunicacoes oficiais para destinatarios externos.
          </Typography>
        </Box>

        <Card sx={{ borderRadius: 3, border: '1px solid #E8E5DE', boxShadow: '0 4px 18px rgba(0,0,0,0.04)' }}>
          <CardContent>
            <Box component="form" onSubmit={handleOfficialSubmit}>
              <Stack spacing={2.5}>
                <Alert severity="warning">
                  Este envio sera entregue a destinatario externo em nome da KAVIAR.
                </Alert>

                <Alert severity="info">
                  Os anexos serao enviados ao destinatario externo em nome da KAVIAR.
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

                <Stack spacing={1.2}>
                  <Typography sx={{ fontWeight: 700, color: '#1A1A1A' }}>Anexos</Typography>
                  <Typography variant="body2" sx={{ color: '#6B7280' }}>
                    Permitido: PDF, JPG, JPEG, PNG. Maximo de 3 arquivos, ate 5 MB cada.
                  </Typography>

                  <Box>
                    <input
                      id="official-attachments-input"
                      ref={officialAttachmentsInputRef}
                      type="file"
                      multiple
                      accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                      onChange={handleAttachmentChange}
                      style={{ display: 'none' }}
                    />
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={() => officialAttachmentsInputRef.current?.click()}
                      disabled={sending || officialAttachments.length >= MAX_ATTACHMENTS}
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Selecionar anexos
                    </Button>
                  </Box>

                  {officialAttachments.length > 0 && (
                    <Stack spacing={1}>
                      {officialAttachments.map((file, index) => (
                        <Box
                          key={`${file.name}-${file.size}-${index}`}
                          sx={{
                            p: 1.2,
                            borderRadius: 1.5,
                            border: '1px solid #E5E7EB',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1,
                          }}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{file.name}</Typography>
                            <Typography variant="caption" sx={{ color: '#6B7280' }}>
                              {(file.type || 'tipo nao informado')} • {formatFileSize(file.size)}
                            </Typography>
                          </Box>
                          <Button
                            type="button"
                            size="small"
                            color="error"
                            variant="text"
                            onClick={() => removeAttachment(index)}
                            sx={{ textTransform: 'none' }}
                          >
                            Remover
                          </Button>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Stack>

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
          </CardContent>
        </Card>

        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        {result && (
          <Card sx={{ borderRadius: 3, border: '1px solid #E8E5DE', boxShadow: '0 4px 18px rgba(0,0,0,0.04)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Resultado do envio
                </Typography>
                <Button type="button" variant="text" size="small" onClick={handleNewSend} sx={{ textTransform: 'none' }}>
                  Novo envio
                </Button>
              </Box>

              <Stack spacing={1}>
                <Typography><strong>Status:</strong> {result.failed ? 'falha' : 'sucesso'}</Typography>
                <Typography><strong>Provider usado:</strong> {result.provider || 'nao informado'}</Typography>
                <Typography><strong>Provider padrao:</strong> {result.providerDefault || 'nao informado'}</Typography>
                <Typography><strong>From usado:</strong> {result.from || officialFrom}</Typography>
                <Typography><strong>Destinatario:</strong> {result.to || officialTo.trim()}</Typography>
                {result.template && <Typography><strong>Template:</strong> {result.template}</Typography>}
                {result.subject && <Typography><strong>Assunto:</strong> {result.subject}</Typography>}
                {Array.isArray(result.attachments) && result.attachments.length > 0 && (
                  <Box>
                    <Typography><strong>Anexos enviados:</strong></Typography>
                    {result.attachments.map((attachment, index) => (
                      <Typography key={`${attachment.filename || 'anexo'}-${index}`} variant="body2" sx={{ color: '#4B5563' }}>
                        {attachment.filename || 'arquivo'} • {attachment.contentType || '-'} • {formatFileSize(attachment.size || 0)}
                      </Typography>
                    ))}
                  </Box>
                )}
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
            <Box>
              <Typography><strong>Anexos:</strong> {officialAttachments.length ? `${officialAttachments.length} arquivo(s)` : 'sem anexos'}</Typography>
              {officialAttachments.map((file, index) => (
                <Typography key={`${file.name}-${index}`} variant="body2" sx={{ color: '#4B5563' }}>
                  {file.name} • {(file.type || 'tipo nao informado')} • {formatFileSize(file.size)}
                </Typography>
              ))}
            </Box>
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