import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Rating,
  CircularProgress,
  Alert,
  Paper,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  SentimentVeryDissatisfied,
  SentimentNeutral,
  SentimentVerySatisfied,
} from '@mui/icons-material';
import { apiClient } from '../../lib/apiClient';

interface Passenger {
  id: string;
  name: string;
  email: string | null;
}

interface Sentiment {
  label: string | null;
  score: number | null;
  confidence: number | null;
  analyzedAt: string | null;
}

interface Feedback {
  id: string;
  rideId: string;
  rating: number;
  comment: string | null;
  tags: string[] | null;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
  passenger: Passenger;
  sentiment: Sentiment | null;
}

interface FeedbacksResponse {
  success: boolean;
  data: Feedback[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function FeedbackRow({ feedback }: { feedback: Feedback }) {
  const [open, setOpen] = useState(false);

  const getSentimentIcon = (label: string | null) => {
    if (!label) return null;
    switch (label.toLowerCase()) {
      case 'positive':
        return <SentimentVerySatisfied color="success" />;
      case 'negative':
        return <SentimentVeryDissatisfied color="error" />;
      case 'neutral':
        return <SentimentNeutral color="action" />;
      default:
        return null;
    }
  };

  const getSentimentColor = (label: string | null) => {
    if (!label) return 'default';
    switch (label.toLowerCase()) {
      case 'positive':
        return 'success';
      case 'negative':
        return 'error';
      case 'neutral':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <>
      <TableRow hover>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
            {feedback.rideId.substring(0, 8)}...
          </Typography>
        </TableCell>
        <TableCell>
          <Rating value={feedback.rating} readOnly size="small" />
        </TableCell>
        <TableCell>
          <Typography variant="body2">{feedback.passenger.name}</Typography>
        </TableCell>
        <TableCell>
          {feedback.sentiment ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getSentimentIcon(feedback.sentiment.label)}
              <Chip
                label={feedback.sentiment.label || 'N/A'}
                size="small"
                color={getSentimentColor(feedback.sentiment.label) as any}
              />
            </Box>
          ) : (
            <Chip label="Não analisado" size="small" variant="outlined" />
          )}
        </TableCell>
        <TableCell>
          <Typography variant="body2" color="text.secondary">
            {new Date(feedback.createdAt).toLocaleDateString('pt-BR')}
          </Typography>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom component="div">
                Detalhes do Feedback
              </Typography>
              
              {feedback.comment && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Comentário:
                  </Typography>
                  <Typography variant="body2">{feedback.comment}</Typography>
                </Box>
              )}

              {feedback.tags && feedback.tags.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Tags:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {feedback.tags.map((tag, index) => (
                      <Chip key={index} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}

              {feedback.sentiment && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Análise de Sentimento:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {feedback.sentiment.score !== null && (
                      <Chip
                        label={`Score: ${feedback.sentiment.score.toFixed(4)}`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                    {feedback.sentiment.confidence !== null && (
                      <Chip
                        label={`Confiança: ${(feedback.sentiment.confidence * 100).toFixed(1)}%`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                    {feedback.sentiment.analyzedAt && (
                      <Chip
                        label={`Analisado: ${new Date(feedback.sentiment.analyzedAt).toLocaleString('pt-BR')}`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary">
                  ID: {feedback.id}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Corrida: {feedback.rideId}
                </Typography>
                {!feedback.isAnonymous && feedback.passenger.email && (
                  <Typography variant="caption" color="text.secondary">
                    Email: {feedback.passenger.email}
                  </Typography>
                )}
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function RideFeedbacks() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchFeedbacks();
  }, [page, rowsPerPage]);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await apiClient.request<FeedbacksResponse>(
        `/api/admin/ride-feedbacks?page=${page + 1}&limit=${rowsPerPage}`
      );

      if (response.data.success) {
        setFeedbacks(response.data.data);
        setTotalCount(response.data.pagination.total);
      } else {
        setError('Erro ao carregar feedbacks');
      }
    } catch (err: any) {
      console.error('[RideFeedbacks] Error fetching feedbacks:', err);
      if (err.message?.includes('401')) {
        setError('Sessão expirada. Faça login novamente.');
      } else if (err.message?.includes('403')) {
        setError('Acesso negado. Você não tem permissão para visualizar feedbacks.');
      } else {
        setError('Erro ao carregar feedbacks. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading && feedbacks.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Feedbacks de Corridas
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width="50px" />
                  <TableCell>Corrida</TableCell>
                  <TableCell>Avaliação</TableCell>
                  <TableCell>Passageiro</TableCell>
                  <TableCell>Sentimento</TableCell>
                  <TableCell>Data</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {feedbacks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                        Nenhum feedback encontrado
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  feedbacks.map((feedback) => (
                    <FeedbackRow key={feedback.id} feedback={feedback} />
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 20, 50]}
            labelRowsPerPage="Feedbacks por página:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
            }
          />
        </CardContent>
      </Card>
    </Box>
  );
}
