const { supabase } = require('./supabase');

/**
 * SISTEMA DE COMUNIDADES (CERCA COMUNITÁRIA)
 * 
 * Implementa isolamento geográfico para corridas:
 * - Passageiros e motoristas pertencem a uma comunidade
 * - Corridas são restritas à comunidade por padrão
 * - Passageiro pode opcionalmente permitir motoristas externos
 */

/**
 * Buscar todas as comunidades ativas
 * @returns {Promise<Array>} Lista de comunidades
 */
async function getAllCommunities() {
  try {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching communities:', error);
    throw error;
  }
}

/**
 * Buscar comunidade por ID
 * @param {string} communityId - ID da comunidade
 * @returns {Promise<Object>} Dados da comunidade
 */
async function getCommunityById(communityId) {
  try {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .eq('id', communityId)
      .eq('is_active', true)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching community:', error);
    throw error;
  }
}

/**
 * Criar nova comunidade
 * @param {Object} communityData - Dados da comunidade
 * @returns {Promise<Object>} Comunidade criada
 */
async function createCommunity(communityData) {
  try {
    const { name, type } = communityData;
    
    // Validação básica
    if (!name || !type) {
      throw new Error('Nome e tipo são obrigatórios');
    }
    
    const validTypes = ['bairro', 'vila', 'comunidade', 'condominio'];
    if (!validTypes.includes(type)) {
      throw new Error('Tipo inválido. Use: bairro, vila, comunidade, condominio');
    }
    
    const { data, error } = await supabase
      .from('communities')
      .insert({
        name: name.trim(),
        type,
        is_active: true
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Comunidade criada:', {
      id: data.id,
      name: data.name,
      type: data.type
    });
    
    return data;
  } catch (error) {
    console.error('Error creating community:', error);
    throw error;
  }
}

/**
 * Buscar comunidade de um passageiro
 * @param {string} passengerId - ID do passageiro
 * @returns {Promise<Object>} Dados da comunidade
 */
async function getPassengerCommunity(passengerId) {
  try {
    const { data, error } = await supabase
      .from('passengers')
      .select(`
        community_id,
        communities (
          id,
          name,
          type,
          is_active
        )
      `)
      .eq('id', passengerId)
      .single();
    
    if (error) throw error;
    return data?.communities;
  } catch (error) {
    console.error('Error fetching passenger community:', error);
    throw error;
  }
}

/**
 * Buscar comunidade de um motorista
 * @param {string} driverId - ID do motorista
 * @returns {Promise<Object>} Dados da comunidade
 */
async function getDriverCommunity(driverId) {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select(`
        community_id,
        communities (
          id,
          name,
          type,
          is_active
        )
      `)
      .eq('id', driverId)
      .single();
    
    if (error) throw error;
    return data?.communities;
  } catch (error) {
    console.error('Error fetching driver community:', error);
    throw error;
  }
}

/**
 * Verificar se motorista pode aceitar corrida
 * @param {string} driverId - ID do motorista
 * @param {string} rideId - ID da corrida
 * @returns {Promise<boolean>} Se pode aceitar
 */
async function canDriverAcceptRide(driverId, rideId) {
  try {
    const { data, error } = await supabase
      .rpc('can_driver_accept_ride', {
        driver_uuid: driverId,
        ride_uuid: rideId
      });
    
    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error('Error checking driver ride eligibility:', error);
    return false;
  }
}

/**
 * Buscar motoristas elegíveis para uma corrida
 * @param {string} rideId - ID da corrida
 * @returns {Promise<Array>} Lista de motoristas elegíveis
 */
async function getEligibleDriversForRide(rideId) {
  try {
    // Buscar dados da corrida
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('community_id, allow_external_drivers')
      .eq('id', rideId)
      .single();
    
    if (rideError) throw rideError;
    
    let query = supabase
      .from('drivers')
      .select(`
        id,
        community_id,
        communities (name, type)
      `)
      .eq('communities.is_active', true);
    
    // Se não permite externos, filtrar apenas da mesma comunidade
    if (!ride.allow_external_drivers) {
      query = query.eq('community_id', ride.community_id);
    }
    
    const { data: drivers, error: driversError } = await query;
    
    if (driversError) throw driversError;
    return drivers || [];
  } catch (error) {
    console.error('Error fetching eligible drivers:', error);
    throw error;
  }
}

/**
 * Permitir motoristas externos em uma corrida
 * @param {string} rideId - ID da corrida
 * @param {string} passengerId - ID do passageiro (validação)
 * @returns {Promise<Object>} Corrida atualizada
 */
async function allowExternalDrivers(rideId, passengerId) {
  try {
    // Verificar se o passageiro é dono da corrida
    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('passenger_id, allow_external_drivers')
      .eq('id', rideId)
      .single();
    
    if (rideError) throw rideError;
    
    if (ride.passenger_id !== passengerId) {
      throw new Error('Apenas o passageiro pode permitir motoristas externos');
    }
    
    if (ride.allow_external_drivers) {
      throw new Error('Motoristas externos já estão permitidos');
    }
    
    // Atualizar corrida
    const { data, error } = await supabase
      .from('rides')
      .update({
        allow_external_drivers: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', rideId)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Motoristas externos permitidos na corrida:', {
      rideId,
      passengerId
    });
    
    return data;
  } catch (error) {
    console.error('Error allowing external drivers:', error);
    throw error;
  }
}

/**
 * Criar corrida com isolamento por comunidade
 * @param {Object} rideData - Dados da corrida
 * @returns {Promise<Object>} Corrida criada
 */
/**
 * Criar corrida com isolamento por comunidade - APENAS STORED PROCEDURE
 */
async function createRideWithCommunity(rideData) {
  try {
    const {
      passenger_id,
      pickup_location,
      destination,
      allow_external_drivers = false,
      service_type = 'STANDARD_RIDE',
      additional_fee = 0,
      service_notes = null,
      base_amount = null,
      ...otherData
    } = rideData;
    
    // USAR APENAS STORED PROCEDURE - Nenhuma lógica no Node.js
    const { data, error } = await supabase
      .rpc('atomic_create_ride', {
        passenger_uuid: passenger_id,
        pickup_location_param: pickup_location,
        destination_location_param: destination,
        service_type_param: service_type,
        allow_external_drivers_param: allow_external_drivers,
        base_amount_param: base_amount,
        additional_fee_param: additional_fee,
        service_notes_param: service_notes
      });
    
    if (error) throw error;
    
    if (!data.success) {
      throw new Error(data.error);
    }
    
    console.log('✅ Corrida criada atomicamente:', data);
    
    return data;
  } catch (error) {
    console.error('Error creating ride with community:', error);
    throw error;
  }
}

module.exports = {
  getAllCommunities,
  getCommunityById,
  createCommunity,
  getPassengerCommunity,
  getDriverCommunity,
  canDriverAcceptRide,
  getEligibleDriversForRide,
  allowExternalDrivers,
  createRideWithCommunity
};
