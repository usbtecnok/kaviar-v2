import React from "react";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import { Container, Typography, Box, Button, TextField } from "@mui/material";
import PassengerApp from "./components/passenger/PassengerApp";
import DriverApp from "./components/driver/DriverApp";
import AuthApp from "./components/auth/AuthApp";
import AdminApp from "./components/admin/AdminApp";
import CompleteOnboarding from "./pages/onboarding/CompleteOnboarding";
import PremiumTourism from "./pages/PremiumTourism";
import Turismo from "./pages/Turismo";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminResetPassword from "./pages/admin/ResetPassword";
import SetPassword from "./pages/driver/SetPassword";
import ProtectedRoute from "./routes/ProtectedRoute";
import { RideProvider } from "./context/RideContext";
import { DriverProvider } from "./context/DriverContext";
import { AuthProvider } from "./contexts/AuthContext";

function ConsultorForm() {
  const [form, setForm] = React.useState({ nome: '', whatsapp: '', bairro: '', cidade: '', qtd: '', obs: '' });
  const [sent, setSent] = React.useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const msg = `*Quero ser Consultor Kaviar*%0A%0ANome: ${encodeURIComponent(form.nome)}%0AWhatsApp: ${encodeURIComponent(form.whatsapp)}%0ABairro/Região: ${encodeURIComponent(form.bairro)}%0ACidade: ${encodeURIComponent(form.cidade)}%0AMotoristas que posso indicar: ${encodeURIComponent(form.qtd || 'não informado')}%0AObservações: ${encodeURIComponent(form.obs || 'nenhuma')}`;
    window.open(`https://wa.me/5521968648777?text=${msg}`, '_blank');
    setSent(true);
  };

  if (sent) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" sx={{ color: '#2ECC71', fontWeight: 700, mb: 1 }}>✅ Mensagem preparada!</Typography>
        <Typography variant="body2" color="text.secondary">
          Complete o envio na janela do WhatsApp que foi aberta. Nossa equipe entrará em contato em breve.
        </Typography>
        <Button onClick={() => setSent(false)} sx={{ mt: 2, textTransform: 'none' }}>Enviar novamente</Button>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField label="Nome completo" required value={form.nome} onChange={set('nome')} size="small" fullWidth />
      <TextField label="WhatsApp (com DDD)" required value={form.whatsapp} onChange={set('whatsapp')} size="small" fullWidth placeholder="(21) 99999-9999" />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <TextField label="Bairro / Região" required value={form.bairro} onChange={set('bairro')} size="small" />
        <TextField label="Cidade" required value={form.cidade} onChange={set('cidade')} size="small" />
      </Box>
      <TextField label="Quantos motoristas poderia indicar?" value={form.qtd} onChange={set('qtd')} size="small" fullWidth placeholder="Ex: 3 a 5" />
      <TextField label="Observações (opcional)" value={form.obs} onChange={set('obs')} size="small" fullWidth multiline rows={2} />
      <Button type="submit" variant="contained" sx={{
        py: 1.5, borderRadius: 2, fontWeight: 700, fontSize: '1rem', textTransform: 'none',
        backgroundColor: '#FFD700', color: '#1a1a2e',
        '&:hover': { backgroundColor: '#CCB000', transform: 'translateY(-1px)' },
        transition: 'all 0.2s ease'
      }}>
        Enviar via WhatsApp
      </Button>
    </Box>
  );
}

