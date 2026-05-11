import { useSearchParams } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';

const gold = '#B8942E';

export default function DriverRegister() {
  const [searchParams] = useSearchParams();
  const partnerCode = searchParams.get('partner_code') || '';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Box sx={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <Typography sx={{ color: gold, fontWeight: 800, fontSize: 24, letterSpacing: 2, mb: 1 }}>KAVIAR</Typography>
        <Typography variant="h5" sx={{ color: '#E8E3D5', fontWeight: 700, mb: 1 }}>Seja motorista parceiro</Typography>

        {partnerCode && (
          <Box sx={{ bgcolor: '#111', border: '1px solid #222', borderRadius: 2, p: 1.5, mb: 3 }}>
            <Typography sx={{ color: '#999', fontSize: 13 }}>Você foi indicado por</Typography>
            <Typography sx={{ color: gold, fontWeight: 700, fontSize: 18 }}>{partnerCode.replace(/-/g, ' ')}</Typography>
          </Box>
        )}

        <Box sx={{ textAlign: 'left', mb: 3 }}>
          <Typography sx={{ color: '#E8E3D5', mb: 1.5, fontSize: 14 }}>Para se cadastrar como motorista KAVIAR você precisa:</Typography>
          {['Baixar o app KAVIAR', 'Informar dados pessoais e do veículo', 'Enviar foto da CNH', 'Enviar certidão de antecedentes criminais', 'Aguardar aprovação da equipe'].map((item, i) => (
            <Typography key={i} sx={{ color: '#999', fontSize: 13, mb: 0.5 }}>
              {i + 1}. {item}
            </Typography>
          ))}
        </Box>

        {partnerCode && (
          <Typography sx={{ color: '#666', fontSize: 12, mb: 2 }}>
            Ao se cadastrar pelo app, informe o código <strong style={{ color: gold }}>{partnerCode}</strong> quando solicitado.
          </Typography>
        )}

        <Button fullWidth variant="contained" href="https://kaviar.com.br/motorista" sx={{ bgcolor: gold, '&:hover': { bgcolor: '#9A7B24' }, height: 48, fontSize: 16, fontWeight: 700, mb: 1.5 }}>
          Quero ser motorista
        </Button>

        <Button fullWidth variant="outlined" href="https://kaviar.com.br" sx={{ borderColor: '#333', color: '#999', height: 40 }}>
          Conhecer o KAVIAR
        </Button>

        <Typography sx={{ color: '#333', mt: 3, fontSize: 11 }}>
          KAVIAR — Mobilidade comunitária
        </Typography>
      </Box>
    </Box>
  );
}
