import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
import { Card, CardContent, CardHeader, Typography, TextField, Button, Box, Alert, CircularProgress } from '@mui/material';
import { Room as MapPin, Delete as Trash2, OpenInNew as ExternalLink } from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';


const useAuth = () => {
  const token = localStorage.getItem('kaviar_admin_token');
  const adminData = localStorage.getItem('kaviar_admin_data');
  const admin = adminData ? JSON.parse(adminData) : null;
  return { token, admin };
};

export const VirtualFenceCenterCard = ({ driverId }) => {
  const { token, admin } = useAuth();
  const [center, setCenter] = useState(null);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchCenter();
  }, [driverId]);

  const fetchCenter = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/admin/drivers/${driverId}/virtual-fence-center`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success && data.virtualFenceCenter) {
        setCenter(data.virtualFenceCenter);
        setLat(data.virtualFenceCenter.lat.toString());
        setLng(data.virtualFenceCenter.lng.toString());
      } else {
        setCenter(null);
        setLat('');
        setLng('');
      }
      
      if (data.updatedAt) {
        setUpdatedAt(data.updatedAt);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Não foi possível carregar os dados.' });
    } finally {
      setLoading(false);
    }
  };

  const validateCoordinates = (latitude, longitude) => {
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    
    if (isNaN(latNum) || isNaN(lngNum)) {
      setMessage({ type: 'error', text: 'Coordenadas inválidas. Use latitude entre -90 e 90 e longitude entre -180 e 180.' });
      return false;
    }
    
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      setMessage({ type: 'error', text: 'Coordenadas inválidas. Use latitude entre -90 e 90 e longitude entre -180 e 180.' });
      return false;
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateCoordinates(lat, lng)) return;
    
    try {
      setSaving(true);
      setMessage(null);
      
      const response = await fetch(`${API_URL}/api/admin/drivers/${driverId}/virtual-fence-center`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ lat: parseFloat(lat), lng: parseFloat(lng) })
      });
      
      const data = await response.json();
      
      if (response.status === 403) {
        setMessage({ type: 'error', text: 'Acesso negado. Você não tem permissão para alterar o centro virtual.' });
        return;
      }
      
      if (response.status === 404) {
        setMessage({ type: 'error', text: 'Motorista não encontrado.' });
        return;
      }
      
      if (!data.success) {
        setMessage({ type: 'error', text: data.error || 'Não foi possível salvar agora. Tente novamente.' });
        return;
      }
      
      setMessage({ type: 'success', text: 'Centro virtual salvo com sucesso.' });
      await fetchCenter();
    } catch (error) {
      setMessage({ type: 'error', text: 'Não foi possível salvar agora. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja remover o centro virtual?')) return;
    
    try {
      setSaving(true);
      setMessage(null);
      
      const response = await fetch(`${API_URL}/api/admin/drivers/${driverId}/virtual-fence-center`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (response.status === 403) {
        setMessage({ type: 'error', text: 'Acesso negado. Você não tem permissão para alterar o centro virtual.' });
        return;
      }
      
      if (!data.success) {
        setMessage({ type: 'error', text: 'Não foi possível remover agora. Tente novamente.' });
        return;
      }
      
      setMessage({ type: 'success', text: 'Centro virtual removido com sucesso.' });
      setCenter(null);
      setLat('');
      setLng('');
      setUpdatedAt(null);
    } catch (error) {
      setMessage({ type: 'error', text: 'Não foi possível remover agora. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  const openInMaps = () => {
    if (center) {
      window.open(`https://www.google.com/maps?q=${center.lat},${center.lng}`, '_blank');
    }
  };

  const canEdit = admin?.role === 'SUPER_ADMIN' || admin?.role === 'OPERATOR';

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
        avatar={<MapPin size={24} />}
        title="Centro Virtual (Fallback 800m)"
        subheader="Usado somente quando não existe geofence oficial. Define o centro do território virtual do motorista para matching e precificação dentro de um raio de 800m."
      />
      <CardContent>
        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        {center ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Centro virtual ativo.</strong><br />
            Raio aplicado: 800m a partir do ponto definido.
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Nenhum centro virtual definido.</strong><br />
            Se o motorista atua em área sem mapa oficial, defina um ponto de referência para ativar o fallback 800m.
          </Alert>
        )}

        {!canEdit && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Modo somente leitura.</strong><br />
            Somente SUPER_ADMIN ou OPERATOR podem alterar o centro virtual.
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="Latitude"
            placeholder="Ex.: -23.5505"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            fullWidth
            type="number"
            inputProps={{ step: 'any' }}
            disabled={!canEdit}
          />
          <TextField
            label="Longitude"
            placeholder="Ex.: -46.6333"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            fullWidth
            type="number"
            inputProps={{ step: 'any' }}
            disabled={!canEdit}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !lat || !lng || !canEdit}
            startIcon={saving ? <CircularProgress size={16} /> : <MapPin size={16} />}
          >
            Salvar Centro
          </Button>
          
          {center && (
            <>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDelete}
                disabled={saving || !canEdit}
                startIcon={<Trash2 size={16} />}
              >
                Remover Centro
              </Button>
              
              <Button
                variant="outlined"
                onClick={openInMaps}
                startIcon={<ExternalLink size={16} />}
              >
                Abrir no mapa
              </Button>
            </>
          )}
        </Box>

        {updatedAt && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Atualizado em: {format(new Date(updatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </Typography>
        )}

        <Alert severity="warning" variant="outlined" sx={{ fontSize: '0.875rem' }}>
          <strong>⚠️ Aviso de governança:</strong><br />
          Alterações nesse campo impactam o matching e a taxa aplicada em áreas sem geofence.
          Use apenas para motoristas que operam em regiões não mapeadas.
        </Alert>
      </CardContent>
    </Card>
  );
};
