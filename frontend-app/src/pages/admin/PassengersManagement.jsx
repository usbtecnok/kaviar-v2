import { Box, Typography, Alert } from '@mui/material';

export default function PassengersManagement() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestão de Passageiros
      </Typography>
      
      <Alert severity="info" sx={{ mt: 2 }}>
        Funcionalidade em desenvolvimento. Endpoint não disponível no backend.
      </Alert>
    </Box>
  );
}
