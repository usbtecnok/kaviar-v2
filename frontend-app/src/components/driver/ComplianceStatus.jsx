import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { Warning, CheckCircle, Upload, History } from '@mui/icons-material';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function ComplianceStatus() {
  const [status, setStatus] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadStatus();
    loadDocuments();
  }, []);

  const loadStatus = async () => {
    try {
      const token = localStorage.getItem('kaviar_driver_token');
      const response = await fetch(`${API_BASE_URL}/api/drivers/me/compliance/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error('Error loading status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const token = localStorage.getItem('kaviar_driver_token');
      const response = await fetch(`${API_BASE_URL}/api/drivers/me/compliance/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setDocuments(data.data);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Selecione um arquivo');
      return;
    }

    if (!lgpdAccepted) {
      setError('Você precisa aceitar o termo de consentimento LGPD');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // TODO: Implementar upload real para S3
      // Atualmente simulado para desenvolvimento
      // Em produção, usar AWS S3, Cloudinary ou similar
      // Exemplo:
      // const s3Url = await uploadToS3(selectedFile);
      // const fileUrl = s3Url;
      
      // Simular upload (REMOVER EM PRODUÇÃO)
      const fileUrl = `https://storage.kaviar.com/compliance/${Date.now()}-${selectedFile.name}`;

      const token = localStorage.getItem('kaviar_driver_token');
      const response = await fetch(`${API_BASE_URL}/api/drivers/me/compliance/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileUrl,
          lgpdConsentAccepted: lgpdAccepted
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Documento enviado com sucesso! Aguarde a análise.');
        setUploadDialogOpen(false);
        setSelectedFile(null);
        setLgpdAccepted(false);
        loadStatus();
        loadDocuments();
      } else {
        setError(data.error || 'Erro ao enviar documento');
      }
    } catch (error) {
      setError('Erro ao enviar documento');
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (statusCode) => {
    switch (statusCode) {
      case 'valid': return 'success';
      case 'warning': return 'warning';
      case 'expiring_soon': return 'error';
      case 'expired': return 'error';
      case 'no_document': return 'error';
      default: return 'default';
    }
  };

  const getDocumentStatusColor = (docStatus) => {
    switch (docStatus) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            {status?.status === 'valid' ? <CheckCircle color="success" /> : <Warning color="error" />}
            <Typography variant="h6">Atestado de Antecedentes Criminais</Typography>
          </Box>

          {status && (
            <Box>
              <Alert severity={getStatusColor(status.status)} sx={{ mb: 2 }}>
                {status.message}
              </Alert>

              {status.daysUntilExpiration !== null && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {status.daysUntilExpiration > 0 
                    ? `Vence em ${status.daysUntilExpiration} dias`
                    : 'Documento vencido'}
                </Typography>
              )}

              <Box sx={{ display: 'flex', gap: 2 }}>
                {(status.needsRevalidation || status.status === 'warning') && (
                  <Button
                    variant="contained"
                    startIcon={<Upload />}
                    onClick={() => setUploadDialogOpen(true)}
                  >
                    Enviar Novo Atestado
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<History />}
                  onClick={() => setHistoryDialogOpen(true)}
                >
                  Ver Histórico
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Upload */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Enviar Novo Atestado</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Envie seu atestado de antecedentes criminais atualizado (Certidão "Nada Consta").
            </Typography>

            <Button
              variant="outlined"
              component="label"
              fullWidth
              sx={{ mb: 2 }}
            >
              {selectedFile ? `✓ ${selectedFile.name}` : 'Selecionar Arquivo (PDF ou Imagem)'}
              <input
                type="file"
                hidden
                accept=".pdf,image/*"
                onChange={(e) => setSelectedFile(e.target.files[0])}
              />
            </Button>

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="caption">
                <strong>Termo de Consentimento LGPD:</strong><br/>
                Autorizo o tratamento do meu atestado de antecedentes criminais exclusivamente para fins de segurança, conformidade e auditoria da plataforma KAVIAR, nos termos da LGPD.
              </Typography>
            </Alert>

            <FormControlLabel
              control={
                <Checkbox
                  checked={lgpdAccepted}
                  onChange={(e) => setLgpdAccepted(e.target.checked)}
                />
              }
              label="Li e aceito o termo de consentimento LGPD"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!selectedFile || !lgpdAccepted || uploading}
          >
            {uploading ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Histórico */}
      <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Histórico de Documentos</DialogTitle>
        <DialogContent>
          <List>
            {documents.map((doc) => (
              <ListItem key={doc.id} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1">
                        {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                      </Typography>
                      <Chip
                        label={doc.status === 'approved' ? 'Aprovado' : doc.status === 'pending' ? 'Em análise' : 'Rejeitado'}
                        color={getDocumentStatusColor(doc.status)}
                        size="small"
                      />
                      {doc.is_current && <Chip label="Vigente" color="primary" size="small" />}
                    </Box>
                  }
                  secondary={
                    <Box>
                      {doc.valid_from && doc.valid_until && (
                        <Typography variant="caption" display="block">
                          Válido de {new Date(doc.valid_from).toLocaleDateString('pt-BR')} até {new Date(doc.valid_until).toLocaleDateString('pt-BR')}
                        </Typography>
                      )}
                      {doc.rejection_reason && (
                        <Typography variant="caption" color="error" display="block">
                          Motivo: {doc.rejection_reason}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
            {documents.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                Nenhum documento enviado ainda
              </Typography>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