function Home() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Container maxWidth="md" sx={{ textAlign: "center", py: 4 }}>
        <Box sx={{ mb: 6 }}>
          <img
            src="/kaviar-logo.jpg"
            alt="Kaviar"
            style={{
              width: 120,
              height: 'auto',
              marginBottom: 32,
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
            }}
          />
          <Typography
            variant="h1"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 800,
              color: 'primary.main',
              letterSpacing: '-0.03em',
              mb: 3,
              fontSize: { xs: '2.5rem', md: '3.5rem' }
            }}
          >
            KAVIAR
          </Typography>
          <Typography
            variant="h4"
            color="text.primary"
            sx={{
              mb: 4,
              fontWeight: 500,
              lineHeight: 1.3,
              fontSize: { xs: '1.5rem', md: '2rem' }
            }}
          >
            Sistema de Corridas Comunitárias Premium
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              mb: 8,
              maxWidth: 600,
              mx: 'auto',
              fontSize: '1.25rem',
              lineHeight: 1.5,
              fontWeight: 400
            }}
          >
            Conecte-se ao seu bairro através de transporte colaborativo inteligente.<br />
            Motoristas especializados, passageiros satisfeitos, bairros fortalecidos.
          </Typography>
        </Box>

        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          maxWidth: 400,
          mx: 'auto'
        }}>
          <Button
            variant="contained"
            size="large"
            component={Link}
            to="/cadastro"
            sx={{
              py: 3,
              px: 6,
              width: '100%',
              backgroundColor: '#2e7d32',
              borderRadius: 3,
              fontWeight: 700,
              fontSize: '1.1rem',
              textTransform: 'none',
              boxShadow: '0 8px 24px rgba(46, 125, 50, 0.3)',
              '&:hover': {
                backgroundColor: '#1b5e20',
                boxShadow: '0 12px 32px rgba(46, 125, 50, 0.4)',
                transform: 'translateY(-2px)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            🚀 Cadastrar-se no KAVIAR
          </Button>

          <Box sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 2,
            width: '100%'
          }}>
            <Button
              variant="outlined"
              size="medium"
              component={Link}
              to="/passageiro"
              sx={{
                py: 2,
                borderRadius: 2,
                fontWeight: 600,
                fontSize: '0.9rem',
                textTransform: 'none',
                borderColor: '#1976d2',
                color: '#1976d2',
                '&:hover': {
                  backgroundColor: '#1976d2',
                  color: 'white',
                  transform: 'translateY(-1px)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              Passageiro
            </Button>

            <Button
              variant="outlined"
              size="medium"
              component={Link}
              to="/login"
              sx={{
                py: 2,
                borderRadius: 2,
                fontWeight: 600,
                fontSize: '0.9rem',
                textTransform: 'none',
                borderColor: '#111',
                color: '#111',
                '&:hover': {
                  backgroundColor: '#111',
                  color: 'white',
                  transform: 'translateY(-1px)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              Entrar
            </Button>

            <Button
              variant="outlined"
              size="medium"
              component={Link}
              to="/admin/login"
              sx={{
                py: 2,
                borderRadius: 2,
                fontWeight: 600,
                fontSize: '0.9rem',
                textTransform: 'none',
                borderColor: '#d32f2f',
                color: '#d32f2f',
                '&:hover': {
                  backgroundColor: '#d32f2f',
                  color: 'white',
                  transform: 'translateY(-1px)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              Admin
            </Button>
          </Box>

          <Button
            variant="contained"
            size="large"
            component={Link}
            to="/turismo"
            sx={{
              py: 2.5,
              px: 5,
              width: '100%',
              backgroundColor: '#9c27b0',
              borderRadius: 3,
              fontWeight: 700,
              fontSize: '1rem',
              textTransform: 'none',
              boxShadow: '0 6px 20px rgba(156, 39, 176, 0.3)',
              '&:hover': {
                backgroundColor: '#7b1fa2',
                boxShadow: '0 8px 28px rgba(156, 39, 176, 0.4)',
                transform: 'translateY(-2px)'
              },
              transition: 'all 0.3s ease',
              mt: 2
            }}
          >
            🏖️ Turismo Premium
          </Button>
        </Box>

        {/* Seção Consultor Kaviar */}
        <Box sx={{ mt: 10, pt: 6, borderTop: '1px solid', borderColor: 'divider' }} id="saiba-mais">
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#FFD700', mb: 1, fontSize: { xs: '1.8rem', md: '2.2rem' } }}>
            Seja um Consultor Kaviar
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontSize: '1.1rem', maxWidth: 600, mx: 'auto' }}>
            Ajude a expandir a rede de motoristas da Kaviar na sua região e tenha uma renda extra com indicações qualificadas.
          </Typography>

          <Box sx={{ textAlign: 'left', maxWidth: 600, mx: 'auto', mb: 5 }}>
            <Typography variant="body1" color="text.primary" sx={{ mb: 3, lineHeight: 1.8 }}>
              A Kaviar está ampliando sua rede de motoristas em novas regiões.
              Se você conhece pessoas de confiança que poderiam dirigir com a gente, você pode se tornar um Consultor Kaviar e participar desse crescimento.
            </Typography>

            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>
              Como funciona
            </Typography>
            <Box component="ol" sx={{ pl: 2.5, mb: 3, '& li': { mb: 1, color: 'text.primary', lineHeight: 1.7 } }}>
              <li>Você se cadastra como Consultor Kaviar</li>
              <li>Indica motoristas da sua região</li>
              <li>A equipe da Kaviar entra em contato com os indicados</li>
              <li>Quando o motorista indicado completar a primeira corrida real, você recebe a bonificação</li>
            </Box>

            <Box sx={{ bgcolor: '#1a1a2e', borderRadius: 3, p: 3, border: '1px solid #FFD700', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#FFD700' }}>
                💰 Regra de bonificação
              </Typography>
              <Typography variant="body1" sx={{ color: '#f5f5f5', lineHeight: 1.8 }}>
                <strong>R$ 20,00 por motorista indicado</strong> que completar sua primeira corrida real na plataforma.
              </Typography>
              <Typography variant="body2" sx={{ color: '#a0a0b0', mt: 1, lineHeight: 1.7 }}>
                Não pagamos por simples cadastro. A bonificação é ativada somente quando o motorista que você indicou
                for aprovado, começar a rodar e finalizar a primeira corrida com sucesso. Isso garante qualidade para
                todos e recompensa indicações reais.
              </Typography>
            </Box>
          </Box>

          {/* Formulário de cadastro */}
          <Box sx={{ maxWidth: 480, mx: 'auto' }} id="consultor">
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: 'primary.main' }}>
              Quero ser Consultor Kaviar
            </Typography>
            <ConsultorForm />
          </Box>
        </Box>

        {/* Seção Download APKs */}
        <Box sx={{ mt: 10, pt: 6, borderTop: '1px solid', borderColor: 'divider' }} id="download">
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mb: 1, fontSize: { xs: '1.8rem', md: '2.2rem' } }}>
            Baixe o app KAVIAR
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 5, fontSize: '1.1rem' }}>
            Escolha a versão ideal para você e instale agora mesmo no seu celular Android.
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3, maxWidth: 600, mx: 'auto' }}>
            {/* Card Motorista */}
            <Box sx={{ bgcolor: '#fff', borderRadius: 3, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid', borderColor: 'divider', textAlign: 'left' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>🚗 KAVIAR Motorista</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                Receba corridas, acompanhe solicitações e gerencie sua operação com praticidade.
              </Typography>
              <Button
                variant="contained"
                fullWidth
                href="https://downloads.kaviar.com.br/kaviar-motorista-v4.apk"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  py: 1.5, borderRadius: 2, fontWeight: 700, fontSize: '0.95rem', textTransform: 'none',
                  backgroundColor: '#2e7d32',
                  '&:hover': { backgroundColor: '#1b5e20', transform: 'translateY(-1px)' },
                  transition: 'all 0.2s ease'
                }}
              >
                Baixar App do Motorista
              </Button>
            </Box>

            {/* Card Passageiro */}
            <Box sx={{ bgcolor: '#fff', borderRadius: 3, p: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid', borderColor: 'divider', textAlign: 'left' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>👤 KAVIAR Passageiro</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                Solicite corridas com rapidez, acompanhe sua viagem e tenha mais praticidade no dia a dia.
              </Typography>
              <Button
                variant="contained"
                fullWidth
                href="https://downloads.kaviar.com.br/kaviar-passageiro-v9.apk"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  py: 1.5, borderRadius: 2, fontWeight: 700, fontSize: '0.95rem', textTransform: 'none',
                  backgroundColor: '#1976d2',
                  '&:hover': { backgroundColor: '#1565c0', transform: 'translateY(-1px)' },
                  transition: 'all 0.2s ease'
                }}
              >
                Baixar App do Passageiro
              </Button>
            </Box>
          </Box>
        </Box>

        <Box sx={{ mt: 8, pt: 4, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>
            © 2026 KAVIAR — uma plataforma USB Tecnok Manutenção e Instalação de Computadores Ltda.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default function App() {
  return (
    <RideProvider>
      <DriverProvider>
        <Routes>
          <Route path="/" element={<Home />} />

          {/* Tela de escolha */}
          <Route path="/login" element={<Login />} />
          
          {/* Reset de senha */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/admin/reset-password"
            element={
              <AuthProvider>
                <AdminResetPassword />
              </AuthProvider>
            }
          />
          
          {/* First access motorista */}
          <Route path="/motorista/definir-senha" element={<SetPassword />} />

          {/* Mantém o AuthApp (se ainda existir fluxo interno) */}
          <Route path="/auth/*" element={<AuthApp />} />

          {/* Cadastro (onboarding) */}
          <Route path="/cadastro" element={<CompleteOnboarding />} />

          {/* Apps */}
          <Route
            path="/passageiro/*"
            element={
              <ProtectedRoute allowedRoles={['PASSENGER']}>
                <PassengerApp />
              </ProtectedRoute>
            }
          />
          <Route path="/motorista/*" element={<DriverApp />} />
          <Route
            path="/admin/*"
            element={
              <AuthProvider>
                <AdminApp />
              </AuthProvider>
            }
          />

          <Route path="/turismo" element={<Turismo />} />
          <Route path="/premium-tourism" element={<PremiumTourism />} />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DriverProvider>
    </RideProvider>
  );
}
