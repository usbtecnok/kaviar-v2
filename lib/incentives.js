const { supabase } = require('./supabase');

/**
 * SISTEMA DE INCENTIVOS AO MOTORISTA LOCAL
 * 
 * Implementa bônus automático para motoristas da mesma comunidade
 * e governança de ativação de comunidades baseada em massa crítica
 */

/**
 * Verificar se comunidade está ativa para corridas
 * @param {string} communityId - ID da comunidade
 * @returns {Promise<boolean>} Se a comunidade está ativa
 */
async function isCommunityActive(communityId) {
  try {
    const { data, error } = await supabase
      .from('communities')
      .select('status')
      .eq('id', communityId)
      .eq('status', 'active')
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // Ignorar "not found"
    return !!data;
  } catch (error) {
    console.error('Error checking community status:', error);
    return false;
  }
}

/**
 * Atualizar status de uma comunidade baseado no número de motoristas
 * @param {string} communityId - ID da comunidade
 * @returns {Promise<Object>} Resultado da atualização
 */
async function updateCommunityStatus(communityId) {
  try {
    const { data, error } = await supabase
      .rpc('update_community_status', {
        community_uuid: communityId
      });
    
    if (error) throw error;
    
    console.log('✅ Status da comunidade atualizado:', {
      communityId,
      updated: data
    });
    
    return { success: true, updated: data };
  } catch (error) {
    console.error('Error updating community status:', error);
    throw error;
  }
}

/**
 * Buscar configuração de bônus para uma comunidade
 * @param {string} communityId - ID da comunidade (null para global)
 * @returns {Promise<Object>} Configuração de bônus
 */
async function getBonusConfig(communityId = null) {
  try {
    let query = supabase
      .from('bonus_config')
      .select('*')
      .eq('is_active', true);
    
    if (communityId) {
      // Buscar específica da comunidade primeiro, depois global
      query = query.or(`community_id.eq.${communityId},community_id.is.null`)
        .order('community_id', { nullsLast: false });
    } else {
      // Buscar apenas global
      query = query.is('community_id', null);
    }
    
    const { data, error } = await query.limit(1).single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    console.error('Error fetching bonus config:', error);
    return null;
  }
}

/**
 * Calcular bônus do motorista local
 * @param {string} driverId - ID do motorista
 * @param {string} rideId - ID da corrida
 * @param {number} baseAmount - Valor base da corrida
 * @returns {Promise<Object>} Dados do bônus calculado
 */
async function calculateCommunityBonus(driverId, rideId, baseAmount) {
  try {
    const { data, error } = await supabase
      .rpc('calculate_community_bonus', {
        driver_uuid: driverId,
        ride_uuid: rideId,
        base_amount_param: baseAmount
      });
    
    if (error) throw error;
    
    const result = data[0] || {
      bonus_amount: 0.00,
      bonus_type: 'none',
      config_used: {}
    };
    
    console.log('💰 Bônus calculado:', {
      driverId,
      rideId,
      baseAmount,
      bonusAmount: result.bonus_amount,
      bonusType: result.bonus_type
    });
    
    return result;
  } catch (error) {
    console.error('Error calculating community bonus:', error);
    return {
      bonus_amount: 0.00,
      bonus_type: 'none',
      config_used: {}
    };
  }
}

/**
 * Registrar ganhos do motorista com bônus
 * @param {Object} earningsData - Dados dos ganhos
 * @returns {Promise<Object>} Registro de ganhos criado
 */
