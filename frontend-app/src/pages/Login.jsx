import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const gold = '#D4AF37';

export default function Login() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#070707', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top, rgba(212,175,55,0.15), transparent 40%)', pointerEvents: 'none' }} />

      <Box sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, mx: 'auto', px: 3, py: 6, textAlign: 'center' }}>
        {/* Logo */}
        <Box sx={{ mb: 5 }}>
          <Box sx={{ width: 56, height: 56, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, border: `1px solid ${gold}40`, bgcolor: '#111', color: gold, fontWeight: 800, fontSize: 22, boxShadow: '0 0 30px rgba(212,175,55,0.15)', mb: 2 }}>K</Box>
          <Typography sx={{ fontSize: 12, letterSpacing: '0.35em', color: gold, textTransform: 'uppercase' }}>KAVIAR</Typography>
          <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>Acesse sua conta</Typography>
        </Box>

        {/* Options */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button component={Link} to="/auth/form" variant="contained" fullWidth sx={{ bgcolor: gold, color: '#000', fontWeight: 700, borderRadius: 3, textTransform: 'none', py: 2, fontSize: '0.95rem', '&:hover': { bgcolor: '#e1be52' } }}>
            Entrar como Passageiro
          </Button>

          <Button component={Link} to="/cadastro" variant="outlined" fullWidth sx={{ borderColor: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, borderRadius: 3, textTransform: 'none', py: 2, fontSize: '0.95rem', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}>
            Entrar como Motorista
          </Button>

          <Button component={Link} to="/admin/login" variant="outlined" fullWidth sx={{ borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontWeight: 500, borderRadius: 3, textTransform: 'none', py: 1.5, fontSize: '0.85rem', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' } }}>
            Painel administrativo
          </Button>
        </Box>

        <Button component={Link} to="/" sx={{ mt: 4, color: 'rgba(255,255,255,0.4)', textTransform: 'none', fontSize: 13, '&:hover': { color: '#fff' } }}>
          ← Voltar para a home
        </Button>
      </Box>
    </Box>
  );
}
