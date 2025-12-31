const { createClient } = require('@supabase/supabase-js');

// Configuração do cliente Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
}

// Cliente com Service Role Key (acesso total, apenas backend)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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
 * Busca ou cria conversa WhatsApp
 * @param {string} phone - Número normalizado
 * @param {string} userType - Tipo identificado do usuário
 * @returns {Promise<Object>} - Objeto da conversa
 */
async function findOrCreateConversation(phone, userType = 'unknown') {
  try {
    // Buscar conversa existente
    const { data: existingConversation, error: findError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('phone', phone)
      .single();
    
    if (findError && findError.code !== 'PGRST116') {
      throw findError;
    }
    
    if (existingConversation) {
      // Atualizar last_message_at e user_type se necessário
      const updates = { last_message_at: new Date().toISOString() };
      
      if (userType !== 'unknown' && existingConversation.user_type === 'unknown') {
        updates.user_type = userType;
      }
      
      const { data: updatedConversation, error: updateError } = await supabase
        .from('whatsapp_conversations')
        .update(updates)
        .eq('id', existingConversation.id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      return updatedConversation;
    }
    
    // Criar nova conversa
    const { data: newConversation, error: createError } = await supabase
      .from('whatsapp_conversations')
      .insert({
        phone,
        user_type: userType,
        last_message_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) throw createError;
    
    return newConversation;
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
      MessageSid: messageSid
    } = twilioPayload;
    
    // Normalizar número do remetente
    const normalizedPhone = normalizePhoneNumber(fromNumber);
    
    // Identificar tipo de usuário
    const userType = await identifyUserType(normalizedPhone, messageBody);
    
    // Buscar ou criar conversa
    const conversation = await findOrCreateConversation(normalizedPhone, userType);
    
    // Salvar mensagem
    const savedMessage = await saveWhatsAppMessage({
      conversationId: conversation.id,
      direction: 'inbound',
      body: messageBody,
      messageSid: messageSid,
      rawPayload: twilioPayload
    });
    
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
  findOrCreateConversation,
  saveWhatsAppMessage,
  processWhatsAppMessage
};
