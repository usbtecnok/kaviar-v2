import { Router } from 'express';

const router = Router();

// Twilio WhatsApp Webhook
// Note: This is a placeholder - actual webhook logic should be imported from the root webhooks folder
router.post('/twilio/whatsapp', (req, res) => {
  try {
    // Log webhook received
    console.log('[TWILIO_WEBHOOK] WhatsApp message received:', {
      from: req.body.From,
      to: req.body.To,
      body: req.body.Body?.substring(0, 100), // Log first 100 chars
      timestamp: new Date().toISOString()
    });

    // Respond quickly to Twilio (required)
    res.status(200).send('OK');

    // TODO: Process webhook asynchronously if needed
    // This ensures Twilio gets fast response while processing happens in background
    
  } catch (error) {
    console.error('[TWILIO_WEBHOOK] Error processing WhatsApp webhook:', error);
    
    // Still respond 200 to Twilio to avoid retries for processing errors
    // Only respond 4xx/5xx for actual webhook validation issues
    res.status(200).send('ERROR_LOGGED');
  }
});

// Health check for integrations
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'integrations',
    features: {
      twilio_whatsapp: true
    },
    timestamp: new Date().toISOString()
  });
});

export { router as integrationsRoutes };
