import React, { useState, useEffect } from 'react';
import {
  Container, Card, CardContent, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, Box, CircularProgress
} from '@mui/material';
import { PlayArrow, Refresh } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';

const API_BASE = 'https://api.kaviar.com.br/api/admin';
const FEATURE_KEY = 'passenger_favorites_matching';

export default function BetaMonitor() {
  const [checkpoints, setCheckpoints] = useState([]);
  const [lastCheckpoint, setLastCheckpoint] = useState(null);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);
  const [runbook, setRunbook] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('kaviar_admin_token');
  const adminData = JSON.parse(localStorage.getItem('kaviar_admin_data') || '{}');
  const canEdit = adminData.role === 'SUPER_ADMIN' || adminData.role === 'OPERATOR';

  useEffect(() => {
    loadCheckpoints();
    loadRunbook();
  }, []);

  const loadCheckpoints = async () => {
    try {
      const res = await fetch(`${API_BASE}/beta-monitor/${FEATURE_KEY}/checkpoints?limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCheckpoints(data.checkpoints || []);
        if (data.checkpoints && data.checkpoints.length > 0) {
          setLastCheckpoint(data.checkpoints[0]);
        }
      }
    } catch (err) {
      console.error('Error loading checkpoints:', err);
    }
  };

  const loadRunbook = async () => {
    try {
      const res = await fetch(`${API_BASE}/runbooks/${FEATURE_KEY}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRunbook(data.markdown || '');
      }
    } catch (err) {
      console.error('Error loading runbook:', err);
    }
  };

  const handleRun = async () => {
    if (!canEdit) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/beta-monitor/${FEATURE_KEY}/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phase: 'phase1_beta' })
      });

      const data = await res.json();
      
      if (data.success) {
        setSuccess('Checkpoint iniciado com sucesso');
        setTimeout(() => {
          loadCheckpoints();
          setSuccess('');
        }, 10000);
      } else {
        setError(data.error || 'Erro ao executar checkpoint');
      }
    } catch (err) {
      setError('Erro ao executar checkpoint');
    } finally {
      setLoading(false);
    }
  };

  const loadCheckpointDetail = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/beta-monitor/${FEATURE_KEY}/checkpoints/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedCheckpoint(data.checkpoint);
      }
    } catch (err) {
      console.error('Error loading checkpoint detail:', err);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'PASS') return 'success';
    if (status === 'WARN') return 'warning';
    if (status === 'FAIL') return 'error';
    return 'default';
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
        Beta Monitor - Passenger Favorites Matching
      </Typography>

      {!canEdit && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Modo somente leitura. Apenas SUPER_ADMIN e OPERATOR podem executar checkpoints.
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Card A - Status Atual */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Status Atual
            </Typography>
            <Box>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadCheckpoints}
                sx={{ mr: 1 }}
              >
                Atualizar
              </Button>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <PlayArrow />}
                onClick={handleRun}
                disabled={!canEdit || loading}
              >
                Executar Agora
              </Button>
            </Box>
          </Box>

          {lastCheckpoint ? (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Último checkpoint: {new Date(lastCheckpoint.created_at).toLocaleString('pt-BR')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Chip
                  label={`Status: ${lastCheckpoint.status}`}
                  color={getStatusColor(lastCheckpoint.status)}
                  size="small"
                />
                <Chip label={`Phase: ${lastCheckpoint.phase}`} size="small" />
                <Chip label={lastCheckpoint.checkpoint_label} size="small" variant="outlined" />
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Nenhum checkpoint registrado ainda
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Card B - Histórico */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Histórico de Checkpoints
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Data/Hora</TableCell>
                  <TableCell>Label</TableCell>
                  <TableCell>Phase</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {checkpoints.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        Nenhum checkpoint encontrado
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  checkpoints.map((cp) => (
                    <TableRow key={cp.id} hover>
                      <TableCell>{new Date(cp.created_at).toLocaleString('pt-BR')}</TableCell>
                      <TableCell>{cp.checkpoint_label}</TableCell>
                      <TableCell>{cp.phase}</TableCell>
                      <TableCell>
                        <Chip
                          label={cp.status}
                          color={getStatusColor(cp.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => loadCheckpointDetail(cp.id)}
                        >
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Card C - Runbook */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Runbook Operacional
          </Typography>
          
          <Box sx={{ 
            maxHeight: 400, 
            overflow: 'auto', 
            p: 2, 
            bgcolor: '#f5f5f5', 
            borderRadius: 1,
            '& h1': { fontSize: '1.5rem', fontWeight: 600, mt: 2, mb: 1 },
            '& h2': { fontSize: '1.25rem', fontWeight: 600, mt: 2, mb: 1 },
            '& h3': { fontSize: '1.1rem', fontWeight: 600, mt: 1, mb: 1 },
            '& code': { bgcolor: '#e0e0e0', p: 0.5, borderRadius: 0.5 },
            '& pre': { bgcolor: '#e0e0e0', p: 1, borderRadius: 1, overflow: 'auto' }
          }}>
            {runbook ? (
              <ReactMarkdown>{runbook}</ReactMarkdown>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Runbook não disponível
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Modal Detalhes */}
      <Dialog
        open={!!selectedCheckpoint}
        onClose={() => setSelectedCheckpoint(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detalhes do Checkpoint
        </DialogTitle>
        <DialogContent>
          {selectedCheckpoint && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>Config:</Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
                <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                  {JSON.stringify(selectedCheckpoint.config, null, 2)}
                </pre>
              </Paper>

              <Typography variant="subtitle2" gutterBottom>Metrics:</Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
                <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                  {JSON.stringify(selectedCheckpoint.metrics, null, 2)}
                </pre>
              </Paper>

              <Typography variant="subtitle2" gutterBottom>Determinism:</Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
                <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                  {JSON.stringify(selectedCheckpoint.determinism, null, 2)}
                </pre>
              </Paper>

              <Typography variant="subtitle2" gutterBottom>Alerts:</Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                  {JSON.stringify(selectedCheckpoint.alerts, null, 2)}
                </pre>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedCheckpoint(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
