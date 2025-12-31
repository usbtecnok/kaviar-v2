const express = require('express');
const twilio = require('twilio');
const { saveWhatsAppMessage, findOrCreateConversation, createEmergencyEvent } = require('../lib/supabase');

const router = express.Router();

// Twilio client initialization
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Enviar mensagem WhatsApp via Dashboard Admin
 * POST /api/messages/send
 * 
 * Body: { to: "+5511999999999", body: "Mensagem" }
 */
router.post('/send', async (req, res) => {
  try {
    const { to, body } = req.body;
    
    // Validação básica
    if (!to || !body) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: to, body'
      });
    }
    
    // Normalizar número de destino
    const normalizedPhone = to.startsWith('+') ? to : `+${to}`;
    const whatsappNumber = `whatsapp:${normalizedPhone}`;
    
    console.log('📤 Enviando mensagem WhatsApp:', {
      to: whatsappNumber,
      body: body.substring(0, 100) + '...',
      timestamp: new Date().toISOString()
    });
    
    // Enviar via Twilio
    const message = await twilioClient.messages.create({
      body: body,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: whatsappNumber
    });
    
    console.log('✅ Mensagem enviada via Twilio:', {
      messageSid: message.sid,
      status: message.status
    });
    
    // Buscar ou criar conversa
    const conversation = await findOrCreateConversation(normalizedPhone, 'unknown');
    
    // Salvar mensagem outbound no Supabase
    const savedMessage = await saveWhatsAppMessage({
      conversationId: conversation.id,
      direction: 'outbound',
      body: body,
      messageSid: message.sid,
      rawPayload: {
        twilioSid: message.sid,
        status: message.status,
        to: whatsappNumber,
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        sentAt: new Date().toISOString(),
        sentVia: 'dashboard'
      }
    });
    
    console.log('💾 Mensagem salva no Supabase:', {
      messageId: savedMessage.id,
      conversationId: conversation.id
    });
    
    // Resposta rápida
    res.status(200).json({
      success: true,
      message: {
        id: savedMessage.id,
        twilioSid: message.sid,
        conversationId: conversation.id
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    
    // Log detalhado para debug
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      moreInfo: error.moreInfo,
      payload: req.body
    });
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Endpoint de teste para verificar configuração Twilio
 * GET /api/messages/test
 */
router.get('/test', (req, res) => {
  res.json({
    status: 'API Messages is working',
    timestamp: new Date().toISOString(),
    twilioConfig: {
      accountSid: process.env.TWILIO_ACCOUNT_SID ? 'Configured' : 'Missing',
      authToken: process.env.TWILIO_AUTH_TOKEN ? 'Configured' : 'Missing',
      whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'Not configured'
    }
  });
});

/**
 * Ativar botão de pânico
 * POST /api/messages/panic
 * 
 * Body: { phone: "+5511999999999", location?: { lat, lng } }
 */
router.post('/panic', async (req, res) => {
  try {
    const { phone, location } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Campo obrigatório: phone'
      });
    }
    
    console.log('🚨 BOTÃO DE PÂNICO ATIVADO:', {
      phone,
      location,
      timestamp: new Date().toISOString()
    });
    
    // Normalizar número
    const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    
    // Buscar ou criar conversa
    const conversation = await findOrCreateConversation(normalizedPhone, 'unknown');
    
    // Criar evento de emergência
    const emergencyEvent = await createEmergencyEvent(conversation.id, 'panic_button');
    
    // Atualizar localização se fornecida
    if (location && location.lat && location.lng) {
      const { supabase } = require('../lib/supabase');
      await supabase
        .from('emergency_events')
        .update({
          location_lat: location.lat,
          location_lng: location.lng
        })
        .eq('id', emergencyEvent.id);
    }
    
    // Enviar mensagem automática de protocolo
    const protocolMessage = `🚨 Protocolo de segurança ativado.
Para sua proteção, você deseja enviar um áudio descrevendo a situação?
Se concordar, responda SIM e envie o áudio.
O envio é opcional e será usado apenas para segurança.`;
    
    const twilioMessage = await twilioClient.messages.create({
      body: protocolMessage,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${normalizedPhone}`
    });
    
    // Salvar mensagem de protocolo
    await saveWhatsAppMessage({
      conversationId: conversation.id,
      direction: 'outbound',
      body: protocolMessage,
      messageSid: twilioMessage.sid,
      rawPayload: {
        twilioSid: twilioMessage.sid,
        emergencyProtocol: true,
        emergencyEventId: emergencyEvent.id
      }
    });
    
    res.status(200).json({
      success: true,
      emergency: {
        id: emergencyEvent.id,
        conversationId: conversation.id,
        status: 'active'
      }
    });
    
  } catch (error) {
    console.error('❌ Erro no botão de pânico:', error);
    res.status(200).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
