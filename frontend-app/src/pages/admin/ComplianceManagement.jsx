import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Tabs,
  Tab,
  IconButton,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { CheckCircle, Cancel, Visibility, History } from '@mui/icons-material';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function ComplianceManagement() {
  const [currentTab, setCurrentTab] = useState('pending');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionDialog, setActionDialog] = useState({ open: false, action: null, document: null, reason: '' });
  const [historyDialog, setHistoryDialog] = useState({ open: false, driverId: null, documents: [] });

  useEffect(() => {
    loadDocuments();
  }, [currentTab]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('kaviar_admin_token');
      const endpoint = currentTab === 'pending' 
        ? '/api/admin/compliance/documents/pending'
        : '/api/admin/compliance/documents/expiring';

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setDocuments(data.data);
      } else {
        setError(data.error || 'Erro ao carregar documentos');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(
        `${API_BASE_URL}/api/admin/compliance/documents/${actionDialog.document.id}/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setSuccess('Documento aprovado com sucesso');
        setActionDialog({ open: false, action: null, document: null, reason: '' });
        loadDocuments();
      } else {
        setError(data.error || 'Erro ao aprovar documento');
      }
    } catch (error) {
      setError('Erro de conexão');
    }
  };

  const handleReject = async () => {
    if (!actionDialog.reason || actionDialog.reason.trim().length < 10) {
      setError('Motivo da rejeição deve ter pelo menos 10 caracteres');
      return;
    }

    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(
        `${API_BASE_URL}/api/admin/compliance/documents/${actionDialog.document.id}/reject`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ reason: actionDialog.reason })
        }
      );

      const data = await response.json();
      if (data.success) {
        setSuccess('Documento rejeitado');
        setActionDialog({ open: false, action: null, document: null, reason: '' });
        loadDocuments();
      } else {
        setError(data.error || 'Erro ao rejeitar documento');
      }
    } catch (error) {
      setError('Erro de conexão');
    }
  };

  const loadDriverHistory = async (driverId) => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(
        `${API_BASE_URL}/api/admin/compliance/drivers/${driverId}/documents`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const data = await response.json();
      if (data.success) {
        setHistoryDialog({ open: true, driverId, documents: data.data });
      }
    } catch (error) {
      setError('Erro ao carregar histórico');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getDaysUntilExpiration = (validUntil) => {
    if (!validUntil) return null;
    const now = new Date();
    const expiration = new Date(validUntil);
    const days = Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Gestão de Compliance - Antecedentes Criminais
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Pendentes de Aprovação" value="pending" />
        <Tab label="Vencendo em Breve" value="expiring" />
      </Tabs>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Motorista</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Data Envio</TableCell>
              {currentTab === 'expiring' && <TableCell>Vencimento</TableCell>}
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>{doc.drivers?.name || 'N/A'}</TableCell>
                <TableCell>{doc.drivers?.email || 'N/A'}</TableCell>
                <TableCell>
                  <Chip
                    label={doc.status === 'approved' ? 'Aprovado' : doc.status === 'pending' ? 'Pendente' : 'Rejeitado'}
                    color={getStatusColor(doc.status)}
                    size="small"
                  />
                  {doc.is_current && <Chip label="Vigente" color="primary" size="small" sx={{ ml: 1 }} />}
                </TableCell>
                <TableCell>{new Date(doc.created_at).toLocaleDateString('pt-BR')}</TableCell>
                {currentTab === 'expiring' && (
                  <TableCell>
                    {doc.valid_until ? (
                      <Box>
                        <Typography variant="body2">
                          {new Date(doc.valid_until).toLocaleDateString('pt-BR')}
                        </Typography>
                        <Typography variant="caption" color="error">
                          {getDaysUntilExpiration(doc.valid_until)} dias restantes
                        </Typography>
                      </Box>
                    ) : 'N/A'}
                  </TableCell>
                )}
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {doc.status === 'pending' && (
                      <>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => setActionDialog({ open: true, action: 'approve', document: doc, reason: '' })}
                          title="Aprovar"
                        >
                          <CheckCircle />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setActionDialog({ open: true, action: 'reject', document: doc, reason: '' })}
                          title="Rejeitar"
                        >
                          <Cancel />
                        </IconButton>
                      </>
                    )}
                    <IconButton
                      size="small"
                      color="info"
                      onClick={() => window.open(doc.file_url, '_blank')}
                      title="Ver documento"
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="default"
                      onClick={() => loadDriverHistory(doc.driver_id)}
                      title="Ver histórico"
                    >
                      <History />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {documents.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">
            Nenhum documento encontrado nesta categoria.
          </Typography>
        </Box>
      )}

      {/* Dialog de Ação */}
      <Dialog open={actionDialog.open} onClose={() => setActionDialog({ open: false, action: null, document: null, reason: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionDialog.action === 'approve' ? 'Aprovar Documento' : 'Rejeitar Documento'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Motorista: <strong>{actionDialog.document?.drivers?.name}</strong>
          </Typography>

          {actionDialog.action === 'reject' && (
            <TextField
              fullWidth
              label="Motivo da Rejeição"
              multiline
              rows={4}
              value={actionDialog.reason}
              onChange={(e) => setActionDialog(prev => ({ ...prev, reason: e.target.value }))}
              required
              helperText="Mínimo 10 caracteres"
            />
          )}

          {actionDialog.action === 'approve' && (
            <Alert severity="info">
              Ao aprovar, o documento será válido por 12 meses e se tornará o documento vigente do motorista.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog({ open: false, action: null, document: null, reason: '' })}>
            Cancelar
          </Button>
          <Button
            onClick={actionDialog.action === 'approve' ? handleApprove : handleReject}
            variant="contained"
            color={actionDialog.action === 'approve' ? 'success' : 'error'}
          >
            {actionDialog.action === 'approve' ? 'Aprovar' : 'Rejeitar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Histórico */}
      <Dialog open={historyDialog.open} onClose={() => setHistoryDialog({ open: false, driverId: null, documents: [] })} maxWidth="md" fullWidth>
        <DialogTitle>Histórico de Documentos</DialogTitle>
        <DialogContent>
          <List>
            {historyDialog.documents.map((doc) => (
              <ListItem key={doc.id} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1">
                        {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                      </Typography>
                      <Chip
                        label={doc.status === 'approved' ? 'Aprovado' : doc.status === 'pending' ? 'Pendente' : 'Rejeitado'}
                        color={getStatusColor(doc.status)}
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
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialog({ open: false, driverId: null, documents: [] })}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
