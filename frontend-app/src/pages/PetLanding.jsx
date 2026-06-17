import React, { useState } from 'react';
import { Box, Typography, Button, TextField, Container, Snackbar, Alert } from '@mui/material';

const gold = '#D4AF37';
const bg = '#070707';
const WHATSAPP_NUMBER = '5521968648777';

const sx = {
  page: { minHeight: '100vh', bgcolor: bg, color: '#fff' },
  glow: { position: 'absolute', inset: 0, background: 'radial-gradient(circle at top, rgba(212,175,55,0.12), transparent 40%)', pointerEvents: 'none' },
  section: { position: 'relative', zIndex: 10, maxWidth: 900, mx: 'auto', px: { xs: 2, md: 5 }, py: { xs: 4, md: 6 } },
  card: { borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(255,255,255,0.03)', p: { xs: 3, md: 4 } },
  input: {
    '& .MuiOutlinedInput-root': { color: '#fff', borderRadius: 2, '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' }, '&:hover fieldset': { borderColor: gold }, '&.Mui-focused fieldset': { borderColor: gold } },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)' },
    '& .MuiInputLabel-root.Mui-focused': { color: gold },
  },
  goldBtn: {
    background: `linear-gradient(180deg, #eece55 0%, ${gold} 50%, #b8962e 100%)`,
    color: '#000', fontWeight: 700, borderRadius: 2, textTransform: 'none', py: 1.5, px: 4,
    '&:hover': { background: 'linear-gradient(180deg, #f3d660 0%, #e1be52 50%, #c5a028 100%)' },
  },
};

const STEPS = [
  { icon: '📹', title: 'Treinamento', desc: 'Assista 2 vídeos curtos sobre segurança e protocolo' },
  { icon: '📝', title: 'Questionário', desc: 'Responda 10 perguntas (nota mínima 7/10)' },
  { icon: '📸', title: 'Fotos do veículo', desc: 'Envie fotos do carro preparado com kit pet' },
  { icon: '🏅', title: 'Selo ativo', desc: 'Receba seu selo e comece a aceitar corridas pet' },
];

const REQUIREMENTS = [
  'Carro 4 portas com banco traseiro adequado',
  'Capa protetora resistente (nylon 600D)',
  'Cinto de segurança pet',
  'Kit de higienização (desinfetante + pano)',
  'Disponibilidade para treinamento',
];

export default function PetLanding() {
  const [form, setForm] = useState({ name: '', whatsapp: '', bairro: '', carro: '', experiencia: '' });
  const [sent, setSent] = useState(false);

  const handleWhatsApp = () => {
    const msg = `Olá! Quero me cadastrar no KAVIAR Pet.\nNome: ${form.name}\nWhatsApp: ${form.whatsapp}\nBairro: ${form.bairro}\nCarro: ${form.carro}\nExperiência com pets: ${form.experiencia}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    setSent(true);
  };

  const valid = form.name.length >= 3 && form.whatsapp.length >= 10 && form.bairro && form.carro && form.experiencia;

  return (
    <Box sx={sx.page}>
      <Box sx={sx.glow} />

      {/* Header */}
      <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.06)', py: 2, px: 3, position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ fontWeight: 800, fontSize: 18, color: gold, letterSpacing: 2 }}>
          KAVIAR <span style={{ color: '#fff' }}>PET</span> 🐾
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <img src={new URL('../assets/logo-kaviar-full.svg', import.meta.url).href} alt="KAVIAR" style={{ height: 24 }} />
        </Box>
      </Box>

      <Box sx={sx.section}>
        {/* Hero */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, fontSize: { xs: '1.8rem', md: '2.5rem' } }}>
            Transporte Pet com<br />Operação Certificada
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', maxWidth: 600, mx: 'auto' }}>
            Motoristas treinados, veículos preparados e acompanhamento da Central em tempo real.
          </Typography>
        </Box>

        {/* Como funciona */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, textAlign: 'center' }}>
            Como funciona a homologação
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 2 }}>
            {STEPS.map((s, i) => (
              <Box key={i} sx={{ ...sx.card, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 36, mb: 1 }}>{s.icon}</Typography>
                <Typography sx={{ fontWeight: 700, mb: 0.5, color: gold }}>{s.title}</Typography>
                <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{s.desc}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Requisitos */}
        <Box sx={{ ...sx.card, mb: 6 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: gold }}>
            Requisitos mínimos
          </Typography>
          {REQUIREMENTS.map((r, i) => (
            <Typography key={i} sx={{ fontSize: 15, mb: 1, color: 'rgba(255,255,255,0.75)' }}>
              ✓ &nbsp;{r}
            </Typography>
          ))}
          <Typography sx={{ mt: 2, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            Homologação obrigatória — operação assistida pela Central KAVIAR Pet.
          </Typography>
        </Box>

        {/* Formulário de pré-cadastro */}
        <Box sx={{ ...sx.card, mb: 4 }} id="cadastro">
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}>
            Quero me cadastrar
          </Typography>
          <Typography sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', mb: 3, fontSize: 14 }}>
            Preencha seus dados e nossa equipe entrará em contato via WhatsApp.
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
            <TextField label="Nome completo" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} sx={sx.input} fullWidth />
            <TextField label="WhatsApp" value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="(21) 99999-0000" sx={sx.input} fullWidth />
            <TextField label="Bairro / Região" value={form.bairro} onChange={e => setForm({ ...form, bairro: e.target.value })} sx={sx.input} fullWidth />
            <TextField label="Modelo do carro" value={form.carro} onChange={e => setForm({ ...form, carro: e.target.value })} sx={sx.input} fullWidth />
          </Box>
          <TextField
            label="Experiência com pets"
            value={form.experiencia}
            onChange={e => setForm({ ...form, experiencia: e.target.value })}
            placeholder="Tenho pet / Já transportei / Nunca transportei"
            sx={{ ...sx.input, mb: 3 }}
            fullWidth
          />

          <Box sx={{ textAlign: 'center' }}>
            <Button sx={sx.goldBtn} onClick={handleWhatsApp} disabled={!valid} size="large">
              Enviar via WhatsApp 💬
            </Button>
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', py: 4, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, mb: 3 }}>
            KAVIAR PET — OPERAÇÃO CERTIFICADA DE TRANSPORTE PET
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
            <img src={new URL('../assets/logo-kaviar-full.svg', import.meta.url).href} alt="KAVIAR" style={{ height: 32 }} />
          </Box>
          <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', mt: 1 }}>
            KAVIAR — Rio de Janeiro/RJ — Atendimento digital
          </Typography>
        </Box>
      </Box>

      <Snackbar open={sent} autoHideDuration={5000} onClose={() => setSent(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" sx={{ bgcolor: '#1A2A1A', color: '#4CAF50' }}>
          Dados enviados! Nossa equipe entrará em contato em breve.
        </Alert>
      </Snackbar>
    </Box>
  );
}
