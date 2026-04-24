import { Box, Typography, Button } from '@mui/material';

export default function ConviteExpirado() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
        <Typography sx={{ fontSize: 48, mb: 2 }}>⏳</Typography>
        <Typography variant="h5" sx={{ color: '#C9A227', fontWeight: 700, mb: 1 }}>Convite expirado</Typography>
        <Typography sx={{ color: '#A7A7A7', mb: 3, lineHeight: 1.7 }}>
          Este link de acesso não é mais válido.<br />
          Solicite um novo acesso à equipe KAVIAR.
        </Typography>
        <Button href="https://kaviar.com.br" variant="outlined"
          sx={{ borderColor: 'rgba(201,162,39,0.4)', color: '#C9A227', textTransform: 'none',
            '&:hover': { borderColor: '#C9A227', bgcolor: 'rgba(201,162,39,0.06)' } }}>
          Voltar ao site
        </Button>
      </Box>
    </Box>
  );
}
