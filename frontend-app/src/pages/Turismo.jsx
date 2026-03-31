import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button, Grid, Card, CardContent, TextField, Paper, IconButton, CircularProgress, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { WhatsApp, Send, Close, Chat, Star, Shield, EmojiEvents, ExpandMore } from '@mui/icons-material';
import { API_BASE_URL } from '../config/api';

const tours = [
  {
    id: 1,
    title: "Clássicos do Rio",
    image: "/turismo-replit/generated_images/sugarloaf_mountain_golden_hour.png",
    duration: "6 Horas",
    rating: "5.0",
    locations: "Pão de Açúcar • Cristo Redentor • Maracanã",
    description: "Um tour completo pelos cartões postais mais icônicos da cidade maravilhosa, com conforto absoluto e sem filas.",
  },
  {
    id: 2,
    title: "Natureza Imperial",
    image: "/turismo-replit/generated_images/tijuca_forest_road.png",
    duration: "5 Horas",
    rating: "4.9",
    locations: "Floresta da Tijuca • Jardim Botânico • Vista Chinesa",
    description: "Mergulhe na maior floresta urbana do mundo e descubra a história imperial do Brasil em um passeio relaxante.",
  },
  {
    id: 3,
    title: "Rio Panorâmico",
    image: "/turismo-replit/generated_images/christ_the_redeemer_majestic.png",
    duration: "4 Horas",
    rating: "4.9",
    locations: "Mirante Dona Marta • Santa Teresa • Lapa",
    description: "Vistas de tirar o fôlego e a boemia charmosa de Santa Teresa, finalizando nos Arcos da Lapa.",
  },
];

const features = [
  {
    icon: Star,
    title: "Motoristas de Elite",
    description: "Nossos parceiros passam por um rigoroso processo de seleção. Apenas os 5% melhores, com avaliação média de 4.9+, dirigem para a Kaviar.",
  },
  {
    icon: EmojiEvents,
    title: "Combos Exclusivos",
    description: "Esqueça os passeios turísticos comuns. Oferecemos experiências curadas com serviço de bordo, sem pressa e com total privacidade.",
  },
  {
    icon: Shield,
    title: "Segurança Executiva",
    description: "Monitoramento em tempo real e protocolos de segurança avançados para sua tranquilidade total.",
  },
];

const faqs = [
  {
    question: "Como funciona o agendamento dos combos turísticos?",
    answer: "Você pode agendar diretamente pelo nosso aplicativo ou site. Após escolher o roteiro, você define a data e horário. Um motorista executivo buscará você no local combinado (hotel ou residência) para iniciar o tour exclusivo.",
  },
  {
    question: "Quais tipos de veículos estão disponíveis?",
    answer: "Trabalhamos exclusivamente com sedãs executivos de luxo (como Corolla, Civic, Sentra ou superiores). Todos higienizados e com ar-condicionado digital.",
  },
  {
    question: "É seguro fazer os passeios com a Kaviar?",
    answer: "Segurança é nossa prioridade absoluta. Todos os nossos motoristas passam por verificação de antecedentes criminais e treinamento de direção defensiva. Além disso, todas as rotas são monitoradas em tempo real pela nossa central.",
  },
  {
    question: "Posso personalizar meu roteiro?",
    answer: "Sim! Embora tenhamos combos pré-definidos para otimizar seu tempo, você tem total liberdade para conversar com o motorista e ajustar paradas conforme sua preferência. A cobrança é feita por hora ou pacote fechado.",
  },
  {
    question: "Quais são os requisitos para ser motorista parceiro?",
    answer: "Exigimos veículo sedan médio/grande, fabricação a partir de 2020, CNH EAR, antecedentes criminais limpos e passar em nossa entrevista presencial e teste de qualidade.",
  },
];

