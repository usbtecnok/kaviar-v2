import { Box, Typography, Card, CardContent } from '@mui/material';

export default function CreditPurchases() {
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>Pagamentos Legados</Typography>
      <Card sx={{ bgcolor: '#1a1a1a', border: '1px solid #333' }}>
        <CardContent>
          <Typography variant="h6" sx={{ color: '#FFD700', mb: 1 }}>Histórico removido</Typography>
          <Typography sx={{ color: '#ccc' }}>Os pagamentos legados foram removidos do painel.</Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
