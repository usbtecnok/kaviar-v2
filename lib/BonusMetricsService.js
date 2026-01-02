// =====================================================
// INTEGRAÇÃO BACKEND - SERVIÇO DE BÔNUS
// =====================================================

const { supabase } = require('./supabase');

// Database query helper
const db = {
  query: async (text, params) => {
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: text, 
      params: params || [] 
    });
    if (error) throw error;
    return { rows: data || [] };
  }
};

class BonusMetricsService {
  
  // 🎯 Aplicar A/B Test ao Criar Corrida
  static async createRideWithBonus(rideData) {
    const { passenger_id, driver_id, community_id, base_fare = 15.00 } = rideData;
    
    try {
      // 1. Criar corrida básica
      const rideResult = await db.query(`
        INSERT INTO rides (passenger_id, driver_id, community_id, status)
        VALUES ($1, $2, $3, 'pending')
        RETURNING id
      `, [passenger_id, driver_id, community_id]);
      
      const rideId = rideResult.rows[0].id;
      
      // 2. Aplicar A/B test e bônus
      const bonusResult = await db.query(`
        SELECT * FROM apply_first_accept_bonus($1, $2)
      `, [rideId, base_fare]);
      
      const { has_bonus, ab_group, bonus_amount } = bonusResult.rows[0];
      
      return {
        ride_id: rideId,
        has_first_accept_bonus: has_bonus,
        ab_test_group: ab_group,
        bonus_amount: bonus_amount,
        offer_sent_at: 'NOW()' // Será definido pelo banco
      };
      
    } catch (error) {
      // Log seguro sem exposição de dados sensíveis
      console.error('Erro ao criar corrida com A/B test:', {
        code: error.code,
        timestamp: new Date().toISOString()
      });
      throw new Error('Erro interno ao processar corrida');
    }
  }
  
  // 📊 Processar Aceite de Corrida
  static async processRideAcceptance(rideId, driverId) {
    try {
      // Atualizar status (triggers calculam tempo automaticamente)
      const result = await db.query(`
        UPDATE rides 
        SET status = 'accepted', driver_id = $2
        WHERE id = $1 AND status = 'pending'
        RETURNING has_first_accept_bonus, bonus_amount, accept_time_seconds
      `, [rideId, driverId]);
      
      if (result.rows.length === 0) {
        throw new Error('Corrida não encontrada ou já aceita');
      }
      
      const ride = result.rows[0];
      
      return {
        ride_id: rideId,
        accepted: true,
        accept_time_seconds: ride.accept_time_seconds,
        bonus_earned: ride.has_first_accept_bonus ? ride.bonus_amount : 0
      };
      
    } catch (error) {
      // Log seguro sem exposição de dados sensíveis
      console.error('Erro ao processar aceite:', {
        code: error.code,
        timestamp: new Date().toISOString()
      });
      throw new Error('Erro interno ao processar aceite');
    }
  }
  
  // 📈 Obter Métricas Rápidas
  static async getQuickMetrics(period = 7, communityId = null) {
    try {
      const query = `
        SELECT 
          COUNT(*) FILTER (WHERE has_first_accept_bonus = TRUE) as bonus_rides,
          COUNT(*) FILTER (WHERE has_first_accept_bonus = FALSE) as regular_rides,
          ROUND(AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = TRUE), 1) as avg_time_bonus,
          ROUND(AVG(accept_time_seconds) FILTER (WHERE has_first_accept_bonus = FALSE), 1) as avg_time_regular,
          ROUND(SUM(bonus_amount), 2) as total_cost
        FROM rides 
        WHERE accepted_at >= CURRENT_DATE - INTERVAL '${period} days'
          AND status = 'accepted'
          AND accept_time_seconds IS NOT NULL
          ${communityId ? 'AND community_id = $1' : ''}
      `;
      
      const params = communityId ? [communityId] : [];
      const result = await db.query(query, params);
      
      return result.rows[0];
      
    } catch (error) {
      // Log seguro sem exposição de dados sensíveis
      console.error('Erro ao obter métricas:', {
        code: error.code,
        timestamp: new Date().toISOString()
      });
      throw new Error('Erro interno ao obter métricas');
    }
  }
  
  // ⚙️ Verificar Status A/B Test
  static async getABTestStatus() {
    try {
      const result = await db.query(`
        SELECT is_enabled, group_a_percentage
        FROM ab_test_config 
        WHERE feature_name = 'first_accept_bonus'
      `);
      
      return result.rows[0] || { is_enabled: false, group_a_percentage: 50 };
      
    } catch (error) {
      // Log seguro sem exposição de dados sensíveis
      console.error('Erro ao verificar status A/B test:', {
        code: error.code,
        timestamp: new Date().toISOString()
      });
      return { is_enabled: false, group_a_percentage: 50 };
    }
  }
}

module.exports = BonusMetricsService;
