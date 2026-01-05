import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  Button,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Shield, Warning } from '@mui/icons-material';

export default function LGPDConsent() {
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  // Verificar se já aceitou LGPD (implementar com API real)
  useEffect(() => {
    // checkLGPDStatus();
  }, []);

  const handleAcceptLGPD = async () => {
    setLoading(true);
    try {
      // Implementar chamada para API de consentimento
      // await api.post('/api/governance/consent', {
      //   passengerId: currentUser.id,
      //   consentType: 'lgpd',
      //   accepted: true
      // });
      setLgpdAccepted(true);
    } catch (error) {
      console.error('Erro ao registrar consentimento:', error);
    } finally {
      setLoading(false);
    }
  };

  if (lgpdAccepted) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Shield sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Consentimento Registrado
          </Typography>
          <Typography variant="body1">
            Seu consentimento LGPD foi registrado com sucesso. Você pode usar todos os recursos do sistema.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Alert severity="error" sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          <Warning sx={{ mr: 1, verticalAlign: 'middle' }} />
          Consentimento LGPD Obrigatório
        </Typography>
        Para usar o sistema KAVIAR, você deve aceitar nossos termos de privacidade conforme a LGPD.
      </Alert>

      <Paper sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Shield sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Proteção de Dados Pessoais
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Respeitamos sua privacidade e seguimos a Lei Geral de Proteção de Dados (LGPD)
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Como tratamos seus dados:
          </Typography>
          <Box component="ul" sx={{ pl: 2 }}>
            <li>
              <Typography variant="body2">
                Coletamos apenas dados necessários para o funcionamento do serviço
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Seus dados são protegidos com criptografia e medidas de segurança
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Você pode solicitar exclusão dos seus dados a qualquer momento
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                Não compartilhamos seus dados com terceiros sem autorização
              </Typography>
            </li>
          </Box>
        </Box>

        <Box sx={{ textAlign: 'center' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={lgpdAccepted}
                onChange={(e) => setLgpdAccepted(e.target.checked)}
              />
            }
            label="Aceito o tratamento dos meus dados pessoais conforme descrito"
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => setShowTerms(true)}
            >
              Ler Termos Completos
            </Button>
            <Button
              variant="contained"
              onClick={handleAcceptLGPD}
              disabled={!lgpdAccepted || loading}
              size="large"
            >
              {loading ? 'Registrando...' : 'Aceitar e Continuar'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Dialog com termos completos */}
      <Dialog open={showTerms} onClose={() => setShowTerms(false)} maxWidth="md" fullWidth>
        <DialogTitle>Termos de Privacidade - LGPD</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            Este documento descreve como a KAVIAR coleta, usa e protege suas informações pessoais...
          </Typography>
          <Typography variant="body2" paragraph>
            [Texto completo dos termos LGPD seria inserido aqui]
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTerms(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
