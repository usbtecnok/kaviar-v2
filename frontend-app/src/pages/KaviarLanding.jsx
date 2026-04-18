import React from 'react';
import { Box, Typography, Button, TextField, Container } from '@mui/material';
import { Link } from 'react-router-dom';

// ─── Styles ───
const gold = '#D4AF37';
const goldLight = '#F3D57A';
const bg = '#070707';

const sx = {
  page: { minHeight: '100vh', bgcolor: bg, color: '#fff', position: 'relative' },
  glow: { position: 'absolute', inset: 0, background: 'radial-gradient(circle at top, rgba(212,175,55,0.18), transparent 32%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.07), transparent 22%)', pointerEvents: 'none' },
  header: { position: 'relative', zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(24px)' },
  section: { position: 'relative', zIndex: 10, maxWidth: 1200, mx: 'auto', px: { xs: 3, md: 5 } },
  card: { borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' },
  input: {
    '& .MuiOutlinedInput-root': { color: '#fff', borderRadius: 3, '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover fieldset': { borderColor: gold }, '&.Mui-focused fieldset': { borderColor: gold } },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.45)' },
    '& .MuiInputLabel-root.Mui-focused': { color: gold },
  },
  goldBtn: {
    background: 'linear-gradient(180deg, #eece55 0%, #D4AF37 50%, #b8962e 100%)',
    color: '#000', fontWeight: 700, borderRadius: 3, textTransform: 'none', py: 1.8, px: 4, fontSize: '0.9rem',
    boxShadow: '0 4px 16px rgba(212,175,55,0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
    '&:hover': { background: 'linear-gradient(180deg, #f3d660 0%, #e1be52 50%, #c5a028 100%)', transform: 'translateY(-1px)', boxShadow: '0 6px 24px rgba(212,175,55,0.28), inset 0 1px 0 rgba(255,255,255,0.2)' },
    transition: 'all 0.2s',
  },
  outlineBtn: { border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, borderRadius: 3, textTransform: 'none', py: 1.8, px: 4, fontSize: '0.9rem', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', transform: 'translateY(-1px)' }, transition: 'all 0.2s' },
};

// ─── Consultor Form (reused) ───
function ConsultorForm() {
  const [form, setForm] = React.useState({ nome: '', whatsapp: '', bairro: '', cidade: '' });
  const [sent, setSent] = React.useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const msg = `*Quero ser Consultor Kaviar*%0A%0ANome: ${encodeURIComponent(form.nome)}%0AWhatsApp: ${encodeURIComponent(form.whatsapp)}%0ARegião: ${encodeURIComponent(form.bairro)}%0ACidade: ${encodeURIComponent(form.cidade)}`;
    window.open(`https://wa.me/5521968648777?text=${msg}`, '_blank');
    try {
      const notes = `Região: ${form.bairro} | Cidade: ${form.cidade}`;
      await fetch('https://api.kaviar.com.br/api/public/consultant-lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.nome, phone: form.whatsapp, source: 'site-consultor', notes }),
      });
    } catch {}
    setSent(true);
  };

  if (sent) return (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Typography sx={{ color: '#66BB6A', fontWeight: 700, mb: 1 }}>✅ Mensagem preparada!</Typography>
      <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Complete o envio na janela do WhatsApp.</Typography>
      <Button onClick={() => setSent(false)} sx={{ mt: 2, color: gold, textTransform: 'none' }}>Enviar novamente</Button>
    </Box>
  );

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField label="Seu nome" required value={form.nome} onChange={set('nome')} size="small" fullWidth sx={sx.input} />
      <TextField label="WhatsApp (com DDD)" required value={form.whatsapp} onChange={set('whatsapp')} size="small" fullWidth sx={sx.input} />
      <TextField label="Sua região / comunidade" required value={form.bairro} onChange={set('bairro')} size="small" fullWidth sx={sx.input} />
      <TextField label="Cidade" required value={form.cidade} onChange={set('cidade')} size="small" fullWidth sx={sx.input} />
      <Button type="submit" variant="contained" fullWidth sx={sx.goldBtn}>Quero ser consultor</Button>
    </Box>
  );
}

