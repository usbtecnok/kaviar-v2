import { Routes, Route, Link, Navigate } from "react-router-dom";
import { API_BASE_URL } from '../../config/api';
import { Container, Typography, Box, Card, CardContent, Button, Grid, Chip, Alert, CircularProgress, ToggleButton, ToggleButtonGroup, Table, TableBody, TableCell, TableHead, TableRow, Tabs, Tab } from "@mui/material";
import { AdminPanelSettings, Dashboard, Group, Analytics, DirectionsCar, Security, PersonAdd, Tour, People, LocationCity, Elderly, PendingActions, CheckCircle, Map, Shield, CreditCard, ChatBubble, Apartment, GridOn, DriveEta, Person, Explore, Lock, Flight, Star, Storefront, BarChart, Handshake, CardGiftcard, Paid, SupportAgent } from "@mui/icons-material";
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
import RatingsPage from "../../pages/admin/ratings/RatingsPage";
import CompensationsPage from "../../pages/admin/CompensationsPage";
import LocalSupportDrivers from "../../pages/admin/LocalSupportDrivers";
import VitrineLocalList from "../../pages/admin/vitrine-local/VitrineLocalList";
import VitrineLocalForm from "../../pages/admin/vitrine-local/VitrineLocalForm";
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
import LocalOperators from "../../pages/admin/LocalOperators";
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
      bgcolor: '#FFFFFF',
      borderRadius: 2,
      border: '1px solid #E8E5DE',
      borderTop: '3px solid #B8942E',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      <Box>
        <Typography variant="h6" sx={{ color: '#1A1A1A', fontWeight: 700 }}>
          <span style={{ color: '#B8942E' }}>KAVIAR</span> Admin — {admin?.name || 'Usuário'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: '#6B7280' }}>
            {admin?.role || 'ADMIN'}
          </Typography>
          {isAngelViewer && (
            <Chip 
              label="👁️ Modo Leitura" 
              size="small"
              sx={{ 
                bgcolor: '#FFF3E0', 
                color: '#E65100',
                fontWeight: 'bold',
                border: '1px solid #FFE0B2'
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
          borderColor: '#E8E5DE',
          color: '#6B7280',
          '&:hover': {
            borderColor: '#B8942E',
            color: '#B8942E',
            bgcolor: 'rgba(184,148,46,0.04)'
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
            <CircularProgress sx={{ color: '#B8942E', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#6B7280' }}>
              Carregando painel administrativo...
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: '#FAFAF8', minHeight: '100vh', pt: 1 }}>
    <Container maxWidth="lg" sx={{ mt: 3, pb: 6 }}>
      <AdminHeader />
      
      {/* Header compacto */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 12, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.3 }}>Painel Administrativo</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.3px' }}>KAVIAR Dashboard</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {['ANGEL_VIEWER', 'INVESTOR_VIEW'].includes(admin?.role) && (
        <Card sx={{ mb: 3, bgcolor: '#FFFFFF', border: '1px solid #E8E5DE', cursor: 'pointer', borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', '&:hover': { borderColor: '#B8942E', boxShadow: '0 2px 8px rgba(184,148,46,0.1)' } }}
          onClick={() => window.location.href = '/admin/visao'}>
          <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2 }}>
            <Box>
              <Typography sx={{ color: '#1A1A1A', fontWeight: 700, fontSize: 15 }}>Visão do Projeto</Typography>
              <Typography sx={{ color: '#6B7280', fontSize: 12, mt: 0.3 }}>Visão estratégica, modelo e potencial de expansão</Typography>
            </Box>
            <Typography sx={{ color: '#B8942E', fontSize: 20 }}>→</Typography>
          </CardContent>
        </Card>
      )}

      {/* ── KPIs + Aprovações ── */}
      {!loading && dashboardData && (
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          {/* KPIs */}
          {[
            { icon: <People sx={{ fontSize: 22, color: '#B8942E' }} />, value: stats.totalPassengers || 0, label: 'Passageiros' },
            { icon: <DirectionsCar sx={{ fontSize: 22, color: '#B8942E' }} />, value: stats.totalDrivers || 0, label: 'Motoristas' },
            { icon: <LocationCity sx={{ fontSize: 22, color: '#B8942E' }} />, value: stats.totalNeighborhoods || 0, label: 'Bairros' },
            { icon: <Tour sx={{ fontSize: 22, color: '#B8942E' }} />, value: stats.totalGuides || 0, label: 'Guias' },
          ].map(k => (
            <Grid item xs={6} sm={3} key={k.label}>
              <Card sx={{ bgcolor: '#FFFFFF', border: '1px solid #E8E5DE', borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <CardContent sx={{ textAlign: 'center', py: 2, px: 1.5 }}>
                  {k.icon}
                  <Typography sx={{ color: '#1A1A1A', fontSize: 26, fontWeight: 700, lineHeight: 1.2, mt: 0.5 }}>{k.value}</Typography>
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
              <Card component={p.active ? Link : 'div'} to={p.active ? p.to : undefined} sx={{ bgcolor: p.active ? '#FFFBEB' : '#FFFFFF', border: `1px solid ${p.active ? '#FDE68A' : '#E8E5DE'}`, borderRadius: 2, textDecoration: 'none', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', ...(p.active && { '&:hover': { borderColor: '#B8942E', transform: 'translateY(-1px)', boxShadow: '0 3px 8px rgba(184,148,46,0.12)' } }) }}>
                <CardContent sx={{ textAlign: 'center', py: 1.5, px: 1 }}>
                  <Typography sx={{ color: p.active ? '#92400E' : '#D1D5DB', fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>{p.value}</Typography>
                  <Typography sx={{ color: p.active ? '#B45309' : '#D1D5DB', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.03em', mt: 0.3 }}>{p.label}</Typography>
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
            <Card sx={{ bgcolor: '#FFFFFF', border: '1px solid #E8E5DE', borderRadius: 2, height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography sx={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Painel Executivo</Typography>
                    <Typography sx={{ fontWeight: 700, color: '#1A1A1A', fontSize: 16 }}>Operações</Typography>
                  </Box>
                  <Button component={Link} to="/admin/executive-operations" variant="outlined" size="small" sx={{ borderColor: '#E8E5DE', color: '#B8942E', fontSize: 11, fontWeight: 600, '&:hover': { bgcolor: '#B8942E', color: '#fff', borderColor: '#B8942E' } }}>
                    Abrir →
                  </Button>
                </Box>
                <Grid container spacing={1}>
                  {[
                    { symbol: '⌂', value: territoryData.homebound, label: 'Retorno', accent: '#16A34A' },
                    { symbol: '●', value: territoryData.local, label: 'Local', accent: '#1A1A1A' },
                    { symbol: '◎', value: territoryData.adjacent, label: 'Vizinho', accent: '#6B7280' },
                    { symbol: '○', value: territoryData.external, label: 'Externo', accent: '#9CA3AF' },
                    { symbol: '∑', value: territoryData.total, label: 'Total', accent: '#B8942E' },
                  ].map((t, i) => (
                    <Grid item xs key={i}>
                      <Box sx={{ textAlign: 'center', py: 1 }}>
                        <Typography sx={{ color: t.accent, fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{t.value}</Typography>
                        <Typography sx={{ color: '#9CA3AF', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.03em', mt: 0.3 }}>{t.label}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
                {opsData && (
                  <Box sx={{ display: 'flex', gap: 2.5, mt: 2, pt: 2, borderTop: '1px solid #F3F4F6', flexWrap: 'wrap' }}>
                    {[
                      { label: 'Corridas hoje', value: opsData.rides?.completed },
                      { label: 'Bruto', value: opsData.financials?.gross_total != null ? `R$\u00a0${Number(opsData.financials.gross_total).toFixed(0)}` : '—' },
                      { label: 'Créditos', value: opsData.financials?.credits_consumed },
                      { label: 'Espera', value: opsData.wait?.total_minutes != null ? `${opsData.wait.total_minutes}m` : '—' },
                    ].map(s => (
                      <Box key={s.label}>
                        <Typography sx={{ color: '#1A1A1A', fontSize: 16, fontWeight: 700, lineHeight: 1 }}>{s.value ?? '—'}</Typography>
                        <Typography sx={{ color: '#9CA3AF', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.03em', mt: 0.2 }}>{s.label}</Typography>
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
          <RatingsOverviewCard compact linkTo="/admin/ratings" />
        </Grid>
      </Grid>

      {/* Atalhos de Gerenciamento */}
      <Box sx={{ mb: 4 }}>
        {[
          { section: 'Operação', items: [
            { Icon: DirectionsCar, title: 'Corridas', desc: 'Gestão operacional de corridas', to: '/admin/rides' },
            { Icon: CreditCard, title: 'Compras de Créditos', desc: 'Purchases, webhooks e saldos', to: '/admin/credit-purchases' },
            { Icon: ChatBubble, title: 'Central WhatsApp', desc: 'Atendimento, contexto e operação', to: '/admin/whatsapp', accent: '#16A34A' },
            { Icon: BarChart, title: 'Monitor Operacional', desc: 'Dispatch, território e performance', to: '/admin/operations' },
            { Icon: Paid, title: 'Compensações', desc: 'Apoio ao motorista em cancelamentos', to: '/admin/compensations' },
          ]},
          { section: 'Comercial', items: [
            { Icon: Handshake, title: 'Interessados Consultor', desc: 'Leads, performance e equipe', to: '/admin/consultant-leads' },
            { Icon: Apartment, title: 'Associações / Operadores', desc: 'Associações e lideranças locais', to: '/admin/local-operators' },
            { Icon: SupportAgent, title: 'Apoio Local', desc: 'Motoristas parceiros de apoio local', to: '/admin/local-support' },
            { Icon: Storefront, title: 'Vitrine Local', desc: 'Anúncios de comércios e parceiros', to: '/admin/vitrine-local' },
            { Icon: Flight, title: 'Premium Tourism', desc: 'Pacotes e reservas turísticas', to: '/admin/premium-tourism/packages', accent: '#2563EB' },
          ]},
          { section: 'Gestão', items: [
            { Icon: DriveEta, title: 'Motoristas', desc: 'Gerenciar motoristas', to: '/admin/drivers' },
            { Icon: People, title: 'Passageiros', desc: 'Gerenciar passageiros', to: '/admin/passengers' },
            { Icon: Explore, title: 'Guias Turísticos', desc: 'Gerenciar guias', to: '/admin/guides' },
            { Icon: Star, title: 'Avaliações', desc: 'Notas, comentários e atenção', to: '/admin/ratings' },
            { Icon: Apartment, title: 'Comunidades', desc: 'Gestão de comunidades e ativação', to: '/admin/communities' },
          ]},
          { section: 'Configuração', items: [
            { Icon: Map, title: 'Bairros', desc: 'Gestão de bairros administrativos', to: '/admin/neighborhoods' },
            { Icon: GridOn, title: 'Geofences', desc: 'Revisão e validação de geofences', to: '/admin/geofences' },
            { Icon: Lock, title: 'Auditoria', desc: 'Logs e ações administrativas', to: '/admin/audit' },
            ...(isSuperAdmin ? [
              { Icon: Shield, title: 'Incidentes de Emergência', desc: 'Cofre de evidência e trilha de proteção', to: '/admin/emergency-events', accent: '#DC2626' },
              { Icon: CardGiftcard, title: 'Convites Investidor/Anjo', desc: 'Enviar convites read-only', to: '/admin/investor-invites' },
            ] : []),
          ]},
        ].map(({ section, items }) => (
          <Box key={section} sx={{ mb: 4 }}>
            <Typography sx={{ fontSize: 12, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>Painel</Typography>
            <Typography sx={{ fontWeight: 700, color: '#1A1A1A', fontSize: 18, mb: 2 }}>{section}</Typography>
            <Grid container spacing={2}>
              {items.map(c => {
                const color = c.accent || '#B8942E';
                return (
                  <Grid item xs={12} sm={6} md={4} key={c.to}>
                    <Card sx={{ bgcolor: '#FFFFFF', border: '1px solid #E8E5DE', borderRadius: 2, height: '100%', transition: 'all 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', '&:hover': { borderColor: color, transform: 'translateY(-2px)', boxShadow: `0 4px 12px rgba(0,0,0,0.08)` } }}>
                      <CardContent sx={{ textAlign: 'center', pt: 3.5, pb: 3, px: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                        <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: `${color}0D`, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, border: `1px solid ${color}20` }}>
                          <c.Icon sx={{ fontSize: 24, color }} />
                        </Box>
                        <Typography sx={{ color: '#1A1A1A', fontWeight: 600, fontSize: 14, mb: 0.5 }}>{c.title}</Typography>
                        <Typography sx={{ color: '#6B7280', fontSize: 12, lineHeight: 1.5, mb: 'auto', pb: 2 }}>{c.desc}</Typography>
                        <Button variant="outlined" component={Link} to={c.to} sx={{ borderColor: '#E8E5DE', color: '#6B7280', fontWeight: 600, fontSize: 12, px: 3, py: 0.7, '&:hover': { bgcolor: color, color: '#fff', borderColor: color } }}>
                          Acessar
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        ))}
      </Box>

      {/* Build Stamp */}
      <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #E8E5DE', textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
          Build: {__BUILD_HASH__} - {new Date(__BUILD_TIME__).toLocaleString('pt-BR')}
        </Typography>
      </Box>
    </Container>
    </Box>
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
          <Route path="/local-operators" element={
            <ProtectedAdminRoute>
              <AdminHeader />
              <LocalOperators />
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
          
          {/* Avaliações e Reputação */}
          <Route path="/ratings" element={<ProtectedAdminRoute><RatingsPage /></ProtectedAdminRoute>} />
          <Route path="/compensations" element={<ProtectedAdminRoute><CompensationsPage /></ProtectedAdminRoute>} />
          <Route path="/local-support" element={<ProtectedAdminRoute><Container maxWidth="lg" sx={{ mt: 2 }}><AdminHeader /><LocalSupportDrivers /></Container></ProtectedAdminRoute>} />

          {/* Rotas Vitrine Local */}
          <Route path="/vitrine-local" element={<ProtectedAdminRoute><VitrineLocalList /></ProtectedAdminRoute>} />
          <Route path="/vitrine-local/new" element={<ProtectedAdminRoute><VitrineLocalForm /></ProtectedAdminRoute>} />
          <Route path="/vitrine-local/:id/edit" element={<ProtectedAdminRoute><VitrineLocalForm /></ProtectedAdminRoute>} />

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