export default function Turismo() {
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Olá! Sou o assistente da Kaviar. Pergunte sobre nossos roteiros ou fale direto no WhatsApp!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Formulário de recrutamento
  const [formData, setFormData] = useState({
    profileType: '',
    name: '',
    phone: '',
    vehicle: ''
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/turismo/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, conversationHistory: messages }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Desculpe, ocorreu um erro. Por favor, tente novamente ou entre em contato pelo WhatsApp: (21) 96864-8777',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleWhatsApp = (tourTitle = '') => {
    const message = tourTitle 
      ? `Olá! Gostaria de saber mais sobre o roteiro: *${tourTitle}*`
      : 'Olá! Gostaria de saber mais sobre os combos turísticos da Kaviar.';
    window.open(`https://wa.me/5521968648777?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleRecruitmentSubmit = (e) => {
    e.preventDefault();
    
    const profileLabels = {
      motorista: 'Motorista Executivo',
      motorista_bilingue: 'Motorista Bilíngue (Inglês/Espanhol)',
      agente_turismo: 'Agente de Turismo / Guia'
    };
    
    const profileLabel = profileLabels[formData.profileType] || formData.profileType;
    const message = `*Nova Candidatura - Kaviar*\n\n*Perfil:* ${profileLabel}\n*Nome:* ${formData.name}\n*Telefone:* ${formData.phone}\n*Veículo/Experiência:* ${formData.vehicle}`;
    
    window.open(`https://wa.me/5521968648777?text=${encodeURIComponent(message)}`, '_blank');
    
    setFormData({ profileType: '', name: '', phone: '', vehicle: '' });
  };

  return (
    <Box sx={{ bgcolor: '#0a0a0a', minHeight: '100vh' }}>
      {/* Hero Section */}
      <Box
        sx={{
          minHeight: '100vh',
          backgroundImage: 'url(/turismo-replit/generated_images/luxury_sedan_in_rio_at_night.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 50%, #0a0a0a 100%)',
            zIndex: 1
          }
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, textAlign: 'center', px: 2 }}>
          <Box
            component="img"
            src="/turismo-replit/Gemini_Generated_Image_n3kx2kn3kx2kn3kx_1765055903753.png"
            alt="Kaviar Logo"
            sx={{ height: { xs: 120, md: 176 }, width: 'auto', mx: 'auto', mb: 3, objectFit: 'contain' }}
          />
          
          <Typography
            variant="overline"
            sx={{ color: '#FFD700', fontWeight: 500, letterSpacing: 3, textTransform: 'uppercase', fontSize: { xs: '0.75rem', md: '0.875rem' } }}
          >
            Mobilidade Executiva Premium
          </Typography>
          
          <Typography
            variant="h1"
            sx={{
              color: 'white',
              fontWeight: 700,
              fontSize: { xs: '2rem', md: '4rem', lg: '5rem' },
              lineHeight: 1.2,
              mt: 2,
              mb: 3,
              fontFamily: '"Playfair Display", serif'
            }}
          >
            Kaviar: Transformando Rotas em{' '}
            <Box component="span" sx={{ background: 'linear-gradient(to right, #FFD700, #FFC700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Roteiros Inesquecíveis
            </Box>
          </Typography>

          <Typography
            variant="h6"
            sx={{ color: 'rgba(255,255,255,0.8)', maxWidth: 700, mx: 'auto', mb: 4, fontSize: { xs: '1rem', md: '1.25rem' }, fontWeight: 300 }}
          >
            Experimente o Rio de Janeiro com a elegância que você merece. Carros de luxo, motoristas de elite e roteiros exclusivos.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'center', mt: 4 }}>
            <Button
              size="large"
              variant="contained"
              onClick={() => document.getElementById('download-apps')?.scrollIntoView({ behavior: 'smooth' })}
              sx={{
                bgcolor: '#00FFFF',
                color: '#0a0a0a',
                px: 4,
                py: 2,
                fontSize: '1.125rem',
                fontWeight: 700,
                borderRadius: 50,
                boxShadow: '0 0 20px rgba(0,255,255,0.3)',
                '&:hover': {
                  bgcolor: '#00CCCC',
                  transform: 'scale(1.05)',
                  boxShadow: '0 0 30px rgba(0,255,255,0.5)'
                },
                transition: 'all 0.3s'
              }}
            >
              BAIXAR O APP
            </Button>
            <Button
              size="large"
              variant="contained"
              onClick={() => navigate('/premium-tourism')}
              sx={{
                bgcolor: '#9C27B0',
                color: 'white',
                px: 4,
                py: 2,
                fontSize: '1.125rem',
                fontWeight: 700,
                borderRadius: 50,
                boxShadow: '0 0 20px rgba(156,39,176,0.3)',
                '&:hover': {
                  bgcolor: '#7B1FA2',
                  transform: 'scale(1.05)',
                  boxShadow: '0 0 30px rgba(156,39,176,0.5)'
                },
                transition: 'all 0.3s'
              }}
            >
              VER PACOTES
            </Button>
            <Button
              size="large"
              variant="outlined"
              onClick={() => document.getElementById('roteiros')?.scrollIntoView({ behavior: 'smooth' })}
              sx={{
                borderColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                px: 4,
                py: 2,
                fontSize: '1.125rem',
                borderRadius: 50,
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              CONHECER ROTEIROS
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Download Apps Section */}
      <Box id="download-apps" sx={{ py: 10, bgcolor: '#0f0f0f', borderBottom: '1px solid rgba(255,215,0,0.1)' }}>
        <Container maxWidth="sm">
          <Box sx={{ textAlign: 'center', mb: 5 }}>
            <Typography
              sx={{
                fontSize: { xs: '3.5rem', md: '5rem' },
                fontWeight: 900,
                fontFamily: '"Playfair Display", serif',
                fontStyle: 'italic',
                background: 'linear-gradient(135deg, #FFD700 0%, #FFC700 40%, #B8860B 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1,
                mb: 2,
                textShadow: '0 0 40px rgba(255,215,0,0.15)'
              }}
            >
              K
            </Typography>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, fontFamily: '"Playfair Display", serif', mb: 1 }}>
              Baixe os apps do KAVIAR
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.5)', mt: 1 }}>
              Instalação para Android via APK
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Motorista */}
            <Card
              sx={{
                bgcolor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,215,0,0.15)',
                borderRadius: 3,
                transition: 'all 0.3s',
                '&:hover': { borderColor: 'rgba(255,215,0,0.4)', transform: 'translateY(-2px)' }
              }}
            >
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, mb: 0.5 }}>
                  🚗 Kaviar Motorista
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 2 }}>
                  Para motoristas parceiros que vão dirigir e aceitar corridas
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  href="https://downloads.kaviar.com.br/kaviar-motorista.apk"
                  target="_blank"
                  sx={{
                    bgcolor: '#FFD700', color: '#0a0a0a', py: 1.5, fontWeight: 700, fontSize: '1rem',
                    '&:hover': { bgcolor: '#FFC700' }
                  }}
                >
                  BAIXAR APK MOTORISTA
                </Button>
              </CardContent>
            </Card>

            {/* Passageiro */}
            <Card
              sx={{
                bgcolor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(0,255,255,0.15)',
                borderRadius: 3,
                transition: 'all 0.3s',
                '&:hover': { borderColor: 'rgba(0,255,255,0.4)', transform: 'translateY(-2px)' }
              }}
            >
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, mb: 0.5 }}>
                  👤 Kaviar Passageiro
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 2 }}>
                  Para passageiros que querem solicitar corridas
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  href="https://downloads.kaviar.com.br/kaviar-passageiro.apk"
                  target="_blank"
                  sx={{
                    bgcolor: '#00FFFF', color: '#0a0a0a', py: 1.5, fontWeight: 700, fontSize: '1rem',
                    '&:hover': { bgcolor: '#00CCCC' }
                  }}
                >
                  BAIXAR APK PASSAGEIRO
                </Button>
              </CardContent>
            </Card>
          </Box>

          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', display: 'block', textAlign: 'center', mt: 3 }}>
            Ao baixar, permita a instalação de fontes desconhecidas no seu Android
          </Typography>
        </Container>
      </Box>

      {/* Tours Section */}
      <Box id="roteiros" sx={{ py: 12, bgcolor: '#0a0a0a' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="overline" sx={{ color: '#FFD700', fontWeight: 500, letterSpacing: 3, textTransform: 'uppercase' }}>
              Experiências Exclusivas
            </Typography>
            <Typography variant="h2" sx={{ color: 'white', fontWeight: 700, mt: 2, mb: 2, fontFamily: '"Playfair Display", serif', fontSize: { xs: '2rem', md: '3rem' } }}>
              Nossos Combos Turísticos
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', maxWidth: 700, mx: 'auto' }}>
              Roteiros planejados para oferecer o máximo de conforto, segurança e exclusividade.
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {tours.map((tour) => (
              <Grid item xs={12} md={4} key={tour.id}>
                <Card
                  sx={{
                    bgcolor: '#1a1a1a',
                    border: '1px solid rgba(255,255,255,0.05)',
                    overflow: 'hidden',
                    transition: 'all 0.3s',
                    '&:hover': {
                      borderColor: 'rgba(255,215,0,0.3)',
                      transform: 'translateY(-8px)',
                      '& .tour-image': {
                        transform: 'scale(1.1)'
                      }
                    }
                  }}
                >
                  <Box sx={{ position: 'relative', height: 256, overflow: 'hidden' }}>
                    <Box
                      className="tour-image"
                      component="img"
                      src={tour.image}
                      alt={tour.title}
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.7s'
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        bgcolor: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(10px)',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 50,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        border: '1px solid rgba(255,215,0,0.2)'
                      }}
                    >
                      <Star sx={{ fontSize: 12, color: '#FFD700' }} />
                      <Typography variant="caption" sx={{ color: '#FFD700', fontWeight: 700 }}>
                        {tour.rating}
                      </Typography>
                    </Box>
                  </Box>

                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h5" sx={{ color: 'white', fontWeight: 700, mb: 1 }}>
                      {tour.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,215,0,0.8)', fontWeight: 500, mb: 1, display: 'block' }}>
                      {tour.locations}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 2, lineHeight: 1.6 }}>
                      {tour.description}
                    </Typography>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => handleWhatsApp(tour.title)}
                      sx={{
                        borderColor: 'rgba(255,255,255,0.1)',
                        color: 'white',
                        '&:hover': {
                          borderColor: '#00FFFF',
                          bgcolor: '#00FFFF',
                          color: '#0a0a0a'
                        },
                        transition: 'all 0.3s'
                      }}
                    >
                      VER ROTEIRO E AGENDAR
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: 12, bgcolor: '#0f0f0f', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Container maxWidth="lg">
          <Grid container spacing={6}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Box
                  sx={{
                    textAlign: 'center',
                    p: 3,
                    borderRadius: 4,
                    bgcolor: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'all 0.3s',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.05)',
                      borderColor: 'rgba(255,215,0,0.2)'
                    }
                  }}
                >
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      bgcolor: 'rgba(255,215,0,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2
                    }}
                  >
                    <feature.icon sx={{ fontSize: 32, color: '#FFD700' }} />
                  </Box>
                  <Typography variant="h5" sx={{ color: 'white', fontWeight: 700, mb: 2, fontFamily: '"Playfair Display", serif' }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                    {feature.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* FAQ Section */}
      <Box sx={{ py: 12, bgcolor: '#0f0f0f', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="overline" sx={{ color: '#FFD700', fontWeight: 500, letterSpacing: 3, textTransform: 'uppercase' }}>
              Dúvidas Frequentes
            </Typography>
            <Typography variant="h2" sx={{ color: 'white', fontWeight: 700, mt: 2, fontFamily: '"Playfair Display", serif', fontSize: { xs: '2rem', md: '2.5rem' } }}>
              Perguntas & Respostas
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {faqs.map((faq, index) => (
              <Accordion
                key={index}
                sx={{
                  bgcolor: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '8px !important',
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': {
                    borderColor: 'rgba(255,215,0,0.2)'
                  }
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore sx={{ color: 'white' }} />}
                  sx={{
                    '& .MuiAccordionSummary-content': {
                      my: 2
                    }
                  }}
                >
                  <Typography variant="body1" sx={{ color: 'white', fontWeight: 500, fontSize: '1.125rem' }}>
                    {faq.question}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                    {faq.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Recruitment Section */}
      <Box id="motoristas" sx={{ py: 12, bgcolor: '#0a0a0a', position: 'relative', overflow: 'hidden' }}>
        <Container maxWidth="lg">
          <Grid container spacing={8} alignItems="center">
            
            {/* Content */}
            <Grid item xs={12} lg={6} sx={{ order: { xs: 2, lg: 1 } }}>
              <Box sx={{ mb: 4 }}>
                <Typography variant="overline" sx={{ color: '#FFD700', fontWeight: 500, letterSpacing: 3, textTransform: 'uppercase' }}>
                  Junte-se à Elite
                </Typography>
                <Typography variant="h2" sx={{ color: 'white', fontWeight: 700, mt: 2, mb: 3, fontFamily: '"Playfair Display", serif', fontSize: { xs: '2rem', md: '3rem' } }}>
                  Trabalhe com a Kaviar
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.125rem', lineHeight: 1.8 }}>
                  Não somos apenas um app de transporte. Somos um clube exclusivo de mobilidade e turismo. 
                  Oferecemos ganhos superiores, passageiros selecionados e o status que você merece.
                </Typography>
              </Box>

              <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 48, height: 4, background: 'linear-gradient(to right, #FFD700, transparent)', borderRadius: 50 }} />
                  <Typography sx={{ color: 'white', fontWeight: 500 }}>Ganhos até 3x maiores que apps comuns</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 48, height: 4, background: 'linear-gradient(to right, #FFD700, transparent)', borderRadius: 50 }} />
                  <Typography sx={{ color: 'white', fontWeight: 500 }}>Clientes corporativos e turismo de luxo</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 48, height: 4, background: 'linear-gradient(to right, #FFD700, transparent)', borderRadius: 50 }} />
                  <Typography sx={{ color: 'white', fontWeight: 500 }}>Suporte dedicado 24h</Typography>
                </Box>
              </Box>

              <Card sx={{ bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', mt: 4 }}>
                <CardContent sx={{ p: 3 }}>
                  <form onSubmit={handleRecruitmentSubmit}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box>
                        <Typography variant="body2" sx={{ color: 'white', mb: 1, fontWeight: 500 }}>Tipo de Perfil</Typography>
                        <TextField
                          select
                          fullWidth
                          required
                          value={formData.profileType}
                          onChange={(e) => setFormData({ ...formData, profileType: e.target.value })}
                          SelectProps={{ native: true }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              bgcolor: 'rgba(0,0,0,0.5)',
                              color: 'white',
                              '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                              '&:hover fieldset': { borderColor: 'rgba(255,215,0,0.3)' },
                              '&.Mui-focused fieldset': { borderColor: '#FFD700' }
                            }
                          }}
                        >
                          <option value="">Selecione seu perfil</option>
                          <option value="motorista">Motorista Executivo</option>
                          <option value="motorista_bilingue">Motorista Bilíngue (Inglês/Espanhol)</option>
                          <option value="agente_turismo">Agente de Turismo / Guia</option>
                        </TextField>
                      </Box>

                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" sx={{ color: 'white', mb: 1, fontWeight: 500 }}>Nome Completo</Typography>
                          <TextField
                            fullWidth
                            required
                            placeholder="Seu nome"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                bgcolor: 'rgba(0,0,0,0.5)',
                                color: 'white',
                                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                '&:hover fieldset': { borderColor: 'rgba(255,215,0,0.3)' },
                                '&.Mui-focused fieldset': { borderColor: '#FFD700' }
                              },
                              '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.5)' }
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" sx={{ color: 'white', mb: 1, fontWeight: 500 }}>Telefone (WhatsApp)</Typography>
                          <TextField
                            fullWidth
                            required
                            placeholder="(21) 99999-9999"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                bgcolor: 'rgba(0,0,0,0.5)',
                                color: 'white',
                                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                '&:hover fieldset': { borderColor: 'rgba(255,215,0,0.3)' },
                                '&.Mui-focused fieldset': { borderColor: '#FFD700' }
                              },
                              '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.5)' }
                            }}
                          />
                        </Grid>
                      </Grid>

                      <Box>
                        <Typography variant="body2" sx={{ color: 'white', mb: 1, fontWeight: 500 }}>
                          {formData.profileType === 'agente_turismo' ? 'Experiência (opcional)' : 'Veículo / Experiência'}
                        </Typography>
                        <TextField
                          fullWidth
                          required={formData.profileType !== 'agente_turismo'}
                          placeholder={formData.profileType === 'agente_turismo' ? 'Ex: 5 anos como guia turístico' : 'Ex: Toyota Corolla 2024'}
                          value={formData.vehicle}
                          onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              bgcolor: 'rgba(0,0,0,0.5)',
                              color: 'white',
                              '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                              '&:hover fieldset': { borderColor: 'rgba(255,215,0,0.3)' },
                              '&.Mui-focused fieldset': { borderColor: '#FFD700' }
                            },
                            '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.5)' }
                          }}
                        />
                      </Box>

                      <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{
                          bgcolor: '#FFD700',
                          color: '#0a0a0a',
                          py: 2,
                          fontSize: '1.125rem',
                          fontWeight: 700,
                          '&:hover': {
                            bgcolor: '#FFC700',
                            transform: 'scale(1.02)'
                          },
                          transition: 'all 0.3s'
                        }}
                      >
                        QUERO ME CANDIDATAR AGORA
                      </Button>
                    </Box>
                  </form>
                </CardContent>
              </Card>
            </Grid>

            {/* Image */}
            <Grid item xs={12} lg={6} sx={{ order: { xs: 1, lg: 2 } }}>
              <Box sx={{ position: 'relative' }}>
                <Box
                  sx={{
                    position: 'absolute',
                    inset: -16,
                    background: 'radial-gradient(circle, rgba(255,215,0,0.2) 0%, rgba(0,255,255,0.1) 100%)',
                    filter: 'blur(60px)',
                    borderRadius: '50%'
                  }}
                />
                <Box
                  sx={{
                    position: 'relative',
                    borderRadius: 4,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
                  }}
                >
                  <Box
                    component="img"
                    src="/turismo-replit/generated_images/professional_chauffeur_service.png"
                    alt="Motorista Kaviar"
                    sx={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 50%, transparent 100%)',
                      p: 4
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        color: 'white',
                        fontFamily: '"Playfair Display", serif',
                        fontStyle: 'italic',
                        fontSize: '1.25rem',
                        mb: 1
                      }}
                    >
                      "A Kaviar elevou meu padrão de trabalho e qualidade de vida."
                    </Typography>
                    <Typography sx={{ color: '#FFD700', fontWeight: 700 }}>
                      — Roberto M., Motorista Parceiro
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>

          </Grid>
        </Container>
      </Box>

      {/* Chatbot Floating Button */}
      {!chatOpen && (
        <IconButton
          onClick={() => setChatOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            bgcolor: '#FFD700',
            color: '#0a0a0a',
            width: 64,
            height: 64,
            boxShadow: '0 4px 20px rgba(255,215,0,0.4)',
            '&:hover': {
              bgcolor: '#FFC700',
              transform: 'scale(1.1)',
              boxShadow: '0 6px 30px rgba(255,215,0,0.6)'
            },
            transition: 'all 0.3s'
          }}
        >
          <Chat sx={{ fontSize: 28 }} />
        </IconButton>
      )}

      {/* Chatbot Window */}
      {chatOpen && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: { xs: 0, md: 24 },
            right: { xs: 0, md: 24 },
            zIndex: 1000,
            width: { xs: '100%', md: 380 },
            height: { xs: '100%', md: 600 },
            borderRadius: { xs: 0, md: 2 },
            bgcolor: '#0a0a0a',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Chat Header */}
          <Box
            sx={{
              background: 'linear-gradient(to right, #FFD700, #FFC700)',
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Chat sx={{ color: '#0a0a0a' }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ color: '#0a0a0a', fontWeight: 700 }}>
                  Kaviar Suporte
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(0,0,0,0.7)' }}>
                  Online agora
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={() => setChatOpen(false)} sx={{ color: '#0a0a0a' }}>
              <Close />
            </IconButton>
          </Box>

          {/* Messages */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#000' }}>
            {messages.map((msg, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  mb: 2
                }}
              >
                <Paper
                  sx={{
                    maxWidth: '80%',
                    px: 2,
                    py: 1.5,
                    borderRadius: 4,
                    bgcolor: msg.role === 'user' ? '#FFD700' : 'rgba(255,255,255,0.1)',
                    color: msg.role === 'user' ? '#0a0a0a' : 'white',
                    border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  <Typography variant="body2">{msg.content}</Typography>
                </Paper>
              </Box>
            ))}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                <Paper sx={{ px: 2, py: 1.5, bgcolor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} sx={{ color: '#FFD700' }} />
                  <Typography variant="body2" sx={{ color: 'white' }}>Digitando...</Typography>
                </Paper>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input */}
          <Box sx={{ p: 2, bgcolor: '#000', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255,255,255,0.05)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    '& fieldset': {
                      borderColor: 'rgba(255,255,255,0.1)'
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255,215,0,0.3)'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FFD700'
                    }
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: 'rgba(255,255,255,0.5)'
                  }
                }}
              />
              <IconButton
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                sx={{
                  bgcolor: '#FFD700',
                  color: '#0a0a0a',
                  '&:hover': {
                    bgcolor: '#FFC700'
                  },
                  '&:disabled': {
                    bgcolor: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.3)'
                  }
                }}
              >
                <Send />
              </IconButton>
            </Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', textAlign: 'center', mt: 1 }}>
              Atendimento Automático • Kaviar Mobilidade
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Footer */}
      <Box sx={{ bgcolor: '#000', borderTop: '1px solid rgba(255,255,255,0.05)', py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={6}>
            <Grid item xs={12} md={4}>
              <Box
                component="img"
                src="/turismo-replit/Gemini_Generated_Image_n3kx2kn3kx2kn3kx_1765055903753.png"
                alt="Kaviar Logo"
                sx={{ height: 48, width: 'auto', mb: 2, objectFit: 'contain' }}
              />
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 3, lineHeight: 1.6 }}>
                Mobilidade executiva e turismo premium no Rio de Janeiro. Transformando cada trajeto em uma experiência única.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <IconButton
                  onClick={() => handleWhatsApp()}
                  sx={{
                    bgcolor: '#25D366',
                    color: 'white',
                    '&:hover': {
                      bgcolor: '#128C7E'
                    }
                  }}
                >
                  <WhatsApp />
                </IconButton>
              </Box>
            </Grid>
            <Grid item xs={12} md={8}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', textAlign: { xs: 'center', md: 'right' } }}>
                © {new Date().getFullYear()} KAVIAR — uma plataforma USB Tecnok Manutenção e Instalação de Computadores Ltda.
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}
