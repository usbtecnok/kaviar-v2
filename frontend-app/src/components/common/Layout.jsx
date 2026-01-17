import { useState, useEffect } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Box, 
  Container,
  Menu,
  MenuItem
} from '@mui/material';
import { 
  AccountCircle, 
  ExitToApp,
  Dashboard,
  DirectionsCar,
  Person
} from '@mui/icons-material';
import KaviarLogo from './KaviarLogo';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Layout = ({ children, title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [displayUser, setDisplayUser] = useState(null);

  // Detectar área do motorista e usar token correto
  useEffect(() => {
    const isDriverArea = location.pathname.startsWith('/motorista');
    
    if (isDriverArea) {
      // Área do motorista: usar kaviar_driver_token
      const driverToken = localStorage.getItem('kaviar_driver_token');
      if (driverToken) {
        // Decodificar token JWT para pegar dados do motorista
        try {
          const payload = JSON.parse(atob(driverToken.split('.')[1]));
          setDisplayUser({
            email: payload.email || 'Motorista',
            user_type: 'driver'
          });
        } catch (error) {
          setDisplayUser({ email: 'Motorista', user_type: 'driver' });
        }
      } else {
        setDisplayUser(null);
      }
    } else {
      // Outras áreas: usar contexto normal
      setDisplayUser(user);
    }
  }, [location.pathname, user]);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    const isDriverArea = location.pathname.startsWith('/motorista');
    
    if (isDriverArea) {
      // Logout do motorista
      localStorage.removeItem('kaviar_driver_token');
      navigate('/motorista/login');
    } else {
      // Logout normal
      logout();
      navigate('/login');
    }
    handleClose();
  };

  const getUserTypeIcon = () => {
    switch (displayUser?.user_type) {
      case 'admin': return <Dashboard />;
      case 'driver': return <DirectionsCar />;
      case 'passenger': return <Person />;
      default: return <AccountCircle />;
    }
  };

  const getUserTypeLabel = () => {
    switch (displayUser?.user_type) {
      case 'admin': return 'Admin';
      case 'driver': return 'Motorista';
      case 'passenger': return 'Passageiro';
      default: return 'Usuário';
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <KaviarLogo variant="icon" size="small" sx={{ mr: 2 }} />
            <Typography variant="h6" component="div">
              {title || 'Kaviar'}
            </Typography>
          </Box>
          
          {displayUser && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                {displayUser.email} ({getUserTypeLabel()})
              </Typography>
              
              <IconButton
                size="large"
                onClick={handleMenu}
                color="inherit"
              >
                {getUserTypeIcon()}
              </IconButton>
              
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem onClick={handleLogout}>
                  <ExitToApp sx={{ mr: 1 }} />
                  Sair
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
        {children}
      </Container>
    </Box>
  );
};

export default Layout;
