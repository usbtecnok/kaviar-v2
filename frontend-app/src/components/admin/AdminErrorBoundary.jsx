import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Admin Error Boundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/admin';
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: '#000',
          color: '#FFD700',
          p: 3
        }}>
          <Box sx={{ textAlign: 'center', maxWidth: 500 }}>
            <ErrorOutline sx={{ fontSize: 64, mb: 2, color: '#FFD700' }} />
            
            <Typography variant="h4" gutterBottom sx={{ color: '#FFD700', fontWeight: 'bold' }}>
              Erro no Painel Admin
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 3, color: '#FFF' }}>
              Ocorreu um erro inesperado no painel administrativo. 
              Tente recarregar a página ou voltar ao início.
            </Typography>

            <Alert severity="error" sx={{ mb: 3, bgcolor: '#1a1a1a', color: '#FFD700' }}>
              {this.state.error?.message || 'Erro desconhecido'}
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button 
                variant="contained" 
                onClick={this.handleReload}
                startIcon={<Refresh />}
                sx={{ 
                  bgcolor: '#FFD700', 
                  color: '#000',
                  '&:hover': { bgcolor: '#FFC107' }
                }}
              >
                Recarregar
              </Button>
              
              <Button 
                variant="outlined" 
                onClick={this.handleGoHome}
                sx={{ 
                  borderColor: '#FFD700', 
                  color: '#FFD700',
                  '&:hover': { borderColor: '#FFC107', bgcolor: 'rgba(255, 215, 0, 0.1)' }
                }}
              >
                Voltar ao Início
              </Button>
            </Box>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default AdminErrorBoundary;
