import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Componentes de tela
import PassengerHome from './components/passenger/PassengerHome';
import RideRequest from './components/passenger/RideRequest';
import ServiceConfirmation from './components/passenger/ServiceConfirmation';
import RideInProgress from './components/passenger/RideInProgress';
import RideCompletion from './components/passenger/RideCompletion';
import PassengerProfile from './components/passenger/PassengerProfile';

import DriverHome from './components/driver/DriverHome';
import RideReceived from './components/driver/RideReceived';
import RideActive from './components/driver/RideActive';
import DriverEarnings from './components/driver/DriverEarnings';
import DriverProfile from './components/driver/DriverProfile';

import AdminDashboard from './components/admin/AdminDashboard';
import AdminCommunities from './components/admin/AdminCommunities';
import AdminCommunityChanges from './components/admin/AdminCommunityChanges';
import AdminIncentives from './components/admin/AdminIncentives';
import AdminReports from './components/admin/AdminReports';

import Login from './components/auth/Login';
import ProtectedRoute from './components/common/ProtectedRoute';

// Configuração do React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
  },
});

// Tema Material-UI
const theme = createTheme({
  palette: {
    primary: {
      main: '#2E7D32', // Verde Kaviar
    },
    secondary: {
      main: '#FF6F00', // Laranja para ações
    },
    background: {
      default: '#F5F5F5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '12px 24px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            {/* Autenticação */}
            <Route path="/login" element={<Login />} />
            
            {/* Rotas do Passageiro */}
            <Route path="/passenger" element={<ProtectedRoute userType="passenger" />}>
              <Route index element={<PassengerHome />} />
              <Route path="ride-request" element={<RideRequest />} />
              <Route path="service-confirmation" element={<ServiceConfirmation />} />
              <Route path="ride-in-progress" element={<RideInProgress />} />
              <Route path="ride-completion" element={<RideCompletion />} />
              <Route path="profile" element={<PassengerProfile />} />
            </Route>
            
            {/* Rotas do Motorista */}
            <Route path="/driver" element={<ProtectedRoute userType="driver" />}>
              <Route index element={<DriverHome />} />
              <Route path="ride-received" element={<RideReceived />} />
              <Route path="ride-active" element={<RideActive />} />
              <Route path="earnings" element={<DriverEarnings />} />
              <Route path="profile" element={<DriverProfile />} />
            </Route>
            
            {/* Rotas do Admin */}
            <Route path="/admin" element={<ProtectedRoute userType="admin" />}>
              <Route index element={<AdminDashboard />} />
              <Route path="communities" element={<AdminCommunities />} />
              <Route path="community-changes" element={<AdminCommunityChanges />} />
              <Route path="incentives" element={<AdminIncentives />} />
              <Route path="reports" element={<AdminReports />} />
            </Route>
            
            {/* Redirect padrão */}
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
