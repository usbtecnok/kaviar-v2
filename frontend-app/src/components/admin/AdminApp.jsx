import { Routes, Route } from "react-router-dom";
import { Container, Typography, Box, Card, CardContent, Button } from "@mui/material";
import { AdminPanelSettings, Dashboard, Group, Analytics, DirectionsCar, Security } from "@mui/icons-material";
import { ProtectedAdminRoute } from "./ProtectedAdminRoute";
import AdminLogin from "./AdminLogin";
import DomainHeader from "../common/DomainHeader";
import AdminDashboard from "../../pages/admin/Dashboard";
import CommunityManagement from "../../pages/admin/CommunityManagement";
import BonusMetrics from "../../pages/admin/BonusMetrics";
import { RideList, RideDetail, RideAudit } from "../../pages/admin/rides";

function AdminHeader() {
  const adminData = localStorage.getItem('kaviar_admin_data');
  const admin = adminData ? JSON.parse(adminData) : null;
  
  const handleLogout = () => {
    localStorage.removeItem('kaviar_admin_token');
    localStorage.removeItem('kaviar_admin_data');
    window.location.href = '/admin/login';
  };
  
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      mb: 3,
      p: 2,
      bgcolor: 'background.paper',
      borderRadius: 1,
      boxShadow: 1
    }}>
      <Box>
        <Typography variant="h6" color="error.main">
          Admin: {admin?.name || 'Usuário'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {admin?.role || 'ADMIN'}
        </Typography>
      </Box>
      <Button 
        onClick={handleLogout} 
        color="error"
        variant="outlined"
        size="small"
      >
        Sair
      </Button>
    </Box>
  );
}

function AdminHome() {
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <AdminHeader />
      
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <AdminPanelSettings sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Painel Administrativo
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gestão completa do sistema KAVIAR
        </Typography>
      </Box>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Dashboard sx={{ fontSize: 40, color: 'error.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Métricas gerais do sistema
            </Typography>
            <Button variant="contained" color="error" href="/admin/dashboard">
              Acessar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <DirectionsCar sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Corridas
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Gestão operacional de corridas
            </Typography>
            <Button variant="contained" href="/admin/rides">
              Acessar
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Group sx={{ fontSize: 40, color: 'info.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Comunidades
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Gestão de comunidades ativas
            </Typography>
            <Button variant="contained" color="info" href="/admin/communities">
              Acessar
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            <Security sx={{ fontSize: 40, color: 'warning.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Auditoria
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Logs e ações administrativas
            </Typography>
            <Button variant="contained" color="warning" href="/admin/rides/audit">
              Acessar
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

function AdminDashboardWrapper() {
  return (
    <Container maxWidth="lg" sx={{ mt: 2 }}>
      <AdminHeader />
      <DomainHeader 
        domain="admin" 
        title="Dashboard Administrativo"
        breadcrumbs={["Dashboard"]}
        backUrl="/admin"
      />
      <AdminDashboard />
    </Container>
  );
}

function AdminCommunitiesWrapper() {
  return (
    <Container maxWidth="lg" sx={{ mt: 2 }}>
      <AdminHeader />
      <DomainHeader 
        domain="admin" 
        title="Gestão de Comunidades"
        breadcrumbs={["Comunidades"]}
        backUrl="/admin"
      />
      <CommunityManagement />
    </Container>
  );
}

function AdminMetricsWrapper() {
  return (
    <Container maxWidth="lg" sx={{ mt: 2 }}>
      <AdminHeader />
      <DomainHeader 
        domain="admin" 
        title="Métricas A/B"
        breadcrumbs={["Métricas A/B"]}
        backUrl="/admin"
      />
      <BonusMetrics />
    </Container>
  );
}

export default function AdminApp() {
  return (
    <Routes>
      <Route path="/login" element={<AdminLogin />} />
      <Route path="/" element={
        <ProtectedAdminRoute>
          <AdminHome />
        </ProtectedAdminRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedAdminRoute>
          <AdminDashboardWrapper />
        </ProtectedAdminRoute>
      } />
      <Route path="/communities" element={
        <ProtectedAdminRoute>
          <AdminCommunitiesWrapper />
        </ProtectedAdminRoute>
      } />
      <Route path="/metrics" element={
        <ProtectedAdminRoute>
          <AdminMetricsWrapper />
        </ProtectedAdminRoute>
      } />
      
      {/* Rotas de Corridas */}
      <Route path="/rides" element={
        <ProtectedAdminRoute>
          <RideList />
        </ProtectedAdminRoute>
      } />
      <Route path="/rides/:id" element={
        <ProtectedAdminRoute>
          <RideDetail />
        </ProtectedAdminRoute>
      } />
      <Route path="/rides/audit" element={
        <ProtectedAdminRoute>
          <RideAudit />
        </ProtectedAdminRoute>
      } />
    </Routes>
  );
}
