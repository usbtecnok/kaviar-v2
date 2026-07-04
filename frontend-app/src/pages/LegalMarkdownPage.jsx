import React from 'react';
import { Box, Container, Link, Stack, Typography } from '@mui/material';
import Markdown from 'react-markdown';

export default function LegalMarkdownPage({ title, subtitle, markdown }) {
  // TODO: manter este conteúdo alinhado com a versão aprovada pelo time legal e compliance.

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#04070C', color: '#fff', py: { xs: 4, md: 6 } }}>
      <Container maxWidth="md">
        <Stack spacing={1} sx={{ mb: 3 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#D4AF37', fontSize: { xs: '1.9rem', md: '2.5rem' } }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography sx={{ color: 'rgba(255,255,255,0.72)' }}>
              {subtitle}
            </Typography>
          ) : null}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Link href="/" underline="hover" sx={{ color: '#8CB8FF' }}>Início</Link>
            <Link href="/privacidade" underline="hover" sx={{ color: '#8CB8FF' }}>Privacidade</Link>
            <Link href="/termos-passageiro" underline="hover" sx={{ color: '#8CB8FF' }}>Termos Passageiro</Link>
            <Link href="/termos-motorista" underline="hover" sx={{ color: '#8CB8FF' }}>Termos Motorista</Link>
            <Link href="/excluir-conta" underline="hover" sx={{ color: '#8CB8FF' }}>Excluir Conta</Link>
          </Stack>
        </Stack>

        <Box
          sx={{
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 3,
            bgcolor: 'rgba(255,255,255,0.03)',
            p: { xs: 2, md: 3 },
            '& h1': { color: '#fff', fontSize: { xs: '1.5rem', md: '1.8rem' }, mt: 1.5, mb: 1 },
            '& h2': { color: '#D4AF37', fontSize: { xs: '1.2rem', md: '1.35rem' }, mt: 2.2, mb: 0.8 },
            '& h3': { color: '#F5D980', fontSize: { xs: '1rem', md: '1.1rem' }, mt: 1.8, mb: 0.6 },
            '& p, & li': { color: 'rgba(255,255,255,0.86)', lineHeight: 1.7 },
            '& ul, & ol': { pl: 3 },
            '& hr': { borderColor: 'rgba(255,255,255,0.2)', my: 2 },
            '& strong': { color: '#fff' },
            '& a': { color: '#8CB8FF' },
          }}
        >
          <Markdown>{markdown}</Markdown>
        </Box>
      </Container>
    </Box>
  );
}
