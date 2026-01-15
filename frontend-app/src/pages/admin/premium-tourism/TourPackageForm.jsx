import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Container, Card, CardContent, TextField, Button, 
  MenuItem, Box, Alert, Grid, Typography
} from '@mui/material';
import { Save, Cancel } from '@mui/icons-material';
import { adminApi } from '../../../services/adminApi';
import { validateTourPackage, ERROR_MESSAGES } from '../../../utils/premiumTourismHelpers';
import DomainHeader from '../../../components/common/DomainHeader';
import PremiumTourismNav from '../../../components/admin/premium-tourism/PremiumTourismNav';

export default function TourPackageForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'TOUR',
    partnerName: '',
    basePrice: '',
    estimatedDurationMinutes: '',
    locations: '',
    isActive: true
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      loadPackage();
    }
  }, [id, isEdit]);

  const loadPackage = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getTourPackage(id);
      const pkg = response.package || response.data || response;
      setFormData({
        title: pkg.title || '',
        description: pkg.description || '',
        type: pkg.type || 'TOUR',
        partnerName: pkg.partnerName || '',
        basePrice: pkg.basePrice?.toString() || '',
        estimatedDurationMinutes: pkg.estimatedDurationMinutes?.toString() || '',
        locations: Array.isArray(pkg.locations) ? pkg.locations.join(', ') : pkg.locations || '',
        isActive: pkg.isActive !== false
      });
    } catch (err) {
      setError('Erro ao carregar pacote');
      console.error('Error loading package:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Preparar dados para validação
    const dataToValidate = {
      ...formData,
      basePrice: parseFloat(formData.basePrice) || 0,
      estimatedDurationMinutes: parseInt(formData.estimatedDurationMinutes) || 0,
      locations: formData.locations.split(',').map(l => l.trim()).filter(Boolean)
    };

    // Validar
    const validation = validateTourPackage(dataToValidate);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (isEdit) {
        await adminApi.updateTourPackage(id, dataToValidate);
      } else {
        await adminApi.createTourPackage(dataToValidate);
      }

      navigate('/admin/premium-tourism/packages');
    } catch (err) {
      setError(err.response?.data?.message || ERROR_MESSAGES.SERVER_ERROR);
      console.error('Error saving package:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/premium-tourism/packages');
  };

  if (loading && isEdit) {
    return (
      <Container maxWidth="xl" sx={{ mt: 2 }}>
        <Typography>Carregando pacote...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2 }}>
      <DomainHeader 
        domain="admin" 
        title={isEdit ? 'Editar Pacote' : 'Novo Pacote'}
        breadcrumbs={["Premium/Turismo", "Pacotes", isEdit ? 'Editar' : 'Novo']}
        backUrl="/admin/premium-tourism/packages"
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <PremiumTourismNav />
        </Grid>

        <Grid item xs={12} md={9}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Card>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Título"
                      value={formData.title}
                      onChange={handleChange('title')}
                      error={Boolean(errors.title)}
                      helperText={errors.title}
                      required
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Descrição"
                      value={formData.description}
                      onChange={handleChange('description')}
                      error={Boolean(errors.description)}
                      helperText={errors.description}
                      required
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      select
                      fullWidth
                      label="Tipo"
                      value={formData.type}
                      onChange={handleChange('type')}
                      error={Boolean(errors.type)}
                      helperText={errors.type}
                      required
                    >
                      <MenuItem value="TOUR">Tour Turístico</MenuItem>
                      <MenuItem value="AIRPORT_TRANSFER">Transfer Aeroporto</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Nome do Parceiro"
                      value={formData.partnerName}
                      onChange={handleChange('partnerName')}
                      error={Boolean(errors.partnerName)}
                      helperText={errors.partnerName}
                      required
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Preço Base (R$)"
                      value={formData.basePrice}
                      onChange={handleChange('basePrice')}
                      error={Boolean(errors.basePrice)}
                      helperText={errors.basePrice}
                      inputProps={{ min: 0, step: 0.01 }}
                      required
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Duração (minutos)"
                      value={formData.estimatedDurationMinutes}
                      onChange={handleChange('estimatedDurationMinutes')}
                      error={Boolean(errors.estimatedDurationMinutes)}
                      helperText={errors.estimatedDurationMinutes}
                      inputProps={{ min: 1 }}
                      required
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Locais (separados por vírgula)"
                      value={formData.locations}
                      onChange={handleChange('locations')}
                      error={Boolean(errors.locations)}
                      helperText={errors.locations || "Ex: Cristo Redentor, Pão de Açúcar, Copacabana"}
                      required
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                      <Button
                        variant="outlined"
                        onClick={handleCancel}
                        startIcon={<Cancel />}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        variant="contained"
                        color="secondary"
                        startIcon={<Save />}
                        disabled={loading}
                      >
                        {loading ? 'Salvando...' : (isEdit ? 'Atualizar' : 'Criar')}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
