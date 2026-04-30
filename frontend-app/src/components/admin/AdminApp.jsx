import { Routes, Route, Link, Navigate } from "react-router-dom";
import { API_BASE_URL } from '../../config/api';
import { Container, Typography, Box, Card, CardContent, Button, Grid, Chip, Alert, CircularProgress, ToggleButton, ToggleButtonGroup, Table, TableBody, TableCell, TableHead, TableRow, Tabs, Tab } from "@mui/material";
import { AdminPanelSettings, Dashboard, Group, Analytics, DirectionsCar, Security, PersonAdd, Tour, People, LocationCity, Elderly, PendingActions, CheckCircle, Map, Shield, CreditCard, ChatBubble, Apartment, GridOn, DriveEta, Person, Explore, Lock, Flight, BarChart, Handshake, CardGiftcard } from "@mui/icons-material";
import { ProtectedAdminRoute } from "./ProtectedAdminRoute";
import AdminLogin from "./AdminLogin";
import AdminErrorBoundary from "./AdminErrorBoundary";
import DomainHeader from "../common/DomainHeader";
import FeatureFlags from "../../pages/admin/FeatureFlags";
// import BetaMonitor from "../../pages/admin/BetaMonitor"; // HIBERNADO — reaproveitável
import OperationsMonitor from "../../pages/admin/OperationsMonitor";
import ExecutiveOperations from "../../pages/admin/ExecutiveOperations";
import EmergencyEvents from "../../pages/admin/EmergencyEvents";
import MatchMonitor from "../../pages/admin/MatchMonitor";
import CommunitiesManagement from "../../pages/admin/CommunitiesManagement";
import NeighborhoodsManagement from "../../pages/admin/NeighborhoodsManagement";
import NeighborhoodsByCity from "../../pages/admin/NeighborhoodsByCity";
import DriversManagement from "../../pages/admin/DriversManagement";
import { RatingsOverviewCard } from "./RatingsOverviewCard";
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
          <Typography variant="body2" sx={{ color: '#E8E3D5' }}>
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
    fetchDashboardData();
    fetchTerritoryData();
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

      // Se 401, mostrar erro no dashboard (ProtectedAdminRoute cuida do redirect real)
      if (driversResponse.status === 401 || guidesResponse.status === 401) {
        throw new Error('Sessão expirada. Faça login novamente.');
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
    <Container maxWidth="lg" sx={{ mt: 3, pb: 6 }}>
      <AdminHeader />
      
      {/* Header compacto */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 11, color: '#6B6045', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.3 }}>Painel Administrativo</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#C8A84E', letterSpacing: '-0.2px' }}>KAVIAR Dashboard</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, bgcolor: '#1a1a1a', color: '#C8A84E' }}>{error}</Alert>}

      {['ANGEL_VIEWER', 'INVESTOR_VIEW'].includes(admin?.role) && (
        <Card sx={{ mb: 3, background: 'linear-gradient(145deg, #101014, #09090b)', border: '1px solid #C8A84E33', cursor: 'pointer', borderRadius: 3 }}
          onClick={() => window.location.href = '/admin/visao'}>
          <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
            <Box>
              <Typography sx={{ color: '#C8A84E', fontWeight: 700, fontSize: 15 }}>Visão do Projeto</Typography>
              <Typography sx={{ color: '#8888A0', fontSize: 12, mt: 0.3 }}>Visão estratégica, modelo e potencial de expansão</Typography>
            </Box>
            <Typography sx={{ color: '#C8A84E', fontSize: 20 }}>→</Typography>
          </CardContent>
        </Card>
      )}

      {/* ── KPIs + Aprovações ── */}
      {!loading && dashboardData && (
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          {/* KPIs */}
          {[
            { icon: <People sx={{ fontSize: 22, color: '#C8A84E' }} />, value: stats.totalPassengers || 0, label: 'Passageiros' },
            { icon: <DirectionsCar sx={{ fontSize: 22, color: '#C8A84E' }} />, value: stats.totalDrivers || 0, label: 'Motoristas' },
            { icon: <LocationCity sx={{ fontSize: 22, color: '#C8A84E' }} />, value: stats.totalNeighborhoods || 0, label: 'Bairros' },
            { icon: <Tour sx={{ fontSize: 22, color: '#C8A84E' }} />, value: stats.totalGuides || 0, label: 'Guias' },
          ].map(k => (
            <Grid item xs={6} sm={3} key={k.label}>
              <Card sx={{ background: 'linear-gradient(145deg, #101014, #09090b)', border: '1px solid #C8A84E20', borderRadius: 2.5 }}>
                <CardContent sx={{ textAlign: 'center', py: 2, px: 1.5 }}>
                  {k.icon}
                  <Typography sx={{ color: '#C8A84E', fontSize: 26, fontWeight: 700, lineHeight: 1.2, mt: 0.5 }}>{k.value}</Typography>
                  <Typography sx={{ color: '#9CA3AF', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.03em', mt: 0.3 }}>{k.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}

          {/* Aprovações inline */}
          {[
            { value: pending.drivers || 0, label: 'Motoristas pendentes', to: '/admin/drivers/approval', active: pending.drivers > 0 },
            { value: pending.passengers || 0, label: 'Passageiros pendentes', to: '/admin/passengers?status=pending', active: pending.passengers > 0 },
            { value: pending.guides || 0, label: 'Guias pendentes', to: '/admin/guides?status=pending', active: pending.guides > 0 },
          ].map(p => (
            <Grid item xs={4} sm={4} md={4} key={p.label}>
              <Card component={p.active ? Link : 'div'} to={p.active ? p.to : undefined} sx={{ background: 'linear-gradient(145deg, #101014, #09090b)', border: `1px solid ${p.active ? '#D4A01740' : '#1A1A2E'}`, borderRadius: 2.5, textDecoration: 'none', transition: 'all 0.2s', ...(p.active && { '&:hover': { borderColor: '#D4A01770', transform: 'translateY(-1px)' } }) }}>
                <CardContent sx={{ textAlign: 'center', py: 1.5, px: 1 }}>
                  <Typography sx={{ color: p.active ? '#D4A017' : '#555570', fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>{p.value}</Typography>
                  <Typography sx={{ color: p.active ? '#A08030' : '#555570', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.03em', mt: 0.3 }}>{p.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Operações + Avaliações lado a lado ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Operações */}
        <Grid item xs={12} md={7}>
          {territoryData && territoryData.total > 0 && (
            <Card sx={{ background: 'linear-gradient(145deg, #101014, #09090b)', border: '1px solid #C8A84E20', borderRadius: 2.5, height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography sx={{ fontSize: 10, color: '#6B6045', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Painel Executivo</Typography>
                    <Typography sx={{ fontWeight: 700, color: '#C8A84E', fontSize: 16 }}>Operações</Typography>
                  </Box>
                  <Button component={Link} to="/admin/executive-operations" variant="outlined" size="small" sx={{ borderColor: '#C8A84E30', color: '#C8A84E', fontSize: 11, fontWeight: 600, '&:hover': { bgcolor: '#C8A84E', color: '#0a0a0a', borderColor: '#C8A84E' } }}>
                    Abrir →
                  </Button>
                </Box>
                <Grid container spacing={1}>
                  {[
                    { symbol: '⌂', value: territoryData.homebound, label: 'Retorno', accent: '#7CB87A' },
                    { symbol: '●', value: territoryData.local, label: 'Local', accent: '#F5F1E8' },
                    { symbol: '◎', value: territoryData.adjacent, label: 'Vizinho', accent: '#A7A7A7' },
                    { symbol: '○', value: territoryData.external, label: 'Externo', accent: '#6B6045' },
                    { symbol: '∑', value: territoryData.total, label: 'Total', accent: '#C8A84E' },
                  ].map((t, i) => (
                    <Grid item xs key={i}>
                      <Box sx={{ textAlign: 'center', py: 1 }}>
                        <Typography sx={{ color: t.accent, fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{t.value}</Typography>
                        <Typography sx={{ color: '#6B6045', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.03em', mt: 0.3 }}>{t.label}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
                {opsData && (
                  <Box sx={{ display: 'flex', gap: 2.5, mt: 2, pt: 2, borderTop: '1px solid #1A1A2E', flexWrap: 'wrap' }}>
                    {[
                      { label: 'Corridas hoje', value: opsData.rides?.completed },
                      { label: 'Bruto', value: opsData.financials?.gross_total != null ? `R$\u00a0${Number(opsData.financials.gross_total).toFixed(0)}` : '—' },
                      { label: 'Créditos', value: opsData.financials?.credits_consumed },
                      { label: 'Espera', value: opsData.wait?.total_minutes != null ? `${opsData.wait.total_minutes}m` : '—' },
                    ].map(s => (
                      <Box key={s.label}>
                        <Typography sx={{ color: '#C8A84E', fontSize: 16, fontWeight: 700, lineHeight: 1 }}>{s.value ?? '—'}</Typography>
                        <Typography sx={{ color: '#6B6045', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.03em', mt: 0.2 }}>{s.label}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Avaliações */}
        <Grid item xs={12} md={5}>
          <RatingsOverviewCard compact />
        </Grid>
      </Grid>

      {/* Atalhos de Gerenciamento */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 11, color: '#6B6045', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.3 }}>Painel</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#C8A84E', letterSpacing: '-0.2px' }}>Gerenciamento</Typography>
        </Box>
        <Grid container spacing={2}>
          {[
            { Icon: DirectionsCar, title: 'Corridas', desc: 'Gestão operacional de corridas', to: '/admin/rides' },
            { Icon: CreditCard, title: 'Compras de Créditos', desc: 'Purchases, webhooks e saldos', to: '/admin/credit-purchases' },
            { Icon: ChatBubble, title: 'Central WhatsApp', desc: 'Atendimento, contexto e operação', to: '/admin/whatsapp', accent: '#25D366' },
            { Icon: Apartment, title: 'Comunidades', desc: 'Gestão de comunidades e ativação', to: '/admin/communities' },
            { Icon: Map, title: 'Bairros', desc: 'Gestão de bairros administrativos', to: '/admin/neighborhoods' },
            { Icon: GridOn, title: 'Geofences', desc: 'Revisão e validação de geofences', to: '/admin/geofences' },
            { Icon: DriveEta, title: 'Motoristas', desc: 'Gerenciar motoristas', to: '/admin/drivers' },
            { Icon: People, title: 'Passageiros', desc: 'Gerenciar passageiros', to: '/admin/passengers' },
            { Icon: Explore, title: 'Guias Turísticos', desc: 'Gerenciar guias', to: '/admin/guides' },
            { Icon: Lock, title: 'Auditoria', desc: 'Logs e ações administrativas', to: '/admin/audit' },
            { Icon: Flight, title: 'Premium Tourism', desc: 'Pacotes e reservas turísticas', to: '/admin/premium-tourism/packages', accent: '#5B9BD5' },
            { Icon: BarChart, title: 'Monitor Operacional', desc: 'Dispatch, território e performance', to: '/admin/operations' },
            { Icon: Handshake, title: 'Interessados Consultor', desc: 'Leads, performance e equipe', to: '/admin/consultant-leads' },
          ].map(c => {
            const color = c.accent || '#C8A84E';
            return (
            <Grid item xs={12} sm={6} md={4} key={c.to}>
              <Card sx={{ background: 'linear-gradient(145deg, #111217, #0c0c10)', border: `1px solid ${color}22`, borderRadius: 3, height: '100%', transition: 'all 0.3s cubic-bezier(.4,0,.2,1)', '&:hover': { borderColor: `${color}50`, transform: 'translateY(-3px)', boxShadow: `0 8px 24px ${color}0a` } }}>
                <CardContent sx={{ textAlign: 'center', pt: 4, pb: 3.5, px: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                  <Box sx={{ width: 54, height: 54, borderRadius: '50%', background: `radial-gradient(circle, ${color}14 0%, ${color}06 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5, border: `1px solid ${color}18` }}>
                    <c.Icon sx={{ fontSize: 26, color }} />
                  </Box>
                  <Typography sx={{ color: '#E0DDD5', fontWeight: 600, fontSize: 14, letterSpacing: '0.01em', mb: 0.5 }}>{c.title}</Typography>
                  <Typography sx={{ color: '#9CA3AF', fontSize: 11.5, lineHeight: 1.5, mb: 'auto', pb: 2.5 }}>{c.desc}</Typography>
                  <Button variant="outlined" component={Link} to={c.to} sx={{ borderColor: `${color}35`, color, fontWeight: 600, fontSize: 11.5, letterSpacing: '0.02em', px: 3, py: 0.8, '&:hover': { bgcolor: color, color: '#0a0a0a', borderColor: color } }}>
                    Acessar
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            );
          })}

          {isSuperAdmin && (
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ background: 'linear-gradient(145deg, #111217, #0c0c10)', border: '1px solid rgba(239,83,80,0.18)', borderRadius: 3, height: '100%', transition: 'all 0.3s cubic-bezier(.4,0,.2,1)', '&:hover': { borderColor: 'rgba(239,83,80,0.45)', transform: 'translateY(-3px)', boxShadow: '0 8px 24px rgba(239,83,80,0.06)' } }}>
                <CardContent sx={{ textAlign: 'center', pt: 4, pb: 3.5, px: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                  <Box sx={{ width: 54, height: 54, borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,83,80,0.10) 0%, rgba(239,83,80,0.03) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5, border: '1px solid rgba(239,83,80,0.12)' }}>
                    <Shield sx={{ fontSize: 26, color: '#ef5350' }} />
                  </Box>
                  <Typography sx={{ color: '#e57373', fontWeight: 600, fontSize: 14, letterSpacing: '0.01em', mb: 0.5 }}>Incidentes de Emergência</Typography>
                  <Typography sx={{ color: '#9CA3AF', mb: 'auto', pb: 2.5, fontSize: 11.5, lineHeight: 1.5 }}>Cofre de evidência e trilha de proteção</Typography>
                  <Button variant="outlined" component={Link} to="/admin/emergency-events" sx={{ borderColor: 'rgba(239,83,80,0.35)', color: '#ef5350', fontWeight: 600, fontSize: 12, px: 3, '&:hover': { borderColor: '#ef5350', bgcolor: 'rgba(239,83,80,0.06)' } }}>
                    Acessar
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          )}

          {isSuperAdmin && (
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ background: 'linear-gradient(145deg, #111217, #0c0c10)', border: '1px solid rgba(200,168,78,0.18)', borderRadius: 3, height: '100%', transition: 'all 0.3s cubic-bezier(.4,0,.2,1)', '&:hover': { borderColor: 'rgba(200,168,78,0.45)', transform: 'translateY(-3px)', boxShadow: '0 8px 24px rgba(200,168,78,0.06)' } }}>
                <CardContent sx={{ textAlign: 'center', pt: 4, pb: 3.5, px: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                  <Box sx={{ width: 54, height: 54, borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,168,78,0.10) 0%, rgba(200,168,78,0.03) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5, border: '1px solid rgba(200,168,78,0.12)' }}>
                    <CardGiftcard sx={{ fontSize: 26, color: '#C8A84E' }} />
                  </Box>
                  <Typography sx={{ color: '#E0DDD5', fontWeight: 600, fontSize: 14, letterSpacing: '0.01em', mb: 0.5 }}>Convites Investidor/Anjo</Typography>
                  <Typography sx={{ color: '#9CA3AF', mb: 'auto', pb: 2.5, fontSize: 11.5, lineHeight: 1.5 }}>Enviar convites read-only</Typography>
                  <Button variant="outlined" component={Link} to="/admin/investor-invites" sx={{ borderColor: 'rgba(200,168,78,0.35)', color: '#C8A84E', fontWeight: 600, fontSize: 12, px: 3, '&:hover': { borderColor: '#C8A84E', bgcolor: 'rgba(200,168,78,0.06)' } }}>
                    Acessar
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          )}
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

function ConsultantLeadsHub() {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <Typography variant="h5" sx={{ color: '#C8A84E', fontWeight: 800, mb: 2, letterSpacing: 1 }}>
        🤝 Interessados Consultor
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, '& .MuiTab-root': { color: '#999', fontWeight: 700, fontSize: 14 }, '& .Mui-selected': { color: '#C8A84E' }, '& .MuiTabs-indicator': { backgroundColor: '#C8A84E' } }}>
        <Tab label="Leads" />
        <Tab label="Performance" />
        <Tab label="Equipe" />
      </Tabs>
      {tab === 0 && <ConsultantLeads />}
      {tab === 1 && <LeadPerformance />}
      {tab === 2 && <ReferralManagement />}
    </Box>
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
      <Box sx={{ bgcolor: '#0A0A0F', minHeight: '100vh', color: '#FFD700' }}>
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
                <ConsultantLeadsHub />
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
          <Route path="/executive-operations" element={
            <ProtectedAdminRoute>
              <ExecutiveOperations />
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
