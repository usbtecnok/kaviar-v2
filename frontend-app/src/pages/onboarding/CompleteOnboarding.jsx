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
  StepLabel,
  Card,
  CardContent
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from '@mui/icons-material';
import api from '../../api';

const steps = ['Dados Pessoais', 'Comunidade', 'LGPD', 'Finalização'];

export default function CompleteOnboarding() {
  const [activeStep, setActiveStep] = useState(0);
  const [userType, setUserType] = useState('passenger'); // passenger, driver, guide
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    communityId: '',
    // Driver specific
    documentCpf: '',
    documentRg: '',
    documentCnh: '',
    vehiclePlate: '',
    vehicleModel: '',
    // Guide specific
    isBilingual: false,
    languages: [],
    alsoDriver: false
  });
  const [communities, setCommunities] = useState([]);
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    try {
      const response = await api.get('/governance/communities');
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
      let userId;

      // 1. Criar usuário baseado no tipo
      if (userType === 'passenger') {
        const response = await api.post('/governance/passenger', {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          communityId: formData.communityId
        });
        userId = response.data.data.id;

        // Registrar consentimento LGPD
        await api.post('/governance/consent', {
          passengerId: userId,
          consentType: 'lgpd',
          accepted: lgpdAccepted,
          ipAddress: 'onboarding'
        });
      } else if (userType === 'driver') {
        // Criar driver e enviar documentos
        const response = await api.post('/governance/driver', {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          communityId: formData.communityId,
          documentCpf: formData.documentCpf,
          documentRg: formData.documentRg,
          documentCnh: formData.documentCnh,
          vehiclePlate: formData.vehiclePlate,
          vehicleModel: formData.vehicleModel
        });
        userId = response.data.data.id;
      } else if (userType === 'guide') {
        const response = await api.post('/governance/guide', {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          communityId: formData.communityId,
          isBilingual: formData.isBilingual,
          languages: formData.languages,
          alsoDriver: formData.alsoDriver
        });
        userId = response.data.data.id;
      }

      setCompleted(true);
    } catch (error) {
      setError(error.response?.data?.error || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Cadastro Realizado!
            </Typography>
            <Typography variant="body1" sx={{ mb: 4 }}>
              Seu cadastro foi enviado para análise. Você receberá um email quando for aprovado.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/')}
              size="large"
            >
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Tipo de Usuário</InputLabel>
              <Select
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
              >
                <MenuItem value="passenger">Passageiro</MenuItem>
                <MenuItem value="driver">Motorista</MenuItem>
                <MenuItem value="guide">Guia Turístico</MenuItem>
              </Select>
            </FormControl>
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

            {/* Campos específicos para motorista */}
            {userType === 'driver' && (
              <>
                <Typography variant="h6" sx={{ mt: 2 }}>Documentos</Typography>
                <TextField
                  label="CPF"
                  value={formData.documentCpf}
                  onChange={(e) => setFormData(prev => ({ ...prev, documentCpf: e.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="RG"
                  value={formData.documentRg}
                  onChange={(e) => setFormData(prev => ({ ...prev, documentRg: e.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="CNH"
                  value={formData.documentCnh}
                  onChange={(e) => setFormData(prev => ({ ...prev, documentCnh: e.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="Placa do Veículo"
                  value={formData.vehiclePlate}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehiclePlate: e.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="Modelo do Veículo"
                  value={formData.vehicleModel}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehicleModel: e.target.value }))}
                  required
                  fullWidth
                />
              </>
            )}

            {/* Campos específicos para guia */}
            {userType === 'guide' && (
              <>
                <Typography variant="h6" sx={{ mt: 2 }}>Informações do Guia</Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isBilingual}
                      onChange={(e) => setFormData(prev => ({ ...prev, isBilingual: e.target.checked }))}
                    />
                  }
                  label="Sou bilíngue"
                />
                <TextField
                  label="Idiomas (separados por vírgula)"
                  value={formData.languages.join(', ')}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    languages: e.target.value.split(',').map(lang => lang.trim()) 
                  }))}
                  fullWidth
                  placeholder="Português, Inglês, Espanhol"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.alsoDriver}
                      onChange={(e) => setFormData(prev => ({ ...prev, alsoDriver: e.target.checked }))}
                    />
                  }
                  label="Também atuo como motorista"
                />
              </>
            )}
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
            <Typography>Tipo: {userType === 'passenger' ? 'Passageiro' : userType === 'driver' ? 'Motorista' : 'Guia Turístico'}</Typography>
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
          Cadastro KAVIAR
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
