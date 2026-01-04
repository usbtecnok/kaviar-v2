import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, Alert } from '@mui/material';
import { checkPremiumTourismEnabled } from '../../services/featureFlags';

export default function PremiumTourismButton() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPremiumTourismEnabled().then(isEnabled => {
      setEnabled(isEnabled);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <Button disabled>Verificando...</Button>;
  }

  if (!enabled) {
    return (
      <Alert severity="warning" sx={{ mt: 1 }}>
        Funcionalidade desabilitada
      </Alert>
    );
  }

  return (
    <Button 
      variant="contained" 
      color="secondary"
      component={Link}
      to="/admin/premium-tourism/packages"
    >
      Acessar
    </Button>
  );
}
