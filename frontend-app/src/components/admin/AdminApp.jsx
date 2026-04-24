import { Routes, Route, Link, Navigate } from "react-router-dom";
import { API_BASE_URL } from '../../config/api';
import { Container, Typography, Box, Card, CardContent, Button, Grid, Chip, Alert, CircularProgress, ToggleButton, ToggleButtonGroup, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import { AdminPanelSettings, Dashboard, Group, Analytics, DirectionsCar, Security, PersonAdd, Tour, People, LocationCity, Elderly, PendingActions, CheckCircle, Map, Shield } from "@mui/icons-material";
import { ProtectedAdminRoute } from "./ProtectedAdminRoute";
import AdminLogin from "./AdminLogin";
import AdminErrorBoundary from "./AdminErrorBoundary";
import DomainHeader from "../common/DomainHeader";
import FeatureFlags from "../../pages/admin/FeatureFlags";
// import BetaMonitor from "../../pages/admin/BetaMonitor"; // HIBERNADO — reaproveitável
import OperationsMonitor from "../../pages/admin/OperationsMonitor";
import EmergencyEvents from "../../pages/admin/EmergencyEvents";
import MatchMonitor from "../../pages/admin/MatchMonitor";
import CommunitiesManagement from "../../pages/admin/CommunitiesManagement";
import NeighborhoodsManagement from "../../pages/admin/NeighborhoodsManagement";
import NeighborhoodsByCity from "../../pages/admin/NeighborhoodsByCity";
import DriversManagement from "../../pages/admin/DriversManagement";
import PassengersManagement from "../../pages/admin/PassengersManagement";
import PassengerDetail from "../../pages/admin/PassengerDetail";
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
import ChangePassword from "../../pages/admin/ChangePassword";
import WhatsAppCentral from "../../pages/admin/WhatsAppCentral";
import ForgotPassword from "../../pages/admin/ForgotPassword";
import InvestorInvites from "../../pages/admin/InvestorInvites";
import InvestorVision from "../../pages/admin/InvestorVision";
import ConsultantLeads from "../../pages/admin/ConsultantLeads";
import LeadPerformance from "../../pages/admin/LeadPerformance";
import StaffManagement from "../../pages/admin/StaffManagement";
import AuditLogs from "../../pages/admin/AuditLogs";
import ReferralManagement from "../../pages/admin/ReferralManagement";
import FinancePayments from "../../pages/admin/FinancePayments";
import CreditPurchases from "../../pages/admin/CreditPurchases";
import { useState, useEffect } from 'react';

function FinanceHomeRedirect() {
  const adminData = localStorage.getItem('kaviar_admin_data');
  const admin = adminData ? JSON.parse(adminData) : null;
  if (admin?.role === 'FINANCE') return <FinancePayments />;
  return <AdminHome />;
}


function AdminHeader() {
  const adminData = localStorage.getItem('kaviar_admin_data');
  const admin = adminData ? JSON.parse(adminData) : null;
  const isAngelViewer = admin?.role === 'ANGEL_VIEWER';
  
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
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: '#FFF' }}>
            {admin?.role || 'ADMIN'}
          </Typography>
          {isAngelViewer && (
            <Chip 
              label="👁️ Modo Leitura" 
              size="small"
              sx={{ 
                bgcolor: '#FFA726', 
                color: '#000',
                fontWeight: 'bold'
              }} 
            />
          )}
        </Box>
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
  const [territoryData, setTerritoryData] = useState(null);
  const [opsPeriod, setOpsPeriod] = useState('today');
  const [opsData, setOpsData] = useState(null);
  const [opsLoading, setOpsLoading] = useState(false);
  const adminData = localStorage.getItem('kaviar_admin_data');
  const admin = adminData ? JSON.parse(adminData) : null;
  const isSuperAdmin = admin?.role === 'SUPER_ADMIN';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 403) {
        const adminData = localStorage.getItem('kaviar_admin_data');
        if (adminData) {
          const admin = JSON.parse(adminData);
          if (admin.role === 'ANGEL_VIEWER') {
            alert('Sem permissão: você está em modo somente leitura');
          }
        }
      }
      return response;
    };
    
    fetchDashboardData();
    fetchTerritoryData();
    
    return () => { window.fetch = originalFetch; };
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
        fetch(`${API_BASE_URL}/api/neighborhoods`)
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

  const fetchTerritoryData = async () => {
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const res = await fetch(`${API_BASE_URL}/api/admin/dashboard/territory`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setTerritoryData(data.data);
    } catch {}
  };

  const fetchOpsData = async (period) => {
    setOpsLoading(true);
    try {
      const token = localStorage.getItem('kaviar_admin_token');
      const res = await fetch(`${API_BASE_URL}/api/admin/dashboard/operations?period=${period}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setOpsData(json.data);
    } catch {}
    finally { setOpsLoading(false); }
  };

  useEffect(() => { fetchOpsData(opsPeriod); }, [opsPeriod]);

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

      {['ANGEL_VIEWER', 'INVESTOR_VIEW'].includes(admin?.role) && (
        <Card sx={{ mb: 4, bgcolor: '#111', border: '1px solid #FFD700', cursor: 'pointer' }}
          onClick={() => window.location.href = '/admin/visao'}>
          <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 3 }}>
            <Box>
              <Typography variant="h6" sx={{ color: '#FFD700', fontWeight: 'bold' }}>
                Visão do Projeto
              </Typography>
              <Typography variant="body2" sx={{ color: '#ccc', mt: 0.5 }}>
                Conheça a visão estratégica, o modelo e o potencial de expansão do KAVIAR.
              </Typography>
            </Box>
            <Typography sx={{ color: '#FFD700', fontSize: 24 }}>→</Typography>
          </CardContent>
        </Card>
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

      {/* Operação Territorial */}
      {territoryData && territoryData.total > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
            Operação Territorial
          </Typography>
          <Grid container spacing={2}>
            {[
              { icon: '🏠', value: territoryData.homebound, label: 'Retorno casa', color: '#2e7d32' },
              { icon: '💰', value: territoryData.homeboundReduced, label: 'Taxa reduzida', color: '#b8960c' },
              { icon: '📍', value: territoryData.local, label: 'Mesma região', color: '#1976d2' },
              { icon: '↗️', value: territoryData.adjacent, label: 'Bairro vizinho', color: '#ed6c02' },
              { icon: '🌐', value: territoryData.external, label: 'Fora território', color: '#666' },
              { icon: '🚗', value: territoryData.total, label: 'Total corridas', color: '#2e7d32' },
            ].map((item, i) => (
              <Grid item xs={6} sm={4} md={2} key={i}>
                <Card>
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Typography sx={{ fontSize: 22, mb: 0.5 }}>{item.icon}</Typography>
                    <Typography variant="h5" fontWeight="800" sx={{ color: item.color }}>{item.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* ⚡ Operações */}
      {(() => {
        const gold = '#C9A227';
        const goldBorder = 'rgba(201,162,39,0.20)';
        const cardBg = 'linear-gradient(145deg, #15120A 0%, #0E0C07 100%)';
        const sectionLabel = { color: '#6B6045', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: 10, fontWeight: 600 };
        const cell = { borderColor: 'rgba(201,162,39,0.08)', py: 1, color: '#A7A7A7', fontSize: 13 };
        const OCard = ({ label, value, accent, large }) => (
          <Card sx={{ background: cardBg, border: `1px solid ${goldBorder}`, borderRadius: 2, height: '100%', boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
            <CardContent sx={{ textAlign: 'center', py: 2, px: 1.5 }}>
              <Typography sx={{ fontSize: large ? 28 : 22, fontWeight: 800, color: accent || '#F5F1E8', lineHeight: 1.1, letterSpacing: '-0.5px' }}>{value ?? '—'}</Typography>
              <Typography sx={{ color: '#6B6045', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', mt: 0.8 }}>{label}</Typography>
            </CardContent>
          </Card>
        );
        return (
          <Box sx={{ mb: 5 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <Typography sx={{ fontSize: 11, color: '#6B6045', textTransform: 'uppercase', letterSpacing: '0.15em', mb: 0.3 }}>Painel Executivo</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: gold, letterSpacing: '-0.3px' }}>⚡ Operações</Typography>
              </Box>
              <ToggleButtonGroup value={opsPeriod} exclusive onChange={(_, v) => v && setOpsPeriod(v)} size="small" sx={{
                bgcolor: '#0E0C07', border: `1px solid ${goldBorder}`, borderRadius: 2, p: 0.3,
                '& .MuiToggleButton-root': { color: '#6B6045', border: 'none', px: 2.5, py: 0.7, fontSize: 12, fontWeight: 600, borderRadius: '6px !important', textTransform: 'none' },
                '& .Mui-selected': { color: '#0E0C07', bgcolor: `${gold} !important`, fontWeight: 700 },
              }}>
                <ToggleButton value="today">Hoje</ToggleButton>
                <ToggleButton value="7d">7 dias</ToggleButton>
                <ToggleButton value="30d">30 dias</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {opsLoading ? (
              <Box sx={{ textAlign: 'center', py: 5 }}><CircularProgress sx={{ color: gold }} size={28} /></Box>
            ) : opsData ? (<>

              {/* Corridas */}
              <Typography sx={{ ...sectionLabel, mb: 1 }}>Corridas</Typography>
              <Grid container spacing={1.5} sx={{ mb: 3 }}>
                {[
                  { label: 'Concluídas', value: opsData.rides?.completed, accent: '#7CB87A' },
                  { label: 'Canceladas', value: opsData.rides?.canceled, accent: '#C0675A' },
                  { label: 'Sem motorista', value: opsData.rides?.no_driver, accent: '#A7A7A7' },
                  { label: 'Com espera', value: opsData.rides?.with_wait, accent: gold },
                  { label: 'Com ajuste', value: opsData.rides?.with_adjustment, accent: '#F5F1E8' },
                  { label: 'Ajustes aceitos', value: opsData.rides?.adjustments_accepted, accent: '#F5F1E8' },
                ].map(c => <Grid item xs={6} sm={4} md={2} key={c.label}><OCard {...c} /></Grid>)}
              </Grid>

              {/* Financeiro */}
              <Typography sx={{ ...sectionLabel, mb: 1 }}>Financeiro</Typography>
              <Grid container spacing={1.5} sx={{ mb: 3 }}>
                {[
                  { label: 'Valor bruto', value: opsData.financials?.gross_total != null ? `R$\u00a0${Number(opsData.financials.gross_total).toFixed(2)}` : '—', accent: '#7CB87A', large: true },
                  { label: 'Créditos consumidos', value: opsData.financials?.credits_consumed, accent: gold, large: true },
                  { label: 'Receita em créditos', value: opsData.financials?.platform_revenue_credits != null ? `R$\u00a0${Number(opsData.financials.platform_revenue_credits).toFixed(2)}` : '—', accent: '#F5F1E8', large: true },
                  { label: 'Wait charge est.', value: opsData.financials?.wait_charge_estimated != null ? `R$\u00a0${Number(opsData.financials.wait_charge_estimated).toFixed(2)}` : '—', accent: '#A7A7A7', large: true },
                ].map(c => <Grid item xs={6} sm={3} key={c.label}><OCard {...c} /></Grid>)}
              </Grid>

              {/* Espera + Território */}
              <Typography sx={{ ...sectionLabel, mb: 1 }}>Espera · Território</Typography>
              <Grid container spacing={1.5} sx={{ mb: 3 }}>
                {[
                  { label: 'Espera média', value: opsData.wait?.avg_minutes != null ? `${opsData.wait.avg_minutes} min` : '—', accent: gold },
                  { label: 'Espera total', value: opsData.wait?.total_minutes != null ? `${opsData.wait.total_minutes} min` : '—', accent: '#F5F1E8' },
                  { label: 'Local', value: opsData.territory?.local, accent: '#7CB87A' },
                  { label: 'Adjacent', value: opsData.territory?.adjacent, accent: '#A7A7A7' },
                  { label: 'External', value: opsData.territory?.external, accent: '#6B6045' },
                ].map(c => <Grid item xs={4} sm={2} key={c.label}><OCard {...c} /></Grid>)}
              </Grid>

              {/* Rankings */}
              <Grid container spacing={2}>
                {[
                  {
                    title: 'Top Bairros', all: opsData.top_neighborhoods || [], rows: (opsData.top_neighborhoods || []).slice(0, 5),
                    cols: ['#', 'Bairro', 'Corridas'],
                    render: (n, i) => [i + 1, n.name, n.rides],
                    aligns: ['left', 'left', 'right'],
                    accentCol: 2,
                    link: '/admin/operations',
                  },
                  {
                    title: 'Top Motoristas', all: opsData.top_drivers || [], rows: (opsData.top_drivers || []).slice(0, 5),
                    cols: ['Motorista', 'Corridas', 'Créditos', 'Espera'],
                    render: (d) => [d.name, d.rides, d.credits, d.wait_min > 0 ? `${d.wait_min}m` : '—'],
                    aligns: ['left', 'right', 'right', 'right'],
                    accentCol: 1,
                    link: '/admin/drivers',
                  },
                ].map(({ title, all, rows, cols, render, aligns, accentCol, link }) => (
                  <Grid item xs={12} md={6} key={title}>
                    <Card sx={{ background: cardBg, border: `1px solid ${goldBorder}`, borderRadius: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
                      <CardContent sx={{ pb: '16px !important' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Typography sx={{ color: gold, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{title}</Typography>
                          <Button href={link} size="small" sx={{ color: '#6B6045', fontSize: 10, textTransform: 'none', p: 0, minWidth: 0, '&:hover': { color: gold } }}>
                            Ver relatório →
                          </Button>
                        </Box>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ '& td,& th': { borderColor: 'rgba(201,162,39,0.12)' } }}>
                              {cols.map((c, i) => (
                                <TableCell key={c} align={aligns[i]} sx={{ color: '#6B6045', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', py: 0.8, fontWeight: 600 }}>{c}</TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {rows.length ? rows.map((row, ri) => {
                              const vals = render(row, ri);
                              return (
                                <TableRow key={ri} sx={{ '&:hover': { bgcolor: 'rgba(201,162,39,0.04)' }, '& td': { borderColor: 'rgba(201,162,39,0.06)' } }}>
                                  {vals.map((v, vi) => (
                                    <TableCell key={vi} align={aligns[vi]} sx={{ ...cell, color: vi === accentCol ? gold : vi === 0 ? '#F5F1E8' : '#A7A7A7', fontWeight: vi === accentCol ? 700 : 400 }}>{v}</TableCell>
                                  ))}
                                </TableRow>
                              );
                            }) : (
                              <TableRow><TableCell colSpan={cols.length} sx={{ ...cell, textAlign: 'center' }}>—</TableCell></TableRow>
                            )}
                          </TableBody>
                        </Table>
                        {all.length > 5 && (
                          <Typography sx={{ color: '#6B6045', fontSize: 11, mt: 1.5, textAlign: 'center' }}>
                            + {all.length - 5} {title === 'Top Bairros' ? 'bairros' : 'motoristas'} com movimento no período
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>) : null}
          </Box>
        );
      })()}

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
                <Analytics sx={{ fontSize: 40, color: '#FFD700', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Compras de Créditos
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Purchases, webhooks e saldos
                </Typography>
                <Button variant="contained" sx={{ bgcolor: '#FFD700', color: '#000' }} component={Link} to="/admin/credit-purchases">
                  Acessar
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ bgcolor: '#0B3D2E', border: '1px solid #25D366' }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Typography sx={{ fontSize: 40, mb: 1 }}>💬</Typography>
                <Typography variant="h6" gutterBottom sx={{ color: '#25D366' }}>
                  Central WhatsApp
                </Typography>
                <Typography variant="body2" sx={{ color: '#BFC7D5', mb: 2 }}>
                  Atendimento, contexto e operação
                </Typography>
                <Button variant="contained" sx={{ bgcolor: '#25D366', color: '#fff', fontWeight: 700, '&:hover': { bgcolor: '#1da851' } }} component={Link} to="/admin/whatsapp">
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
                <Button variant="contained" color="warning" href="/admin/audit">
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

          {/* Beta Monitor — HIBERNADO */}

          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ bgcolor: '#0d1117', border: '1px solid #FFD700' }}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography sx={{ fontSize: 40, mb: 1.5 }}>📊</Typography>
                <Typography variant="h6" sx={{ color: '#FFD700', fontWeight: 700, mb: 0.5 }}>
                  Monitor Operacional
                </Typography>
                <Typography variant="body2" sx={{ color: '#7a8a9a', mb: 2.5, fontSize: 12 }}>
                  Dispatch, território e performance
                </Typography>
                <Button variant="outlined" sx={{ borderColor: '#FFD70066', color: '#FFD700', fontWeight: 600, fontSize: 12, px: 3, '&:hover': { borderColor: '#FFD700', bgcolor: '#FFD70010' } }} component={Link} to="/admin/operations">
                  Acessar
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {isSuperAdmin && (
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ bgcolor: '#1a0a0a', border: '1px solid #ff444433' }}>
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Shield sx={{ fontSize: 40, color: 'error.main', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: '#ff6b6b', fontWeight: 700, mb: 0.5 }}>
                    Incidentes de Emergência
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#7a8a9a', mb: 2.5, fontSize: 12 }}>
                    Cofre de evidência e trilha de proteção
                  </Typography>
                  <Button variant="outlined" sx={{ borderColor: '#ff444466', color: '#ff6b6b', fontWeight: 600, fontSize: 12, px: 3, '&:hover': { borderColor: '#ff4444', bgcolor: '#ff444410' } }} component={Link} to="/admin/emergency-events">
                    Acessar
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          )}

          {isSuperAdmin && (
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <PersonAdd sx={{ fontSize: 40, color: 'warning.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Convites Investidor/Anjo
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Enviar convites read-only
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="warning"
                    href="/admin/investor-invites"
                  >
                    Acessar
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          )}

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <PersonAdd sx={{ fontSize: 40, color: '#FFD700', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Interessados Consultor
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Leads via WhatsApp
                </Typography>
                <Button 
                  variant="contained" 
                  sx={{ bgcolor: '#FFD700', color: '#000' }}
                  href="/admin/consultant-leads"
                >
                  Acessar
                </Button>
                <Button 
                  variant="outlined" 
                  size="small"
                  sx={{ ml: 1 }}
                  href="/admin/lead-performance"
                >
                  Performance
                </Button>
                <Button 
                  variant="outlined" 
                  size="small"
                  sx={{ ml: 1 }}
                  href="/admin/staff"
                >
                  Equipe
                </Button>
                <Button 
                  variant="outlined" 
                  size="small"
                  sx={{ ml: 1, borderColor: '#FFD700', color: '#B8860B' }}
                  href="/admin/referrals"
                >
                  Indicações
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

function AdminCreditPurchasesWrapper() {
  return (
    <Container maxWidth="lg" sx={{ mt: 2 }}>
      <AdminHeader />
      <DomainHeader 
        domain="admin" 
        title="Compras de Créditos"
        breadcrumbs={["Compras de Créditos"]}
        backUrl="/admin"
      />
      <CreditPurchases />
    </Container>
  );
}

export default function AdminApp() {
  return (
    <AdminErrorBoundary>
      <Box sx={{ bgcolor: '#000', minHeight: '100vh', color: '#FFD700' }}>
        <Routes>
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/investor-invites" element={
            <ProtectedAdminRoute requireSuperAdmin>
              <Container maxWidth="lg" sx={{ mt: 2 }}>
                <AdminHeader />
                <InvestorInvites />
              </Container>
            </ProtectedAdminRoute>
          } />
          <Route path="/visao" element={
            <ProtectedAdminRoute allowedRoles={['ANGEL_VIEWER', 'INVESTOR_VIEW', 'SUPER_ADMIN']}>
              <Box sx={{ bgcolor: '#fff', minHeight: '100vh' }}>
                <InvestorVision />
              </Box>
            </ProtectedAdminRoute>
          } />
          <Route path="/consultant-leads" element={
            <ProtectedAdminRoute>
              <Container maxWidth="lg" sx={{ mt: 2 }}>
                <AdminHeader />
                <ConsultantLeads />
              </Container>
            </ProtectedAdminRoute>
          } />
          <Route path="/lead-performance" element={
            <ProtectedAdminRoute>
              <AdminHeader />
              <LeadPerformance />
            </ProtectedAdminRoute>
          } />
          <Route path="/staff" element={
            <ProtectedAdminRoute>
              <AdminHeader />
              <StaffManagement />
            </ProtectedAdminRoute>
          } />
          <Route path="/audit" element={
            <ProtectedAdminRoute requireSuperAdmin>
              <AdminHeader />
              <AuditLogs />
            </ProtectedAdminRoute>
          } />
          <Route path="/referrals" element={
            <ProtectedAdminRoute allowedRoles={['SUPER_ADMIN']}>
              <AdminHeader />
              <ReferralManagement />
            </ProtectedAdminRoute>
          } />
          <Route path="/finance-payments" element={
            <ProtectedAdminRoute allowedRoles={['SUPER_ADMIN', 'FINANCE']}>
              <FinancePayments />
            </ProtectedAdminRoute>
          } />
          <Route path="/credit-purchases" element={
            <ProtectedAdminRoute allowedRoles={['SUPER_ADMIN', 'FINANCE']}>
              <AdminCreditPurchasesWrapper />
            </ProtectedAdminRoute>
          } />
          <Route path="/whatsapp" element={
            <ProtectedAdminRoute allowedRoles={['SUPER_ADMIN', 'OPERATOR']}>
              <WhatsAppCentral />
            </ProtectedAdminRoute>
          } />
          <Route path="/" element={
            <ProtectedAdminRoute>
              <FinanceHomeRedirect />
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
          
          <Route path="/neighborhoods-by-city" element={
            <ProtectedAdminRoute>
              <Container maxWidth="lg" sx={{ mt: 2 }}>
                <AdminHeader />
                <NeighborhoodsByCity />
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
          
          <Route path="/feature-flags" element={
            <ProtectedAdminRoute>
              <Container maxWidth="lg" sx={{ mt: 2 }}>
                <AdminHeader />
                <FeatureFlags />
              </Container>
            </ProtectedAdminRoute>
          } />

          {/* Beta Monitor — HIBERNADO
          <Route path="/beta-monitor" element={
            <ProtectedAdminRoute>
              <AdminHeader />
              <BetaMonitor />
            </ProtectedAdminRoute>
          } />
          */}
          <Route path="/operations" element={
            <ProtectedAdminRoute allowedRoles={['SUPER_ADMIN', 'OPERATOR']}>
              <OperationsMonitor />
            </ProtectedAdminRoute>
          } />
          <Route path="/emergency-events" element={
            <ProtectedAdminRoute allowedRoles={['SUPER_ADMIN']}>
              <EmergencyEvents />
            </ProtectedAdminRoute>
          } />

          <Route path="/match-monitor" element={
            <ProtectedAdminRoute>
              <Container maxWidth="lg" sx={{ mt: 2 }}>
                <AdminHeader />
                <MatchMonitor />
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

          <Route path="/passengers/:id" element={
            <ProtectedAdminRoute>
              <Container maxWidth="lg" sx={{ mt: 2 }}>
                <AdminHeader />
                <PassengerDetail />
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
