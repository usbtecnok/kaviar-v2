import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  CheckCircle,
  HourglassEmpty,
  Cancel,
  Schedule,
  Description,
  Gavel
} from '@mui/icons-material';
import { API_BASE_URL } from '../../config/api';

const reasonLabels = {
  TENURE_LT_6: 'Precisa completar 6 meses na plataforma',
  DOCS_PENDING: 'Documentos pendentes',
  TERMS_NOT_ACCEPTED: 'Termos ainda não aceitos'
};

export function DriverPremiumEligibilityCard({ driverId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eligibility, setEligibility] = useState(null);

  useEffect(() => {
    fetchEligibility();
  }, [driverId]);

  const fetchEligibility = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('kaviar_admin_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/drivers/${driverId}/eligibility`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 404) {
        setError('Backend ainda não publicou eligibility endpoint');
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar elegibilidade');
      }

      setEligibility(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            KAVIAR PREMIUM (Turismo)
          </Typography>
          <Alert severity="warning">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (!eligibility) return null;

  const getBadge = () => {
    if (eligibility.eligiblePremium) {
      return (
        <Chip
          icon={<CheckCircle />}
          label="Elegível"
          color="success"
          sx={{ fontWeight: 'bold' }}
        />
      );
    }

    if (eligibility.tenureMonths >= 3) {
      return (
        <Chip
          icon={<HourglassEmpty />}
          label="Em Progresso"
          color="warning"
          sx={{ fontWeight: 'bold' }}
        />
      );
    }

    return (
      <Chip
        icon={<Cancel />}
        label="Não Elegível"
        color="error"
        sx={{ fontWeight: 'bold' }}
      />
    );
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            KAVIAR PREMIUM (Turismo)
          </Typography>
          {getBadge()}
        </Box>

        <List dense>
          <ListItem>
            <ListItemIcon>
              <Schedule color={eligibility.tenureMonths >= 6 ? 'success' : 'action'} />
            </ListItemIcon>
            <ListItemText
              primary="Tempo de plataforma"
              secondary={eligibility.tenureLabel}
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <Description color={eligibility.docsOk ? 'success' : 'warning'} />
            </ListItemIcon>
            <ListItemText
              primary="Documentos"
              secondary={eligibility.docsOk ? 'OK' : 'Pendente'}
            />
          </ListItem>

          <ListItem>
            <ListItemIcon>
              <Gavel color={eligibility.termsOk ? 'success' : 'warning'} />
            </ListItemIcon>
            <ListItemText
              primary="Termos"
              secondary={eligibility.termsOk ? 'OK' : 'Pendente'}
            />
          </ListItem>
        </List>

        {!eligibility.eligiblePremium && eligibility.reasons.length > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              Requisitos pendentes:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {eligibility.reasons.map((reason, idx) => (
                <li key={idx}>
                  <Typography variant="body2">
                    {reasonLabels[reason] || reason}
                  </Typography>
                </li>
              ))}
            </ul>
          </Alert>
        )}

        {eligibility.eligiblePremium && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              ✅ Motorista elegível para promoção ao KAVIAR PREMIUM
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
