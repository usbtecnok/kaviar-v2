import { Routes, Route } from "react-router-dom";
import { Container, Typography, Box, Card, CardContent, Button, Chip } from "@mui/material";
import { DirectionsCar, AttachMoney, NotificationImportant } from "@mui/icons-material";
import { Link } from "react-router-dom";
import DomainHeader from "../common/DomainHeader";
import DriverHome from "../../pages/driver/Home";
import RideReceived from "../../pages/driver/RideReceived";
import Earnings from "../../pages/driver/Earnings";

function DriverDashboard() {
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <DomainHeader 
        domain="motorista" 
        title="Área do Motorista"
        showBackButton={true}
        backUrl="/"
      />
      
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <DirectionsCar sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Gerencie suas corridas e serviços
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Chip label="Corrida Normal" color="primary" />
          <Chip label="🧭 Guia Turístico" color="info" />
        </Box>
      </Box>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <DirectionsCar sx={{ fontSize: 40, color: 'warning.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Status e disponibilidade
            </Typography>
            <Button 
              variant="contained" 
              color="warning" 
              component={Link}
              to="/motorista/home"
            >
              Acessar
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <NotificationImportant sx={{ fontSize: 40, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Corrida Recebida
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Gerenciar solicitações
            </Typography>
            <Button 
              variant="contained" 
              color="success" 
              component={Link}
              to="/motorista/ride"
            >
              Acessar
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <AttachMoney sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Ganhos
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Relatórios financeiros
            </Typography>
            <Button 
              variant="contained" 
              component={Link}
              to="/motorista/earnings"
            >
              Acessar
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

function DriverHomeWrapper() {
  return (
    <Container maxWidth="lg" sx={{ mt: 2 }}>
      <DomainHeader 
        domain="motorista" 
        title="Dashboard do Motorista"
        breadcrumbs={["Dashboard"]}
        backUrl="/motorista"
      />
      <DriverHome />
    </Container>
  );
}

function DriverRideWrapper() {
  return (
    <Container maxWidth="lg" sx={{ mt: 2 }}>
      <DomainHeader 
        domain="motorista" 
        title="Corrida Recebida"
        breadcrumbs={["Corrida Recebida"]}
        backUrl="/motorista"
      />
      <RideReceived />
    </Container>
  );
}

function DriverEarningsWrapper() {
  return (
    <Container maxWidth="lg" sx={{ mt: 2 }}>
      <DomainHeader 
        domain="motorista" 
        title="Relatório de Ganhos"
        breadcrumbs={["Ganhos"]}
        backUrl="/motorista"
      />
      <Earnings />
    </Container>
  );
}

export default function DriverApp() {
  return (
    <Routes>
      <Route path="/" element={<DriverDashboard />} />
      <Route path="/home" element={<DriverHomeWrapper />} />
      <Route path="/ride" element={<DriverRideWrapper />} />
      <Route path="/earnings" element={<DriverEarningsWrapper />} />
    </Routes>
  );
}
