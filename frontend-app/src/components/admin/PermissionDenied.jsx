import { Box, Paper, Typography, Button } from '@mui/material';
import { Lock } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export default function PermissionDenied({ message }) {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          maxWidth: 500, 
          textAlign: 'center',
          bgcolor: '#000',
          color: '#FFD700',
          border: '1px solid #FFD700'
        }}
      >
        <Lock sx={{ fontSize: 64, mb: 2, opacity: 0.8 }} />
        
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          Permissão Necessária
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
          {message || 'Você não possui permissão para acessar este recurso. Entre em contato com o administrador do sistema.'}
        </Typography>
        
        <Button
          variant="outlined"
          onClick={() => navigate('/admin')}
          sx={{ 
            color: '#FFD700',
            borderColor: '#FFD700',
            '&:hover': {
              borderColor: '#FFF',
              bgcolor: 'rgba(255, 215, 0, 0.1)'
            }
          }}
        >
          Voltar ao Painel
        </Button>
      </Paper>
    </Box>
  );
}
