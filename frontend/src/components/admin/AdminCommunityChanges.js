import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Grid,
  Divider
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Person,
  LocationCity,
  Schedule
} from '@mui/icons-material';
import { communityChangeAPI } from '../../services/api';

/**
 * TELA DE MUDANÇAS DE COMUNIDADE
 * 
 * Admin aprova/rejeita solicitações de mudança.
 * Dados e ações vêm diretamente do backend.
 */
function AdminCommunityChanges() {
  const queryClient = useQueryClient();
  
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewDialog, setReviewDialog] = useState({ open: false, action: null });
  const [reviewNotes, setReviewNotes] = useState('');

  // Buscar solicitações pendentes
  const { data: pendingRequests, isLoading } = useQuery(
    'pending-community-changes',
    () => communityChangeAPI.getRequests({ status: 'pending' }),
    {
      select: (response) => response.data.requests || []
    }
  );

  // Buscar estatísticas
  const { data: stats } = useQuery(
    'community-change-stats',
    () => communityChangeAPI.getStats({ days_back: 30 }),
    {
      select: (response) => response.data.stats
    }
  );

  // Aprovar solicitação
  const approveMutation = useMutation(
    ({ requestId, reviewData }) => communityChangeAPI.approve(requestId, reviewData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('pending-community-changes');
        queryClient.invalidateQueries('community-change-stats');
        handleCloseDialog();
      }
    }
  );

  // Rejeitar solicitação
  const rejectMutation = useMutation(
    ({ requestId, reviewData }) => communityChangeAPI.reject(requestId, reviewData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('pending-community-changes');
        queryClient.invalidateQueries('community-change-stats');
        handleCloseDialog();
      }
    }
  );

  const handleOpenDialog = (request, action) => {
    setSelectedRequest(request);
    setReviewDialog({ open: true, action });
    setReviewNotes('');
  };

  const handleCloseDialog = () => {
    setReviewDialog({ open: false, action: null });
    setSelectedRequest(null);
    setReviewNotes('');
  };

  const handleConfirmAction = () => {
    if (!selectedRequest || !reviewNotes.trim()) return;

    const reviewData = {
      reviewed_by: 'admin@kaviar.com', // Viria do contexto de auth
      review_notes: reviewNotes.trim()
    };

    if (reviewDialog.action === 'approve') {
      approveMutation.mutate({ 
        requestId: selectedRequest.id, 
        reviewData 
      });
    } else {
      rejectMutation.mutate({ 
        requestId: selectedRequest.id, 
        reviewData 
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Mudanças de Comunidade
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Aprovar ou rejeitar solicitações de mudança
        </Typography>
      </Box>

      {/* Estatísticas */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary.main">
                  {stats.total}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total (30 dias)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {stats.by_status?.pending || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pendentes
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {stats.by_status?.approved || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Aprovadas
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="error.main">
                  {stats.by_status?.rejected || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Rejeitadas
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Lista de Solicitações */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Solicitações Pendentes ({pendingRequests?.length || 0})
          </Typography>
          
          {isLoading ? (
            <Typography>Carregando...</Typography>
          ) : pendingRequests?.length === 0 ? (
            <Alert severity="info">
              Não há solicitações pendentes no momento.
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {pendingRequests?.map((request) => (
                <Card key={request.id} variant="outlined">
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      {/* Informações do usuário */}
                      <Grid item xs={12} md={3}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Person sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography variant="subtitle2">
                            {request.user_type === 'driver' ? 'Motorista' : 'Passageiro'}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          ID: {request.user_id.slice(0, 8)}...
                        </Typography>
                      </Grid>

                      {/* Mudança solicitada */}
                      <Grid item xs={12} md={4}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <LocationCity sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography variant="subtitle2">Mudança</Typography>
                        </Box>
                        <Typography variant="body2">
                          <strong>De:</strong> {request.current_community?.name}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Para:</strong> {request.requested_community?.name}
                        </Typography>
                      </Grid>

                      {/* Motivo */}
                      <Grid item xs={12} md={3}>
                        <Typography variant="subtitle2" gutterBottom>
                          Motivo
                        </Typography>
                        <Typography variant="body2" sx={{ 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {request.reason}
                        </Typography>
                      </Grid>

                      {/* Ações */}
                      <Grid item xs={12} md={2}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            startIcon={<CheckCircle />}
                            onClick={() => handleOpenDialog(request, 'approve')}
                            disabled={approveMutation.isLoading || rejectMutation.isLoading}
                          >
                            Aprovar
                          </Button>
                          
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<Cancel />}
                            onClick={() => handleOpenDialog(request, 'reject')}
                            disabled={approveMutation.isLoading || rejectMutation.isLoading}
                          >
                            Rejeitar
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    {/* Informações adicionais */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Schedule sx={{ mr: 1, color: 'text.secondary', fontSize: 16 }} />
                        <Typography variant="caption">
                          {formatDate(request.created_at)}
                        </Typography>
                      </Box>
                      
                      <Chip 
                        label={request.status}
                        color={getStatusColor(request.status)}
                        size="small"
                      />
                      
                      {request.document_url && (
                        <Button
                          size="small"
                          href={request.document_url}
                          target="_blank"
                        >
                          Ver Documento
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Revisão */}
      <Dialog 
        open={reviewDialog.open} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {reviewDialog.action === 'approve' ? 'Aprovar' : 'Rejeitar'} Solicitação
        </DialogTitle>
        
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Usuário:</strong> {selectedRequest.user_type} 
                (ID: {selectedRequest.user_id.slice(0, 8)}...)
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Mudança:</strong> {selectedRequest.current_community?.name} → {selectedRequest.requested_community?.name}
              </Typography>
              <Typography variant="body2">
                <strong>Motivo:</strong> {selectedRequest.reason}
              </Typography>
            </Box>
          )}
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label={reviewDialog.action === 'approve' ? 'Notas da aprovação' : 'Motivo da rejeição'}
            placeholder={
              reviewDialog.action === 'approve' 
                ? 'Documentação válida, aprovado conforme política...'
                : 'Documentação insuficiente, necessário...'
            }
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            required
          />
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Cancelar
          </Button>
          
          <Button
            variant="contained"
            color={reviewDialog.action === 'approve' ? 'success' : 'error'}
            onClick={handleConfirmAction}
            disabled={!reviewNotes.trim() || approveMutation.isLoading || rejectMutation.isLoading}
          >
            {reviewDialog.action === 'approve' ? 'Aprovar' : 'Rejeitar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default AdminCommunityChanges;
