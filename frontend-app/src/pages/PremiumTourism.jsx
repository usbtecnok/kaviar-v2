import { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Card, CardContent, Button,
  Grid, Chip, TextField, MenuItem, Alert, CircularProgress
} from '@mui/material';
import { Tour, LocationOn, Schedule, AttachMoney, Search } from '@mui/icons-material';
import { formatPrice, formatDuration, formatTourType } from '../utils/premiumTourismHelpers';
import { checkPremiumTourismEnabled } from '../services/featureFlags';
import BookingDialog from '../components/BookingDialog';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function PremiumTourism() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [featureEnabled, setFeatureEnabled] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(null);

  useEffect(() => {
    checkFeatureAndLoadPackages();
  }, []);

  const checkFeatureAndLoadPackages = async () => {
    try {
      const enabled = await checkPremiumTourismEnabled();
      setFeatureEnabled(enabled);
      
      if (enabled) {
        await loadPackages();
      }
    } catch (err) {
      setError('Erro ao verificar disponibilidade do serviço');
    } finally {
      setLoading(false);
    }
  };

  const loadPackages = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/governance/tour-packages`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar pacotes');
      }

      const data = await response.json();
      setPackages(data.packages || []);
    } catch (err) {
      setError('Erro ao carregar pacotes turísticos');
      console.error('Error loading packages:', err);
    }
  };

  const filteredPackages = packages.filter(pkg => {
    const matchesType = !typeFilter || pkg.type === typeFilter;

    const q = (search ?? '').toLowerCase();
    const matchesSearch = !q ||
      (pkg.title ?? '').toLowerCase().includes(q) ||
      (pkg.description ?? '').toLowerCase().includes(q) ||
      (pkg.partnerName ?? '').toLowerCase().includes(q);

    return matchesType && matchesSearch;
  });
if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Carregando...</Typography>
      </Container>
    );
  }

  if (!featureEnabled) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="info" sx={{ textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Turismo Premium
          </Typography>
          <Typography>
            Este serviço não está disponível no momento.
          </Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Tour sx={{ fontSize: 64, color: 'secondary.main', mb: 2 }} />
        <Typography variant="h3" component="h1" gutterBottom color="secondary.main">
          Turismo Premium
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Descubra experiências únicas com nossos parceiros especializados
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                placeholder="Buscar por título, descrição ou parceiro..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Tipo de Experiência"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="">Todos os tipos</MenuItem>
                <MenuItem value="TOUR">Tours Turísticos</MenuItem>
                <MenuItem value="AIRPORT_TRANSFER">Transfers Aeroporto</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <Typography variant="body2" color="text.secondary">
                {filteredPackages.length} experiência{filteredPackages.length !== 1 ? 's' : ''}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Lista de Pacotes */}
      <Grid container spacing={3}>
        {filteredPackages.map((pkg) => (
          <Grid item xs={12} md={6} lg={4} key={pkg.id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Chip 
                    label={formatTourType(pkg.type)} 
                    color={pkg.type === 'TOUR' ? 'primary' : 'secondary'}
                    size="small"
                  />
                  <Typography variant="h6" color="secondary.main" fontWeight="bold">
                    {formatPrice(pkg.basePrice)}
                  </Typography>
                </Box>

                <Typography variant="h6" gutterBottom>
                  {pkg.title}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {pkg.description}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <LocationOn fontSize="small" color="action" />
                  <Typography variant="body2">
                    {pkg.partnerName}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Schedule fontSize="small" color="action" />
                  <Typography variant="body2">
                    {formatDuration(pkg.estimatedDurationMinutes)}
                  </Typography>
                </Box>

                {pkg.locations && pkg.locations.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Locais: {Array.isArray(pkg.locations) ? pkg.locations.join(', ') : pkg.locations}
                    </Typography>
                  </Box>
                )}
              </CardContent>

              <Box sx={{ p: 2, pt: 0 }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="secondary"
                  onClick={() => setSelectedPackage(pkg)}
                >
                  Reservar Agora
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredPackages.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Tour sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nenhuma experiência encontrada
          </Typography>
          <Typography color="text.secondary">
            Tente ajustar os filtros ou volte mais tarde
          </Typography>
        </Box>
      )}

      {/* Modal de Reserva */}
      <BookingDialog
        open={Boolean(selectedPackage)}
        onClose={() => setSelectedPackage(null)}
        tourPackage={selectedPackage}
      />
    </Container>
  );
}
