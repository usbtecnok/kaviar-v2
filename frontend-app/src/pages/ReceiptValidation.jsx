import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';
import { API_BASE_URL } from '../config/api';

const gold = '#B8942E';

export default function ReceiptValidation() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/public/receipt/${code}`)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); else setError('Comprovante não encontrado'); })
      .catch(() => setError('Erro ao verificar'))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) return <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0a0a0a' }}><CircularProgress sx={{ color: gold }} /></Box>;

  if (error) return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0a', color: '#E8E3D5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Typography sx={{ color: gold, fontWeight: 800, fontSize: 20, letterSpacing: 2, mb: 2 }}>KAVIAR</Typography>
      <Typography sx={{ color: '#ef5350', fontSize: 18 }}>❌ {error}</Typography>
      <Typography sx={{ color: '#666', mt: 1, fontSize: 13 }}>Verifique o código e tente novamente.</Typography>
    </Box>
  );

  const [year, monthNum] = data.reference_month.split('-');
  const meses = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const mesRef = `${meses[Number(monthNum)]}/${year}`;
  const valor = (data.amount_cents / 100).toFixed(2).replace('.', ',');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0a', color: '#E8E3D5', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Box sx={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <Typography sx={{ color: gold, fontWeight: 800, fontSize: 20, letterSpacing: 2 }}>KAVIAR</Typography>
        <Typography sx={{ color: '#888', fontSize: 11, mb: 3 }}>Mobilidade local brasileira</Typography>

        <Box sx={{ bgcolor: '#111', border: '1px solid #222', borderRadius: 3, p: 3, textAlign: 'left' }}>
          <Typography sx={{ color: '#4caf50', fontWeight: 700, fontSize: 16, textAlign: 'center', mb: 2 }}>✅ Comprovante verificado</Typography>

          {data.logo_presigned && <Box sx={{ textAlign: 'center', mb: 1 }}><img src={data.logo_presigned} alt="" style={{ width: 50, height: 50, borderRadius: 8, objectFit: 'contain' }} /></Box>}
          <Typography sx={{ color: gold, fontWeight: 700, fontSize: 15, textAlign: 'center', mb: 2 }}>{data.partner.name}</Typography>

          {[
            ['Associado', `${data.member.name}${data.member.unit ? ` (${data.member.unit})` : ''}`],
            ['Referência', mesRef],
            ['Valor', `R$ ${valor}`],
            ['Forma', data.payment_method],
            ['Data', new Date(data.paid_at).toLocaleDateString('pt-BR')],
            ['Status', 'Pago ✓'],
            ['Código', data.receipt_code],
          ].map(([label, value]) => (
            <Box key={label} sx={{ mb: 1.5 }}>
              <Typography sx={{ color: '#666', fontSize: 11 }}>{label}</Typography>
              <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{value}</Typography>
            </Box>
          ))}
        </Box>

        <Typography sx={{ color: '#444', fontSize: 10, mt: 2 }}>Controle interno. Não substitui contabilidade oficial.</Typography>
      </Box>
    </Box>
  );
}
