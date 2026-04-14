import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Box, Typography, CircularProgress } from '@mui/material';

// Motoristas convidados agora recebem link com token de reset.
// Esta página redireciona links legados (com ?email=) para o fluxo seguro.
export default function SetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      navigate(`/admin/reset-password?token=${token}`, { replace: true });
    } else {
      // Link legado com ?email= — redireciona para forgot-password
      navigate('/forgot-password', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Box sx={{ textAlign: 'center' }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography>Redirecionando...</Typography>
      </Box>
    </Container>
  );
}
