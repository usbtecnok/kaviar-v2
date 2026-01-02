
import { Container, Typography, Button, Box, Paper } from '@mui/material';
import { Block } from '@mui/icons-material';
import KaviarLogo from '../components/common/KaviarLogo';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const AccessDenied = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoBack = () => {
    const redirectPath = user?.user_type === 'admin' ? '/admin' : 
                        user?.user_type === 'driver' ? '/driver' : 
                        '/passenger';
    navigate(redirectPath);
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%', textAlign: 'center' }}>
          <KaviarLogo variant="icon" size="large" sx={{ mb: 2, opacity: 0.5 }} />
          
          <Block sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          
          <Typography component="h1" variant="h4" gutterBottom>
            Acesso Negado
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            Você não tem permissão para acessar esta página.
          </Typography>
          
          <Button
            variant="contained"
            onClick={handleGoBack}
            sx={{ mt: 2 }}
          >
            Voltar ao Início
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default AccessDenied;
