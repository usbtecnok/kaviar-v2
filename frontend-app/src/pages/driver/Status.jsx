import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  Button,
  Card,
  CardContent,
  LinearProgress
} from '@mui/material';
import WarningAmber from '@mui/icons-material/WarningAmber';
import CheckCircle from '@mui/icons-material/CheckCircle';
import HourglassEmpty from '@mui/icons-material/HourglassEmpty';
import { Link } from 'react-router-dom';

export default function DriverStatus() {
  const [driverStatus, setDriverStatus] = useState('pending');
  const [documentsSubmitted, setDocumentsSubmitted] = useState(false);

  useEffect(() => {
    const driverData = localStorage.getItem("kaviar_driver_data");
    if (driverData) {
      try {
        const driver = JSON.parse(driverData);
        setDriverStatus(driver.status || 'pending');
        setDocumentsSubmitted(!!driver.certidao_nada_consta_url);
      } catch (error) {
        console.error('Error parsing driver data:', error);
      }
    }
  }, []);

  // ✅ Banner de status pending
  const isPending = driverStatus === 'pending';

  const renderStatusContent = () => {
    switch (driverStatus) {
      case 'pending':
        return (
          <>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight={600}>
                Cadastro em Análise
              </Typography>
              <Typography variant="body2">
                Seu cadastro está sendo analisado pela equipe Kaviar. 
                Você será notificado quando for aprovado.
              </Typography>
            </Alert>
            
            {!documentsSubmitted && (
              <Card sx={{ mb: 3 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <WarningAmber sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
                  <Typography variant="h5" gutterBottom>
                    Informações Pendentes
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 3 }}>
                    Você precisa completar suas informações para ser aprovado como motorista.
                  </Typography>
                  <Button
                    variant="contained"
                  component={Link}
                  to="/motorista/documents"
                  size="large"
                >
                  Completar Informações
                </Button>
              </CardContent>
            </Card>
            )}
          </>
        );

      case 'approved':
        return (
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Motorista Aprovado!
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                Parabéns! Você foi aprovado e já pode receber corridas.
              </Typography>
              <Button
                variant="contained"
                component={Link}
                to="/motorista/home"
                size="large"
              >
                Ir para Dashboard
              </Button>
            </CardContent>
          </Card>
        );

      case 'suspended':
      case 'rejected':
        return (
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <WarningAmber sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Cadastro Rejeitado
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                Infelizmente seus documentos não foram aprovados. Entre em contato conosco para mais informações.
              </Typography>
              <Button
                variant="outlined"
                href="mailto:suporte@kaviar.com"
                size="large"
              >
                Entrar em Contato
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom align="center">
        Status do Motorista
      </Typography>

      {/* Bloqueio visual baseado no status */}
      {driverStatus !== 'approved' && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Acesso Restrito
          </Typography>
          Você não pode receber corridas até ser aprovado como motorista.
        </Alert>
      )}

      {renderStatusContent()}

      {/* Informações adicionais */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Próximos Passos
        </Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          <li>
            <Typography variant="body2">
              Complete todas as informações solicitadas
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              Aguarde a análise da equipe (2-3 dias úteis)
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              Após aprovação, você poderá receber corridas
            </Typography>
          </li>
        </Box>
      </Paper>
    </Container>
  );
}
