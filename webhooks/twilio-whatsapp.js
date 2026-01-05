const express = require('express');
const twilio = require('twilio');
const { processWhatsAppMessage } = require('../lib/supabase');

const router = express.Router();

// Twilio client initialization
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Webhook endpoint para receber mensagens WhatsApp do Twilio
 * POST /webhooks/twilio/whatsapp
 * 
 * Fluxo:
 * 1. Recebe payload do Twilio
 * 2. Processa e salva no Supabase
 * 3. Emite evento real-time automaticamente
 * 4. Retorna 200 OK para o Twilio
 */
router.post('/twilio/whatsapp', async (req, res) => {
  try {
    // Validar payload obrigatório
    const { From, To, Body, MessageSid } = req.body;
    
    if (!From || !To || !MessageSid) {
      console.log('⚠️ Invalid payload - missing required fields:', {
        hasFrom: !!From,
        hasTo: !!To,
        hasMessageSid: !!MessageSid
      });
      return res.status(200).send('OK'); // Não processar, mas não falhar
    }
    
    // Log do payload recebido
    console.log('📱 WhatsApp Webhook Received:', {
      timestamp: new Date().toISOString(),
      from: From,
      to: To,
      body: Body?.substring(0, 100) + '...', // Truncar para log
      messageSid: MessageSid
    });

    // Processar mensagem com Supabase
    const result = await processWhatsAppMessage(req.body);
    
    if (result.success) {
      console.log('✅ Message processed successfully:', {
        conversationId: result.conversation?.id,
        messageId: result.message?.id,
        userType: result.userType,
        phone: result.normalizedPhone
      });
      
      // Log para contexto de roteamento futuro
      const routingContext = {
        userType: result.userType,
        conversationId: result.conversation.id,
        isCommand: req.body.Body?.startsWith('/'),
        containsLocation: req.body.Latitude && req.body.Longitude,
        isEmergency: req.body.Body?.toLowerCase().includes('emergência') || 
                     req.body.Body?.toLowerCase().includes('emergency'),
        hasMedia: parseInt(req.body.NumMedia || '0') > 0
      };
      
      console.log('🔄 Routing Context:', routingContext);
      
      // TODO: Implementar lógica de roteamento baseada no contexto
      // - Associar a corrida ativa
      // - Processar comandos específicos (/status, /cancelar)
      // - Encaminhar mensagens entre passageiro ↔ motorista
      // - Detectar emergências e alertar
      
    } else {
      console.error('❌ Failed to process message:', result.error);
    }

    // Sempre retornar 200 OK para o Twilio
    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Critical error in WhatsApp webhook:', error);
    
    // Log detalhado do erro para debugging
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      payload: req.body
    });
    
    // Sempre retornar 200 para evitar reenvios do Twilio
    res.status(200).send('ERROR_LOGGED');
  }
});

/**
 * Endpoint de teste para verificar integração Supabase
 * GET /webhooks/twilio/test
 */
router.get('/twilio/test', async (req, res) => {
  try {
    const { supabase } = require('../lib/supabase');
    
    // Testar conexão com Supabase
    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .select('count(*)')
      .limit(1);
    
    if (error) throw error;
    
    res.json({
      status: 'Webhook is working',
      timestamp: new Date().toISOString(),
      supabaseConnection: 'Connected',
      twilioConfig: {
        accountSid: process.env.TWILIO_ACCOUNT_SID ? 'Configured' : 'Missing',
        authToken: process.env.TWILIO_AUTH_TOKEN ? 'Configured' : 'Missing',
        whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'Not configured'
      },
      supabaseConfig: {
        url: process.env.SUPABASE_URL ? 'Configured' : 'Missing',
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configured' : 'Missing'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      error: error.message,
      supabaseConnection: 'Failed'
    });
  }
});

/**
 * Endpoint para listar conversas recentes (debug)
 * GET /webhooks/twilio/conversations
 */
router.get('/twilio/conversations', async (req, res) => {
  try {
    const { supabase } = require('../lib/supabase');
    
    const { data: conversations, error } = await supabase
      .from('whatsapp_conversations')
      .select(`
        id,
        phone,
        user_type,
        last_message_at,
        created_at
      `)
      .order('last_message_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    res.json({
      success: true,
      conversations: conversations || [],
      count: conversations?.length || 0
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
