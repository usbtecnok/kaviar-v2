const { supabase } = require('./supabase');

/**
 * SISTEMA DE SERVIÇOS ESPECIAIS
 * 
 * Extensão modular para corridas com serviços diferenciados,
 * mantendo compatibilidade total com sistema existente
 */

/**
 * Verificar se motorista está habilitado para serviço específico
 * @param {string} driverId - ID do motorista
 * @param {string} serviceType - Tipo de serviço
 * @returns {Promise<boolean>} Se está habilitado
 */
async function checkDriverServiceEligibility(driverId, serviceType) {
  try {
    const { data, error } = await supabase
      .rpc('check_driver_service_eligibility', {
        driver_uuid: driverId,
        service_type_param: serviceType
      });
    
    if (error) throw error;
    
    return data || false;
  } catch (error) {
    console.error('Error checking driver eligibility:', error);
    return false;
  }
}

/**
 * Buscar motoristas habilitados para serviço específico
 * @param {string} serviceType - Tipo de serviço
 * @param {string} communityId - ID da comunidade (opcional)
 * @returns {Promise<Array>} Lista de motoristas habilitados
 */
async function getEligibleDriversForService(serviceType, communityId = null) {
  try {
    let query = supabase
      .from('drivers')
      .select(`
        id,
        user_id,
        community_id,
        is_active,
        can_tour_guide,
        can_elderly_assistance,
        can_special_assistance,
        can_community_service,
        communities(name, type)
      `)
      .eq('is_active', true);
    
    // Filtrar por comunidade se especificada
    if (communityId) {
      query = query.eq('community_id', communityId);
    }
    
    const { data: drivers, error } = await query;
    
    if (error) throw error;
    
    // Filtrar motoristas habilitados para o serviço
    const eligibleDrivers = drivers.filter(driver => {
      switch (serviceType) {
        case 'STANDARD_RIDE':
        case 'COMMUNITY_RIDE':
          return true; // Todos podem fazer corridas padrão
        case 'TOUR_GUIDE':
          return driver.can_tour_guide;
        case 'ELDERLY_ASSISTANCE':
          return driver.can_elderly_assistance;
        case 'SPECIAL_ASSISTANCE':
          return driver.can_special_assistance;
        case 'COMMUNITY_SERVICE':
          return driver.can_community_service;
        default:
          return false;
      }
    });
    
    return eligibleDrivers;
  } catch (error) {
    console.error('Error fetching eligible drivers:', error);
    throw error;
  }
}

/**
 * Habilitar motorista para serviços especiais
 * @param {string} driverId - ID do motorista
 * @param {Object} services - Serviços a habilitar
 * @param {string} enabledBy - Quem habilitou
 * @returns {Promise<Object>} Resultado da habilitação
 */
async function enableDriverSpecialServices(driverId, services, enabledBy) {
  try {
    const {
      can_tour_guide = false,
      can_elderly_assistance = false,
      can_special_assistance = false,
      can_community_service = false
    } = services;
    
    const { data, error } = await supabase
      .from('drivers')
      .update({
        can_tour_guide,
        can_elderly_assistance,
        can_special_assistance,
        can_community_service,
        special_services_enabled_at: new Date().toISOString(),
        special_services_enabled_by: enabledBy
      })
      .eq('id', driverId)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('🔧 Motorista habilitado para serviços especiais:', {
      driverId,
      services,
      enabledBy
    });
    
    return data;
  } catch (error) {
    console.error('Error enabling driver special services:', error);
    throw error;
  }
}

/**
 * Buscar configurações de serviços especiais
 * @param {string} serviceType - Tipo específico (opcional)
 * @returns {Promise<Array|Object>} Configurações
 */
