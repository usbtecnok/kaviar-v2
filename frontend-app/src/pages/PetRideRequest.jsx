import { useState } from 'react';
import { Box, Container, Typography, TextField, Button, MenuItem, Alert, CircularProgress } from '@mui/material';
import { API_BASE_URL } from '../config/api';

const GOLD = '#B8942E';
const PORTES = ['Pequeno (até 10kg)', 'Médio (10-25kg)', 'Grande (acima de 25kg)'];
const TIPOS = ['Cachorro', 'Gato', 'Outro'];

export default function PetRideRequest() {
  const [form, setForm] = useState({ name: '', phone: '', origin: '', destination: '', animal_type: '', animal_size: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.origin.trim() || !form.destination.trim()) {
      setError('Preencha nome, WhatsApp, origem e destino.'); return;
    }
    setSubmitting(true); setError('');
    try {
      const notes = [form.animal_type, form.animal_size, form.notes].filter(Boolean).join(' | ');
      const res = await fetch(`${API_BASE_URL}/api/public/private-rides/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          service_type: 'pet',
          scheduled_date: new Date().toISOString().split('T')[0],
          scheduled_time: 'a combinar',
          origin: form.origin.trim(),
          destination: form.destination.trim(),
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (data.success) setSuccess(true);
      else setError(data.error || 'Erro ao enviar');
    } catch { setError('Erro de conexão'); }
    setSubmitting(false);
  };

  if (success) return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#070707', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
        <Typography sx={{ fontSize: 48, mb: 2 }}>🐾</Typography>
        <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>Solicitação enviada!</Typography>
        <Typography sx={{ color: '#9CA3AF', fontSize: 14 }}>Nossa equipe entrará em contato pelo WhatsApp informado para verificar disponibilidade e confirmar as condições.</Typography>
      </Container>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#070707', py: 4 }}>
      <Container maxWidth="sm">
        <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 0.5, textAlign: 'center' }}>
          🐾 <span style={{ color: GOLD }}>KAVIAR</span> Pet
        </Typography>
        <Typography sx={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', mb: 3 }}>Solicitar corrida com seu pet no Rio de Janeiro</Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Seu nome *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} sx={inputSx} fullWidth />
          <TextField label="WhatsApp *" placeholder="(21) 99999-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} sx={inputSx} fullWidth />
          <TextField label="Origem (bairro/endereço) *" value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} sx={inputSx} fullWidth />
          <TextField label="Destino *" value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} sx={inputSx} fullWidth />
          <TextField label="Tipo do animal" select value={form.animal_type} onChange={e => setForm(f => ({ ...f, animal_type: e.target.value }))} sx={inputSx} fullWidth>
            {TIPOS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField label="Porte do animal" select value={form.animal_size} onChange={e => setForm(f => ({ ...f, animal_size: e.target.value }))} sx={inputSx} fullWidth>
            {PORTES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
          <TextField label="Observações" placeholder="Ex: caixa de transporte, guia, necessidades especiais" multiline rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} sx={inputSx} fullWidth />

          <Button onClick={handleSubmit} disabled={submitting} variant="contained" size="large" sx={{ mt: 1, background: `linear-gradient(180deg, #eece55 0%, ${GOLD} 50%, #b8962e 100%)`, color: '#000', fontWeight: 700, py: 1.5 }}>
            {submitting ? <CircularProgress size={20} sx={{ color: '#000' }} /> : 'Solicitar KAVIAR Pet'}
          </Button>
        </Box>

        <Alert severity="info" icon={false} sx={{ mt: 3, bgcolor: 'rgba(184,148,46,0.08)', border: '1px solid rgba(184,148,46,0.2)', '& .MuiAlert-message': { color: '#9CA3AF', fontSize: 11, lineHeight: 1.6 } }}>
          KAVIAR Pet está em fase piloto assistida no Rio de Janeiro. Após o envio, nossa equipe entrará em contato para verificar disponibilidade de motorista Pet homologado e confirmar as condições da corrida.
        </Alert>

        <Typography sx={{ color: '#6B7280', fontSize: 10, mt: 2, textAlign: 'center' }}>
          O envio da solicitação não garante confirmação automática da corrida. O atendimento depende de disponibilidade, análise operacional e confirmação da central KAVIAR/USB Tecnok.
        </Typography>
      </Container>
    </Box>
  );
}

const inputSx = {
  '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' }, '&:hover fieldset': { borderColor: '#B8942E' }, '&.Mui-focused fieldset': { borderColor: '#B8942E' } },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#B8942E' },
  '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.4)' },
};
