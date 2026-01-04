const { createClient } = require('@supabase/supabase-js');

// Configuração do cliente Supabase (opcional)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Se não tiver Supabase configurado, NÃO derruba o servidor.
let supabase = null;

if (supabaseUrl && /^https?:\/\//i.test(supabaseUrl) && supabaseServiceKey) {
  // Cliente com Service Role Key (acesso total, apenas backend)
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log('ℹ️ Supabase: ENABLED');
} else {
  console.log('⚠️ Supabase: DISABLED (SUPABASE_URL/KEY ausentes ou inválidos)');
}

/**
 * Normaliza número de telefone para formato padrão
 * @param {string} phone - Número original (whatsapp:+5511999999999)
 * @returns {string} - Número normalizado (+5511999999999)
 */
function normalizePhoneNumber(phone) {
  if (!phone) return null;
  
  // Remove prefixo whatsapp:
  let normalized = phone.replace('whatsapp:', '');
  
  // Remove caracteres não numéricos exceto +
  normalized = normalized.replace(/[^0-9+]/g, '');
  
  // Adiciona + se não tiver
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  
  // Adiciona código do Brasil se número tem 11 dígitos sem código
  if (normalized.match(/^\+\d{11}$/)) {
    normalized = '+55' + normalized.substring(1);
  }
  
  // Valida formato básico (+ seguido de 7-15 dígitos)
  if (!normalized.match(/^\+[1-9]\d{6,14}$/)) {
    console.warn('Formato de telefone inválido:', phone, '→', normalized);
    return normalized; // Retorna mesmo assim para não quebrar o fluxo
  }
  
  return normalized;
}

/**
 * Identifica tipo de usuário baseado no número e conteúdo
 * @param {string} phone - Número normalizado
 * @param {string} messageBody - Conteúdo da mensagem
 * @returns {Promise<string>} - 'passenger', 'driver', 'unknown'
 */
async function identifyUserType(phone, messageBody) {
  try {
    // TODO: Implementar consulta real ao banco de usuários
    // Por enquanto, lógica baseada em palavras-chave
    
    const body = messageBody?.toLowerCase() || '';
    
    // Palavras-chave para motorista
    const driverKeywords = ['motorista', 'driver', 'corrida aceita', 'chegando', 'estou aqui'];
    const isDriver = driverKeywords.some(keyword => body.includes(keyword));
    
    if (isDriver) return 'driver';
    
    // Palavras-chave para passageiro  
    const passengerKeywords = ['preciso de corrida', 'chamar uber', 'passageiro', 'passenger'];
    const isPassenger = passengerKeywords.some(keyword => body.includes(keyword));
    
    if (isPassenger) return 'passenger';
    
    return 'unknown';
  } catch (error) {
    console.error('Error identifying user type:', error);
    return 'unknown';
  }
}

/**
 * Detecta palavras-chave de emergência
 * @param {string} messageBody - Conteúdo da mensagem
 * @returns {boolean} - Se contém palavras de emergência
 */
function detectEmergencyKeywords(messageBody) {
  if (!messageBody) return false;
  
  const emergencyKeywords = [
    'perigo', 'socorro', 'ajuda', 'emergencia', 'emergência',
    'assalto', 'sequestro', 'acidente', 'pânico', 'panico'
  ];
  
  const body = messageBody.toLowerCase();
  return emergencyKeywords.some(keyword => body.includes(keyword));
}

/**
 * Processa resposta de consentimento "SIM"
 * @param {string} conversationId - ID da conversa
 * @param {string} messageSid - ID da mensagem "SIM"
 */
async function handleConsentResponse(conversationId, messageSid) {
  try {
    // Buscar emergência ativa para esta conversa
    const { data: activeEmergency } = await supabase
      .from('emergency_events')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (activeEmergency) {
      // Marcar consentimento recebido
      await supabase
        .from('emergency_events')
        .update({
          consent_received: true,
          audio_consent_given: true,
          audio_consent_message_id: messageSid
        })
        .eq('id', activeEmergency.id);
      
      console.log('✅ Consentimento de áudio registrado:', {
        emergencyId: activeEmergency.id,
        conversationId,
        messageSid
      });
    }
  } catch (error) {
    console.error('Error handling consent response:', error);
  }
}

/**
 * Verifica se há consentimento para áudio
 * @param {string} conversationId - ID da conversa
 * @returns {Promise<boolean>} - Se tem consentimento
 */
async function checkAudioConsent(conversationId) {
  try {
    const { data } = await supabase
      .from('emergency_events')
      .select('consent_received')
      .eq('conversation_id', conversationId)
      .eq('status', 'active')
      .eq('consent_received', true)
      .limit(1)
      .single();
    
    return !!data;
  } catch (error) {
    return false;
  }
}

/**
 * Registra ação de auditoria do admin
 * @param {string} adminId - ID do admin
 * @param {string} adminEmail - Email do admin
 * @param {string} action - Ação realizada
 * @param {string} emergencyId - ID da emergência (opcional)
 * @param {Object} details - Detalhes adicionais
 */
