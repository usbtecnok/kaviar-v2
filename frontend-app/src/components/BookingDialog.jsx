import { useState } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Grid, Typography, Box, Alert,
  Stepper, Step, StepLabel, Chip
} from '@mui/material';
import { Person, Event, Payment, CheckCircle } from '@mui/icons-material';
import { formatPrice } from '../utils/premiumTourismHelpers';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export default function BookingDialog({ open, onClose, tourPackage }) {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingResult, setBookingResult] = useState(null);

  const [formData, setFormData] = useState({
    // Dados do passageiro
    passengerName: '',
    passengerEmail: '',
    passengerPhone: '',
    passengerCount: 1,
    
    // Dados da reserva
    scheduledDate: '',
    specialRequests: '',
    
    // Dados de contato
    emergencyContact: '',
    emergencyPhone: ''
  });

  const [errors, setErrors] = useState({});

  const steps = ['Dados Pessoais', 'Detalhes da Reserva', 'Confirmação'];

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 0) {
      if (!formData.passengerName.trim()) newErrors.passengerName = 'Nome é obrigatório';
      if (!formData.passengerEmail.trim()) newErrors.passengerEmail = 'Email é obrigatório';
      if (!formData.passengerPhone.trim()) newErrors.passengerPhone = 'Telefone é obrigatório';
      if (formData.passengerCount < 1) newErrors.passengerCount = 'Mínimo 1 passageiro';
    }

    if (step === 1) {
      if (!formData.scheduledDate) newErrors.scheduledDate = 'Data é obrigatória';
      if (!formData.emergencyContact.trim()) newErrors.emergencyContact = 'Contato de emergência é obrigatório';
      if (!formData.emergencyPhone.trim()) newErrors.emergencyPhone = 'Telefone de emergência é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(1)) return;

    try {
      setLoading(true);
      setError('');

      const bookingData = {
        tourPackageId: tourPackage.id,
        passengerName: formData.passengerName,
        passengerEmail: formData.passengerEmail,
        passengerPhone: formData.passengerPhone,
        passengerCount: parseInt(formData.passengerCount),
        scheduledDate: formData.scheduledDate,
        specialRequests: formData.specialRequests || null,
        emergencyContact: formData.emergencyContact,
        emergencyPhone: formData.emergencyPhone
      };

      const response = await fetch(`${API_BASE_URL}/governance/tour-bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar reserva');
      }

      setBookingResult(result);
      setActiveStep(2);

    } catch (err) {
      setError(err.message || 'Erro ao processar reserva');
      console.error('Error creating booking:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setFormData({
      passengerName: '',
      passengerEmail: '',
      passengerPhone: '',
      passengerCount: 1,
      scheduledDate: '',
      specialRequests: '',
      emergencyContact: '',
      emergencyPhone: ''
    });
    setErrors({});
    setError('');
    setBookingResult(null);
    onClose();
  };

  const totalPrice = tourPackage ? tourPackage.basePrice * formData.passengerCount : 0;

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome Completo"
                value={formData.passengerName}
                onChange={handleChange('passengerName')}
                error={Boolean(errors.passengerName)}
                helperText={errors.passengerName}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="email"
                label="Email"
                value={formData.passengerEmail}
                onChange={handleChange('passengerEmail')}
                error={Boolean(errors.passengerEmail)}
                helperText={errors.passengerEmail}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Telefone"
                value={formData.passengerPhone}
                onChange={handleChange('passengerPhone')}
                error={Boolean(errors.passengerPhone)}
                helperText={errors.passengerPhone}
                placeholder="(11) 99999-9999"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Número de Passageiros"
                value={formData.passengerCount}
                onChange={handleChange('passengerCount')}
                error={Boolean(errors.passengerCount)}
                helperText={errors.passengerCount}
                inputProps={{ min: 1, max: 8 }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Valor Total
                </Typography>
                <Typography variant="h6" color="secondary.main">
                  {formatPrice(totalPrice)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formData.passengerCount}x {formatPrice(tourPackage?.basePrice || 0)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="Data Desejada"
                value={formData.scheduledDate}
                onChange={handleChange('scheduledDate')}
                error={Boolean(errors.scheduledDate)}
                helperText={errors.scheduledDate}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: new Date().toISOString().split('T')[0] }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contato de Emergência"
                value={formData.emergencyContact}
                onChange={handleChange('emergencyContact')}
                error={Boolean(errors.emergencyContact)}
                helperText={errors.emergencyContact}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Telefone de Emergência"
                value={formData.emergencyPhone}
                onChange={handleChange('emergencyPhone')}
                error={Boolean(errors.emergencyPhone)}
                helperText={errors.emergencyPhone}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Solicitações Especiais (opcional)"
                value={formData.specialRequests}
                onChange={handleChange('specialRequests')}
                placeholder="Necessidades especiais, preferências, observações..."
              />
            </Grid>
          </Grid>
        );

      case 2:
        return bookingResult ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom color="success.main">
              Reserva Confirmada!
            </Typography>
            
            <Box sx={{ my: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Número da Reserva
              </Typography>
              <Typography variant="h6" color="primary.main">
                #{bookingResult.booking?.id}
              </Typography>
            </Box>

            <Typography variant="body1" gutterBottom>
              Sua reserva foi criada com sucesso!
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Você receberá um email de confirmação em breve com todos os detalhes.
            </Typography>

            {bookingResult.premiumDriversAvailable === 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  No momento não há motoristas premium disponíveis, mas sua reserva foi registrada 
                  e entraremos em contato assim que possível.
                </Typography>
              </Alert>
            )}
          </Box>
        ) : null;

      default:
        return null;
    }
  };

  if (!tourPackage) return null;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ sx: { minHeight: 500 } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">
            Reservar: {tourPackage.title}
          </Typography>
          <Chip 
            label={tourPackage.partnerName} 
            size="small" 
            color="secondary"
          />
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent(activeStep)}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose}>
          {activeStep === 2 ? 'Fechar' : 'Cancelar'}
        </Button>
        
        {activeStep > 0 && activeStep < 2 && (
          <Button onClick={handleBack}>
            Voltar
          </Button>
        )}
        
        {activeStep < 1 && (
          <Button variant="contained" onClick={handleNext}>
            Próximo
          </Button>
        )}
        
        {activeStep === 1 && (
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Processando...' : 'Confirmar Reserva'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
