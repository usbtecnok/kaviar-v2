import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { DirectionsCar } from '@mui/icons-material';

/**
 * TELA DE LOGIN
 * 
 * Autenticação simples com seleção de tipo de usuário.
 * Em produção, integraria com sistema de auth real.
 */
function Login() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    userType: ''
  });
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password || !formData.userType) {
      setError('Todos os campos são obrigatórios');
      return;
    }

    setIsLoading(true);
    
    try {
      // Simular autenticação
      // Em produção, faria chamada real para API de auth
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simular token e dados do usuário
      localStorage.setItem('kaviar_token', 'fake-jwt-token');
      localStorage.setItem('kaviar_user_type', formData.userType);
      localStorage.setItem('kaviar_user_email', formData.email);
      
      // Redirecionar baseado no tipo de usuário
      switch (formData.userType) {
        case 'passenger':
          navigate('/passenger');
          break;
        case 'driver':
          navigate('/driver');
          break;
        case 'admin':
          navigate('/admin');
          break;
        default:
          setError('Tipo de usuário inválido');
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent sx={{ p: 4 }}>
          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <DirectionsCar sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Kaviar
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Corridas comunitárias
            </Typography>
          </Box>

          {/* Formulário */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              variant="outlined"
            />
            
            <TextField
              fullWidth
              label="Senha"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              variant="outlined"
            />
            
            <FormControl fullWidth>
              <InputLabel>Tipo de Usuário</InputLabel>
              <Select
                value={formData.userType}
                label="Tipo de Usuário"
                onChange={(e) => handleInputChange('userType', e.target.value)}
              >
                <MenuItem value="passenger">Passageiro</MenuItem>
                <MenuItem value="driver">Motorista</MenuItem>
                <MenuItem value="admin">Administrador</MenuItem>
              </Select>
            </FormControl>

            {error && (
              <Alert severity="error">
                {error}
              </Alert>
            )}

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </Box>

          {/* Demo Info */}
          <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" display="block" gutterBottom>
              <strong>Demo - Use qualquer email/senha:</strong>
            </Typography>
            <Typography variant="caption" display="block">
              • Passageiro: Solicitar corridas e serviços especiais
            </Typography>
            <Typography variant="caption" display="block">
              • Motorista: Receber e aceitar corridas
            </Typography>
            <Typography variant="caption" display="block">
              • Admin: Gerenciar comunidades e aprovar mudanças
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}

export default Login;