async function recordDriverEarnings(earningsData) {
  try {
    const {
      driver_id,
      ride_id,
      base_amount,
      bonus_amount = 0.00,
      bonus_type = 'none',
      bonus_config_used = {}
    } = earningsData;
    
    const total_amount = parseFloat(base_amount) + parseFloat(bonus_amount);
    
    const { data, error } = await supabase
      .from('driver_earnings')
      .insert({
        driver_id,
        ride_id,
        base_amount: parseFloat(base_amount),
        bonus_amount: parseFloat(bonus_amount),
        total_amount,
        bonus_type,
        bonus_config_used
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('📊 Ganhos registrados:', {
      earningsId: data.id,
      driverId: driver_id,
      rideId: ride_id,
      baseAmount: data.base_amount,
      bonusAmount: data.bonus_amount,
      totalAmount: data.total_amount
    });
    
    return data;
  } catch (error) {
    console.error('Error recording driver earnings:', error);
    throw error;
  }
}

/**
 * Processar finalização de corrida com bônus automático
 * @param {Object} rideCompletionData - Dados da corrida finalizada
 * @returns {Promise<Object>} Resultado do processamento
 */
async function processRideCompletion(rideCompletionData) {
  try {
    const {
      ride_id,
      driver_id,
      base_amount,
      passenger_amount // Valor pago pelo passageiro (não alterado)
    } = rideCompletionData;
    
    // Calcular bônus automático
    const bonusResult = await calculateCommunityBonus(driver_id, ride_id, base_amount);
    
    // Registrar ganhos do motorista
    const earnings = await recordDriverEarnings({
      driver_id,
      ride_id,
      base_amount,
      bonus_amount: bonusResult.bonus_amount,
      bonus_type: bonusResult.bonus_type,
      bonus_config_used: bonusResult.config_used
    });
    
    const result = {
      success: true,
      earnings,
      passenger_paid: passenger_amount, // Valor do passageiro não muda
      driver_received: earnings.total_amount, // Base + bônus
      bonus_applied: bonusResult.bonus_amount > 0,
      bonus_amount: bonusResult.bonus_amount
    };
    
    console.log('🏁 Corrida finalizada com incentivos:', {
      rideId: ride_id,
      passengerPaid: passenger_amount,
      driverReceived: earnings.total_amount,
      bonusApplied: result.bonus_applied
    });
    
    return result;
  } catch (error) {
    console.error('Error processing ride completion:', error);
    throw error;
  }
}

/**
 * Buscar extrato de ganhos do motorista
 * @param {string} driverId - ID do motorista
 * @param {Object} filters - Filtros opcionais (limit, offset, date_from, date_to)
 * @returns {Promise<Object>} Extrato de ganhos
 */
async function getDriverEarnings(driverId, filters = {}) {
  try {
    const {
      limit = 50,
      offset = 0,
      date_from,
      date_to
    } = filters;
    
    let query = supabase
      .from('driver_earnings')
      .select(`
        *,
        rides (
          id,
          pickup_location,
          destination,
          status,
          created_at
        )
      `)
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Filtros de data se fornecidos
    if (date_from) {
      query = query.gte('created_at', date_from);
    }
    if (date_to) {
      query = query.lte('created_at', date_to);
    }
    
    const { data: earnings, error } = await query;
    
    if (error) throw error;
    
    // Calcular totais
    const totals = earnings.reduce((acc, earning) => ({
      total_base: acc.total_base + parseFloat(earning.base_amount),
      total_bonus: acc.total_bonus + parseFloat(earning.bonus_amount),
      total_earnings: acc.total_earnings + parseFloat(earning.total_amount),
      rides_count: acc.rides_count + 1,
      bonus_rides: acc.bonus_rides + (earning.bonus_amount > 0 ? 1 : 0)
    }), {
      total_base: 0,
      total_bonus: 0,
      total_earnings: 0,
      rides_count: 0,
      bonus_rides: 0
    });
    
    return {
      success: true,
      earnings: earnings || [],
      totals,
      pagination: {
        limit,
        offset,
        count: earnings?.length || 0
      }
    };
  } catch (error) {
    console.error('Error fetching driver earnings:', error);
    throw error;
  }
}

/**
 * Criar ou atualizar configuração de bônus
 * @param {Object} configData - Dados da configuração
 * @returns {Promise<Object>} Configuração criada/atualizada
 */
async function setBonusConfig(configData) {
  try {
    const {
      community_id = null, // null = global
      bonus_type = 'percentage',
      bonus_value,
      is_active = true
    } = configData;
    
    // Validação
    if (!bonus_value || bonus_value <= 0) {
      throw new Error('Valor do bônus deve ser maior que zero');
    }
    
    if (!['percentage', 'fixed'].includes(bonus_type)) {
      throw new Error('Tipo de bônus inválido. Use: percentage, fixed');
    }
    
    // Desativar configuração anterior se existir
    if (community_id) {
      await supabase
        .from('bonus_config')
        .update({ is_active: false })
        .eq('community_id', community_id);
    } else {
      await supabase
        .from('bonus_config')
        .update({ is_active: false })
        .is('community_id', null);
    }
    
    // Criar nova configuração
    const { data, error } = await supabase
      .from('bonus_config')
      .insert({
        community_id,
        bonus_type,
        bonus_value: parseFloat(bonus_value),
        is_active
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('⚙️ Configuração de bônus atualizada:', {
      configId: data.id,
      communityId: community_id || 'global',
      bonusType: bonus_type,
      bonusValue: bonus_value
    });
    
    return data;
  } catch (error) {
    console.error('Error setting bonus config:', error);
    throw error;
  }
}

module.exports = {
  isCommunityActive,
  updateCommunityStatus,
  getBonusConfig,
  calculateCommunityBonus,
  recordDriverEarnings,
  processRideCompletion,
  getDriverEarnings,
  setBonusConfig
};
