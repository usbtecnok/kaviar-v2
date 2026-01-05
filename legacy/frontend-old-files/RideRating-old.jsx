import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Rating,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Star,
  DirectionsCar,
  ThumbUp
} from '@mui/icons-material';
import Layout from '../../components/common/Layout';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api';

const RideRating = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const rideData = location.state?.rideData;

  const handleSubmitRating = async () => {
    setLoading(true);
    setError('');

    try {
      await api.post(`/api/rides/${rideData.ride_id}/rate`, {
        rating,
        comment: comment.trim() || null
      });

      navigate('/passenger', { 
        state: { message: 'Avaliação enviada com sucesso!' }
      });
    } catch (err) {
      setError('Erro ao enviar avaliação');
    } finally {
      setLoading(false);
    }
  };

  if (!rideData) {
    navigate('/passenger');
    return null;
  }

  const getRatingLabel = (value) => {
    const labels = {
      1: 'Muito Ruim',
      2: 'Ruim',
      3: 'Regular',
      4: 'Bom',
      5: 'Excelente'
    };
    return labels[value] || '';
  };

  return (
    <Layout title="Avaliar Corrida">
      <Typography variant="h4" gutterBottom>
        Avaliar Corrida
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Detalhes da Corrida
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Origem → Destino
            </Typography>
            <Typography variant="body1">
              {rideData.pickup_address} → {rideData.destination_address}
            </Typography>
          </Box>
          
          {rideData.driver && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Motorista
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <DirectionsCar />
                <Typography variant="body1">
                  {rideData.driver.name} - {rideData.driver.vehicle}
                </Typography>
              </Box>
            </Box>
          )}
          
          <Box>
            <Typography variant="body2" color="textSecondary">
              Valor da Corrida
            </Typography>
            <Typography variant="h6" color="success.main">
              R$ {rideData.final_amount?.toFixed(2) || '0,00'}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Como foi sua experiência?
          </Typography>
          
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Rating
              name="ride-rating"
              value={rating}
              onChange={(event, newValue) => {
                setRating(newValue);
              }}
              size="large"
              icon={<Star fontSize="inherit" />}
            />
            <Typography variant="body1" color="primary.main" sx={{ mt: 1 }}>
              {getRatingLabel(rating)}
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Comentário (opcional)"
            placeholder="Conte-nos mais sobre sua experiência..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            sx={{ mb: 3 }}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => navigate('/passenger')}
              disabled={loading}
            >
              Pular
            </Button>
            
            <Button
              variant="contained"
              fullWidth
              startIcon={<ThumbUp />}
              onClick={handleSubmitRating}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Enviar Avaliação'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default RideRating;
