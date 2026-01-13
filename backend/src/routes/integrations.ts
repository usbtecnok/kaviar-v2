import { Router } from 'express';

export const integrationsRoutes = Router();

// Twilio WhatsApp Webhook
integrationsRoutes.post('/twilio/whatsapp', (req, res) => {
  try {
    console.log('[TWILIO_WEBHOOK] WhatsApp message received:', {
      from: req.body.From,
      to: req.body.To,
      body: req.body.Body?.substring(0, 100),
      timestamp: new Date().toISOString(),
    });

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Recebido ✅ KAVIAR online</Message>
</Response>`;

    res.set('Content-Type', 'text/xml');
    return res.status(200).send(twiml);
  } catch (err) {
    console.error('[TWILIO_WEBHOOK] Error processing webhook:', err);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`;

    res.set('Content-Type', 'text/xml');
    return res.status(200).send(twiml);
  }
});
