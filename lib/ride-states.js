const { supabase } = require('./supabase');

/**
 * BIBLIOTECA DE CONTROLE DE ESTADOS DE CORRIDA - HARDENED
 * 
 * TODAS as operações críticas usam stored procedures atômicas.
 * Nenhuma lógica de negócio no Node.js.
 */

/**
 * Aceitar corrida - APENAS STORED PROCEDURE
 */
async function acceptRide(rideId, driverId) {
  try {
    const { data, error } = await supabase
      .rpc('atomic_accept_ride', {
        ride_uuid: rideId,
        driver_uuid: driverId
      });
    
    if (error) throw error;
    
    if (!data.success) {
      throw new Error(data.error);
    }
    
    console.log('✅ Corrida aceita atomicamente:', data);
    return data;
  } catch (error) {
    console.error('Error accepting ride:', error);
    throw error;
  }
}

/**
 * Iniciar corrida - APENAS STORED PROCEDURE
 */
async function startRide(rideId, driverId) {
  try {
    const { data, error } = await supabase
      .rpc('atomic_start_ride', {
        ride_uuid: rideId,
        driver_uuid: driverId
      });
    
    if (error) throw error;
    
    if (!data.success) {
      throw new Error(data.error);
    }
    
    console.log('🚀 Corrida iniciada atomicamente:', data);
    return data;
  } catch (error) {
    console.error('Error starting ride:', error);
    throw error;
  }
}

/**
 * Finalizar corrida - APENAS STORED PROCEDURE
 */
async function completeRide(rideId, driverId, finalAmount = null) {
  try {
    const { data, error } = await supabase
      .rpc('atomic_finish_ride', {
        ride_uuid: rideId,
        driver_uuid: driverId,
        final_amount_param: finalAmount
      });
    
    if (error) throw error;
    
    if (!data.success) {
      throw new Error(data.error);
    }
    
    console.log('🏁 Corrida finalizada atomicamente:', data);
    return data;
  } catch (error) {
    console.error('Error completing ride:', error);
    throw error;
  }
}

/**
 * Cancelar corrida - APENAS STORED PROCEDURE
 */
async function cancelRide(rideId, userId, reason) {
  try {
    const { data, error } = await supabase
      .rpc('atomic_cancel_ride', {
        ride_uuid: rideId,
        user_uuid: userId,
        cancellation_reason_param: reason
      });
    
    if (error) throw error;
    
    if (!data.success) {
      throw new Error(data.error);
    }
    
    console.log('🚫 Corrida cancelada atomicamente:', data);
    return data;
  } catch (error) {
    console.error('Error cancelling ride:', error);
    throw error;
  }
}

/**
 * Recusar corrida - APENAS STORED PROCEDURE
 */
async function declineRide(rideId, driverId, reason = null) {
  try {
    const { data, error } = await supabase
      .rpc('atomic_decline_ride', {
        ride_uuid: rideId,
        driver_uuid: driverId,
        decline_reason: reason
      });
    
    if (error) throw error;
    
    if (!data.success) {
      throw new Error(data.error);
    }
    
    console.log('❌ Corrida recusada atomicamente:', data);
    return data;
  } catch (error) {
    console.error('Error declining ride:', error);
    throw error;
  }
}

/**
 * Buscar corrida por ID - APENAS LEITURA
 */
async function getRideById(rideId, userId = null) {
  try {
    let query = supabase
      .from('rides')
      .select(`
        *,
        communities(name, type),
        passengers:users!rides_passenger_id_fkey(id, email),
        drivers:users!rides_driver_id_fkey(id, email)
      `)
      .eq('id', rideId);
    
    if (userId) {
      query = query.or(`passenger_id.eq.${userId},driver_id.eq.${userId}`);
    }
    
    const { data, error } = await query.single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching ride:', error);
    throw error;
  }
}

module.exports = {
  acceptRide,
  declineRide,
  startRide,
  completeRide,
  cancelRide,
  getRideById
};
