import { Box, Typography, Alert } from '@mui/material';

export default function NeighborhoodsManagement() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gestão de Bairros
      </Typography>
      
      <Alert severity="info" sx={{ mt: 2 }}>
        Funcionalidade em desenvolvimento. Listagem e edição de bairros será implementada em breve.
      </Alert>
    </Box>
  );
}
