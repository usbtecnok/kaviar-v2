import { Routes, Route, Link, Navigate } from "react-router-dom";
import { Container, Typography, Box, Card, CardContent, Button, Grid, Chip, Alert, CircularProgress } from "@mui/material";
import { AdminPanelSettings, Dashboard, Group, Analytics, DirectionsCar, Security, PersonAdd, Tour, People, LocationCity, Elderly, PendingActions, CheckCircle, Map } from "@mui/icons-material";
import { ProtectedAdminRoute } from "./ProtectedAdminRoute";
import AdminLogin from "./AdminLogin";
import AdminErrorBoundary from "./AdminErrorBoundary";
import DomainHeader from "../common/DomainHeader";
import CommunitiesManagement from "../../pages/admin/CommunitiesManagement";
import NeighborhoodsManagement from "../../pages/admin/NeighborhoodsManagement";
import DriversManagement from "../../pages/admin/DriversManagement";
import PassengersManagement from "../../pages/admin/PassengersManagement";
import GuidesManagement from "../../pages/admin/GuidesManagement";
import GeofenceManagement from "../../pages/admin/GeofenceManagement";
import BonusMetrics from "../../pages/admin/BonusMetrics";
import DriverApproval from "../../pages/admin/DriverApproval";
import DriversList from "../../pages/admin/DriversList";
import DriverDetail from "../../pages/admin/DriverDetail";
import { RideList, RideDetail, RideAudit } from "../../pages/admin/rides";
import TourPackages from "../../pages/admin/premium-tourism/TourPackages";
import TourBookings from "../../pages/admin/premium-tourism/TourBookings";
import TourPackageForm from "../../pages/admin/premium-tourism/TourPackageForm";
import TourPartners from "../../pages/admin/premium-tourism/TourPartners";
import TourReports from "../../pages/admin/premium-tourism/TourReports";
import TourSettings from "../../pages/admin/premium-tourism/TourSettings";
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
      bgcolor: '#1a1a1a',
      borderRadius: 1,
      border: '1px solid #FFD700',
      boxShadow: '0 4px 8px rgba(255, 215, 0, 0.2)'
    }}>
      <Box>
        <Typography variant="h6" sx={{ color: '#FFD700', fontWeight: 'bold' }}>
          Admin: {admin?.name || 'Usuário'}
        </Typography>
        <Typography variant="body2" sx={{ color: '#FFF' }}>
          {admin?.role || 'ADMIN'}
        </Typography>
      </Box>
      <Button 
        onClick={handleLogout} 
        variant="outlined"
        size="small"
        sx={{
          borderColor: '#FFD700',
          color: '#FFD700',
          '&:hover': {
            borderColor: '#FFC107',
            bgcolor: 'rgba(255, 215, 0, 0.1)'
          }
        }}
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
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('kaviar_admin_token');
      if (!token) {
        throw new Error('Token não encontrado');
      }

      // Buscar dados do dashboard
      const [driversResponse, guidesResponse, neighborhoodsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/drivers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/admin/guides`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/governance/neighborhoods`)
      ]);

      // Só remover token se 401 com erro de token inválido
      if (driversResponse.status === 401 || guidesResponse.status === 401) {
        try {
          const errorData = await driversResponse.json();
          if (errorData.error && errorData.error.includes('Token inválido')) {
            localStorage.removeItem('kaviar_admin_token');
            localStorage.removeItem('kaviar_admin_data');
            window.location.href = '/admin/login';
            return;
          }
        } catch (e) {
          // Erro de parsing
        }
        
        throw new Error(`Erro de conexão: ${driversResponse.status}`);
      }

      const driversData = await driversResponse.json();
      const guidesData = await guidesResponse.json();
      const neighborhoodsData = await neighborhoodsResponse.json();

      // Calcular estatísticas
      const drivers = driversData.success ? driversData.data : [];
      const guides = guidesData.success ? guidesData.data : [];
      const neighborhoods = neighborhoodsData.success ? neighborhoodsData.data : [];

      const stats = {
        totalDrivers: drivers.length,
        totalGuides: guides.length,
        totalPassengers: 0, // Endpoint não existe
        totalNeighborhoods: neighborhoods.length
      };

      const pending = {
        drivers: drivers.filter(d => d.status === 'pending').length,
        guides: guides.filter(g => g.status === 'pending').length,
        passengers: 0
      };

      setDashboardData({ stats, pending });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message || 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

  const { stats = {}, pending = {} } = dashboardData || {};

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <AdminHeader />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress sx={{ color: '#FFD700', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#FFD700' }}>
              Carregando painel administrativo...
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, bgcolor: '#000', minHeight: '100vh' }}>
      <AdminHeader />
      
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <AdminPanelSettings sx={{ fontSize: 48, color: '#FFD700', mb: 2 }} />
        <Typography variant="h4" gutterBottom sx={{ color: '#FFD700', fontWeight: 'bold' }}>
          Dashboard Administrativo
        </Typography>
        <Typography variant="body1" sx={{ color: '#FFF' }}>
          Gestão completa do sistema KAVIAR
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, bgcolor: '#1a1a1a', color: '#FFD700' }}>
          {error}
        </Alert>
      )}

      {/* Métricas Gerais */}
      {!loading && dashboardData && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #FFD700' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <People sx={{ fontSize: 40, color: '#FFD700', mb: 1 }} />
                <Typography variant="h4" sx={{ color: '#FFD700' }}>
                  {stats.totalPassengers || 0}
                </Typography>
                <Typography variant="body2" sx={{ color: '#FFF' }}>
                  Passageiros
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #FFD700' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <DirectionsCar sx={{ fontSize: 40, color: '#FFD700', mb: 1 }} />
                <Typography variant="h4" sx={{ color: '#FFD700' }}>
                  {stats.totalDrivers || 0}
                </Typography>
                <Typography variant="body2" sx={{ color: '#FFF' }}>
                  Motoristas
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #FFD700' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <LocationCity sx={{ fontSize: 40, color: '#FFD700', mb: 1 }} />
                <Typography variant="h4" sx={{ color: '#FFD700' }}>
                  {stats.totalNeighborhoods || 0}
                </Typography>
                <Typography variant="body2" sx={{ color: '#FFF' }}>
                  Bairros
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #FFD700' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Tour sx={{ fontSize: 40, color: '#FFD700', mb: 1 }} />
                <Typography variant="h4" sx={{ color: '#FFD700' }}>
                  {stats.totalGuides || 0}
                </Typography>
                <Typography variant="body2" sx={{ color: '#FFF' }}>
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
                <Button 
                  variant="contained" 
                  color="secondary"
                  href="/admin/premium-tourism/packages"
                >
                  Acessar
                </Button>
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
    <AdminErrorBoundary>
      <Box sx={{ bgcolor: '#000', minHeight: '100vh', color: '#FFD700' }}>
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
          
          <Route path="/drivers/:id" element={
            <ProtectedAdminRoute>
              <Container maxWidth="lg" sx={{ mt: 2 }}>
                <AdminHeader />
                <DriverDetail />
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
          
          {/* Rotas de Gestão de Motoristas */}
          <Route path="/motoristas" element={
            <ProtectedAdminRoute>
              <DriversList />
            </ProtectedAdminRoute>
          } />
          <Route path="/motoristas/:id" element={
            <ProtectedAdminRoute>
              <DriverDetail />
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
          <Route path="/premium-tourism/partners" element={
            <ProtectedAdminRoute>
              <TourPartners />
            </ProtectedAdminRoute>
          } />
          <Route path="/premium-tourism/reports" element={
            <ProtectedAdminRoute>
              <TourReports />
            </ProtectedAdminRoute>
          } />
          <Route path="/premium-tourism/settings" element={
            <ProtectedAdminRoute>
              <TourSettings />
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
      </Box>
    </AdminErrorBoundary>
  );
}
