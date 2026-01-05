import { Routes, Route, Link, Navigate } from "react-router-dom";
import { Container, Typography, Box, Button } from "@mui/material";
import PassengerApp from "./components/passenger/PassengerApp";
import DriverApp from "./components/driver/DriverApp";
import AuthApp from "./components/auth/AuthApp";
import AdminApp from "./components/admin/AdminApp";
import CompleteOnboarding from "./pages/onboarding/CompleteOnboarding";
import PremiumTourism from "./pages/PremiumTourism";
import Login from "./pages/Login";
import { RideProvider } from "./context/RideContext";
import { DriverProvider } from "./context/DriverContext";

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
            Conecte-se à sua comunidade através de transporte colaborativo inteligente.<br />
            Motoristas especializados, passageiros satisfeitos, comunidades fortalecidas.
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

        <Box sx={{ mt: 8, pt: 4, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>
            © 2026 KAVIAR - Transformando mobilidade urbana
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

          {/* Mantém o AuthApp (se ainda existir fluxo interno) */}
          <Route path="/auth/*" element={<AuthApp />} />

          {/* Cadastro (onboarding) */}
          <Route path="/cadastro" element={<CompleteOnboarding />} />

          {/* Apps */}
          <Route path="/passageiro/*" element={<PassengerApp />} />
          <Route path="/motorista/*" element={<DriverApp />} />
          <Route path="/admin/*" element={<AdminApp />} />

          <Route path="/turismo" element={<PremiumTourism />} />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DriverProvider>
    </RideProvider>
  );
}
