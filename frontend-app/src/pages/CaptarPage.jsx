import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Container, Typography, TextField, Button, Select, MenuItem, FormControl, InputLabel, Alert, CircularProgress } from '@mui/material';
import { API_BASE_URL } from '../config/api';

const GOLD = '#B8942E';
const TYPES = [
  { value: 'DRIVER', label: '🚗 Motorista' },
  { value: 'PASSENGER', label: '👤 Passageiro' },
  { value: 'LOCAL_BUSINESS', label: '🏪 Comércio Local' },
  { value: 'ASSOCIATION', label: '🏛️ Associação' },
  { value: 'PARTNER', label: '🤝 Parceiro' },
];

export default function CaptarPage() {
  const { code } = useParams();
  const [form, setForm] = useState({ name: '', phone: '', email: '', lead_type: 'DRIVER', notes: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) { setError('Nome e telefone são obrigatórios'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/public/team-referral`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code?.toUpperCase(), ...form }),
      });
      const d = await res.json();
      if (d.success) setResult('success');
      else setError(d.error || 'Erro ao enviar');
    } catch { setError('Erro de conexão'); }
    setLoading(false);
  };

  if (result === 'success') return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Container maxWidth="sm" sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h4" sx={{ color: GOLD, fontWeight: 900, letterSpacing: 4, mb: 2 }}>KAVIAR</Typography>
        <Alert severity="success" sx={{ mb: 3 }}>Cadastro enviado com sucesso! Em breve entraremos em contato.</Alert>
        <Typography sx={{ color: '#999', fontSize: 13 }}>Obrigado pelo seu interesse na mobilidade local.</Typography>
      </Container>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ color: GOLD, fontWeight: 900, letterSpacing: 4, mb: 1 }}>KAVIAR</Typography>
          <Typography sx={{ color: '#999', fontSize: 13, letterSpacing: 1 }}>Mobilidade com identidade</Typography>
        </Box>

        <Box sx={{ bgcolor: '#2a2a2a', borderRadius: 3, p: 3, border: `1px solid ${GOLD}33` }}>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>Cadastre seu interesse</Typography>
          <Typography sx={{ color: '#999', fontSize: 12, mb: 3 }}>Preencha seus dados para fazer parte da rede KAVIAR na sua região.</Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <TextField label="Nome completo *" size="small" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} InputProps={{ sx: { bgcolor: '#333', color: '#fff' } }} InputLabelProps={{ sx: { color: '#999' } }} />
            <TextField label="Telefone/WhatsApp *" size="small" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} InputProps={{ sx: { bgcolor: '#333', color: '#fff' } }} InputLabelProps={{ sx: { color: '#999' } }} />
            <TextField label="Email (opcional)" size="small" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} InputProps={{ sx: { bgcolor: '#333', color: '#fff' } }} InputLabelProps={{ sx: { color: '#999' } }} />
            <FormControl size="small">
              <InputLabel sx={{ color: '#999' }}>Tipo de interesse</InputLabel>
              <Select value={form.lead_type} label="Tipo de interesse" onChange={e => setForm(f => ({ ...f, lead_type: e.target.value }))} sx={{ bgcolor: '#333', color: '#fff' }}>
                {TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Observações (opcional)" size="small" multiline rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} InputProps={{ sx: { bgcolor: '#333', color: '#fff' } }} InputLabelProps={{ sx: { color: '#999' } }} />
            <Button type="submit" variant="contained" disabled={loading} sx={{ bgcolor: GOLD, color: '#000', fontWeight: 700, py: 1.2, '&:hover': { bgcolor: '#9A7B24' } }}>
              {loading ? <CircularProgress size={20} sx={{ color: '#000' }} /> : 'Enviar'}
            </Button>
          </form>
        </Box>

        <Typography sx={{ color: '#555', fontSize: 10, textAlign: 'center', mt: 3 }}>
          KAVIAR — USB Tecnok Manutenção e Instalação de Computadores Ltda
        </Typography>
      </Container>
    </Box>
  );
}