async function logAdminAction(adminId, adminEmail, action, emergencyId = null, details = {}) {
  try {
    await supabase
      .from('admin_audit_log')
      .insert({
        admin_id: adminId,
        admin_email: adminEmail,
        action,
        emergency_id: emergencyId,
        details,
        created_at: new Date().toISOString()
      });
    
    console.log('📋 Admin action logged:', { adminEmail, action, emergencyId });
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
}
async function createEmergencyEvent(conversationId, triggerType, messageId = null) {
  try {
    const { data, error } = await supabase
      .from('emergency_events')
      .insert({
        conversation_id: conversationId,
        trigger_type: triggerType,
        trigger_message_id: messageId,
        status: 'active'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Marcar conversa como emergência
    await supabase
      .from('whatsapp_conversations')
      .update({
        is_emergency: true,
        emergency_started_at: new Date().toISOString()
      })
      .eq('id', conversationId);
    
    console.log('🚨 EMERGÊNCIA DETECTADA:', {
      conversationId,
      triggerType,
      eventId: data.id
    });
    
    return data;
  } catch (error) {
    console.error('Error creating emergency event:', error);
    throw error;
  }
}

/**
 * Busca ou cria conversa WhatsApp usando upsert
 * @param {string} phone - Número normalizado
 * @param {string} userType - Tipo identificado do usuário
 * @returns {Promise<Object>} - Objeto da conversa
 */
async function findOrCreateConversation(phone, userType = 'unknown') {
  try {
    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .upsert({
        phone,
        user_type: userType,
        last_message_at: new Date().toISOString()
      }, {
        onConflict: 'phone',
        ignoreDuplicates: false
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in findOrCreateConversation:', error);
    throw error;
  }
}

/**
 * Salva mensagem WhatsApp no banco
 * @param {Object} messageData - Dados da mensagem
 * @returns {Promise<Object>} - Mensagem salva
 */
async function saveWhatsAppMessage(messageData) {
  try {
    const {
      conversationId,
      direction,
      body,
      messageSid,
      rawPayload
    } = messageData;
    
    const { data: savedMessage, error } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        direction,
        body,
        message_sid: messageSid,
        raw_payload: rawPayload
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return savedMessage;
  } catch (error) {
    console.error('Error saving WhatsApp message:', error);
    throw error;
  }
}

/**
 * Processa mensagem WhatsApp completa (conversa + mensagem)
 * @param {Object} twilioPayload - Payload completo do Twilio
 * @returns {Promise<Object>} - Resultado do processamento
 */
async function processWhatsAppMessage(twilioPayload) {
  try {
    const {
      From: fromNumber,
      To: toNumber,
      Body: messageBody,
      MessageSid: messageSid,
      NumMedia: numMedia
    } = twilioPayload;
    
    // Verificar se mensagem já foi processada (idempotência)
    const { data: existingMessage } = await supabase
      .from('whatsapp_messages')
      .select('id')
      .eq('message_sid', messageSid)
      .single();
    
    if (existingMessage) {
      console.log('📝 Message already processed (duplicate):', messageSid);
      return {
        success: true,
        duplicate: true,
        messageId: existingMessage.id
      };
    }
    
    // Normalizar número do remetente
    const normalizedPhone = normalizePhoneNumber(fromNumber);
    
    // Identificar tipo de usuário
    const userType = await identifyUserType(normalizedPhone, messageBody);
    
    // Buscar ou criar conversa
    const conversation = await findOrCreateConversation(normalizedPhone, userType);
    
    // Verificar se é resposta de consentimento "SIM"
    if (messageBody && messageBody.trim().toUpperCase() === 'SIM') {
      await handleConsentResponse(conversation.id, messageSid);
    }
    
    // Verificar se é mídia (áudio) e se tem consentimento
    if (parseInt(numMedia || '0') > 0) {
      const hasConsent = await checkAudioConsent(conversation.id);
      if (!hasConsent) {
        console.warn('🚫 Áudio recebido SEM consentimento:', {
          phone: normalizedPhone,
          messageSid,
          timestamp: new Date().toISOString()
        });
        
        // Salvar apenas log da tentativa (sem processar mídia)
        await saveWhatsAppMessage({
          conversationId: conversation.id,
          direction: 'inbound',
          body: '[ÁUDIO BLOQUEADO - SEM CONSENTIMENTO]',
          messageSid: messageSid,
          rawPayload: { ...twilioPayload, audioBlocked: true }
        });
        
        return {
          success: true,
          conversation,
          audioBlocked: true,
          reason: 'Sem consentimento LGPD'
        };
      }
    }
    
    // Salvar mensagem
    const savedMessage = await saveWhatsAppMessage({
      conversationId: conversation.id,
      direction: 'inbound',
      body: messageBody,
      messageSid: messageSid,
      rawPayload: twilioPayload
    });
    
    // Verificar se é emergência por palavra-chave
    if (detectEmergencyKeywords(messageBody)) {
      await createEmergencyEvent(conversation.id, 'keyword', savedMessage.id);
    }
    
    return {
      success: true,
      conversation,
      message: savedMessage,
      userType,
      normalizedPhone
    };
  } catch (error) {
    console.error('Error processing WhatsApp message:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  supabase,
  normalizePhoneNumber,
  identifyUserType,
  detectEmergencyKeywords,
  createEmergencyEvent,
  handleConsentResponse,
  checkAudioConsent,
  logAdminAction,
  findOrCreateConversation,
  saveWhatsAppMessage,
  processWhatsAppMessage
};