async function getSpecialServiceConfigs(serviceType = null) {
  try {
    let query = supabase
      .from('special_service_configs')
      .select('*')
      .eq('is_active', true)
      .order('service_type');
    
    if (serviceType) {
      query = query.eq('service_type', serviceType);
      const { data, error } = await query.single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  } catch (error) {
    console.error('Error fetching service configs:', error);
    throw error;
  }
}

/**
 * Calcular valor total com taxa adicional
 * @param {number} baseAmount - Valor base da corrida
 * @param {string} serviceType - Tipo de serviço
 * @param {number} customFee - Taxa customizada (opcional)
 * @returns {Promise<number>} Valor total
 */
async function calculateServiceTotal(baseAmount, serviceType, customFee = null) {
  try {
    const { data, error } = await supabase
      .rpc('calculate_service_total', {
        base_amount: baseAmount,
        service_type_param: serviceType,
        custom_additional_fee: customFee
      });
    
    if (error) throw error;
    
    return parseFloat(data) || baseAmount;
  } catch (error) {
    console.error('Error calculating service total:', error);
    return baseAmount; // Fallback para valor base
  }
}

/**
 * Criar corrida com serviço especial
 * @param {Object} rideData - Dados da corrida
 * @returns {Promise<Object>} Corrida criada
 */
async function createSpecialServiceRide(rideData) {
  try {
    const {
      passenger_id,
      driver_id,
      community_id,
      pickup_location,
      destination_location,
      service_type = 'STANDARD_RIDE',
      additional_fee = 0,
      service_notes = null,
      base_amount
    } = rideData;
    
    // Verificar se motorista está habilitado para o serviço
    if (service_type !== 'STANDARD_RIDE') {
      const isEligible = await checkDriverServiceEligibility(driver_id, service_type);
      if (!isEligible) {
        throw new Error(`Motorista não habilitado para serviço: ${service_type}`);
      }
    }
    
    // Calcular valor total
    const totalAmount = await calculateServiceTotal(base_amount, service_type, additional_fee);
    
    // Criar corrida
    const { data, error } = await supabase
      .from('rides')
      .insert({
        passenger_id,
        driver_id,
        community_id,
        pickup_location,
        destination_location,
        service_type,
        additional_fee,
        service_notes,
        base_amount,
        total_amount: totalAmount,
        status: 'pending'
      })
      .select(`
        *,
        communities(name, type),
        special_service_configs!rides_service_type_fkey(display_name, description, audit_level)
      `)
      .single();
    
    if (error) throw error;
    
    console.log('🚗 Corrida com serviço especial criada:', {
      rideId: data.id,
      serviceType: service_type,
      driverId: driver_id,
      totalAmount
    });
    
    return data;
  } catch (error) {
    console.error('Error creating special service ride:', error);
    throw error;
  }
}

/**
 * Registrar aceite de serviço especial pelo motorista
 * @param {string} rideId - ID da corrida
 * @param {string} driverId - ID do motorista
 * @returns {Promise<Object>} Resultado do aceite
 */
async function recordSpecialServiceAcceptance(rideId, driverId) {
  try {
    // Buscar dados da corrida
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('service_type, additional_fee')
      .eq('id', rideId)
      .single();
    
    if (rideError) throw rideError;
    
    // Atualizar auditoria
    const { data, error } = await supabase
      .from('special_service_audit')
      .update({
        driver_accepted_at: new Date().toISOString(),
        audit_notes: 'Driver explicitly accepted special service'
      })
      .eq('ride_id', rideId)
      .eq('driver_id', driverId)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Aceite de serviço especial registrado:', {
      rideId,
      driverId,
      serviceType: ride.service_type
    });
    
    return data;
  } catch (error) {
    console.error('Error recording service acceptance:', error);
    throw error;
  }
}

/**
 * Buscar histórico de serviços especiais do motorista
 * @param {string} driverId - ID do motorista
 * @param {number} days - Dias para trás (padrão 30)
 * @returns {Promise<Array>} Histórico de serviços
 */
async function getDriverSpecialServiceHistory(driverId, days = 30) {
  try {
    const { data, error } = await supabase
      .from('special_service_audit')
      .select(`
        *,
        rides(
          id,
          pickup_location,
          destination_location,
          base_amount,
          total_amount,
          status,
          created_at
        )
      `)
      .eq('driver_id', driverId)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching driver service history:', error);
    throw error;
  }
}

/**
 * Estatísticas de serviços especiais
 * @param {Object} filters - Filtros (comunidade, período)
 * @returns {Promise<Object>} Estatísticas
 */
async function getSpecialServiceStats(filters = {}) {
  try {
    const { community_id, days_back = 30 } = filters;
    
    let query = supabase
      .from('rides')
      .select('service_type, additional_fee, total_amount, created_at')
      .neq('service_type', 'STANDARD_RIDE')
      .gte('created_at', new Date(Date.now() - days_back * 24 * 60 * 60 * 1000).toISOString());
    
    if (community_id) {
      query = query.eq('community_id', community_id);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const stats = (data || []).reduce((acc, ride) => {
      const serviceType = ride.service_type;
      
      if (!acc.by_service[serviceType]) {
        acc.by_service[serviceType] = {
          count: 0,
          total_additional_fees: 0,
          total_amount: 0
        };
      }
      
      acc.by_service[serviceType].count++;
      acc.by_service[serviceType].total_additional_fees += parseFloat(ride.additional_fee || 0);
      acc.by_service[serviceType].total_amount += parseFloat(ride.total_amount || 0);
      
      acc.total_special_rides++;
      acc.total_additional_revenue += parseFloat(ride.additional_fee || 0);
      
      return acc;
    }, {
      total_special_rides: 0,
      total_additional_revenue: 0,
      by_service: {}
    });
    
    return {
      period_days: days_back,
      ...stats
    };
  } catch (error) {
    console.error('Error fetching special service stats:', error);
    throw error;
  }
}

module.exports = {
  checkDriverServiceEligibility,
  getEligibleDriversForService,
  enableDriverSpecialServices,
  getSpecialServiceConfigs,
  calculateServiceTotal,
  createSpecialServiceRide,
  recordSpecialServiceAcceptance,
  getDriverSpecialServiceHistory,
  getSpecialServiceStats
};
