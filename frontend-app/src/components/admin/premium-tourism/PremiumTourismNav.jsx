import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Box, Paper, List, ListItem, ListItemButton, ListItemIcon, 
  ListItemText, Typography, Divider, Chip, Alert
} from '@mui/material';
import { 
  Tour, CardTravel, BookOnline, Dashboard, 
  TrendingUp, Settings 
} from '@mui/icons-material';
import { checkPremiumTourismEnabled } from '../../../services/featureFlags';

export default function PremiumTourismNav() {
  const location = useLocation();
  const [featureEnabled, setFeatureEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPremiumTourismEnabled().then(enabled => {
      setFeatureEnabled(enabled);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <Paper sx={{ width: 280, p: 2 }}>
        <Typography>Verificando funcionalidade...</Typography>
      </Paper>
    );
  }

  if (!featureEnabled) {
    return (
      <Paper sx={{ width: 280 }}>
        <Alert severity="warning" sx={{ m: 2 }}>
          Premium Tourism não está habilitado
        </Alert>
      </Paper>
    );
  }

  const menuItems = [
    {
      title: 'Visão Geral',
      icon: <Dashboard />,
      path: '/admin/premium-tourism',
      description: 'Dashboard e métricas'
    },
    {
      title: 'Pacotes Turísticos',
      icon: <Tour />,
      path: '/admin/premium-tourism/packages',
      description: 'Gerenciar pacotes de turismo',
      badge: 'Principal'
    },
    {
      title: 'Reservas',
      icon: <BookOnline />,
      path: '/admin/premium-tourism/bookings',
      description: 'Gerenciar reservas de clientes',
      badge: 'Principal'
    },
    {
      title: 'Parceiros',
      icon: <CardTravel />,
      path: '/admin/premium-tourism/partners',
      description: 'Gestão de parceiros turísticos'
    },
    {
      title: 'Relatórios',
      icon: <TrendingUp />,
      path: '/admin/premium-tourism/reports',
      description: 'Análises e relatórios'
    },
    {
      title: 'Configurações',
      icon: <Settings />,
      path: '/admin/premium-tourism/settings',
      description: 'Configurações do módulo'
    }
  ];

  return (
    <Paper sx={{ width: 280, height: 'fit-content' }}>
      <Box sx={{ p: 2, bgcolor: 'secondary.main', color: 'white' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tour />
          Premium Tourism
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          Gestão de Turismo Premium
        </Typography>
      </Box>

      <List sx={{ p: 0 }}>
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          
          return (
            <ListItem key={index} disablePadding>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={isActive}
                sx={{
                  py: 1.5,
                  '&.Mui-selected': {
                    bgcolor: 'secondary.light',
                    color: 'secondary.contrastText',
                    '&:hover': {
                      bgcolor: 'secondary.main',
                    }
                  }
                }}
              >
                <ListItemIcon sx={{ 
                  color: isActive ? 'secondary.contrastText' : 'inherit',
                  minWidth: 40 
                }}>
                  {item.icon}
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">
                        {item.title}
                      </Typography>
                      {item.badge && (
                        <Chip 
                          label={item.badge} 
                          size="small" 
                          color="primary"
                          sx={{ height: 18, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  }
                  secondary={item.description}
                  secondaryTypographyProps={{
                    variant: 'caption',
                    color: isActive ? 'secondary.contrastText' : 'text.secondary'
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />
      
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Módulo Premium Tourism v1.0
        </Typography>
      </Box>
    </Paper>
  );
}
