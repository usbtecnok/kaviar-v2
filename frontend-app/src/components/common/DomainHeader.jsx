import { Box, Typography, Breadcrumbs, Link, IconButton } from '@mui/material';
import { ArrowBack, Home } from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

export default function DomainHeader({ 
  domain, 
  title, 
  breadcrumbs = [], 
  backUrl,
  actions 
}) {
  const navigate = useNavigate();

  const getDomainColor = (domain) => {
    const colors = {
      'admin': 'primary',
      'governance': 'secondary', 
      'premium-tourism': 'info'
    };
    return colors[domain] || 'primary';
  };

  const getDomainLabel = (domain) => {
    const labels = {
      'admin': 'Administração',
      'governance': 'Governança',
      'premium-tourism': 'Premium Tourism'
    };
    return labels[domain] || domain;
  };

  return (
    <Box sx={{ mb: 3 }}>
      {/* Header Principal */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 1 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {backUrl && (
            <IconButton 
              onClick={() => navigate(backUrl)}
              size="small"
              color="primary"
            >
              <ArrowBack />
            </IconButton>
          )}
          
          <Typography 
            variant="h4" 
            component="h1"
            color={`${getDomainColor(domain)}.main`}
          >
            {title}
          </Typography>
        </Box>

        {actions && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {actions}
          </Box>
        )}
      </Box>

      {/* Breadcrumbs */}
      <Breadcrumbs separator="›" sx={{ color: 'text.secondary' }}>
        <Link 
          component={RouterLink} 
          to="/" 
          color="inherit"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <Home fontSize="small" />
          Kaviar
        </Link>
        
        <Link 
          component={RouterLink} 
          to={`/${domain}`} 
          color="inherit"
        >
          {getDomainLabel(domain)}
        </Link>
        
        {breadcrumbs.map((crumb, index) => (
          <Typography key={index} color="text.primary">
            {crumb}
          </Typography>
        ))}
      </Breadcrumbs>
    </Box>
  );
}
