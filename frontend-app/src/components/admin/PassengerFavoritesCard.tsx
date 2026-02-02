import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, Typography, TextField, Button, Box, Alert, CircularProgress, Select, MenuItem, FormControl, InputLabel, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction } from '@mui/material';
import { Favorite as HeartIcon, Delete as TrashIcon, Add as PlusIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface PassengerFavoritesCardProps {
  passengerId: string;
}

interface Favorite {
  id: string;
  lat: number;
  lng: number;
  label: string;
  type: 'HOME' | 'WORK' | 'OTHER';
  created_at: string;
}

const API_URL = process.env.REACT_APP_API_URL || 'https://api.kaviar.com.br';

const TYPE_LABELS = {
  HOME: '🏠 Casa',
  WORK: '💼 Trabalho',
  OTHER: '📍 Outro'
};

export const PassengerFavoritesCard: React.FC<PassengerFavoritesCardProps> = ({ passengerId }) => {
  const { token } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [label, setLabel] = useState('');
  const [type, setType] = useState<'HOME' | 'WORK' | 'OTHER'>('HOME');

  useEffect(() => {
    fetchFavorites();
  }, [passengerId]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/admin/passengers/${passengerId}/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setFavorites(data.favorites || []);
      }
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      setMessage({ type: 'error', text: 'Coordenadas inválidas' });
      return;
    }

    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      setMessage({ type: 'error', text: 'Coordenadas fora do intervalo válido' });
      return;
    }

    if (!label.trim()) {
      setMessage({ type: 'error', text: 'Label é obrigatório' });
      return;
    }

    if (favorites.length >= 3) {
      setMessage({ type: 'error', text: 'Máximo de 3 favoritos permitido' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch(`${API_URL}/api/admin/passengers/${passengerId}/favorites`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lat: latNum,
          lng: lngNum,
          label: label.trim(),
          type
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Favorito adicionado' });
        setLat('');
        setLng('');
        setLabel('');
        setType('HOME');
        setShowForm(false);
        fetchFavorites();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao adicionar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao adicionar favorito' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (favoriteId: string) => {
    if (!confirm('Remover este favorito?')) return;

    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch(`${API_URL}/api/admin/passengers/${passengerId}/favorites/${favoriteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Favorito removido' });
        fetchFavorites();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao remover' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao remover favorito' });
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
            <HeartIcon />
            <Typography variant="h6">Favoritos ({favorites.length}/3)</Typography>
          </Box>
        }
        action={
          !showForm && favorites.length < 3 && (
            <Button
              size="small"
              startIcon={<PlusIcon />}
              onClick={() => setShowForm(true)}
            >
              Adicionar
            </Button>
          )
        }
      />
      <CardContent>
        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        {showForm && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>Novo Favorito</Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex: Casa, Trabalho"
                size="small"
                fullWidth
              />

              <FormControl size="small" fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={type}
                  label="Tipo"
                  onChange={(e) => setType(e.target.value as 'HOME' | 'WORK' | 'OTHER')}
                >
                  <MenuItem value="HOME">🏠 Casa</MenuItem>
                  <MenuItem value="WORK">💼 Trabalho</MenuItem>
                  <MenuItem value="OTHER">📍 Outro</MenuItem>
                </Select>
              </FormControl>

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

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={handleAdd}
                  disabled={saving}
                  fullWidth
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setShowForm(false);
                    setLat('');
                    setLng('');
                    setLabel('');
                    setType('HOME');
                  }}
                  disabled={saving}
                >
                  Cancelar
                </Button>
              </Box>
            </Box>
          </Box>
        )}

        {favorites.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            Nenhum favorito cadastrado
          </Typography>
        ) : (
          <List>
            {favorites.map((fav) => (
              <ListItem key={fav.id} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1">{fav.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {TYPE_LABELS[fav.type]}
                      </Typography>
                    </Box>
                  }
                  secondary={`${fav.lat.toFixed(6)}, ${fav.lng.toFixed(6)}`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleDelete(fav.id)}
                    disabled={saving}
                    size="small"
                  >
                    <TrashIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};
