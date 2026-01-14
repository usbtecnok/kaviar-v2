import { Box, Typography, Alert } from '@mui/material';

export default function NeighborhoodsManagement() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestão de Geofences
      </Typography>
      
      <Alert severity="info" sx={{ mt: 2 }}>
        Funcionalidade em desenvolvimento. Endpoints de geofence não disponíveis no backend.
      </Alert>
    </Box>
  );
}
