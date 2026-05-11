import { useState } from 'react';
import { Box, Typography, TextField, Button, MenuItem, Select, FormControl, InputLabel, FormControlLabel, Checkbox } from '@mui/material';
import { API_BASE_URL } from '../config/api';

const gold = '#B8942E';
const inputSx = { '& .MuiOutlinedInput-root': { color: '#E8E3D5' }, '& .MuiInputLabel-root': { color: '#888' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' } };

const SERVICE_TYPES = [
  { value: 'consulta', label: '🏥 Consulta médica' },
  { value: 'mercado', label: '🛒 Mercado / Farmácia' },
  { value: 'escola', label: '🎒 Escola' },
  { value: 'aeroporto', label: '✈️ Aeroporto / Rodoviária' },
  { value: 'evento', label: '🎉 Evento' },
  { value: 'idoso', label: '👴 Acompanhamento familiar' },
  { value: 'compromisso', label: '📋 Compromisso agendado' },
  { value: 'outro', label: '🚗 Outro' },
];

export default function PrivateRideRequest() {
  const [form, setForm] = useState({ name: '', phone: '', service_type: 'outro', scheduled_date: '', scheduled_time: '', origin: '', destination: '', round_trip: false, wait_at_destination: false, notes: '' });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!form.name || !form.phone || !form.scheduled_date || !form.scheduled_time || !form.origin || !form.destination) {
      setError('Preencha todos os campos obrigatórios'); return;
    }
    const res = await fetch(`${API_BASE_URL}/api/public/private-rides/request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (data.success) setSent(true);
    else setError(data.error || 'Erro ao enviar');
  };

  if (sent) return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0a', color: '#E8E3D5', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Box sx={{ maxWidth: 420, textAlign: 'center' }}>
        <Typography sx={{ color: gold, fontWeight: 800, fontSize: 22, letterSpacing: 2, mb: 1 }}>KAVIAR</Typography>
        <Typography sx={{ color: '#4caf50', fontSize: 48, mb: 2 }}>✓</Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Solicitação enviada!</Typography>
        <Typography sx={{ color: '#888', fontSize: 14 }}>Entraremos em contato pelo WhatsApp para confirmar seu motorista particular.</Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0a0a0a', color: '#E8E3D5', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Box sx={{ maxWidth: 440, width: '100%' }}>
        <Typography sx={{ color: gold, fontWeight: 800, fontSize: 22, letterSpacing: 2, textAlign: 'center' }}>KAVIAR</Typography>
        <Typography sx={{ color: '#888', fontSize: 12, textAlign: 'center', mb: 0.5 }}>Mobilidade local brasileira</Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'center', mb: 3 }}>Motorista Particular</Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField size="small" label="Seu nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} sx={inputSx} />
          <TextField size="small" label="WhatsApp *" placeholder="21999999999" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} sx={inputSx} />

          <FormControl size="small">
            <InputLabel sx={{ color: '#888' }}>Tipo de serviço</InputLabel>
            <Select label="Tipo de serviço" value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} sx={{ color: '#E8E3D5', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' } }}>
              {SERVICE_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField size="small" type="date" label="Data *" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ ...inputSx, flex: 1 }} />
            <TextField size="small" type="time" label="Horário *" value={form.scheduled_time} onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ ...inputSx, flex: 1 }} />
          </Box>

          <TextField size="small" label="Origem (endereço) *" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} sx={inputSx} />
          <TextField size="small" label="Destino (endereço) *" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} sx={inputSx} />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControlLabel control={<Checkbox checked={form.round_trip} onChange={(e) => setForm({ ...form, round_trip: e.target.checked })} sx={{ color: '#555', '&.Mui-checked': { color: gold } }} size="small" />} label={<Typography sx={{ fontSize: 13, color: '#ccc' }}>Ida e volta</Typography>} />
            <FormControlLabel control={<Checkbox checked={form.wait_at_destination} onChange={(e) => setForm({ ...form, wait_at_destination: e.target.checked })} sx={{ color: '#555', '&.Mui-checked': { color: gold } }} size="small" />} label={<Typography sx={{ fontSize: 13, color: '#ccc' }}>Aguardar no local</Typography>} />
          </Box>

          <TextField size="small" label="Observações" multiline rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} sx={inputSx} />

          {error && <Typography sx={{ color: '#ef5350', fontSize: 12 }}>{error}</Typography>}

          <Button fullWidth variant="contained" onClick={handleSubmit} sx={{ bgcolor: gold, '&:hover': { bgcolor: '#9A7B24' }, mt: 1, py: 1.2, fontWeight: 700 }}>Solicitar motorista</Button>

          <Typography sx={{ color: '#555', fontSize: 10, textAlign: 'center', mt: 1 }}>Entraremos em contato pelo WhatsApp para confirmar disponibilidade e valor.</Typography>
        </Box>
      </Box>
    </Box>
  );
}
