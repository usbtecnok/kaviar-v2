import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Rating,
  TextField,
  Alert,
  Avatar
} from '@mui/material';
import { Star, Send, ArrowBack } from '@mui/icons-material';
import Layout from '../../components/common/Layout';
import { useRide } from '../../context/RideContext';
import { useNavigate } from 'react-router-dom';

const RideRating = () => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { currentRide, rateRide, rideStatus } = useRide();
  const navigate = useNavigate();

  const handleSubmitRating = () => {
    rateRide(rating, comment);
    setSubmitted(true);
    
    // Redirecionar após 3 segundos
    setTimeout(() => {
      navigate('/passageiro');
    }, 3000);
  };

  if (!currentRide || rideStatus === 'idle') {
    return (
      <Layout title="Avaliar Corrida">
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              Nenhuma corrida para avaliar
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Você não possui corridas finalizadas para avaliar.
            </Typography>
            <Button 
              variant="contained" 
              href="/passageiro"
              startIcon={<ArrowBack />}
            >
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  if (submitted || rideStatus === 'rated') {
    return (
      <Layout title="Avaliação Enviada">
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Box sx={{ mb: 3 }}>
              <Star sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom color="success.main">
                Avaliação Enviada!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Obrigado pelo seu feedback. Sua avaliação nos ajuda a melhorar o serviço KAVIAR.
              </Typography>
            </Box>
            
            <Alert severity="success" sx={{ mb: 3 }}>
              Avaliação de {rating} estrelas enviada com sucesso!
            </Alert>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Redirecionando para o dashboard...
            </Typography>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout title="Avaliar Corrida">
      <Typography variant="h4" gutterBottom>
        Avaliar sua Experiência
      </Typography>

      {/* Resumo da corrida */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Resumo da Corrida
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Origem:</strong> {currentRide.origin}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Destino:</strong> {currentRide.destination}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Valor:</strong> R$ {currentRide.price}
            </Typography>
          </Box>

          {/* Informações do motorista */}
          {currentRide.driver && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              p: 2, 
              bgcolor: 'background.paper', 
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider'
            }}>
              <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                {currentRide.driver.photo}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  {currentRide.driver.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {currentRide.driver.car} • {currentRide.driver.plate}
                </Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Formulário de avaliação */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Como foi sua experiência?
          </Typography>

          {/* Rating */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Avalie o motorista:
            </Typography>
            <Rating
              value={rating}
              onChange={(event, newValue) => setRating(newValue || 1)}
              size="large"
              sx={{ mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              {rating} de 5 estrelas
            </Typography>
          </Box>

          {/* Comentário */}
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Comentário (opcional)"
            placeholder="Conte-nos sobre sua experiência com o motorista e a corrida..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            sx={{ mb: 3 }}
          />

          {/* Botões */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate('/passageiro')}
              sx={{ flex: 1 }}
            >
              Pular Avaliação
            </Button>
            <Button
              variant="contained"
              startIcon={<Send />}
              onClick={handleSubmitRating}
              sx={{ flex: 2 }}
            >
              Enviar Avaliação
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default RideRating;
