import { Routes, Route, Link, Navigate } from "react-router-dom";
import { Container, Typography, Box, Card, CardContent, Button, Grid, Chip, Alert } from "@mui/material";
import { AdminPanelSettings, Dashboard, Group, Analytics, DirectionsCar, Security, PersonAdd, Tour, People, LocationCity, Elderly, PendingActions, CheckCircle, Map } from "@mui/icons-material";
import { ProtectedAdminRoute } from "./ProtectedAdminRoute";
import AdminLogin from "./AdminLogin";
import DomainHeader from "../common/DomainHeader";
import CommunitiesManagement from "../../pages/admin/CommunitiesManagement";
import NeighborhoodsManagement from "../../pages/admin/NeighborhoodsManagement";
import DriversManagement from "../../pages/admin/DriversManagement";
import PassengersManagement from "../../pages/admin/PassengersManagement";
import GuidesManagement from "../../pages/admin/GuidesManagement";
import GeofenceManagement from "../../pages/admin/GeofenceManagement";
import BonusMetrics from "../../pages/admin/BonusMetrics";
import DriverApproval from "../../pages/admin/DriverApproval";
import { RideList, RideDetail, RideAudit } from "../../pages/admin/rides";
import TourPackages from "../../pages/admin/premium-tourism/TourPackages";
import TourBookings from "../../pages/admin/premium-tourism/TourBookings";
import TourPackageForm from "../../pages/admin/premium-tourism/TourPackageForm";
import PremiumTourismButton from "./PremiumTourismButton";
import ElderlyManagement from "../../pages/admin/ElderlyManagement";
import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

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
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setDashboardData(data.data);
      } else {
        setError(data.error || 'Erro ao carregar dashboard');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const { stats = {}, pending = {} } = dashboardData || {};

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <AdminHeader />
      
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <AdminPanelSettings sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Dashboard Administrativo
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gestão completa do sistema KAVIAR
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Métricas Gerais */}
      {!loading && dashboardData && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <People sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4" color="primary.main">
                  {stats.totalPassengers || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Passageiros
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <DirectionsCar sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h4" color="success.main">
                  {stats.totalDrivers || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Motoristas
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <LocationCity sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="h4" color="warning.main">
                  {stats.totalCommunities || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Comunidades
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Tour sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                <Typography variant="h4" color="secondary.main">
                  {stats.totalGuides || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Guias
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Aprovações Pendentes */}
      {!loading && dashboardData && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
            Aprovações Pendentes
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: pending.drivers > 0 ? 'warning.light' : 'grey.100' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <PendingActions sx={{ fontSize: 40, color: pending.drivers > 0 ? 'warning.main' : 'grey.500', mb: 1 }} />
                  <Typography variant="h4" color={pending.drivers > 0 ? 'warning.main' : 'grey.500'}>
                    {pending.drivers || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Motoristas Pendentes
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="warning" 
                    size="small"
                    href="/admin/drivers?status=pending"
                    disabled={!pending.drivers}
                  >
                    Revisar
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: pending.passengers > 0 ? 'warning.light' : 'grey.100' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <PendingActions sx={{ fontSize: 40, color: pending.passengers > 0 ? 'warning.main' : 'grey.500', mb: 1 }} />
                  <Typography variant="h4" color={pending.passengers > 0 ? 'warning.main' : 'grey.500'}>
                    {pending.passengers || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Passageiros Pendentes
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="warning" 
                    size="small"
                    href="/admin/passengers?status=pending"
                    disabled={!pending.passengers}
                  >
                    Revisar
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ bgcolor: pending.guides > 0 ? 'warning.light' : 'grey.100' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <PendingActions sx={{ fontSize: 40, color: pending.guides > 0 ? 'warning.main' : 'grey.500', mb: 1 }} />
                  <Typography variant="h4" color={pending.guides > 0 ? 'warning.main' : 'grey.500'}>
                    {pending.guides || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Guias Pendentes
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="warning" 
                    size="small"
                    href="/admin/guides?status=pending"
                    disabled={!pending.guides}
                  >
                    Revisar
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Atalhos de Gerenciamento */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
          Gerenciamento
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <PersonAdd sx={{ fontSize: 40, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Aprovação Motoristas
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Aprovar/reprovar motoristas
                </Typography>
                <Button 
                  variant="contained" 
                  color="success"
                  component={Link}
                  to="/admin/drivers/approval"
                >
                  Acessar
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <DirectionsCar sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Corridas
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Gestão operacional de corridas
                </Typography>
                <Button 
                  variant="contained" 
                  component={Link}
                  to="/admin/rides"
                >
                  Acessar
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <LocationCity sx={{ fontSize: 40, color: 'info.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Comunidades
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Gestão de comunidades e ativação
                </Typography>
                <Button variant="contained" color="info" href="/admin/communities">
                  Acessar
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Map sx={{ fontSize: 40, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Bairros
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Gestão de bairros administrativos
                </Typography>
                <Button variant="contained" color="success" href="/admin/neighborhoods">
                  Acessar
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <LocationCity sx={{ fontSize: 40, color: 'warning.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Geofences
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Revisão e validação de geofences
                </Typography>
                <Button variant="contained" color="warning" href="/admin/geofences">
                  Revisar
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <DirectionsCar sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Motoristas
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Gerenciar motoristas
                </Typography>
                <Button variant="contained" href="/admin/drivers">
                  Acessar
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <People sx={{ fontSize: 40, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Passageiros
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Gerenciar passageiros
                </Typography>
                <Button variant="contained" color="success" href="/admin/passengers">
                  Acessar
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Tour sx={{ fontSize: 40, color: 'secondary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Guias Turísticos
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Gerenciar guias
                </Typography>
                <Button variant="contained" color="secondary" href="/admin/guides">
                  Acessar
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
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
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Tour sx={{ fontSize: 40, color: 'secondary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Premium Tourism
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Pacotes e reservas turísticas
                </Typography>
                <PremiumTourismButton />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Build Stamp */}
      <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Build: {__BUILD_HASH__} - {new Date(__BUILD_TIME__).toLocaleString('pt-BR')}
        </Typography>
      </Box>
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

function AdminElderlyWrapper() {
  return (
    <Container maxWidth="lg" sx={{ mt: 2 }}>
      <AdminHeader />
      <DomainHeader 
        domain="admin" 
        title="Acompanhamento Ativo"
        breadcrumbs={["Acompanhamento Ativo"]}
        backUrl="/admin"
      />
      <ElderlyManagement />
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
      <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
      <Route path="/communities" element={
        <ProtectedAdminRoute>
          <Container maxWidth="lg" sx={{ mt: 2 }}>
            <AdminHeader />
            <CommunitiesManagement />
          </Container>
        </ProtectedAdminRoute>
      } />
      
      <Route path="/neighborhoods" element={
        <ProtectedAdminRoute>
          <Container maxWidth="lg" sx={{ mt: 2 }}>
            <AdminHeader />
            <NeighborhoodsManagement />
          </Container>
        </ProtectedAdminRoute>
      } />
      
      <Route path="/geofences" element={
        <ProtectedAdminRoute>
          <Container maxWidth="lg" sx={{ mt: 2 }}>
            <AdminHeader />
            <GeofenceManagement />
          </Container>
        </ProtectedAdminRoute>
      } />
      
      <Route path="/drivers" element={
        <ProtectedAdminRoute>
          <Container maxWidth="lg" sx={{ mt: 2 }}>
            <AdminHeader />
            <DriversManagement />
          </Container>
        </ProtectedAdminRoute>
      } />
      
      <Route path="/passengers" element={
        <ProtectedAdminRoute>
          <Container maxWidth="lg" sx={{ mt: 2 }}>
            <AdminHeader />
            <PassengersManagement />
          </Container>
        </ProtectedAdminRoute>
      } />
      
      <Route path="/guides" element={
        <ProtectedAdminRoute>
          <Container maxWidth="lg" sx={{ mt: 2 }}>
            <AdminHeader />
            <GuidesManagement />
          </Container>
        </ProtectedAdminRoute>
      } />
      
      <Route path="/elderly" element={
        <ProtectedAdminRoute>
          <Container maxWidth="lg" sx={{ mt: 2 }}>
            <AdminHeader />
            <Typography variant="h4" sx={{ p: 3 }}>
              Acompanhamento Ativo - Em desenvolvimento
            </Typography>
          </Container>
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
      
      {/* Rota de Aprovação de Motoristas */}
      <Route path="/drivers/approval" element={
        <ProtectedAdminRoute>
          <DriverApproval />
        </ProtectedAdminRoute>
      } />
      
      {/* Rotas Premium Tourism */}
      <Route path="/premium-tourism/packages" element={
        <ProtectedAdminRoute>
          <TourPackages />
        </ProtectedAdminRoute>
      } />
      <Route path="/premium-tourism/packages/new" element={
        <ProtectedAdminRoute>
          <TourPackageForm />
        </ProtectedAdminRoute>
      } />
      <Route path="/premium-tourism/packages/:id/edit" element={
        <ProtectedAdminRoute>
          <TourPackageForm />
        </ProtectedAdminRoute>
      } />
      <Route path="/premium-tourism/bookings" element={
        <ProtectedAdminRoute>
          <TourBookings />
        </ProtectedAdminRoute>
      } />
      <Route path="/elderly" element={
        <ProtectedAdminRoute>
          <AdminElderlyWrapper />
        </ProtectedAdminRoute>
      } />
      
      {/* Redirects para rotas antigas */}
      <Route path="/bairros" element={<Navigate to="/admin/neighborhoods" replace />} />
    </Routes>
  );
}
