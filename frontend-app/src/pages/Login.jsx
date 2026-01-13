import React from 'react';
import { Container, Grid, Card, CardContent, Typography, Button, Stack } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Acesso ao sistema
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Escolha como você quer entrar. (Admin é separado do Passageiro/Motorista)
      </Typography>

      <Grid container spacing={2}>
        {/* PASSAGEIRO */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Passageiro
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Solicitar corrida, escolher serviço (inclui CARE), acompanhar status e avaliar motorista.
              </Typography>

              <Stack spacing={1}>
                <Button
                  onClick={() => navigate('/login')}
                  variant="contained"
                  fullWidth
                >
                  Entrar como Passageiro
                </Button>
                
                <Button
                  component={RouterLink}
                  to="/cadastro?type=passageiro"
                  variant="outlined"
                  fullWidth
                >
                  Cadastrar Passageiro
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* MOTORISTA */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Motorista
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Cadastro, envio de documentos e corridas (área protegida).
              </Typography>

              <Stack spacing={1}>
                <Button
                  component={RouterLink}
                  to="/cadastro"
                  variant="contained"
                  fullWidth
                >
                  Cadastrar / Completar Cadastro
                </Button>

                <Button
                  component={RouterLink}
                  to="/motorista/documents"
                  variant="outlined"
                  fullWidth
                >
                  Enviar Documentos
                </Button>
              </Stack>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                Obs.: A área do motorista exige autenticação. Se não tiver login ainda, ela vai te mandar para esta tela.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* ADMIN */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Administrador
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Painel admin (Premium Tourism, aprovações, etc).
              </Typography>

              <Stack spacing={1}>
                <Button
                  component={RouterLink}
                  to="/admin/login"
                  variant="contained"
                  color="secondary"
                  fullWidth
                >
                  Entrar como Admin
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
        Dica: o serviço CARE aparece dentro de Passageiro → “Escolha seu serviço”.
      </Typography>
    </Container>
  );
}
