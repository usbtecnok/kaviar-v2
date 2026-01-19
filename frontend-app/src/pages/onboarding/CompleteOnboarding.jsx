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
      
      // Se for motorista, verificar se está autenticado
      if (typeFromUrl === 'driver') {
        const token = localStorage.getItem('kaviar_driver_token');
        if (!token) {
          setError('Você precisa fazer login primeiro para completar seu perfil.');
          setTimeout(() => {
            navigate('/motorista/login');
          }, 2000);
        }
      }
    }
  }, [searchParams, navigate]);
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
    vehicleColor: '',
    certidaoNadaConsta: null, // UI only - not persisted
    pixKey: '',
    pixKeyType: 'CPF', // CPF, CNPJ, EMAIL, PHONE, RANDOM
    // Guide specific
    isBilingual: false,
    languages: [],
    alsoDriver: false,
    // Family bonus
    familyProfile: 'individual', // individual | familiar
    familyBonusAccepted: false
  });
  const [communities, setCommunities] = useState([]);
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
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
    vehicleColor: formData.vehicleColor ?? '',
    certidaoNadaConsta: formData.certidaoNadaConsta,
    pixKey: formData.pixKey ?? '',
    pixKeyType: formData.pixKeyType ?? 'CPF',
    isBilingual: !!formData.isBilingual,
    languages: formData.languages ?? [],
    alsoDriver: !!formData.alsoDriver,
    familyProfile: formData.familyProfile ?? 'individual',
    familyBonusAccepted: !!formData.familyBonusAccepted,
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
      if (!clean.name || !clean.email || !clean.phone || !clean.password) {
        setError('Preencha nome, email, telefone e senha.');
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
      if (!clean.name || !clean.phone) {
        setError('Preencha nome, telefone e permita o acesso à localização.');
        setLoading(false);
        return;
      }
      if (!clean.certidaoNadaConsta) {
        setError('É obrigatório enviar a Certidão Nada Consta para continuar.');
        setLoading(false);
        return;
      }
      if (!termsAccepted) {
        setError('Você deve aceitar os Termos de Uso KAVIAR.');
        setLoading(false);
        return;
      }
      if (!lgpdAccepted) {
        setError('Você deve aceitar a Política de Privacidade (LGPD).');
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
            localStorage.setItem('kaviar_token', loginResponse.data.token);
            localStorage.setItem('kaviar_user', JSON.stringify(loginResponse.data.user));
            
            // Redirect para área do passageiro
            setTimeout(() => {
              navigate('/passageiro/home');
            }, 2000);
          }
        } catch (loginError) {
          console.error('Erro no login automático:', loginError);
        }
      } else if (userType === 'driver') {
        // CADASTRO INICIAL DO MOTORISTA (via /governance/driver)
        if (!clean.password || clean.password.length < 6) {
          setError('Senha deve ter pelo menos 6 caracteres.');
          setLoading(false);
          return;
        }
        if (clean.password !== clean.confirmPassword) {
          setError('Senhas não coincidem.');
          setLoading(false);
          return;
        }

        // 1. Criar motorista com senha
        const registerResponse = await api.post('/api/governance/driver', {
          name: clean.name,
          email: clean.email,
          phone: clean.phone,
          password: clean.password,
          documentCpf: clean.documentCpf || '',
          documentRg: clean.documentRg || '',
          documentCnh: clean.documentCnh || '',
          vehiclePlate: clean.vehiclePlate || '',
          vehicleModel: clean.vehicleModel || '',
          vehicleColor: clean.vehicleColor || ''
        });

        userId = registerResponse.data.data.id;

        // 2. Fazer login automático
        try {
          const loginResponse = await api.post('/api/auth/driver/login', {
            email: clean.email,
            password: clean.password
          });

          // Se login retornar 403 (pending), é esperado
          if (loginResponse.status === 403) {
            setCompleted(true);
            setError('');
            setLoading(false);
            return;
          }

          const token = loginResponse.data.token;
          localStorage.setItem('kaviar_driver_token', token);
          localStorage.setItem('kaviar_driver_data', JSON.stringify(loginResponse.data.user));
        } catch (loginError) {
          // Login falhou (403 pending é esperado)
          if (loginError.response?.status === 403) {
            setCompleted(true);
            setError('');
            setLoading(false);
            return;
          }
          throw loginError;
        }

        setCompleted(true);
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
      const apiError = error.response?.data;

      if (Array.isArray(apiError?.error)) {
        setError(
          apiError.error.map(e => e.message).join('\n')
        );
      } else if (typeof apiError?.message === 'string') {
        setError(apiError.message);
      } else {
        setError('Erro ao finalizar cadastro. Verifique os dados informados.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    // Redirecionar motorista para definir senha
    if (userType === 'driver') {
      setTimeout(() => {
        navigate('/motorista/definir-senha');
      }, 2000);
    }

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
                : userType === 'driver'
                ? 'Cadastro inicial concluído. Agora defina sua senha para acessar.'
                : 'Seu cadastro foi enviado para análise. Você receberá um email quando for aprovado.'
              }
            </Typography>
            {userType !== 'driver' && (
              <Button
                variant="contained"
                onClick={() => navigate('/')}
                size="large"
              >
                Voltar ao Início
              </Button>
            )}
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
              helperText="Email é obrigatório"
            />
            <TextField
              label="Telefone"
              value={clean.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              fullWidth
            />

            {/* Campos de senha para passageiro E motorista */}
            {(userType === 'passenger' || userType === 'driver') && (
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
                <Typography variant="h6" sx={{ mt: 2 }}>Informações Adicionais</Typography>
                
                <Typography variant="body2" sx={{ mb: 1, mt: 2 }}>
                  Dados do Veículo
                </Typography>
                <TextField
                  label="Modelo do Veículo"
                  value={clean.vehicleModel}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehicleModel: e.target.value }))}
                  fullWidth
                  sx={{ mb: 2 }}
                  placeholder="Ex: Honda Civic, Fiat Uno"
                />
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Cor do Veículo</InputLabel>
                  <Select
                    value={clean.vehicleColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, vehicleColor: e.target.value }))}
                  >
                    <MenuItem value="">Selecione</MenuItem>
                    <MenuItem value="Branco">Branco</MenuItem>
                    <MenuItem value="Preto">Preto</MenuItem>
                    <MenuItem value="Prata">Prata</MenuItem>
                    <MenuItem value="Cinza">Cinza</MenuItem>
                    <MenuItem value="Azul">Azul</MenuItem>
                    <MenuItem value="Vermelho">Vermelho</MenuItem>
                    <MenuItem value="Verde">Verde</MenuItem>
                    <MenuItem value="Amarelo">Amarelo</MenuItem>
                    <MenuItem value="Bege">Bege</MenuItem>
                    <MenuItem value="Marrom">Marrom</MenuItem>
                    <MenuItem value="Outro">Outro</MenuItem>
                  </Select>
                </FormControl>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Certidão "Nada Consta" (Antecedentes Criminais) *
                  </Typography>
                  <Button
                    variant="outlined"
                    component="label"
                    fullWidth
                    color={clean.certidaoNadaConsta ? 'success' : 'primary'}
                  >
                    {clean.certidaoNadaConsta ? `✓ ${clean.certidaoNadaConsta.name}` : 'Selecionar Arquivo (PDF ou Imagem)'}
                    <input
                      type="file"
                      hidden
                      accept=".pdf,image/*"
                      onChange={(e) => setFormData(prev => ({ ...prev, certidaoNadaConsta: e.target.files[0] }))}
                    />
                  </Button>
                  <Typography variant="caption" color="error">
                    * Obrigatório para ativação da conta
                  </Typography>
                </Box>

                <Typography variant="body2" sx={{ mb: 1, mt: 2 }}>
                  Chave PIX para Recebimento
                </Typography>
                <FormControl fullWidth sx={{ mb: 1 }}>
                  <InputLabel>Tipo de Chave</InputLabel>
                  <Select
                    value={clean.pixKeyType}
                    onChange={(e) => setFormData(prev => ({ ...prev, pixKeyType: e.target.value }))}
                  >
                    <MenuItem value="CPF">CPF</MenuItem>
                    <MenuItem value="CNPJ">CNPJ</MenuItem>
                    <MenuItem value="EMAIL">E-mail</MenuItem>
                    <MenuItem value="PHONE">Telefone</MenuItem>
                    <MenuItem value="RANDOM">Chave Aleatória</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="Chave PIX"
                  value={clean.pixKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, pixKey: e.target.value }))}
                  fullWidth
                  helperText="* Apenas para visualização. Não será enviado nesta versão."
                />

                <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                  Bônus Familiar KAVIAR
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Selecione seu perfil para receber crédito mensal de abatimento em taxas:
                </Typography>
                <FormControl component="fieldset" sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={clean.familyProfile === 'individual'}
                          onChange={() => setFormData(prev => ({ ...prev, familyProfile: 'individual' }))}
                        />
                      }
                      label="Perfil Individual (R$ 50/mês)"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={clean.familyProfile === 'familiar'}
                          onChange={() => setFormData(prev => ({ ...prev, familyProfile: 'familiar' }))}
                        />
                      }
                      label="Perfil Familiar (R$ 100/mês)"
                    />
                  </Box>
                </FormControl>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={clean.familyBonusAccepted}
                      onChange={(e) => setFormData(prev => ({ ...prev, familyBonusAccepted: e.target.checked }))}
                      required
                    />
                  }
                  label={
                    <Typography variant="caption">
                      Declaro, sob minha responsabilidade, que o perfil familiar selecionado corresponde à minha situação atual, ciente de que a KAVIAR poderá revisar ou cancelar o benefício em caso de inconsistência.
                    </Typography>
                  }
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
            {userType === 'driver' && (
              <>
                <Typography variant="h6" gutterBottom>
                  Termos de Uso KAVIAR
                </Typography>
                <Paper sx={{ p: 2, mb: 3, maxHeight: 300, overflow: 'auto', bgcolor: 'grey.50' }}>
                  <Typography variant="body2" paragraph>
                    <strong>TERMOS DE USO KAVIAR – MOTORISTAS</strong>
                  </Typography>
                  <Typography variant="caption" display="block" gutterBottom>
                    Versão: 2026-01 (Provisória) | Última atualização: Janeiro de 2026
                  </Typography>
                  
                  <Typography variant="body2" paragraph sx={{ mt: 2 }}>
                    Ao prosseguir com o cadastro e utilizar a plataforma KAVIAR, o motorista declara que leu, compreendeu e concorda integralmente com os termos abaixo.
                  </Typography>

                  <Typography variant="body2" paragraph>
                    <strong>1. OBJETO DA PLATAFORMA</strong><br/>
                    A KAVIAR é uma plataforma tecnológica que conecta passageiros a motoristas independentes para prestação de serviços de transporte privado, não estabelecendo vínculo empregatício entre as partes.
                  </Typography>

                  <Typography variant="body2" paragraph>
                    <strong>2. REQUISITOS PARA MOTORISTAS</strong><br/>
                    Para utilizar a plataforma como motorista, o usuário declara que possui capacidade civil plena, é legalmente habilitado para dirigir, possui documentação válida exigida por lei e fornece informações verdadeiras, completas e atualizadas.
                  </Typography>

                  <Typography variant="body2" paragraph>
                    <strong>3. OBRIGAÇÕES DO MOTORISTA</strong><br/>
                    O motorista se compromete a manter comportamento respeitoso com passageiros, cumprir as leis de trânsito e normas locais, não realizar atividades ilícitas, utilizar a plataforma de boa-fé, manter seus dados atualizados, não ceder sua conta a terceiros e responder civil e criminalmente por seus atos.
                  </Typography>

                  <Typography variant="body2" paragraph>
                    <strong>4. GEOLOCALIZAÇÃO</strong><br/>
                    Ao utilizar a KAVIAR, o motorista autoriza expressamente a coleta de sua localização geográfica em tempo real para correspondência de corridas, segurança operacional, auditoria e prevenção de fraudes. Sem a localização ativa, o serviço poderá ser limitado ou indisponível.
                  </Typography>

                  <Typography variant="body2" paragraph>
                    <strong>5. PAGAMENTOS E CHAVE PIX</strong><br/>
                    A KAVIAR poderá utilizar chave PIX informada para repasses financeiros. O motorista é responsável pela veracidade da chave informada. A KAVIAR não se responsabiliza por erros decorrentes de dados incorretos.
                  </Typography>

                  <Typography variant="body2" paragraph>
                    <strong>6. CERTIDÃO "NADA CONSTA"</strong><br/>
                    A KAVIAR poderá solicitar, a qualquer momento, certidões negativas criminais ("Nada Consta") e outros documentos de idoneidade. O envio poderá ser obrigatório para continuidade na plataforma.
                  </Typography>

                  <Typography variant="body2" paragraph>
                    <strong>7. SUSPENSÃO E CANCELAMENTO</strong><br/>
                    A KAVIAR poderá suspender ou encerrar o acesso do motorista, a qualquer tempo, em caso de violação destes termos, reclamações recorrentes, suspeita de fraude, atividades ilegais ou descumprimento de políticas internas.
                  </Typography>

                  <Typography variant="body2" paragraph>
                    <strong>8. LIMITAÇÃO DE RESPONSABILIDADE</strong><br/>
                    A KAVIAR não garante volume mínimo de corridas, não se responsabiliza por conflitos entre motorista e passageiro e atua como intermediadora tecnológica.
                  </Typography>

                  <Typography variant="body2" paragraph>
                    <strong>9. ALTERAÇÕES DOS TERMOS</strong><br/>
                    Estes termos podem ser atualizados a qualquer momento. O motorista será notificado e deverá aceitar a nova versão para continuar utilizando a plataforma.
                  </Typography>

                  <Typography variant="body2" paragraph>
                    <strong>10. FORO</strong><br/>
                    Fica eleito o foro da comarca de domicílio da KAVIAR, para dirimir quaisquer controvérsias decorrentes destes termos.
                  </Typography>
                </Paper>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                    />
                  }
                  label="Li e aceito os Termos de Uso da KAVIAR"
                  required
                />
              </>
            )}
            
            <Typography variant="h6" gutterBottom sx={{ mt: userType === 'driver' ? 3 : 0 }}>
              Política de Privacidade (LGPD)
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Para utilizar nossos serviços, precisamos do seu consentimento para processar seus dados pessoais conforme a Lei Geral de Proteção de Dados.
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={lgpdAccepted}
                  onChange={(e) => setLgpdAccepted(e.target.checked)}
                />
              }
              label="Li e concordo com a Política de Privacidade (LGPD)"
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
            {userType !== 'driver' && <Typography>Email: {clean.email}</Typography>}
            <Typography>Telefone: {clean.phone}</Typography>
            {userType === 'driver' && (
              <>
                <Typography>Termos KAVIAR: {termsAccepted ? 'Aceito' : 'Não aceito'}</Typography>
                <Typography>LGPD: {lgpdAccepted ? 'Aceito' : 'Não aceito'}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  Sua localização será capturada ao finalizar
                </Typography>
              </>
            )}
            {userType !== 'driver' && (
              <Typography>LGPD: {lgpdAccepted ? 'Aceito' : 'Não aceito'}</Typography>
            )}
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
            {error.split('\n').map((msg, i) => (
              <div key={i}>• {msg}</div>
            ))}
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
            disabled={
              loading || 
              (activeStep === 2 && userType === 'driver' && (!termsAccepted || !lgpdAccepted)) ||
              (activeStep === 2 && userType !== 'driver' && !lgpdAccepted)
            }
          >
            {activeStep === steps.length - 1 ? 'Finalizar' : 'Próximo'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
