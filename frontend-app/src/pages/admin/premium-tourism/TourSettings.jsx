import { useState, useEffect } from 'react';
import { Container, Card, CardContent, TextField, Button, Alert, Grid, Typography, Box } from '@mui/material';
import { Save } from '@mui/icons-material';
import { adminApi } from '../../../services/adminApi';
import DomainHeader from '../../../components/common/DomainHeader';
import PremiumTourismNav from '../../../components/admin/premium-tourism/PremiumTourismNav';

export default function TourSettings() {
  const [formData, setFormData] = useState({
    supportWhatsapp: '',
    defaultPartnerId: '',
    termsUrl: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminApi.getTourSettings();
      const settings = data.settings || {};
      setFormData({
        supportWhatsapp: settings.support_whatsapp || '',
        defaultPartnerId: settings.default_partner_id || '',
        termsUrl: settings.terms_url || ''
      });
    } catch (err) {
      setError('Erro ao carregar configurações');
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await adminApi.updateTourSettings(formData);
      setSuccess('Configurações salvas com sucesso');
    } catch (err) {
      setError(err.message || 'Erro ao salvar configurações');
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 2 }}>
        <Typography>Carregando configurações...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2 }}>
      <DomainHeader 
        domain="admin" 
        title="Configurações Premium Tourism"
        breadcrumbs={["Premium/Turismo", "Configurações"]}
        backUrl="/admin"
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <PremiumTourismNav />
        </Grid>

        <Grid item xs={12} md={9}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <Card>
            <CardContent>
              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  label="WhatsApp de Suporte"
                  value={formData.supportWhatsapp}
                  onChange={(e) => setFormData({ ...formData, supportWhatsapp: e.target.value })}
                  fullWidth
                  sx={{ mb: 2 }}
                  helperText="Ex: +5511999999999"
                />

                <TextField
                  label="ID do Parceiro Padrão"
                  value={formData.defaultPartnerId}
                  onChange={(e) => setFormData({ ...formData, defaultPartnerId: e.target.value })}
                  fullWidth
                  sx={{ mb: 2 }}
                  helperText="UUID do parceiro padrão"
                />

                <TextField
                  label="URL dos Termos"
                  value={formData.termsUrl}
                  onChange={(e) => setFormData({ ...formData, termsUrl: e.target.value })}
                  fullWidth
                  sx={{ mb: 3 }}
                  helperText="Ex: https://kaviar.com/terms"
                />

                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<Save />}
                  disabled={saving}
                  color="secondary"
                >
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
