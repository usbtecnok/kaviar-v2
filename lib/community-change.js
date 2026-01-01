const { supabase } = require('./supabase');

/**
 * SISTEMA DE MUDANÇA DE COMUNIDADE COM GOVERNANÇA
 * 
 * Implementa fluxo controlado de mudança de comunidade com aprovação,
 * histórico imutável e auditoria completa
 */

/**
 * Criar solicitação de mudança de comunidade
 * @param {Object} requestData - Dados da solicitação
 * @returns {Promise<Object>} Solicitação criada
 */
async function createCommunityChangeRequest(requestData) {
  try {
    const {
      user_id,
      user_type,
      requested_community_id,
      reason,
      document_url = null
    } = requestData;
    
    // Validação básica
    if (!user_id || !user_type || !requested_community_id || !reason) {
      throw new Error('Campos obrigatórios: user_id, user_type, requested_community_id, reason');
    }
    
    // Buscar comunidade atual do usuário
    let currentCommunityId;
    if (user_type === 'driver') {
      const { data: driver, error } = await supabase
        .from('drivers')
        .select('community_id')
        .eq('user_id', user_id)
        .single();
      
      if (error) throw new Error('Motorista não encontrado');
      currentCommunityId = driver.community_id;
    } else if (user_type === 'passenger') {
      const { data: passenger, error } = await supabase
        .from('passengers')
        .select('community_id')
        .eq('user_id', user_id)
        .single();
      
      if (error) throw new Error('Passageiro não encontrado');
      currentCommunityId = passenger.community_id;
    } else {
      throw new Error('Tipo de usuário inválido');
    }
    
    // Verificar se não está solicitando mudança para a mesma comunidade
    if (currentCommunityId === requested_community_id) {
      throw new Error('Usuário já pertence à comunidade solicitada');
    }
    
    // Verificar se não há solicitação pendente
    const { data: existingRequest } = await supabase
      .from('community_change_requests')
      .select('id')
      .eq('user_id', user_id)
      .eq('user_type', user_type)
      .eq('status', 'pending')
      .single();
    
    if (existingRequest) {
      throw new Error('Já existe uma solicitação pendente para este usuário');
    }
    
    // Verificar se a comunidade solicitada existe e está ativa
    const { data: targetCommunity, error: communityError } = await supabase
      .from('communities')
      .select('id, name, status')
      .eq('id', requested_community_id)
      .eq('is_active', true)
      .single();
    
    if (communityError || !targetCommunity) {
      throw new Error('Comunidade solicitada não encontrada ou inativa');
    }
    
    // Criar solicitação
    const { data, error } = await supabase
      .from('community_change_requests')
      .insert({
        user_id,
        user_type,
        current_community_id: currentCommunityId,
        requested_community_id,
        reason: reason.trim(),
        document_url,
        status: 'pending'
      })
      .select(`
        *,
        current_community:communities!community_change_requests_current_community_id_fkey(id, name),
        requested_community:communities!community_change_requests_requested_community_id_fkey(id, name)
      `)
      .single();
    
    if (error) throw error;
    
    console.log('📝 Solicitação de mudança criada:', {
      requestId: data.id,
      userId: user_id,
      userType: user_type,
      from: data.current_community?.name,
      to: data.requested_community?.name
    });
    
    return data;
  } catch (error) {
    console.error('Error creating community change request:', error);
    throw error;
  }
}

/**
 * Aprovar solicitação de mudança de comunidade
 * @param {string} requestId - ID da solicitação
 * @param {string} reviewedBy - Quem aprovou
 * @param {string} reviewNotes - Notas da aprovação (opcional)
 * @returns {Promise<Object>} Resultado da aprovação
 */
async function approveCommunityChange(requestId, reviewedBy, reviewNotes = null) {
  try {
    const { data, error } = await supabase
      .rpc('approve_community_change', {
        request_uuid: requestId,
        reviewed_by_param: reviewedBy,
        review_notes_param: reviewNotes
      });
    
    if (error) throw error;
    
    if (!data.success) {
      throw new Error(data.error);
    }
    
    console.log('✅ Mudança de comunidade aprovada:', {
      requestId,
      userId: data.user_id,
      userType: data.user_type,
      reviewedBy
    });
    
    return data;
  } catch (error) {
    console.error('Error approving community change:', error);
    throw error;
  }
}

/**
 * Rejeitar solicitação de mudança de comunidade
 * @param {string} requestId - ID da solicitação
 * @param {string} reviewedBy - Quem rejeitou
 * @param {string} reviewNotes - Motivo da rejeição
 * @returns {Promise<Object>} Resultado da rejeição
 */
async function rejectCommunityChange(requestId, reviewedBy, reviewNotes) {
  try {
    const { data, error } = await supabase
      .rpc('reject_community_change', {
        request_uuid: requestId,
        reviewed_by_param: reviewedBy,
        review_notes_param: reviewNotes
      });
    
    if (error) throw error;
    
    if (!data.success) {
      throw new Error(data.error);
    }
    
    console.log('❌ Mudança de comunidade rejeitada:', {
      requestId,
      userId: data.user_id,
      userType: data.user_type,
      reviewedBy
    });
    
    return data;
  } catch (error) {
    console.error('Error rejecting community change:', error);
    throw error;
  }
}

