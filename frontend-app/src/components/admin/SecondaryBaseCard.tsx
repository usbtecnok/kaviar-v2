import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, Typography, TextField, Button, Box, Alert, CircularProgress, Switch, FormControlLabel } from '@mui/material';
import { Place as MapPinIcon, Delete as TrashIcon } from '@mui/icons-material';
import api from '../../api';

interface SecondaryBaseCardProps {
  driverId: string;
}

interface SecondaryBase {
  lat: number;
  lng: number;
  label: string | null;
  enabled: boolean;
}

export const SecondaryBaseCard: React.FC<SecondaryBaseCardProps> = ({ driverId }) => {
  const [base, setBase] = useState<SecondaryBase | null>(null);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [label, setLabel] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchBase();
  }, [driverId]);

  const fetchBase = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/api/admin/drivers/${driverId}/secondary-base`);
      
      if (data.success && data.secondaryBase) {
        setBase(data.secondaryBase);
        setLat(data.secondaryBase.lat.toString());
        setLng(data.secondaryBase.lng.toString());
        setLabel(data.secondaryBase.label || '');
        setEnabled(data.secondaryBase.enabled);
      }
    } catch (error) {
      console.error('Erro ao carregar base secundária:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      setMessage({ type: 'error', text: 'Coordenadas inválidas' });
      return;
    }

    if (latNum < -90 || latNum > 90) {
      setMessage({ type: 'error', text: 'Latitude deve estar entre -90 e 90' });
      return;
    }

    if (lngNum < -180 || lngNum > 180) {
      setMessage({ type: 'error', text: 'Longitude deve estar entre -180 e 180' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const { data } = await api.put(`/api/admin/drivers/${driverId}/secondary-base`, {
        lat: latNum,
        lng: lngNum,
        label: label || null,
        enabled
      });

      if (data.success) {
        setMessage({ type: 'success', text: 'Base secundária atualizada' });
        fetchBase();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao salvar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar base secundária' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Remover base secundária?')) return;

    try {
      setSaving(true);
      setMessage(null);

      const { data } = await api.delete(`/api/admin/drivers/${driverId}/secondary-base`);

      if (data.success) {
        setMessage({ type: 'success', text: 'Base secundária removida' });
        setBase(null);
        setLat('');
        setLng('');
        setLabel('');
        setEnabled(true);
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao remover' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao remover base secundária' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MapPinIcon />
            <Typography variant="h6">Base Secundária</Typography>
          </Box>
        }
      />
      <CardContent>
        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Latitude"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="-23.5505"
            size="small"
            fullWidth
          />

          <TextField
            label="Longitude"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="-46.6333"
            size="small"
            fullWidth
          />

          <TextField
            label="Label (opcional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: Base Zona Sul"
            size="small"
            fullWidth
          />

          <FormControlLabel
            control={
              <Switch
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
            }
            label="Ativa"
          />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || !lat || !lng}
              fullWidth
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>

            {base && (
              <Button
                variant="outlined"
                color="error"
                onClick={handleDelete}
                disabled={saving}
                startIcon={<TrashIcon />}
              >
                Remover
              </Button>
            )}
          </Box>

          {base && (
            <Typography variant="caption" color="text.secondary">
              Base atual: {base.lat.toFixed(6)}, {base.lng.toFixed(6)}
              {base.label && ` (${base.label})`}
              {' • '}
              {base.enabled ? 'Ativa' : 'Inativa'}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
