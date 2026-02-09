import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Grid,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { SentimentChip } from '../components/SentimentChip';
import { SentimentCard } from '../components/SentimentCard';
import type { RideFeedback } from '../types/rideFeedback';

export const RideFeedbacksPage: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<RideFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<RideFeedback | null>(null);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('https://api.kaviar.com.br/api/admin/ride-feedbacks?limit=50', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Erro ao carregar feedbacks');
        }

        const data = await response.json();
        setFeedbacks(data.data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbacks();
  }, []);

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Feedbacks de Corridas
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Passageiro</TableCell>
              <TableCell>Avaliação</TableCell>
              <TableCell>Comentário</TableCell>
              <TableCell>Sentimento</TableCell>
              <TableCell>Data</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {feedbacks.map((feedback) => (
              <TableRow 
                key={feedback.id}
                hover
                onClick={() => setSelectedFeedback(feedback)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {feedback.id.substring(0, 8)}...
                  </Typography>
                </TableCell>
                <TableCell>{feedback.passenger.name}</TableCell>
                <TableCell>
                  <Rating value={feedback.rating} readOnly size="small" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                    {feedback.comment || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <SentimentChip sentiment={feedback.sentiment?.label || null} />
                </TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {new Date(feedback.createdAt).toLocaleDateString('pt-BR')}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {feedbacks.length === 0 && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="body1" color="text.secondary">
            Nenhum feedback encontrado
          </Typography>
        </Box>
      )}

      <Dialog
        open={!!selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedFeedback && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Detalhes do Feedback</Typography>
                <IconButton onClick={() => setSelectedFeedback(null)} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    ID do Feedback
                  </Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {selectedFeedback.id}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Passageiro
                  </Typography>
                  <Typography variant="body1">{selectedFeedback.passenger.name}</Typography>
                  {selectedFeedback.passenger.email && (
                    <Typography variant="caption" color="text.secondary">
                      {selectedFeedback.passenger.email}
                    </Typography>
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Avaliação
                  </Typography>
                  <Rating value={selectedFeedback.rating} readOnly />
                </Grid>

                {selectedFeedback.comment && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Comentário
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="body1">{selectedFeedback.comment}</Typography>
                    </Paper>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <SentimentCard sentiment={selectedFeedback.sentiment} />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Criado em: {new Date(selectedFeedback.createdAt).toLocaleString('pt-BR')}
                  </Typography>
                </Grid>
              </Grid>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Container>
  );
};
