import { Card, CardContent, Typography, Button, Box } from '@mui/material';
import { Bolt, Close } from '@mui/icons-material';

export default function FavoritePlacesPromoBanner({ onAddHome, onDismiss }) {
  return (
    <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Bolt />
              <Typography variant="h6">
                Encontre motoristas mais rápido
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Salve até 3 locais (Casa/Trabalho/Outro). Quando você estiver nesses lugares, 
              o sistema encontra motoristas mais rápido e com estimativa mais precisa.
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mb: 2, opacity: 0.9 }}>
              É opcional e privado. Você pode apagar quando quiser.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                variant="contained" 
                color="secondary"
                onClick={onAddHome}
              >
                Salvar Casa agora
              </Button>
              <Button 
                variant="text" 
                sx={{ color: 'inherit' }}
                onClick={onDismiss}
              >
                Depois
              </Button>
            </Box>
          </Box>
          <Button 
            size="small" 
            onClick={onDismiss}
            sx={{ minWidth: 'auto', color: 'inherit' }}
          >
            <Close />
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
