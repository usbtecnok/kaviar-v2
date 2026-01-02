import { Routes, Route } from "react-router-dom";
import { Container, Typography, Box, Card, CardContent, Button } from "@mui/material";
import { Person, DirectionsCar, Star, Timeline } from "@mui/icons-material";
import DomainHeader from "../common/DomainHeader";
import PassengerHome from "../../pages/passenger/Home";
import RideStatus from "../../pages/passenger/RideStatus";
import RideRating from "../../pages/passenger/RideRating";

function PassengerDashboard() {
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <DomainHeader 
        domain="passageiro" 
        title="Área do Passageiro"
        showBackButton={true}
        backUrl="/"
      />
      
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Person sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          Solicite corridas e serviços especializados
        </Typography>
      </Box>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <DirectionsCar sx={{ fontSize: 40, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Solicitar Corrida
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Corridas normais e guia turístico
            </Typography>
            <Button variant="contained" color="success" href="/passageiro/home">
              Acessar
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Timeline sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Status da Corrida
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Acompanhe sua corrida em tempo real
            </Typography>
            <Button variant="contained" href="/passageiro/status">
              Acessar
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Star sx={{ fontSize: 40, color: 'warning.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Avaliar Corrida
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Avalie sua experiência
            </Typography>
            <Button variant="contained" color="warning" href="/passageiro/rating">
              Acessar
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

function PassengerHomeWrapper() {
  return (
    <Container maxWidth="lg" sx={{ mt: 2 }}>
      <DomainHeader 
        domain="passageiro" 
        title="Solicitar Corrida"
        breadcrumbs={["Solicitar Corrida"]}
        backUrl="/passageiro"
      />
      <PassengerHome />
    </Container>
  );
}

function PassengerStatusWrapper() {
  return (
    <Container maxWidth="lg" sx={{ mt: 2 }}>
      <DomainHeader 
        domain="passageiro" 
        title="Status da Corrida"
        breadcrumbs={["Status da Corrida"]}
        backUrl="/passageiro"
      />
      <RideStatus />
    </Container>
  );
}

function PassengerRatingWrapper() {
  return (
    <Container maxWidth="lg" sx={{ mt: 2 }}>
      <DomainHeader 
        domain="passageiro" 
        title="Avaliar Corrida"
        breadcrumbs={["Avaliar Corrida"]}
        backUrl="/passageiro"
      />
      <RideRating />
    </Container>
  );
}

export default function PassengerApp() {
  return (
    <Routes>
      <Route path="/" element={<PassengerDashboard />} />
      <Route path="/home" element={<PassengerHomeWrapper />} />
      <Route path="/status" element={<PassengerStatusWrapper />} />
      <Route path="/rating" element={<PassengerRatingWrapper />} />
    </Routes>
  );
}
