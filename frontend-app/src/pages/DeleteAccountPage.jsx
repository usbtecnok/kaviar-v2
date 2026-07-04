import { Box, Container, Link, Stack, Typography } from '@mui/material';

export default function DeleteAccountPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#04070C', color: '#fff', py: { xs: 4, md: 6 } }}>
      <Container maxWidth="md">
        <Stack spacing={1} sx={{ mb: 3 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#D4AF37', fontSize: { xs: '1.9rem', md: '2.5rem' } }}>
            Excluir Conta e Dados
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.72)' }}>
            Canal oficial para solicitar exclusão de conta e dados pessoais da plataforma KAVIAR.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Link href="/" underline="hover" sx={{ color: '#8CB8FF' }}>Início</Link>
            <Link href="/privacidade" underline="hover" sx={{ color: '#8CB8FF' }}>Privacidade</Link>
            <Link href="/termos-passageiro" underline="hover" sx={{ color: '#8CB8FF' }}>Termos Passageiro</Link>
            <Link href="/termos-motorista" underline="hover" sx={{ color: '#8CB8FF' }}>Termos Motorista</Link>
          </Stack>
        </Stack>

        <Box sx={{ border: '1px solid rgba(255,255,255,0.14)', borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)', p: { xs: 2, md: 3 } }}>
          <Typography sx={{ fontSize: { xs: '1.2rem', md: '1.35rem' }, color: '#D4AF37', fontWeight: 700, mb: 1.2 }}>
            Como solicitar
          </Typography>

          <Typography sx={{ color: 'rgba(255,255,255,0.86)', mb: 1 }}>
            Envie sua solicitação pelos canais oficiais abaixo:
          </Typography>

          <Box component="ul" sx={{ pl: 3, mb: 2, '& li': { color: 'rgba(255,255,255,0.86)', mb: 0.6 } }}>
            <li>E-mail: suporte@kaviar.com.br</li>
            <li>WhatsApp: +55 21 96864-8777</li>
          </Box>

          <Typography sx={{ fontSize: { xs: '1.05rem', md: '1.15rem' }, color: '#F5D980', fontWeight: 700, mb: 1 }}>
            Informações necessárias no pedido
          </Typography>

          <Box component="ul" sx={{ pl: 3, mb: 2, '& li': { color: 'rgba(255,255,255,0.86)', mb: 0.6 } }}>
            <li>Nome completo</li>
            <li>Telefone e e-mail da conta</li>
            <li>Perfil da conta: Passageiro, Motorista ou ambos</li>
            <li>Descrição do pedido: exclusão de conta e dados</li>
          </Box>

          <Typography sx={{ fontSize: { xs: '1.05rem', md: '1.15rem' }, color: '#F5D980', fontWeight: 700, mb: 1 }}>
            Prazo e retenção legal
          </Typography>

          <Typography sx={{ color: 'rgba(255,255,255,0.86)', lineHeight: 1.7, mb: 1 }}>
            Após validação da identidade, a KAVIAR processará a solicitação de exclusão da conta e dos dados pessoais elegíveis.
            Dados que precisarem ser mantidos por obrigação legal, regulatória, fiscal ou prevenção de fraude poderão ser retidos
            pelo período mínimo exigido na legislação aplicável.
          </Typography>

          <Typography sx={{ color: 'rgba(255,255,255,0.86)', lineHeight: 1.7 }}>
            Para mais detalhes sobre tratamento de dados e direitos do titular, consulte a Política de Privacidade.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
