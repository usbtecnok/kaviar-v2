import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Container, Typography, Box, Card, CardContent, Button, 
  Table, TableBody, TableCell, TableHead, TableRow, 
  Chip, IconButton, TextField, MenuItem, Alert, Grid
} from '@mui/material';
import { Add, Edit, Block, Search } from '@mui/icons-material';
import { adminApi } from '../../../services/adminApi';
import { formatPrice, formatDuration, formatTourType } from '../../../utils/premiumTourismHelpers';
import DomainHeader from '../../../components/common/DomainHeader';
import PremiumTourismNav from '../../../components/admin/premium-tourism/PremiumTourismNav';

export default function TourPackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadPackages();
  }, [page, search, typeFilter]);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;

      const data = await adminApi.getTourPackages(params);
      setPackages(data.packages || []);
      setTotal(data.total || 0);
      setError('');
    } catch (err) {
      setError('Erro ao carregar pacotes turísticos');
      console.error('Error loading tour packages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id, title) => {
    if (!confirm(`Desativar pacote "${title}"?`)) return;

    try {
      await adminApi.deactivateTourPackage(id);
      loadPackages(); // Recarregar lista
    } catch (err) {
      setError('Erro ao desativar pacote');
      console.error('Error deactivating package:', err);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadPackages();
  };

  if (loading && packages.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 2 }}>
        <Typography>Carregando pacotes turísticos...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2 }}>
      <DomainHeader 
        domain="admin" 
        title="Pacotes Turísticos"
        breadcrumbs={["Premium/Turismo", "Pacotes"]}
        backUrl="/admin"
      />

      <Grid container spacing={3}>
        {/* Navegação Lateral */}
        <Grid item xs={12} md={3}>
          <PremiumTourismNav />
        </Grid>

        {/* Conteúdo Principal */}
        <Grid item xs={12} md={9}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

      {/* Filtros e Ações */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Buscar por título ou parceiro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
              sx={{ minWidth: 250 }}
            />
            
            <TextField
              select
              size="small"
              label="Tipo"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="TOUR">Tour Turístico</MenuItem>
              <MenuItem value="AIRPORT_TRANSFER">Transfer Aeroporto</MenuItem>
            </TextField>

            <Button
              variant="outlined"
              startIcon={<Search />}
              onClick={handleSearch}
            >
              Buscar
            </Button>

            <Box sx={{ flexGrow: 1 }} />

            <Button
              variant="contained"
              startIcon={<Add />}
              component={Link}
              to="/admin/premium-tourism/packages/new"
              color="secondary"
            >
              Novo Pacote
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Tabela de Pacotes */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Pacotes Turísticos ({total})
          </Typography>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Título</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Parceiro</TableCell>
                <TableCell>Preço</TableCell>
                <TableCell>Duração</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{pkg.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {pkg.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={formatTourType(pkg.type)} 
                      size="small"
                      color={pkg.type === 'TOUR' ? 'primary' : 'secondary'}
                    />
                  </TableCell>
                  <TableCell>{pkg.partnerName}</TableCell>
                  <TableCell>{formatPrice(pkg.basePrice)}</TableCell>
                  <TableCell>{formatDuration(pkg.estimatedDurationMinutes)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={pkg.isActive ? 'Ativo' : 'Inativo'}
                      color={pkg.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      component={Link}
                      to={`/admin/premium-tourism/packages/${pkg.id}/edit`}
                      size="small"
                      color="primary"
                    >
                      <Edit />
                    </IconButton>
                    {pkg.isActive && (
                      <IconButton
                        onClick={() => handleDeactivate(pkg.id, pkg.title)}
                        size="small"
                        color="error"
                      >
                        <Block />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {packages.length === 0 && !loading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                Nenhum pacote turístico encontrado
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                component={Link}
                to="/admin/premium-tourism/packages/new"
                sx={{ mt: 2 }}
                color="secondary"
              >
                Criar Primeiro Pacote
              </Button>
            </Box>
          )}
        </CardContent>
        </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
