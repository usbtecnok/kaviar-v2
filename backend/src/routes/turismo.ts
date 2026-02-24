import express from 'express';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Muitas requisições. Tente novamente em 1 minuto.' }
});

const faq = [
  { keywords: ['combo', 'roteiro', 'tour', 'passeio'], answer: 'Oferecemos 3 combos: Clássicos do Rio (6h), Natureza Imperial (5h) e Rio Panorâmico (4h). Fale no WhatsApp para detalhes: (21) 96864-8777' },
  { keywords: ['preço', 'valor', 'custo', 'quanto'], answer: 'Os valores variam por roteiro e número de pessoas. Entre em contato pelo WhatsApp para orçamento: (21) 96864-8777' },
  { keywords: ['horário', 'hora', 'quando', 'disponível'], answer: 'Atendemos 24h, todos os dias. Agende pelo WhatsApp: (21) 96864-8777' },
  { keywords: ['pagamento', 'pagar', 'cartão', 'pix'], answer: 'Aceitamos cartão, PIX e dinheiro. Confirme no WhatsApp: (21) 96864-8777' },
  { keywords: ['seguro', 'segurança', 'confiável'], answer: 'Todos os motoristas são verificados e os veículos monitorados em tempo real. Dúvidas? WhatsApp: (21) 96864-8777' },
  { keywords: ['veículo', 'carro', 'sedan'], answer: 'Trabalhamos com sedãs executivos de luxo (Corolla, Civic, Sentra ou superiores). Saiba mais: (21) 96864-8777' },
  { keywords: ['reserva', 'agendar', 'marcar'], answer: 'Para reservar, fale direto no WhatsApp: (21) 96864-8777' },
  { keywords: ['motorista', 'guia', 'driver'], answer: 'Nossos motoristas são de elite, com avaliação 4.9+. Conheça mais: (21) 96864-8777' }
];

function findAnswer(message: string): string {
  const lower = message.toLowerCase();
  
  for (const item of faq) {
    if (item.keywords.some(kw => lower.includes(kw))) {
      return item.answer;
    }
  }
  
  return 'No momento nosso chat inteligente está indisponível. Para reservas e dúvidas, fale no WhatsApp: (21) 96864-8777';
}

router.post('/chat', chatLimiter, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mensagem inválida' });
    }

    if (message.length > 500) {
      return res.status(400).json({ error: 'Mensagem muito longa (máx 500 caracteres)' });
    }

    const reply = findAnswer(message);
    res.json({ reply });

  } catch (error) {
    console.error('Erro no chat:', error);
    res.json({
      reply: 'Para reservas e dúvidas, fale no WhatsApp: (21) 96864-8777'
    });
  }
});

export default router;
