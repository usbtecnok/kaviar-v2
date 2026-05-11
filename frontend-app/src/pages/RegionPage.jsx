import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { API_BASE_URL } from '../config/api';

const gold = '#B8942E';

export default function RegionPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/public/region/${slug}`)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0a0a0a' }}><CircularProgress sx={{ color: gold }} /></Box>;

  const found = data?.found;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0a', color: '#E8E3D5', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Box sx={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
        <Typography sx={{ color: gold, fontWeight: 800, fontSize: 22, letterSpacing: 2 }}>KAVIAR</Typography>
        <Typography sx={{ color: '#888', fontSize: 12, mb: 3 }}>Mobilidade local brasileira</Typography>

        {data?.partner?.logo_url && <img src={data.partner.logo_url} alt="" style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'contain', marginBottom: 12 }} />}

        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>{data?.name || 'Região'}</Typography>

        {found ? (
          <Box>
            {data.drivers_count > 0 && (
              <Typography sx={{ color: '#4caf50', fontSize: 14, mb: 1 }}>🚗 {data.drivers_count} motorista{data.drivers_count > 1 ? 's' : ''} ativo{data.drivers_count > 1 ? 's' : ''} na região</Typography>
            )}
            {data.partner && (
              <Typography sx={{ color: '#888', fontSize: 13, mb: 2 }}>Parceiro local: {data.partner.name}</Typography>
            )}
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.7, mb: 3 }}>
              O KAVIAR opera na sua região com motoristas locais, parceiros territoriais e atendimento personalizado.
            </Typography>
          </Box>
        ) : (
          <Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.7, mb: 3 }}>
              O KAVIAR está chegando na sua região. Quer ajudar a construir a mobilidade local? Seja consultor ou indique motoristas.
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
          <Button variant="contained" component={Link} to="/particular" sx={{ bgcolor: gold, '&:hover': { bgcolor: '#9A7B24' }, fontWeight: 700, py: 1.2 }}>
            Solicitar motorista particular
          </Button>
          <Button variant="outlined" component="a" href="https://kaviar.com.br/#consultor" sx={{ borderColor: gold, color: gold, fontWeight: 600 }}>
            Seja consultor KAVIAR
          </Button>
          <Button variant="outlined" href="https://downloads.kaviar.com.br/kaviar-passageiro-v1.12.1-particular.apk" target="_blank" sx={{ borderColor: '#444', color: '#ccc' }}>
            Baixar app passageiro
          </Button>
        </Box>

        <Typography sx={{ color: '#444', fontSize: 10, mt: 4 }}>KAVIAR • Plataforma brasileira de mobilidade local</Typography>
      </Box>
    </Box>
  );
}
