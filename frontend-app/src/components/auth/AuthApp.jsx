import { Routes, Route, Link } from "react-router-dom";
import { Container, Typography, Box, Button } from "@mui/material";
import { Login as LoginIcon } from "@mui/icons-material";
import DomainHeader from "../common/DomainHeader";
import LoginForm from "./LoginForm";
import KaviarLogo from "../common/KaviarLogo";

function AuthHome() {
  return (
    <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
      <DomainHeader 
        domain="login" 
        title="Acesso ao Sistema"
        showBackButton={true}
        backUrl="/"
      />
      
      <Box sx={{ mb: 4 }}>
        <KaviarLogo variant="icon" size="large" sx={{ mb: 2 }} />
        <LoginIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h4" component="h1" gutterBottom>
          Acesso KAVIAR
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Entre no sistema de corridas comunitárias
        </Typography>
      </Box>
      
      <Box sx={{ mb: 4 }}>
        <Button 
          variant="contained" 
          size="large" 
          component={Link}
          to="/login/form"
          sx={{ py: 2, px: 4 }}
        >
          Fazer Login
        </Button>
      </Box>
    </Container>
  );
}

function LoginWrapper() {
  return (
    <Container maxWidth="sm" sx={{ mt: 2 }}>
      <DomainHeader 
        domain="login" 
        title="Formulário de Login"
        backUrl="/login"
      />
      <LoginForm />
    </Container>
  );
}

export default function AuthApp() {
  return (
    <Routes>
      <Route path="/" element={<AuthHome />} />
      <Route path="/form" element={<LoginWrapper />} />
    </Routes>
  );
}
