import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
} from '@mui/material';

const TYPE_LABELS = {
  HOME: 'Casa',
  WORK: 'Trabalho',
  OTHER: 'Outro',
};

export default function AddFavoritePlaceModal({ open, onClose, onSave, initialType = 'HOME' }) {
  const [formData, setFormData] = useState({
    type: initialType,
    label: '',
    address_text: '',
    lat: null,
    lng: null,
    place_source: 'manual',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleChange('lat', position.coords.latitude);
          handleChange('lng', position.coords.longitude);
          handleChange('place_source', 'gps');
        },
        (error) => {
          console.error('Erro ao obter localização:', error);
          alert('Não foi possível obter sua localização. Digite o endereço manualmente.');
        }
      );
    } else {
      alert('Geolocalização não suportada pelo navegador.');
    }
  };

  const handleSubmit = () => {
    if (!formData.label) {
      alert('Digite um nome para o local');
      return;
    }

    // Se não tem lat/lng, tentar obter do GPS
    if (!formData.lat || !formData.lng) {
      alert('Obtendo sua localização...');
      handleGetCurrentLocation();
      return;
    }

    onSave(formData);
    onClose();
    
    // Reset form
    setFormData({
      type: 'HOME',
      label: '',
      address_text: '',
      lat: null,
      lng: null,
      place_source: 'manual',
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Adicionar Local Favorito</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Tipo</InputLabel>
            <Select
              value={formData.type}
              label="Tipo"
              onChange={(e) => handleChange('type', e.target.value)}
            >
              <MenuItem value="HOME">🏠 Casa</MenuItem>
              <MenuItem value="WORK">💼 Trabalho</MenuItem>
              <MenuItem value="OTHER">📍 Outro</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Nome do local"
            placeholder={`Ex: ${TYPE_LABELS[formData.type]}, Apartamento, Escritório...`}
            value={formData.label}
            onChange={(e) => handleChange('label', e.target.value)}
            fullWidth
            required
          />

          <TextField
            label="Endereço (opcional)"
            placeholder="Ex: Rua X, 123 - Bairro"
            value={formData.address_text}
            onChange={(e) => handleChange('address_text', e.target.value)}
            fullWidth
            multiline
            rows={2}
          />

          {(!formData.lat || !formData.lng) && (
            <Button 
              variant="outlined" 
              onClick={handleGetCurrentLocation}
              fullWidth
            >
              📍 Usar minha localização atual
            </Button>
          )}

          {formData.lat && formData.lng && (
            <Typography variant="caption" color="text.secondary">
              ✓ Localização: {formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained">
          Salvar Local
        </Button>
      </DialogActions>
    </Dialog>
  );
}
