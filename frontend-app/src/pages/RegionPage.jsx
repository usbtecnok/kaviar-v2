import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          {/* KAVIAR Particular */}
          <Box sx={{ border: '1px solid #222', borderRadius: 2, p: 2, textAlign: 'left' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 0.5 }}>KAVIAR Particular</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, mb: 1.5 }}>Reserve um motorista para consultas, compras, eventos, ida e volta ou espera no local.</Typography>
            <Button variant="contained" component="a" href="https://kaviar.com.br/particular" target="_blank" fullWidth sx={{ bgcolor: gold, '&:hover': { bgcolor: '#9A7B24' }, fontWeight: 700, py: 1 }}>
              Solicitar motorista particular
            </Button>
          </Box>

          {/* Seja Consultor */}
          <Box sx={{ border: '1px solid #222', borderRadius: 2, p: 2, textAlign: 'left' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 0.5 }}>Seja Consultor KAVIAR</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, mb: 1.5 }}>Ganhe indicando motoristas, passageiros, parceiros e comércios da sua região.</Typography>
            <Button variant="outlined" component="a" href="https://kaviar.com.br/#consultor" target="_blank" fullWidth sx={{ borderColor: gold, color: gold, fontWeight: 600, py: 1 }}>
              Quero ser consultor
            </Button>
          </Box>

          {/* Trabalhe como Motorista */}
          <Box sx={{ border: '1px solid #222', borderRadius: 2, p: 2, textAlign: 'left' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 0.5 }}>Trabalhe como motorista</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, mb: 1.5 }}>Dirija na sua região com mais proximidade e autonomia.</Typography>
            <Button variant="outlined" component="a" href="https://downloads.kaviar.com.br/kaviar-motorista-v1.12.0-boarding-code.apk" target="_blank" fullWidth sx={{ borderColor: '#444', color: '#ccc', fontWeight: 600, py: 1 }}>
              Baixar app Motorista
            </Button>
          </Box>

          {/* Guia Turístico Local */}
          <Box sx={{ border: '1px solid #222', borderRadius: 2, p: 2, textAlign: 'left', opacity: 0.85 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 0.5 }}>Guia turístico local</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, mb: 1.5 }}>Conhece bem a região? Em breve, moradores poderão oferecer roteiros, passeios e experiências locais pelo KAVIAR.</Typography>
            <Button variant="outlined" component="a" href={`https://wa.me/5521968648777?text=${encodeURIComponent('Olá, tenho interesse em saber mais sobre Guia Turístico Local / Pacotes Turísticos KAVIAR na região ' + (data?.name || ''))}`} target="_blank" fullWidth sx={{ borderColor: '#555', color: '#aaa', fontWeight: 600, py: 1 }}>
              Tenho interesse
            </Button>
          </Box>
        </Box>

        {/* Vitrine Local */}
        <Box sx={{ mt: 4, textAlign: 'left' }}>
          <Typography sx={{ color: gold, fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', mb: 1, textAlign: 'center' }}>Vitrine Local</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 16, textAlign: 'center', mb: 2 }}>Comércios e serviços da região</Typography>

          {(!data?.businesses || data.businesses.length === 0) ? (
            <Typography sx={{ color: '#666', fontSize: 13, textAlign: 'center' }}>Em breve: comércios e serviços parceiros da sua região.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {data.businesses.map(b => (
                <Box key={b.id} sx={{ border: '1px solid #222', borderRadius: 2, p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                  {b.logo_url && <img src={b.logo_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'contain' }} />}
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{b.name}</Typography>
                    {b.description && <Typography sx={{ color: '#888', fontSize: 12 }}>{b.description}</Typography>}
                    {b.address && <Typography sx={{ color: '#666', fontSize: 11 }}>📍 {b.address}</Typography>}
                  </Box>
                  {b.whatsapp && <Button size="small" variant="outlined" sx={{ borderColor: '#4caf50', color: '#4caf50', fontSize: 11, minWidth: 'auto' }} onClick={() => window.open(`https://wa.me/55${b.whatsapp.replace(/\D/g, '')}`, '_blank')}>WhatsApp</Button>}
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Typography sx={{ color: '#444', fontSize: 10, mt: 4 }}>KAVIAR • Plataforma brasileira de mobilidade local</Typography>
      </Box>
    </Box>
  );
}