/**
 * Mudança administrativa de comunidade (override)
 * @param {Object} changeData - Dados da mudança
 * @returns {Promise<Object>} Resultado da mudança
 */
async function adminChangeCommunity(changeData) {
  try {
    const {
      user_id,
      user_type,
      new_community_id,
      changed_by,
      reason = 'Mudança administrativa'
    } = changeData;
    
    const { data, error } = await supabase
      .rpc('admin_change_community', {
        user_uuid: user_id,
        user_type_param: user_type,
        new_community_uuid: new_community_id,
        changed_by_param: changed_by,
        reason_param: reason
      });
    
    if (error) throw error;
    
    if (!data.success) {
      throw new Error(data.error);
    }
    
    console.log('🔧 Mudança administrativa realizada:', {
      userId: user_id,
      userType: user_type,
      newCommunityId: new_community_id,
      changedBy: changed_by
    });
    
    return data;
  } catch (error) {
    console.error('Error in admin community change:', error);
    throw error;
  }
}

/**
 * Buscar solicitações de mudança
 * @param {Object} filters - Filtros de busca
 * @returns {Promise<Array>} Lista de solicitações
 */
async function getCommunityChangeRequests(filters = {}) {
  try {
    const {
      status,
      user_type,
      community_id,
      limit = 50,
      offset = 0
    } = filters;
    
    let query = supabase
      .from('community_change_requests')
      .select(`
        *,
        current_community:communities!community_change_requests_current_community_id_fkey(id, name, type),
        requested_community:communities!community_change_requests_requested_community_id_fkey(id, name, type)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Aplicar filtros
    if (status) {
      query = query.eq('status', status);
    }
    
    if (user_type) {
      query = query.eq('user_type', user_type);
    }
    
    if (community_id) {
      query = query.or(`current_community_id.eq.${community_id},requested_community_id.eq.${community_id}`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching community change requests:', error);
    throw error;
  }
}

/**
 * Buscar histórico de mudanças de um usuário
 * @param {string} userId - ID do usuário
 * @param {string} userType - Tipo do usuário
 * @returns {Promise<Array>} Histórico de mudanças
 */
async function getUserCommunityHistory(userId, userType) {
  try {
    const { data, error } = await supabase
      .from('user_community_history')
      .select(`
        *,
        old_community:communities!user_community_history_old_community_id_fkey(id, name, type),
        new_community:communities!user_community_history_new_community_id_fkey(id, name, type)
      `)
      .eq('user_id', userId)
      .eq('user_type', userType)
      .order('changed_at', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching user community history:', error);
    throw error;
  }
}

/**
 * Buscar solicitação específica
 * @param {string} requestId - ID da solicitação
 * @returns {Promise<Object>} Dados da solicitação
 */
async function getCommunityChangeRequest(requestId) {
  try {
    const { data, error } = await supabase
      .from('community_change_requests')
      .select(`
        *,
        current_community:communities!community_change_requests_current_community_id_fkey(id, name, type),
        requested_community:communities!community_change_requests_requested_community_id_fkey(id, name, type)
      `)
      .eq('id', requestId)
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching community change request:', error);
    throw error;
  }
}

/**
 * Estatísticas de mudanças de comunidade
 * @param {Object} filters - Filtros (período, comunidade)
 * @returns {Promise<Object>} Estatísticas
 */
async function getCommunityChangeStats(filters = {}) {
  try {
    const { days_back = 30, community_id } = filters;
    
    let query = supabase
      .from('community_change_requests')
      .select('status, user_type, created_at')
      .gte('created_at', new Date(Date.now() - days_back * 24 * 60 * 60 * 1000).toISOString());
    
    if (community_id) {
      query = query.or(`current_community_id.eq.${community_id},requested_community_id.eq.${community_id}`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const stats = (data || []).reduce((acc, request) => {
      // Por status
      acc.by_status[request.status] = (acc.by_status[request.status] || 0) + 1;
      
      // Por tipo de usuário
      acc.by_user_type[request.user_type] = (acc.by_user_type[request.user_type] || 0) + 1;
      
      // Total
      acc.total++;
      
      return acc;
    }, {
      total: 0,
      by_status: {},
      by_user_type: {}
    });
    
    return {
      period_days: days_back,
      ...stats
    };
  } catch (error) {
    console.error('Error fetching community change stats:', error);
    throw error;
  }
}

module.exports = {
  createCommunityChangeRequest,
  approveCommunityChange,
  rejectCommunityChange,
  adminChangeCommunity,
  getCommunityChangeRequests,
  getUserCommunityHistory,
  getCommunityChangeRequest,
  getCommunityChangeStats
};
