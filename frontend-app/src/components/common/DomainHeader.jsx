import { Box, Typography, Button, Breadcrumbs, Link } from "@mui/material";
import { ArrowBack, Home } from "@mui/icons-material";

const DomainHeader = ({ 
  domain, 
  title, 
  breadcrumbs = [], 
  showBackButton = true,
  backUrl = "/" 
}) => {
  const getDomainColor = () => {
    switch (domain) {
      case 'passageiro': return '#2e7d32';
      case 'motorista': return '#ed6c02';
      case 'admin': return '#d32f2f';
      case 'login': return '#1976d2';
      default: return '#1976d2';
    }
  };

  return (
    <Box sx={{ 
      borderBottom: '1px solid #e0e0e0', 
      pb: 2, 
      mb: 3,
      backgroundColor: 'background.paper'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {showBackButton && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<ArrowBack />}
              href={backUrl}
              sx={{ minWidth: 'auto' }}
            >
              Voltar
            </Button>
          )}
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 600, 
              color: getDomainColor(),
              textTransform: 'capitalize'
            }}
          >
            {title}
          </Typography>
        </Box>
        
        <Button
          variant="text"
          size="small"
          startIcon={<Home />}
          href="/"
          sx={{ color: 'text.secondary' }}
        >
          Início
        </Button>
      </Box>
      
      {breadcrumbs.length > 0 && (
        <Breadcrumbs separator="›" sx={{ fontSize: '0.875rem' }}>
          <Link href="/" color="inherit" underline="hover">
            KAVIAR
          </Link>
          <Link href={`/${domain}`} color="inherit" underline="hover" sx={{ textTransform: 'capitalize' }}>
            {domain}
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <Typography key={index} color="text.primary" sx={{ fontSize: '0.875rem' }}>
              {crumb}
            </Typography>
          ))}
        </Breadcrumbs>
      )}
    </Box>
  );
};

export default DomainHeader;
