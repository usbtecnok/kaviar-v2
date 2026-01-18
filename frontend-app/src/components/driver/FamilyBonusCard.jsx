import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { FamilyRestroom, Person } from '@mui/icons-material';

const BONUS_BASE = 100;

export default function FamilyBonusCard() {
  const driverData = JSON.parse(localStorage.getItem('kaviar_driver_data') || '{}');
  const driverId = driverData.id;

  if (!driverId) return null;

  const familyProfile = localStorage.getItem(`kaviar_driver_${driverId}_family_profile`) || 'individual';
  const bonusPercent = parseInt(localStorage.getItem(`kaviar_driver_${driverId}_family_bonus_percent`) || '50');
  const acceptedAt = localStorage.getItem(`kaviar_driver_${driverId}_family_accepted_at`);

  const bonusAmount = (BONUS_BASE * bonusPercent) / 100;
  const isFamiliar = familyProfile === 'familiar';

  if (!acceptedAt) {
    return null; // Não exibir se não aceitou o benefício
  }

  return (
    <Card sx={{ mb: 3, bgcolor: isFamiliar ? 'success.light' : 'info.light' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {isFamiliar ? <FamilyRestroom /> : <Person />}
          <Typography variant="h6" fontWeight="bold">
            Bônus Familiar KAVIAR
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Perfil:</Typography>
            <Chip 
              label={isFamiliar ? 'Familiar' : 'Individual'} 
              color={isFamiliar ? 'success' : 'info'}
              size="small"
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Crédito mensal:</Typography>
            <Typography variant="h6" color="success.main" fontWeight="bold">
              R$ {bonusAmount.toFixed(2)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2">Uso:</Typography>
            <Typography variant="caption" color="text.secondary">
              Abatimento automático de taxas
            </Typography>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Declarado em: {new Date(acceptedAt).toLocaleDateString('pt-BR')}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
