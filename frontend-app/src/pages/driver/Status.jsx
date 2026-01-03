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
import { Warning, CheckCircle, HourglassEmpty } from '@mui/icons-material';
import { Link } from 'react-router-dom';

export default function DriverStatus() {
  const [driverStatus, setDriverStatus] = useState('pending'); // Simular - vem do contexto real
  const [documentsSubmitted, setDocumentsSubmitted] = useState(false);

  // Simular verificação de status (implementar com API real)
  useEffect(() => {
    // Verificar status do motorista logado
    // setDriverStatus(currentDriver.status);
    // setDocumentsSubmitted(!!currentDriver.documentCpf);
  }, []);

  const renderStatusContent = () => {
    switch (driverStatus) {
      case 'pending':
        if (!documentsSubmitted) {
          return (
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Warning sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Documentos Pendentes
                </Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  Você precisa enviar seus documentos para ser aprovado como motorista.
                </Typography>
                <Button
                  variant="contained"
                  component={Link}
                  to="/motorista/documents"
                  size="large"
                >
                  Enviar Documentos
                </Button>
              </CardContent>
            </Card>
          );
        } else {
          return (
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <HourglassEmpty sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Aguardando Aprovação
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Seus documentos foram enviados e estão sendo analisados.
                </Typography>
                <LinearProgress sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Tempo médio de análise: 2-3 dias úteis
                </Typography>
              </CardContent>
            </Card>
          );
        }

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
              <Warning sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
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
              Envie todos os documentos solicitados
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