// ─── Landing ───
export default function KaviarLanding() {
  React.useEffect(() => {
    if (window.location.hash) {
      setTimeout(() => { document.querySelector(window.location.hash)?.scrollIntoView({ behavior: 'smooth' }); }, 300);
    }
  }, []);

  return (
    <Box sx={sx.page}>
      <Box sx={sx.glow} />

      {/* ─── Header ─── */}
      <Box sx={sx.header}>
        <Box sx={{ maxWidth: 1200, mx: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: { xs: 3, md: 5 }, py: 2.5 }}>
          <Box component={Link} to="/" sx={{ display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', position: 'relative' }}>
            {/* Glow */}
            <Box sx={{ position: 'absolute', inset: '-12px -16px', borderRadius: '34px', background: 'radial-gradient(circle at 30%, rgba(212,175,55,0.18), transparent 60%)', filter: 'blur(18px)', zIndex: 0, pointerEvents: 'none' }} />
            {/* Symbol */}
            <img src="/kaviar-logo-k.png" alt="" style={{ height: 60, width: 60, borderRadius: 12, position: 'relative', zIndex: 1, filter: 'drop-shadow(0 0 14px rgba(212,175,55,0.18))' }} />
            {/* Wordmark */}
            <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography sx={{
                fontSize: 28,
                fontFamily: '"Cormorant Garamond", "Playfair Display", "Georgia", serif',
                fontWeight: 600,
                letterSpacing: '0.30em',
                lineHeight: 1,
                color: 'transparent',
                backgroundImage: 'linear-gradient(180deg, #fff3bf 0%, #f3d57a 18%, #d4af37 42%, #fff1a8 52%, #b88913 78%, #f0cf67 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.15))',
              }}>KAVIAR</Typography>
              <Typography sx={{ mt: 0.4, fontSize: 8.5, letterSpacing: '0.22em', color: 'rgba(200,169,74,0.6)', textTransform: 'uppercase', fontWeight: 500, fontFamily: '"Inter", "Helvetica Neue", sans-serif' }}>Mobilidade local brasileira</Typography>
            </Box>
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 4 }}>
            {[['#consultor', 'Consultor'], ['#comunidade', 'Comunidade'], ['#downloads', 'Downloads']].map(([href, label]) => (
              <Typography key={href} component="a" href={href} sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, textDecoration: 'none', '&:hover': { color: '#fff' }, transition: 'color 0.2s' }}>{label}</Typography>
            ))}
            <Button component={Link} to="/login" variant="outlined" size="small" sx={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)', borderRadius: 2.5, textTransform: 'none', fontSize: 13, px: 2.5 }}>Já tenho conta</Button>
          </Box>
        </Box>
      </Box>

      {/* ─── Hero ─── */}
      <Box sx={{ ...sx.section, py: { xs: 8, md: 12 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.15fr 0.85fr' }, gap: 6, alignItems: 'center' }}>
          <Box>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, borderRadius: 5, border: `1px solid ${gold}25`, bgcolor: `${gold}15`, px: 2, py: 0.8, mb: 3 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 500, color: goldLight }}>Plataforma brasileira • mobilidade local • confiança para o dia e para a noite</Typography>
            </Box>

            <Typography variant="h2" sx={{ fontWeight: 600, lineHeight: 1.05, letterSpacing: '-0.02em', fontSize: { xs: '2.2rem', md: '3.5rem' } }}>
              Motoristas da sua região.{' '}<Box component="span" sx={{ color: 'transparent', backgroundImage: 'linear-gradient(180deg, #f3d57a, #D4AF37, #b88913)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Corridas da sua comunidade.</Box>
            </Typography>

            <Typography sx={{ mt: 3, fontSize: { xs: 16, md: 18 }, lineHeight: 1.7, color: 'rgba(255,255,255,0.68)', maxWidth: 640 }}>
              O KAVIAR é um app brasileiro de mobilidade local, criado para conectar passageiros e motoristas da própria região com mais proximidade, confiança e praticidade no dia a dia.
            </Typography>

            <Typography sx={{ mt: 2, fontSize: { xs: 15, md: 17 }, lineHeight: 1.6, color: 'rgba(255,255,255,0.5)', maxWidth: 640 }}>
              Dirija perto de casa ou ganhe indicando novos motoristas para a sua comunidade.
            </Typography>

            <Box sx={{ mt: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
              <Button variant="contained" href="#downloads" sx={sx.goldBtn}>Quero ser motorista KAVIAR</Button>
              <Button variant="outlined" href="#consultor" sx={sx.outlineBtn}>Quero ser consultor</Button>
            </Box>

            {/* Value props */}
            <Box sx={{ mt: 5, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
              {[
                ['Brasileiro', 'Posicionamento local, humano e próximo da realidade da região.'],
                ['Comunitário', 'Prioridade para motoristas da própria comunidade e expansão responsável.'],
                ['Oportunidade', 'Ganhos ao dirigir e também ao indicar novos motoristas.'],
              ].map(([title, desc]) => (
                <Box key={title} sx={{ borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)', bgcolor: 'rgba(255,255,255,0.03)', p: 2 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: gold }}>{title}</Typography>
                  <Typography sx={{ mt: 1, fontSize: 12.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.55)' }}>{desc}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Side card */}
          <Box sx={{ ...sx.card, p: { xs: 3, md: 3.5 }, display: { xs: 'none', lg: 'block' } }}>
            <Box sx={{ borderRadius: 5, border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(to bottom, rgba(20,20,20,0.9), rgba(11,11,11,0.95))', backdropFilter: 'blur(16px)', p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                  <Typography sx={{ fontSize: 10, letterSpacing: '0.3em', color: gold, textTransform: 'uppercase' }}>Visão da marca</Typography>
                  <Typography sx={{ mt: 1, fontSize: 18, fontWeight: 600 }}>KAVIAR + Comunidade</Typography>
                </Box>
                <Box sx={{ borderRadius: 5, border: `1px solid ${gold}20`, bgcolor: `${gold}10`, px: 1.5, py: 0.5 }}>
                  <Typography sx={{ fontSize: 11, color: goldLight }}>Pré-piloto</Typography>
                </Box>
              </Box>
              {[
                ['Motorista local em destaque', 'Rede formada por motoristas da própria região, com mais proximidade e confiança no atendimento.'],
                ['Renda por indicação', 'Consultores locais podem apresentar novos motoristas e participar do crescimento do KAVIAR na comunidade.'],
                ['Diálogo com lideranças', 'Expansão com conversa, respeito ao território e abertura para parceria com associações de moradores.'],
              ].map(([t, d]) => (
                <Box key={t} sx={{ borderRadius: 3, border: '1px solid rgba(255,255,255,0.07)', bgcolor: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)', p: 2, mb: 1.5 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>{t}</Typography>
                  <Typography sx={{ mt: 1, fontSize: 12.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.55)' }}>{d}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ─── Consultor ─── */}
      <Box id="consultor" sx={{ ...sx.section, py: { xs: 4, md: 7 } }}>
        <Box sx={{ ...sx.card, overflow: 'hidden' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 0.9fr' }, gap: 4, p: { xs: 4, md: 6 } }}>
            <Box>
              <Typography sx={{ fontSize: 11, letterSpacing: '0.35em', color: gold, textTransform: 'uppercase', mb: 1.5 }}>Consultor KAVIAR</Typography>
              <Typography variant="h4" sx={{ fontWeight: 600, letterSpacing: '-0.01em', fontSize: { xs: '1.6rem', md: '2.2rem' } }}>
                Ganhe indicando motoristas da sua comunidade
              </Typography>
              <Typography sx={{ mt: 2.5, fontSize: { xs: 15, md: 16 }, lineHeight: 1.7, color: 'rgba(255,255,255,0.62)' }}>
                Se você conhece motoristas da sua região, pode ajudar a expandir a rede do KAVIAR e ganhar com isso. É uma forma de gerar oportunidade local e fortalecer a mobilidade da própria comunidade.
              </Typography>

              <Box sx={{ mt: 4, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                {[
                  ['1', 'Você apresenta', 'Indique motoristas confiáveis da sua região.'],
                  ['2', 'Nós avaliamos', 'O KAVIAR entra em contato e acompanha o onboarding.'],
                  ['3', 'A rede cresce', 'Sua comunidade ganha novas oportunidades locais.'],
                ].map(([n, t, d]) => (
                  <Box key={n} sx={{ borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)', bgcolor: 'rgba(0,0,0,0.25)', p: 2.5 }}>
                    <Typography sx={{ fontSize: 22, fontWeight: 600, color: gold }}>{n}</Typography>
                    <Typography sx={{ mt: 1.5, fontSize: 13, fontWeight: 500 }}>{t}</Typography>
                    <Typography sx={{ mt: 1, fontSize: 12.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.5)' }}>{d}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box sx={{ borderRadius: 5, border: '1px solid rgba(255,255,255,0.1)', bgcolor: 'rgba(0,0,0,0.25)', p: { xs: 3, md: 4 } }}>
              <Typography sx={{ fontSize: 10, letterSpacing: '0.3em', color: gold, textTransform: 'uppercase' }}>Cadastro de interesse</Typography>
              <Typography sx={{ mt: 1.5, fontSize: 20, fontWeight: 600, mb: 3 }}>Quero ser consultor</Typography>
              <ConsultorForm />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ─── Comunidade ─── */}
      <Box id="comunidade" sx={{ ...sx.section, py: { xs: 4, md: 7 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '0.95fr 1.05fr' }, gap: 3 }}>
          <Box sx={{ ...sx.card, p: { xs: 4, md: 5 } }}>
            <Typography sx={{ fontSize: 11, letterSpacing: '0.35em', color: gold, textTransform: 'uppercase' }}>Comunidade em primeiro lugar</Typography>
            <Typography variant="h4" sx={{ mt: 2, fontWeight: 600, letterSpacing: '-0.01em', fontSize: { xs: '1.6rem', md: '2.2rem' } }}>
              Parcerias com associações e lideranças locais
            </Typography>
            <Typography sx={{ mt: 2.5, fontSize: { xs: 15, md: 16 }, lineHeight: 1.7, color: 'rgba(255,255,255,0.62)' }}>
              O KAVIAR busca construir uma mobilidade local com diálogo, respeito à comunidade e valorização de motoristas da própria região. Se você representa uma associação de moradores ou liderança local, queremos conversar com você.
            </Typography>
            <Box sx={{ mt: 3, display: 'inline-flex', borderRadius: 5, border: '1px solid rgba(255,255,255,0.1)', bgcolor: 'rgba(255,255,255,0.03)', px: 2, py: 1 }}>
              <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>Para associações de moradores e lideranças locais</Typography>
            </Box>
            <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                Parcerias e marca: <Box component="a" href="mailto:contato@kaviar.com.br" sx={{ color: gold, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>contato@kaviar.com.br</Box>
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                Institucional: <Box component="a" href="mailto:contato@usbtecnok.com.br" sx={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>contato@usbtecnok.com.br</Box>
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            {[
              ['Respeito ao território', 'Crescimento com conversa e entendimento da realidade de cada comunidade.'],
              ['Motoristas da região', 'Valorização de quem já conhece o território e o dia a dia local.'],
              ['Expansão responsável', 'Nada de postura invasiva: o objetivo é construir junto e somar.'],
              ['Canal de diálogo', 'Espaço para apresentar a comunidade, tirar dúvidas e discutir parcerias.'],
            ].map(([t, d]) => (
              <Box key={t} sx={{ ...sx.card, p: 3 }}>
                <Typography sx={{ fontSize: 16, fontWeight: 600 }}>{t}</Typography>
                <Typography sx={{ mt: 1.5, fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.55)' }}>{d}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ─── Downloads ─── */}
      <Box id="downloads" sx={{ ...sx.section, py: { xs: 4, md: 7 } }}>
        <Box sx={{ mb: 4 }}>
          <Typography sx={{ fontSize: 11, letterSpacing: '0.35em', color: gold, textTransform: 'uppercase' }}>Downloads</Typography>
          <Typography variant="h4" sx={{ mt: 1.5, fontWeight: 600, letterSpacing: '-0.01em', fontSize: { xs: '1.6rem', md: '2.2rem' } }}>
            Baixe o app certo para o seu momento
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
          {/* Motorista - destaque */}
          <Box sx={{ borderRadius: 6, border: `1px solid ${gold}20`, background: 'linear-gradient(135deg, #1b1608, #0c0b08)', p: { xs: 4, md: 5 }, boxShadow: `0 30px 120px rgba(212,175,55,0.08)` }}>
            <Box sx={{ display: 'inline-flex', borderRadius: 5, border: `1px solid ${gold}20`, bgcolor: `${gold}10`, px: 1.5, py: 0.5, mb: 2 }}>
              <Typography sx={{ fontSize: 11, color: goldLight }}>Prioridade atual</Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>App do Motorista</Typography>
            <Typography sx={{ fontSize: 15, lineHeight: 1.7, color: 'rgba(255,255,255,0.62)', mb: 3 }}>
              Ideal para quem quer dirigir na própria região e participar da construção da rede local do KAVIAR.
            </Typography>
            <Box component="ul" sx={{ pl: 0, listStyle: 'none', mb: 4, '& li': { fontSize: 13, color: 'rgba(255,255,255,0.55)', mb: 1, '&::before': { content: '"•"', mr: 1, color: gold } } }}>
              <li>Cadastro e onboarding de motorista</li>
              <li>Recebimento de corridas da sua região</li>
              <li>Operação focada em proximidade e confiança</li>
            </Box>
            <Button variant="contained" href="https://downloads.kaviar.com.br/kaviar-motorista-v1.7.0.apk" target="_blank" rel="noopener" sx={sx.goldBtn}>
              Baixar app do motorista
            </Button>
          </Box>

          {/* Passageiro */}
          <Box sx={{ ...sx.card, p: { xs: 4, md: 5 } }}>
            <Box sx={{ display: 'inline-flex', borderRadius: 5, border: '1px solid rgba(255,255,255,0.1)', bgcolor: 'rgba(255,255,255,0.03)', px: 1.5, py: 0.5, mb: 2 }}>
              <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>Acesso complementar</Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>App do Passageiro</Typography>
            <Typography sx={{ fontSize: 15, lineHeight: 1.7, color: 'rgba(255,255,255,0.62)', mb: 3 }}>
              Disponível para quem já quer conhecer a experiência do KAVIAR e acompanhar a expansão da rede na sua região.
            </Typography>
            <Box component="ul" sx={{ pl: 0, listStyle: 'none', mb: 4, '& li': { fontSize: 13, color: 'rgba(255,255,255,0.55)', mb: 1, '&::before': { content: '"•"', mr: 1 } } }}>
              <li>Solicitação de corrida pelo app</li>
              <li>Experiência conectada à rede local</li>
              <li>Acompanhe a expansão na sua região</li>
            </Box>
            <Button variant="outlined" href="https://downloads.kaviar.com.br/kaviar-passageiro-v1.7.0.apk" target="_blank" rel="noopener" sx={sx.outlineBtn}>
              Baixar app do passageiro
            </Button>
          </Box>
        </Box>
      </Box>

      {/* ─── Footer ─── */}
      <Box sx={{ position: 'relative', zIndex: 10, mt: 5, borderTop: '1px solid rgba(255,255,255,0.1)', bgcolor: 'rgba(0,0,0,0.3)' }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 3, px: { xs: 3, md: 5 }, py: 4 }}>
          <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>© 2026 KAVIAR • Plataforma brasileira de mobilidade local</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {[
              ['/login', 'Entrar'],
              ['/admin/login', 'Admin'],
              ['/turismo', 'Turismo Premium'],
            ].map(([href, label]) => (
              <Typography key={href} component={Link} to={href} sx={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', textDecoration: 'none', '&:hover': { color: '#fff' }, transition: 'color 0.2s' }}>{label}</Typography>
            ))}
          </Box>
        </Box>
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 3, md: 5 }, pb: 4 }}>
          <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 1.7 }}>
            Plataforma operada por USB TECNOK — Manutenção e Instalação de Computadores LTDA — ME • CNPJ 07.710.691/0001-66 • Rio de Janeiro, RJ • Desde 2005
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
