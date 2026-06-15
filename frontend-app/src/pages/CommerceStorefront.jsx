import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Grid, Button, TextField, Chip, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, IconButton, Badge } from '@mui/material';
import { Add, Remove, ShoppingCart, Store } from '@mui/icons-material';
import { API_BASE_URL } from '../config/api';

const GOLD = '#B8942E';

export default function CommerceStorefront() {
  const { slug } = useParams();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', customer_address: '', delivery_type: 'pickup', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [snack, setSnack] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/public/commerce/${slug}`);
        const data = await res.json();
        if (data.success) { setStore(data.data.account); setProducts(data.data.products); }
        else setError(data.error || 'Comércio não encontrado');
      } catch { setError('Erro de conexão'); }
      setLoading(false);
    })();
  }, [slug]);

  const addToCart = (productId) => setCart(c => ({ ...c, [productId]: (c[productId] || 0) + 1 }));
  const removeFromCart = (productId) => setCart(c => { const n = { ...c }; if (n[productId] > 1) n[productId]--; else delete n[productId]; return n; });
  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);
  const cartTotal = Object.entries(cart).reduce((s, [id, qty]) => { const p = products.find(p => p.id === id); return s + (p ? p.price_cents * qty : 0); }, 0);

  const handleSubmit = async () => {
    if (!form.customer_name.trim() || !form.customer_phone.trim()) return setSnack('Nome e telefone obrigatórios');
    setSubmitting(true);
    const items = Object.entries(cart).map(([product_id, quantity]) => ({ product_id, quantity }));
    try {
      const res = await fetch(`${API_BASE_URL}/api/public/commerce/${slug}/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_name: form.customer_name, customer_phone: form.customer_phone, customer_address: form.customer_address || null, delivery_type: form.delivery_type, notes: form.notes, items }),
      });
      const data = await res.json();
      if (data.success) { setSuccess(data.data); setCheckoutOpen(false); setCart({}); }
      else setSnack(data.error || 'Erro ao enviar pedido');
    } catch { setSnack('Erro de conexão'); }
    setSubmitting(false);
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress sx={{ color: GOLD }} /></Box>;
  if (error) return <Box sx={{ textAlign: 'center', mt: 8 }}><Alert severity="error" sx={{ maxWidth: 400, mx: 'auto' }}>{error}</Alert></Box>;

  if (success) return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Card sx={{ maxWidth: 420, width: '100%', textAlign: 'center' }}><CardContent sx={{ p: 4 }}>
        {!success.pix ? <>
          <Typography sx={{ fontSize: 48, mb: 2 }}>✅</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Pedido enviado!</Typography>
          <Typography sx={{ color: '#6B7280', mb: 2 }}>Seu pedido foi recebido por {store?.name}.</Typography>
          {success.order_code && <Chip label={success.order_code} sx={{ fontWeight: 800, fontSize: 18, px: 2, py: 2.5, mb: 1 }} />}
          <Chip label={`Total: R$ ${(success.total_cents / 100).toFixed(2)}`} sx={{ fontWeight: 700, fontSize: 14, px: 2, py: 2, mb: 1 }} />
          {success.order_code && <Typography sx={{ fontSize: 12, color: '#6B7280', mb: 1 }}>Acompanhe em: <a href={`/pedido/${success.order_code}`} style={{ color: GOLD }}>/pedido/{success.order_code}</a></Typography>}
          <Typography sx={{ fontSize: 11, color: '#9CA3AF', mb: 2, px: 1 }}>A nota fiscal/comprovante será entregue pelo comércio junto com o produto, quando aplicável.</Typography>
          <Button fullWidth variant="contained" sx={{ bgcolor: '#059669', textTransform: 'none', fontWeight: 700, mb: 1 }}
            onClick={async () => {
              const res = await fetch(`${API_BASE_URL}/api/public/commerce/orders/${success.id}/pay`, { method: 'POST' });
              const data = await res.json();
              if (data.success) setSuccess(s => ({ ...s, pix: data.data }));
              else setSnack(data.data?.already_paid ? 'Já pago!' : 'Erro ao gerar Pix');
            }}>Pagar com Pix</Button>
          <Button fullWidth sx={{ textTransform: 'none', color: '#6B7280' }} onClick={() => { setSuccess(null); setForm({ customer_name: '', customer_phone: '', customer_address: '', delivery_type: 'pickup', notes: '' }); }}>Fazer novo pedido</Button>
        </> : <>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>💳 Pague via Pix</Typography>
          <Typography sx={{ color: '#6B7280', mb: 2, fontSize: 13 }}>Escaneie o QR Code ou copie o código Pix abaixo.</Typography>
          {success.pix.pix_qr_code && <Box sx={{ mb: 2 }}><img src={`data:image/png;base64,${success.pix.pix_qr_code}`} alt="QR Pix" style={{ width: 200, height: 200 }} /></Box>}
          {success.pix.pix_copy_paste && <Box sx={{ bgcolor: '#F3F4F6', p: 1.5, borderRadius: 1, mb: 2, wordBreak: 'break-all' }}>
            <Typography sx={{ fontSize: 11, fontFamily: 'monospace' }}>{success.pix.pix_copy_paste}</Typography>
            <Button size="small" sx={{ mt: 1, textTransform: 'none' }} onClick={() => { navigator.clipboard.writeText(success.pix.pix_copy_paste); setSnack('Código copiado!'); }}>📋 Copiar Pix</Button>
          </Box>}
          <Typography sx={{ fontSize: 11, color: '#9CA3AF' }}>Após pagar, o comércio será notificado automaticamente.</Typography>
        </>}
      </CardContent></Card>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FAFAF8', pb: 10 }}>
      {/* Header */}
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #E5E7EB', p: 3, mb: 3 }}>
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Store sx={{ color: GOLD, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#111' }}>{store?.trade_name || store?.name}</Typography>
              <Typography sx={{ fontSize: 13, color: '#6B7280' }}>{store?.category} {store?.address && `• ${store.address}`}</Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Products */}
      <Box sx={{ maxWidth: 800, mx: 'auto', px: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 2, color: '#374151' }}>{products.length} produtos disponíveis</Typography>
        <Grid container spacing={1.5}>
          {products.map(p => {
            const qty = cart[p.id] || 0;
            return (
              <Grid item xs={12} sm={6} key={p.id}>
                <Card sx={{ border: qty > 0 ? `2px solid ${GOLD}` : '1px solid #E5E7EB', transition: 'all .15s' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5 }}>
                    {p.image_url ? (
                      <Box sx={{ width: 72, height: 72, minWidth: 72, borderRadius: 1.5, overflow: 'hidden', bgcolor: '#F3F4F6', mr: 1.5 }}>
                        <img src={`${API_BASE_URL}/api/public/commerce/products/${p.id}/image`} alt={p.name} loading="lazy" onError={e => { e.currentTarget.parentElement.style.background = '#F3F4F6'; e.currentTarget.style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </Box>
                    ) : (
                      <Box sx={{ width: 72, height: 72, minWidth: 72, borderRadius: 1.5, bgcolor: '#F3F4F6', mr: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Store sx={{ fontSize: 24, color: '#D1D5DB' }} />
                      </Box>
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>{p.name}</Typography>
                      {p.description && <Typography sx={{ fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mt: 0.3 }}>{p.description}</Typography>}
                      <Typography sx={{ fontWeight: 700, color: GOLD, fontSize: 14, mt: 0.5 }}>R$ {(p.price_cents / 100).toFixed(2)}</Typography>
                      {p.stock_quantity !== null && p.stock_quantity <= 5 && <Chip label={`${p.stock_quantity} restantes`} size="small" color="warning" sx={{ mt: 0.3, fontSize: 10, height: 18 }} />}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
                      {qty > 0 && <><IconButton size="small" onClick={() => removeFromCart(p.id)}><Remove sx={{ fontSize: 16 }} /></IconButton><Typography sx={{ fontWeight: 700, minWidth: 20, textAlign: 'center', fontSize: 14 }}>{qty}</Typography></>}
                      <IconButton size="small" onClick={() => addToCart(p.id)} sx={{ bgcolor: `${GOLD}15`, '&:hover': { bgcolor: `${GOLD}30` } }}><Add sx={{ fontSize: 16, color: GOLD }} /></IconButton>
                    </Box>
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* Cart FAB */}
      {cartCount > 0 && (
        <Box sx={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
          <Button variant="contained" startIcon={<Badge badgeContent={cartCount} color="error"><ShoppingCart /></Badge>} onClick={() => setCheckoutOpen(true)}
            sx={{ bgcolor: GOLD, px: 4, py: 1.5, borderRadius: 3, fontWeight: 700, fontSize: 15, textTransform: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', '&:hover': { bgcolor: '#96782A' } }}>
            Fazer Pedido • R$ {(cartTotal / 100).toFixed(2)}
          </Button>
        </Box>
      )}

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onClose={() => setCheckoutOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Finalizar Pedido</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <Box sx={{ bgcolor: '#F9FAFB', p: 2, borderRadius: 1 }}>
            {Object.entries(cart).map(([id, qty]) => { const p = products.find(x => x.id === id); return p ? <Typography key={id} sx={{ fontSize: 13 }}>{qty}× {p.name} — R$ {(p.price_cents * qty / 100).toFixed(2)}</Typography> : null; })}
            <Box sx={{ borderTop: '1px solid #E5E7EB', mt: 1, pt: 1 }}>
              <Typography sx={{ fontSize: 13 }}>Produtos: R$ {(cartTotal / 100).toFixed(2)}</Typography>
              {form.delivery_type === 'delivery' && <Typography sx={{ fontSize: 13, color: '#059669' }}>Entrega: R$ 3,00</Typography>}
              <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Total: R$ {((cartTotal + (form.delivery_type === 'delivery' ? 300 : 0)) / 100).toFixed(2)}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button fullWidth variant={form.delivery_type === 'pickup' ? 'contained' : 'outlined'} size="small" onClick={() => setForm(f => ({ ...f, delivery_type: 'pickup' }))} sx={{ textTransform: 'none', ...(form.delivery_type === 'pickup' && { bgcolor: GOLD }) }}>🏪 Retirar no local</Button>
            <Button fullWidth variant={form.delivery_type === 'delivery' ? 'contained' : 'outlined'} size="small" onClick={() => setForm(f => ({ ...f, delivery_type: 'delivery' }))} sx={{ textTransform: 'none', ...(form.delivery_type === 'delivery' && { bgcolor: '#059669' }) }}>🚗 Receber em casa</Button>
          </Box>
          <TextField label="Seu nome *" size="small" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
          <TextField label="Seu telefone *" size="small" value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} />
          {form.delivery_type === 'delivery' && <TextField label="Endereço de entrega *" size="small" value={form.customer_address} onChange={e => setForm(f => ({ ...f, customer_address: e.target.value }))} placeholder="Rua, número, bairro, complemento" />}
          <TextField label="Observações" size="small" multiline rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ex: sem cebola, troco para R$50..." />
          {form.delivery_type === 'pickup' && <Alert severity="info" sx={{ fontSize: 12 }}>Retirada no local. Pagamento via Pix.</Alert>}
          {form.delivery_type === 'delivery' && <Alert severity="info" sx={{ fontSize: 12 }}>Entrega KAVIAR • Taxa: R$ 3,00 • Pagamento via Pix</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckoutOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting} sx={{ bgcolor: GOLD }}>{submitting ? 'Enviando...' : 'Enviar Pedido'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}
