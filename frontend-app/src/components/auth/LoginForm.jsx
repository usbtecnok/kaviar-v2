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
        console.log('[LoginForm] Token salvo');
        
        // Capturar localização apenas 1x por sessão (não-bloqueante)
        if (navigator.geolocation && !sessionStorage.getItem('gps_sent')) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                await api.post('/api/passenger/onboarding/location', {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  accuracy_m: position.coords.accuracy
                });
                sessionStorage.setItem('gps_sent', '1');
                console.log('[LoginForm] Localização capturada');
              } catch (error) {
                console.log('[LoginForm] Erro ao enviar localização (não-crítico)');
              }
            },
            () => console.log('[LoginForm] Localização negada (não-crítico)'),
            { timeout: 5000, maximumAge: 60000 }
          );
        }
        
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
