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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle } from '@mui/icons-material';
import api from '../../api';

const steps = ['Dados Pessoais', 'Comunidade', 'LGPD', 'Finalização'];

export default function CompleteOnboarding() {
  const [activeStep, setActiveStep] = useState(0);
  const [userType, setUserType] = useState('passenger'); // passenger, driver, guide
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Pré-selecionar tipo baseado na URL
  useEffect(() => {
    const typeFromUrl = searchParams.get('type');
    if (typeFromUrl && ['passenger', 'driver', 'guide'].includes(typeFromUrl)) {
      setUserType(typeFromUrl);
    }
  }, [searchParams]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
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


  // === CLEAN_FORM_VALUES (component scope) ===
  // Valores seguros para o JSX (evita null/undefined)
  const clean = {
    name: formData.name ?? '',
    email: formData.email ?? '',
    phone: formData.phone ?? '',
    password: formData.password ?? '',
    confirmPassword: formData.confirmPassword ?? '',
    communityId: formData.communityId ?? '',
    documentCpf: formData.documentCpf ?? '',
    documentRg: formData.documentRg ?? '',
    documentCnh: formData.documentCnh ?? '',
    vehiclePlate: formData.vehiclePlate ?? '',
    vehicleModel: formData.vehicleModel ?? '',
    isBilingual: !!formData.isBilingual,
    languages: formData.languages ?? [],
    alsoDriver: !!formData.alsoDriver,
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
    // Validação mínima por tipo (evita 500 no backend)
    if (userType === 'passenger') {
      if (!clean.name || !clean.phone || !clean.password) {
        setError('Preencha nome, telefone e senha.');
        setLoading(false);
        return;
      }
      if (clean.password.length < 6) {
        setError('Senha deve ter pelo menos 6 caracteres.');
        setLoading(false);
        return;
      }
      if (clean.password !== clean.confirmPassword) {
        setError('Senhas não coincidem.');
        setLoading(false);
        return;
      }
    }

    if (userType === 'driver') {
      if (!clean.name || !clean.phone || !clean.communityId) {
        setError('Preencha nome, telefone e comunidade.');
        setLoading(false);
        return;
      }
      if (!clean.documentCpf || !clean.documentRg || !clean.documentCnh || !clean.vehiclePlate || !clean.vehicleModel) {
        setError('Preencha CPF, RG, CNH e dados do veículo.');
        setLoading(false);
        return;
      }
    }

    if (userType === 'guide') {
      if (!clean.name || !clean.phone || !clean.communityId) {
        setError('Preencha nome, telefone e comunidade.');
        setLoading(false);
        return;
      }
    }

    try {
      let userId;

      // 1. Criar usuário baseado no tipo
      if (userType === 'passenger') {
        const response = await api.post('/api/governance/passenger', {
          name: clean.name,
          email: clean.email,
          phone: clean.phone,
          password: clean.password,
          communityId: clean.communityId || null
        });
        userId = response.data.data.id;

        // Registrar consentimento LGPD
        await api.post('/api/governance/consent', {
          passengerId: userId,
          consentType: 'LGPD',
          accepted: lgpdAccepted,
          ipAddress: 'onboarding'
        });

        // Login automático após cadastro
        try {
          const loginResponse = await api.post('/api/auth/passenger/login', {
            email: clean.email,
            phone: clean.phone
          });
          
          if (loginResponse.data.success) {
            localStorage.setItem('token', loginResponse.data.token);
            localStorage.setItem('user', JSON.stringify(loginResponse.data.user));
            
            // Redirect para área do passageiro
            setTimeout(() => {
              navigate('/passageiro/home');
            }, 2000);
          }
        } catch (loginError) {
          console.error('Erro no login automático:', loginError);
        }
      } else if (userType === 'driver') {
        // Criar driver e enviar documentos
        console.log('[DEBUG] driver payload:', {
          name: clean.name,
          email: clean.email,
          phone: clean.phone,
          communityId: clean.communityId,
          documentCpf: clean.documentCpf,
          documentRg: clean.documentRg,
          documentCnh: clean.documentCnh,
          vehiclePlate: clean.vehiclePlate,
          vehicleModel: clean.vehicleModel
        });
        const response = await api.post('/api/governance/driver', {
          name: clean.name,
          email: clean.email,
          phone: clean.phone,
          communityId: clean.communityId,
          documentCpf: clean.documentCpf,
          documentRg: clean.documentRg,
          documentCnh: clean.documentCnh,
          vehiclePlate: clean.vehiclePlate,
          vehicleModel: clean.vehicleModel
        });
        userId = response.data.data.id;
      } else if (userType === 'guide') {
        const response = await api.post('/api/governance/guide', {
          name: clean.name,
          email: clean.email,
          phone: clean.phone,
          communityId: clean.communityId,
          isBilingual: clean.isBilingual,
          languages: clean.languages,
          alsoDriver: clean.alsoDriver
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
              {userType === 'passenger' 
                ? 'Redirecionando para sua área...' 
                : 'Seu cadastro foi enviado para análise. Você receberá um email quando for aprovado.'
              }
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
              value={clean.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={clean.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Telefone"
              value={clean.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              fullWidth
            />

            {/* Campos de senha para passageiro */}
            {userType === 'passenger' && (
              <>
                <TextField
                  label="Senha"
                  type="password"
                  value={clean.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  fullWidth
                  helperText="Mínimo 6 caracteres"
                />
                <TextField
                  label="Confirmar Senha"
                  type="password"
                  value={clean.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  fullWidth
                />
              </>
            )}

            {/* Campos específicos para motorista */}
            {userType === 'driver' && (
              <>
                <Typography variant="h6" sx={{ mt: 2 }}>Documentos</Typography>
                <TextField
                  label="CPF"
                  value={clean.documentCpf}
                  onChange={(e) => setFormData(prev => ({ ...prev, documentCpf: e.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="RG"
                  value={clean.documentRg}
                  onChange={(e) => setFormData(prev => ({ ...prev, documentRg: e.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="CNH"
                  value={clean.documentCnh}
                  onChange={(e) => setFormData(prev => ({ ...prev, documentCnh: e.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="Placa do Veículo"
                  value={clean.vehiclePlate}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehiclePlate: e.target.value }))}
                  required
                  fullWidth
                />
                <TextField
                  label="Modelo do Veículo"
                  value={clean.vehicleModel}
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
                      checked={clean.isBilingual}
                      onChange={(e) => setFormData(prev => ({ ...prev, isBilingual: e.target.checked }))}
                    />
                  }
                  label="Sou bilíngue"
                />
                <TextField
                  label="Idiomas (separados por vírgula)"
                  value={clean.languages.join(', ')}
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
                      checked={clean.alsoDriver}
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
          <FormControl fullWidth>
            <InputLabel>Comunidade (Opcional)</InputLabel>
            <Select
              value={clean.communityId}
              onChange={(e) => setFormData(prev => ({ ...prev, communityId: e.target.value }))}
            >
              <MenuItem value="">Nenhuma</MenuItem>
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
            <Typography>Nome: {clean.name}</Typography>
            <Typography>Email: {clean.email}</Typography>
            <Typography>Telefone: {clean.phone}</Typography>
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
