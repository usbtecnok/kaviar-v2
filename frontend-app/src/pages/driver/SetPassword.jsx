import { useState } from 'react';
import { Container, Paper, Typography, TextField, Button, Alert, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://kaviar-v2.onrender.com';

export default function DriverSetPassword() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/driver/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || 'Erro ao definir senha.');
        return;
      }

      setSuccess(true);
      
      // Fazer login automático após definir senha
      try {
        const loginRes = await fetch(`${API_BASE_URL}/api/auth/driver/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const loginData = await loginRes.json();

        if (loginRes.ok && loginData.token) {
          localStorage.setItem('kaviar_driver_token', loginData.token);
          
          // Salvar dados do motorista
          if (loginData.driver) {
            localStorage.setItem('kaviar_driver_data', JSON.stringify(loginData.driver));
          }
          
          // Redirecionar para onboarding para completar perfil
          setTimeout(() => {
            navigate('/onboarding?type=driver');
          }, 2000);
        } else {
          // Se login falhar, redirecionar para login manual
          setTimeout(() => {
            navigate('/motorista/login');
          }, 2000);
        }
      } catch (error) {
        // Em caso de erro, redirecionar para login manual
        setTimeout(() => {
          navigate('/motorista/login');
        }, 2000);
      }
    } catch (error) {
      setError('Erro ao conectar com o servidor.');
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: 6 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" fontWeight={800} gutterBottom align="center">
          Definir Senha
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }} align="center">
          Cadastro inicial concluído. Agora defina sua senha para acessar.
        </Typography>

        {success ? (
          <Alert severity="success">
            Senha definida com sucesso! Fazendo login e redirecionando para completar seu perfil...
          </Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Nova Senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                helperText="Mínimo 6 caracteres"
              />
              <TextField
                label="Confirmar Senha"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                fullWidth
              />
              
              {error && (
                <Alert severity="error">{error}</Alert>
              )}

              <Button type="submit" variant="contained" size="large" fullWidth>
                Definir Senha
              </Button>
            </Box>
          </form>
        )}
      </Paper>
    </Container>
  );
}
