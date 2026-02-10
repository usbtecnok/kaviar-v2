import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TextField, 
  Button, 
  Box, 
  Alert,
  Typography
} from '@mui/material';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('[LoginForm] Enviando login:', { email, hasPassword: !!password });

    try {
      const response = await api.post('/api/auth/passenger/login', {
        email: email.trim(),
        password
      });

      console.log('[LoginForm] Response:', { success: response.data.success, hasToken: !!response.data.token });

      if (response.data.success) {
        localStorage.setItem('kaviar_token', response.data.token);
        localStorage.setItem('kaviar_user', JSON.stringify(response.data.user));
        setUser(response.data.user);
        console.log('[LoginForm] Token salvo, redirecionando...');
        navigate('/passageiro/home');
      } else {
        setError('Email ou senha incorretos');
      }
    } catch (error) {
      console.error('[LoginForm] Erro:', error.response?.data || error.message);
      setError(error.response?.data?.error || 'Erro no login');
    }
    
    setLoading(false);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Typography variant="h5" gutterBottom>
        Login do Passageiro
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        fullWidth
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Senha"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        sx={{ mb: 3 }}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        disabled={loading}
        sx={{ py: 1.5 }}
      >
        {loading ? 'Entrando...' : 'Entrar'}
      </Button>
    </Box>
  );
}
