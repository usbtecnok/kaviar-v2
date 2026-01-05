import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Alert,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const steps = ['Dados Pessoais', 'Comunidade', 'LGPD', 'Finalização'];

export default function PassengerRegistration() {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    communityId: ''
  });
  const [communities, setCommunities] = useState([]);
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    try {
      const response = await api.get('/api/governance/communities');
      if (response.data.success) {
        setCommunities(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar comunidades:', error);
    }
  };

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      handleSubmit();
    } else {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Criar passageiro
      const passengerResponse = await api.post('/api/governance/passenger', {
        ...formData,
        status: 'pending'
      });

      if (passengerResponse.data.success) {
        const passengerId = passengerResponse.data.data.id;

        // 2. Registrar consentimento LGPD
        await api.post('/api/governance/consent', {
          passengerId,
          consentType: 'lgpd',
          accepted: lgpdAccepted,
          ipAddress: 'frontend' // Simplificado
        });

        navigate('/passageiro/pending');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nome Completo"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Telefone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              fullWidth
            />
          </Box>
        );
      case 1:
        return (
          <FormControl fullWidth required>
            <InputLabel>Comunidade</InputLabel>
            <Select
              value={formData.communityId}
              onChange={(e) => setFormData(prev => ({ ...prev, communityId: e.target.value }))}
            >
              {communities.map(community => (
                <MenuItem key={community.id} value={community.id}>
                  {community.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Consentimento LGPD
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Para utilizar nossos serviços, precisamos do seu consentimento para processar seus dados pessoais.
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={lgpdAccepted}
                  onChange={(e) => setLgpdAccepted(e.target.checked)}
                />
              }
              label="Aceito o tratamento dos meus dados pessoais conforme a LGPD"
              required
            />
          </Box>
        );
      case 3:
        return (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Revisão dos Dados
            </Typography>
            <Typography>Nome: {formData.name}</Typography>
            <Typography>Email: {formData.email}</Typography>
            <Typography>Telefone: {formData.phone}</Typography>
            <Typography>LGPD: {lgpdAccepted ? 'Aceito' : 'Não aceito'}</Typography>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Cadastro de Passageiro
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {renderStepContent(activeStep)}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
          >
            Voltar
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={loading || (activeStep === 2 && !lgpdAccepted)}
          >
            {activeStep === steps.length - 1 ? 'Finalizar' : 'Próximo'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
