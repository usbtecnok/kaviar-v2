import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Chip, CircularProgress, Alert } from '@mui/material';
import { API_BASE_URL } from '../config/api';

const GOLD = '#B8942E';
const STEPS = [
  { key: 'received', label: 'Pedido recebido' },
  { key: 'paid', label: 'Pagamento confirmado' },
  { key: 'accepted', label: 'Aceito pelo comércio' },
  { key: 'preparing', label: 'Em preparo' },
  { key: 'ready', label: 'Pronto' },
  { key: 'dispatched', label: 'Saiu para entrega' },
  { key: 'delivered', label: 'Entregue' },
];

function getActiveStep(data) {
  if (!data) return 0;
  if (data.status === 'CANCELED') return -1;
  if (data.status === 'COMPLETED' || data.status === 'DELIVERED') return 7;
  if (data.status === 'DISPATCHED' || data.delivery_status === 'assigned') return 6;
  if (data.status === 'READY') return 5;
  if (data.status === 'PREPARING') return 4;
  if (data.status === 'ACCEPTED') return 3;
  if (data.payment_status === 'paid') return 2;
  return 1;
}

function getMessage(data) {
  if (!data) return '';
  if (data.status === 'CANCELED') return 'Pedido cancelado';
  if (data.status === 'COMPLETED' || data.status === 'DELIVERED') return 'Pedido entregue com sucesso! ✅';
  if (data.delivery_status === 'assigned' && data.driver_name) return `Seu pedido saiu para entrega com ${data.driver_name}`;
  if (data.status === 'DISPATCHED') return 'Seu pedido saiu para entrega';
  if (data.status === 'READY' && data.delivery_type === 'delivery') return 'Pronto! Organizando entrega';
  if (data.status === 'READY') return 'Seu pedido está pronto para retirada';
  if (data.status === 'PREPARING') return 'Seu pedido está em preparo';
  if (data.status === 'ACCEPTED') return 'O comércio aceitou seu pedido';
  if (data.payment_status === 'paid') return 'Pagamento confirmado';
  return 'Aguardando pagamento';
}

export default function OrderTrackingPage() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/public/commerce/orders/${code}/track`);
        const d = await res.json();
        if (d.success) setData(d.data);
        else setError(d.error || 'Pedido não encontrado');
      } catch { setError('Erro de conexão'); }
      setLoading(false);
    })();
  }, [code]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress sx={{ color: GOLD }} /></Box>;
  if (error) return <Box sx={{ textAlign: 'center', mt: 8 }}><Alert severity="error" sx={{ maxWidth: 400, mx: 'auto' }}>{error}</Alert></Box>;

  const step = getActiveStep(data);
  const msg = getMessage(data);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FAFAF8', p: 3 }}>
      <Box sx={{ maxWidth: 500, mx: 'auto' }}>
        <Card sx={{ mb: 3 }}><CardContent sx={{ textAlign: 'center', py: 3 }}>
          <Typography sx={{ fontSize: 12, color: '#6B7280' }}>Pedido</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: GOLD }}>{data.order_code}</Typography>
          <Typography sx={{ fontSize: 14, color: '#374151', mt: 0.5 }}>{data.commerce_name}</Typography>
        </CardContent></Card>

        <Card sx={{ mb: 3 }}><CardContent>
          <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 2, textAlign: 'center' }}>{msg}</Typography>
          {/* Timeline */}
          {data.status !== 'CANCELED' ? (
            <Box sx={{ pl: 2 }}>
              {STEPS.filter((_, i) => data.delivery_type === 'pickup' ? i < 5 : true).map((s, i) => (
                <Box key={s.key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: i < step ? '#10B981' : i === step ? GOLD : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {i < step && <Typography sx={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</Typography>}
                  </Box>
                  <Typography sx={{ fontSize: 13, color: i <= step ? '#111' : '#9CA3AF', fontWeight: i === step ? 700 : 400 }}>{s.label}</Typography>
                </Box>
              ))}
            </Box>
          ) : <Alert severity="error">Este pedido foi cancelado.</Alert>}
        </CardContent></Card>

        {/* Delivery code */}
        {data.delivery_code && data.delivery_type === 'delivery' && ['READY', 'DISPATCHED'].includes(data.status) && (
          <Card sx={{ mb: 3, border: '2px solid #F59E0B' }}><CardContent sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: 12, color: '#6B7280' }}>Código de entrega</Typography>
            <Typography sx={{ fontSize: 32, fontWeight: 800, letterSpacing: 4, color: '#111' }}>{data.delivery_code}</Typography>
            <Typography sx={{ fontSize: 11, color: '#F59E0B', mt: 1 }}>Informe este código ao motorista somente ao receber o pedido</Typography>
          </CardContent></Card>
        )}

        {/* Driver info */}
        {data.driver_name && <Card sx={{ mb: 3 }}><CardContent><Typography sx={{ fontSize: 12, color: '#6B7280' }}>Motorista</Typography><Typography sx={{ fontWeight: 700 }}>{data.driver_name}</Typography></CardContent></Card>}

        {/* Order summary */}
        <Card><CardContent>
          <Typography sx={{ fontSize: 12, color: '#6B7280', mb: 1 }}>Resumo</Typography>
          {data.items?.map((i, idx) => <Typography key={idx} sx={{ fontSize: 13 }}>{i.quantity}× {i.name} — R$ {(i.total_cents / 100).toFixed(2)}</Typography>)}
          <Box sx={{ borderTop: '1px solid #E5E7EB', mt: 1, pt: 1 }}>
            {data.delivery_fee_cents > 0 && <Typography sx={{ fontSize: 12 }}>Entrega: R$ {(data.delivery_fee_cents / 100).toFixed(2)}</Typography>}
            <Typography sx={{ fontWeight: 700 }}>Total: R$ {(data.total_cents / 100).toFixed(2)}</Typography>
          </Box>
          <Chip label={data.delivery_type === 'delivery' ? '🚗 Entrega' : '🏪 Retirada'} size="small" sx={{ mt: 1 }} />
        </CardContent></Card>
      </Box>
    </Box>
  );
}
