import { useState } from 'react';
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
import { useNavigate } from 'react-router-dom';

const Layout = ({ children, title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleClose();
  };

  const getUserTypeIcon = () => {
    switch (user?.user_type) {
      case 'admin': return <Dashboard />;
      case 'driver': return <DirectionsCar />;
      case 'passenger': return <Person />;
      default: return <AccountCircle />;
    }
  };

  const getUserTypeLabel = () => {
    switch (user?.user_type) {
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
          
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                {user.email} ({getUserTypeLabel()})
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
